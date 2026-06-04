const INPE_FIRE_EVENTS_ACTIVE_KML_URL = "https://dataserver-coids.inpe.br/queimadas/queimadas/eventos/ativos/eventos_ativos.kml";
const INPE_FIRE_EVENTS_OBSERVATION_KML_URL = "https://dataserver-coids.inpe.br/queimadas/queimadas/eventos/observacao/eventos_observacao.kml";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type FireEvent = {
  type: "Feature";
  id: string;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: Record<string, unknown>;
};

function jsonResponse(body: Record<string, unknown>, status = 200, cache = "public, max-age=600, stale-while-revalidate=900") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache,
    },
  });
}

function publicErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const lower = message.toLowerCase();

  if (lower.includes("certificate") || lower.includes("certificado") || lower.includes("cert")) {
    return "Fonte INPE Eventos de Fogo indisponivel por falha de certificado no servidor de origem.";
  }

  return error instanceof Error ? error.message : "Fonte INPE Eventos de Fogo indisponivel";
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(value: string) {
  return decodeXmlEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toUpperCase()
    .trim();
}

function textBetween(value: string, tag: string) {
  const match = value.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].trim() : null;
}

function fieldFromDescription(description: string, labels: string | string[]) {
  const html = decodeXmlEntities(description);
  const candidates = Array.isArray(labels) ? labels : [labels];
  const candidateKeys = candidates.map(normalizeText);
  const rowPattern = /<tr[^>]*>\s*<td[^>]*>\s*<b>\s*([\s\S]*?)\s*<\/b>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;

  for (const match of html.matchAll(rowPattern)) {
    const label = normalizeText(stripTags(match[1] || ""));
    if (candidateKeys.includes(label)) return stripTags(match[2] || "");
  }

  for (const label of candidates) {
    const normalizedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`<td[^>]*>\\s*<b>\\s*${normalizedLabel}\\s*<\\/b>\\s*<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, "i");
    const match = html.match(pattern);
    if (match) return stripTags(match[1]);
  }

  return null;
}

function numberFromText(value: string | null) {
  if (!value) return null;
  const parsed = Number(value.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function isoDateTime(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().replace(" ", "T");
  const withZone = /z$|[+-]\d{2}:?\d{2}$/i.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  return Number.isFinite(date.getTime()) ? date.toISOString() : value;
}

function polygonFromCoordinates(value: string | null) {
  if (!value) return null;

  const ring = value.trim().split(/\s+/).map((chunk) => {
    const [lon, lat] = chunk.split(",").map(Number);
    return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null;
  }).filter((coordinate): coordinate is number[] => Boolean(coordinate));

  if (ring.length < 4) return null;
  return {
    type: "Polygon" as const,
    coordinates: [ring],
  };
}

function parseKmlEvents(kml: string, mode: "active" | "observation") {
  const placemarks = kml.match(/<Placemark\b[\s\S]*?<\/Placemark>/gi) || [];

  const events = placemarks.map((placemark): FireEvent | null => {
    if (!/<Polygon\b/i.test(placemark)) return null;

    const name = stripTags(textBetween(placemark, "name") || "");
    const eventId = name.match(/\bEvento\s+(\d+)/i)?.[1];
    if (!eventId) return null;

    const description = textBetween(placemark, "description") || "";
    const state = fieldFromDescription(description, "Estado");
    if (normalizeText(state || "") !== "RIO GRANDE DO SUL") return null;

    const coordinates = textBetween(placemark, "coordinates");
    const geometry = polygonFromCoordinates(coordinates);
    if (!geometry) return null;

    const eventType = fieldFromDescription(description, "Tipo");
    const city = fieldFromDescription(description, ["Município", "MunicÃ­pio"]);
    const startedAt = fieldFromDescription(description, ["Data início", "Data inÃ­cio"]);
    const endedAt = fieldFromDescription(description, "Data fim");
    const durationDays = fieldFromDescription(description, ["Duração", "DuraÃ§Ã£o"]);
    const latestFocus = fieldFromDescription(description, ["Último foco", "Ãltimo foco"]);

    return {
      type: "Feature" as const,
      id: `inpe-${mode}-${eventId}`,
      geometry,
      properties: {
        id_evento: Number(eventId),
        name,
        tipo: eventType,
        municipio: city,
        estado: state,
        data_inicio: startedAt,
        data_fim: endedAt,
        duracao_dias: numberFromText(durationDays),
        dt_maxima: isoDateTime(latestFocus),
        mode,
        source: "INPE Eventos de Fogo / Dados Abertos KML",
      },
    };
  });

  return events.filter((event): event is FireEvent => Boolean(event));
}

async function fetchKml(url: string, mode: "active" | "observation") {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.google-earth.kml+xml,application/xml,text/xml,*/*", "User-Agent": "SentinelaRS/1.0" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`INPE Eventos de Fogo ${mode} HTTP ${response.status}`);

  const text = await response.text();
  return {
    mode,
    url,
    records: parseKmlEvents(text, mode),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return jsonResponse({ ok: false, error: "Method not allowed" }, 405, "no-store");

  try {
    const [active, observation] = await Promise.all([
      fetchKml(INPE_FIRE_EVENTS_ACTIVE_KML_URL, "active"),
      fetchKml(INPE_FIRE_EVENTS_OBSERVATION_KML_URL, "observation"),
    ]);
    const records = [...active.records, ...observation.records]
      .sort((a, b) => new Date(String(b.properties.dt_maxima || 0)).getTime() - new Date(String(a.properties.dt_maxima || 0)).getTime());
    const latest = records[0]?.properties?.dt_maxima || null;

    return jsonResponse({
      ok: true,
      source: "INPE Eventos de Fogo / Dados Abertos KML",
      mode: "active_and_observation_kml_rs",
      fetched_at: new Date().toISOString(),
      count: records.length,
      active_count: active.records.length,
      observation_count: observation.records.length,
      latest,
      records,
      active_records: active.records,
      observation_records: observation.records,
      files: [
        { mode: active.mode, sourceUrl: active.url, count_rs: active.records.length },
        { mode: observation.mode, sourceUrl: observation.url, count_rs: observation.records.length },
      ],
      source_url: "https://data.inpe.br/queimadas/dados-abertos/",
      operational_use: "Eventos de Fogo agregados a partir de focos ativos. Produto provisorio em validacao, util para qualificar foco pontual isolado.",
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      source: "INPE Eventos de Fogo / Dados Abertos KML",
      error: publicErrorMessage(error),
      records: [],
      count: 0,
      fetched_at: new Date().toISOString(),
    }, 200, "no-store");
  }
});
