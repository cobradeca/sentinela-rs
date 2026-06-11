const ANA_LEGACY_BASE_URL = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos";

const RIVER_STATIONS = [
  {
    code: "87450020",
    id: "guaiba_gasometro",
    name: "Usina do Gasômetro",
    river: "Guaíba",
    role: "aporte norte da Lagoa dos Patos",
  },
  {
    code: "87905000",
    id: "camaqua_passo_mendonca",
    name: "Passo do Mendonça",
    river: "Camaquã",
    role: "aporte oeste/centro-sul da Lagoa dos Patos",
  },
  {
    code: "86510000",
    id: "taquari_mucum",
    name: "Muçum",
    river: "Taquari",
    role: "bacia Taquari-Antas, afluente do Jacuí/Guaíba",
  },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function formatDateBR(date: Date) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() || null;
}

function parseNumber(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(",", ".").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseAnaXml(xml: string) {
  const rows: Array<{
    measured_at: string | null;
    level_cm: number | null;
    level_m: number | null;
    rain_mm: number | null;
    flow: number | null;
  }> = [];
  const re = /<DadosHidrometereologicos\b[^>]*>([\s\S]*?)<\/DadosHidrometereologicos>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(xml)) !== null) {
    const block = match[1];
    const levelCm = parseNumber(readTag(block, "Nivel"));
    rows.push({
      measured_at: parseDate(readTag(block, "DataHora")),
      level_cm: levelCm,
      level_m: typeof levelCm === "number" ? Number((levelCm / 100).toFixed(3)) : null,
      rain_mm: parseNumber(readTag(block, "Chuva")),
      flow: parseNumber(readTag(block, "Vazao")),
    });
  }

  return rows
    .filter((row) => row.measured_at && typeof row.level_cm === "number")
    .sort((a, b) => new Date(b.measured_at || 0).getTime() - new Date(a.measured_at || 0).getTime());
}

function findDelta24h(rows: ReturnType<typeof parseAnaXml>) {
  if (rows.length < 2 || !rows[0]?.measured_at || typeof rows[0]?.level_cm !== "number") return null;
  const latestAt = new Date(rows[0].measured_at).getTime();
  const targetMs = latestAt - 24 * 60 * 60 * 1000;
  let best = rows[1];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const row of rows.slice(1)) {
    if (!row.measured_at || typeof row.level_cm !== "number") continue;
    const distance = Math.abs(new Date(row.measured_at).getTime() - targetMs);
    if (distance < bestDistance) {
      best = row;
      bestDistance = distance;
    }
  }

  if (!best || typeof best.level_cm !== "number") return null;
  return Number((rows[0].level_cm - best.level_cm).toFixed(1));
}

async function fetchStation(station: typeof RIVER_STATIONS[number], startDate: string, endDate: string) {
  const params = new URLSearchParams({
    codEstacao: station.code,
    dataInicio: startDate,
    dataFim: endDate,
  });

  try {
    const response = await fetch(`${ANA_LEGACY_BASE_URL}?${params.toString()}`, {
      headers: {
        Accept: "application/xml,text/xml,*/*",
        "User-Agent": "SentinelaRS/1.0",
      },
    });
    const text = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        ...station,
        error: `ANA Telemetria returned ${response.status}`,
        raw: text.slice(0, 300),
      };
    }

    const rows = parseAnaXml(text);
    const latest = rows[0] || null;

    if (!latest || typeof latest.level_cm !== "number") {
      return {
        ok: false,
        ...station,
        error: "sem leitura de nível no período consultado",
        rows_count: rows.length,
      };
    }

    return {
      ok: true,
      ...station,
      level_cm: latest.level_cm,
      level_m: latest.level_m,
      rain_mm: latest.rain_mm,
      flow: latest.flow,
      measured_at: latest.measured_at,
      delta_24h_cm: findDelta24h(rows),
      rows_count: rows.length,
      unit: "cm",
    };
  } catch (error) {
    return {
      ok: false,
      ...station,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const end = new Date();
  const start = new Date(end.getTime() - 2 * 24 * 60 * 60 * 1000);
  const startDate = formatDateBR(start);
  const endDate = formatDateBR(end);

  try {
    const stations = await Promise.all(RIVER_STATIONS.map((station) => fetchStation(station, startDate, endDate)));
    const valid = stations.filter((station) => station.ok);

    return new Response(JSON.stringify({
      ok: valid.length > 0,
      source: "ANA Telemetria legado",
      source_url: "https://telemetriaws1.ana.gov.br/ServiceANA.asmx",
      mode: "river_level_context",
      note: "Uso restrito a nível de rios contribuintes. Consulta sempre com período explícito; HTTP 200 sem linha de leitura não é tratado como dado válido.",
      fetched_at: new Date().toISOString(),
      range: { start: startDate, end: endDate },
      count: valid.length,
      stations,
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=900, stale-while-revalidate=900",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      source: "ANA Telemetria legado",
      error: error instanceof Error ? error.message : "Unknown error",
      stations: [],
      fetched_at: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
