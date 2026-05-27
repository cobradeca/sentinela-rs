const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const TOKEN_URL =
  Deno.env.get("COPERNICUS_TOKEN_URL") ||
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

const STATS_URL =
  Deno.env.get("COPERNICUS_STATISTICS_URL") ||
  "https://sh.dataspace.copernicus.eu/api/v1/statistics";

const CLIENT_ID = Deno.env.get("COPERNICUS_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("COPERNICUS_CLIENT_SECRET");

// AOI inicial terrestre para NDVI: entorno oeste/sul da Lagoa dos Patos.
// Evita usar a Lagoa inteira porque NDVI sobre água distorce o indicador.
const AOIS: Record<string, { name: string; geometry: unknown }> = {
  entorno_lagoa_patos: {
    name: "Entorno terrestre da Lagoa dos Patos",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-53.20, -32.25],
        [-52.10, -32.25],
        [-52.10, -30.20],
        [-53.20, -30.20],
        [-53.20, -32.25],
      ]],
    },
  },
  pelotas_campanha: {
    name: "Pelotas / campanha e entorno rural",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-52.80, -31.95],
        [-52.25, -31.95],
        [-52.25, -31.35],
        [-52.80, -31.35],
        [-52.80, -31.95],
      ]],
    },
  },
  serra: {
    name: "Serra Gaúcha / Caxias do Sul",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-51.45, -29.35],
        [-50.85, -29.35],
        [-50.85, -28.80],
        [-51.45, -28.80],
        [-51.45, -29.35],
      ]],
    },
  },
};

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing COPERNICUS_CLIENT_ID or COPERNICUS_CLIENT_SECRET");
  }

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", CLIENT_ID);
  body.set("client_secret", CLIENT_SECRET);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body,
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Copernicus token failed ${response.status}: ${text.slice(0, 300)}`);

  const data = JSON.parse(text);
  if (!data?.access_token) throw new Error("Copernicus token response without access_token");
  return data.access_token as string;
}

function buildEvalscript() {
  return `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "vegetation", bands: 1, sampleType: "FLOAT32" },
      { id: "low_vegetation", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function evaluatePixel(s) {
  // Máscara de nuvem/sombra/neve e pixels inválidos.
  const invalid = s.dataMask === 0 || s.SCL === 3 || s.SCL === 8 || s.SCL === 9 || s.SCL === 10 || s.SCL === 11;
  const denom = s.B08 + s.B04;
  const ndvi = denom === 0 ? 0 : (s.B08 - s.B04) / denom;

  // Indicadores simples, não alertas:
  // vegetação saudável aproximada: NDVI >= 0.45
  // vegetação baixa/estressada aproximada: 0.15 <= NDVI < 0.35
  const vegetation = (!invalid && ndvi >= 0.45) ? 1 : 0;
  const lowVegetation = (!invalid && ndvi >= 0.15 && ndvi < 0.35) ? 1 : 0;

  return {
    ndvi: [invalid ? 0 : ndvi],
    vegetation: [vegetation],
    low_vegetation: [lowVegetation],
    dataMask: [invalid ? 0 : 1]
  };
}`;
}

async function fetchNdviStats(token: string, aoiKey: string, days: number) {
  const aoi = AOIS[aoiKey] || AOIS.entorno_lagoa_patos;
  const from = isoDaysAgo(days);
  const to = new Date().toISOString();

  const body = {
    input: {
      bounds: {
        geometry: aoi.geometry,
        properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: { from, to },
            maxCloudCoverage: 85,
            mosaickingOrder: "leastCC",
          },
        },
      ],
    },
    aggregation: {
      timeRange: { from, to },
      aggregationInterval: { of: "P10D" },
      width: 512,
      height: 512,
      evalscript: buildEvalscript(),
    },
    calculations: {
      ndvi: {},
      vegetation: {},
      low_vegetation: {},
    },
  };

  const response = await fetch(STATS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Copernicus NDVI statistics failed ${response.status}: ${text.slice(0, 700)}`);

  return { raw: JSON.parse(text), aoi, from, to };
}

function extractLatestInterval(raw: any) {
  const intervals = Array.isArray(raw?.data) ? raw.data : [];
  const sorted = intervals
    .filter((item) => item?.outputs)
    .sort((a, b) => String(b?.interval?.to || "").localeCompare(String(a?.interval?.to || "")));
  return sorted[0] || null;
}

