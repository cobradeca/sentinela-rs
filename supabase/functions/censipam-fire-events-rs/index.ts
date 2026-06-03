const CENSIPAM_FILTER_URL = "https://panorama.sipam.gov.br/painel-do-fogo/backend/classes/dados_abertos_download.php";
const CENSIPAM_WFS_URL = "https://panorama.sipam.gov.br/geoserver/ows/";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type GeoJsonFeature = {
  type: "Feature";
  id?: string;
  geometry: Record<string, unknown> | null;
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

async function fetchRsEventIds() {
  const response = await fetch(CENSIPAM_FILTER_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "SentinelaRS/1.0",
    },
    body: JSON.stringify({ ufs: "RS", municipios: [] }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) throw new Error(`CENSIPAM filtro HTTP ${response.status}`);

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => Number(item?.id_evento))
    .filter((id) => Number.isInteger(id) && id > 0);
}

async function fetchEventsGeoJson(ids: number[]) {
  if (ids.length === 0) return [];

  const params = new URLSearchParams({
    service: "WFS",
    version: "1.0.0",
    request: "GetFeature",
    typeName: "tb_evento_filtro_download",
    outputFormat: "application/json",
    CQL_FILTER: `id_evento IN (${ids.join(",")})`,
  });

  const response = await fetch(`${CENSIPAM_WFS_URL}?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "SentinelaRS/1.0" },
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) throw new Error(`CENSIPAM WFS HTTP ${response.status}`);

  const data = await response.json();
  return Array.isArray(data?.features) ? data.features as GeoJsonFeature[] : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return jsonResponse({ ok: false, error: "Method not allowed" }, 405, "no-store");

  try {
    const ids = await fetchRsEventIds();
    const features = await fetchEventsGeoJson(ids);
    const recentThreshold = Date.now() - 48 * 60 * 60 * 1000;
    const activeFeatures = features.filter((feature) => {
      const latestDetection = new Date(String(feature?.properties?.dt_maxima || "")).getTime();
      return Number.isFinite(latestDetection) && latestDetection >= recentThreshold;
    });
    const latest = features
      .map((feature) => String(feature?.properties?.dt_maxima || ""))
      .filter(Boolean)
      .sort()
      .at(-1) || null;

    return jsonResponse({
      ok: true,
      source: "CENSIPAM Painel do Fogo / Dados Abertos GeoJSON",
      mode: "current_month_rs_geojson",
      fetched_at: new Date().toISOString(),
      count: features.length,
      active_count_48h: activeFeatures.length,
      latest,
      records: features,
      active_records_48h: activeFeatures,
      source_url: "https://panorama.sipam.gov.br/painel-do-fogo/download_dados_abertos.html",
      operational_use: "Eventos de Fogo consolidados em poligonos. Complementam focos pontuais do INPE.",
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      source: "CENSIPAM Painel do Fogo / Dados Abertos GeoJSON",
      error: error instanceof Error ? error.message : "Fonte CENSIPAM indisponivel",
      records: [],
      count: 0,
      fetched_at: new Date().toISOString(),
    }, 200, "no-store");
  }
});