function readStats(interval: any, outputId: string) {
  const bands = interval?.outputs?.[outputId]?.bands;
  const first = bands?.B0 || bands?.["0"] || Object.values(bands || {})[0] as any;
  const stats = first?.stats || {};
  return {
    mean: typeof stats.mean === "number" ? stats.mean : null,
    min: typeof stats.min === "number" ? stats.min : null,
    max: typeof stats.max === "number" ? stats.max : null,
    stDev: typeof stats.stDev === "number" ? stats.stDev : null,
    sampleCount: typeof stats.sampleCount === "number" ? stats.sampleCount : null,
    noDataCount: typeof stats.noDataCount === "number" ? stats.noDataCount : null,
  };
}

function statusFromNdvi(ndviMean: number | null, validCoverage: number | null) {
  if (validCoverage === null || validCoverage < 0.25) return "BAIXA_COBERTURA";
  if (ndviMean === null) return "SEM_INDICADOR";
  if (ndviMean < 0.25) return "VEGETACAO_BAIXA";
  if (ndviMean < 0.40) return "VEGETACAO_MODERADA";
  return "OK";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const url = new URL(req.url);
  const aoiKey = url.searchParams.get("aoi") || "entorno_lagoa_patos";
  const days = Math.min(90, Math.max(10, Number(url.searchParams.get("days") || 30)));

  try {
    const token = await getAccessToken();
    const { raw, aoi, from, to } = await fetchNdviStats(token, aoiKey, days);
    const latest = extractLatestInterval(raw);

    if (!latest) {
      return new Response(JSON.stringify({
        ok: false,
        status: "NO_VALID_INTERVAL",
        source: "Copernicus Data Space / Sentinel Hub Statistical API",
        product: "Sentinel-2 L2A NDVI vegetation indicator",
        aoi: aoi.name,
        aoi_key: aoiKey,
        from,
        to,
        error: "Nenhum intervalo estatístico válido retornado.",
        fetched_at: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } });
    }

    const ndviStats = readStats(latest, "ndvi");
    const vegetationStats = readStats(latest, "vegetation");
    const lowVegetationStats = readStats(latest, "low_vegetation");

    const validSamples = ndviStats.sampleCount || 0;
    const noData = ndviStats.noDataCount || 0;
    const total = validSamples + noData;
    const validCoverage = total > 0 ? validSamples / total : null;
    const status = statusFromNdvi(ndviStats.mean, validCoverage);

    return new Response(JSON.stringify({
      ok: ["OK", "VEGETACAO_MODERADA", "VEGETACAO_BAIXA"].includes(status),
      status,
      source: "Copernicus Data Space / Sentinel Hub Statistical API",
      product: "Sentinel-2 L2A NDVI vegetation indicator",
      use: "contexto de vegetação/estiagem por satélite; não é alerta oficial e não substitui INMET, Defesa Civil ou órgãos ambientais",
      aoi: aoi.name,
      aoi_key: aoiKey,
      period: latest.interval || { from, to },
      ndvi_mean: ndviStats.mean,
      ndvi_min: ndviStats.min,
      ndvi_max: ndviStats.max,
      vegetation_fraction: vegetationStats.mean,
      vegetation_percent: typeof vegetationStats.mean === "number" ? Number((vegetationStats.mean * 100).toFixed(1)) : null,
      low_vegetation_fraction: lowVegetationStats.mean,
      low_vegetation_percent: typeof lowVegetationStats.mean === "number" ? Number((lowVegetationStats.mean * 100).toFixed(1)) : null,
      valid_coverage: validCoverage,
      valid_coverage_percent: typeof validCoverage === "number" ? Number((validCoverage * 100).toFixed(1)) : null,
      sample_count: validSamples,
      no_data_count: noData,
      method: "Sentinel-2 L2A; NDVI = (B08 - B04) / (B08 + B04); pixels com nuvem/sombra/neve mascarados por SCL",
      limitation: "NDVI é óptico e depende de baixa nebulosidade. Deve ser usado apenas como contexto de vegetação/estiagem; não gera alerta automático sozinho.",
      fetched_at: new Date().toISOString(),
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      status: "ERROR",
      source: "Copernicus Data Space / Sentinel Hub Statistical API",
      product: "Sentinel-2 L2A NDVI vegetation indicator",
      error: error instanceof Error ? error.message : "Unknown error",
      fetched_at: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
