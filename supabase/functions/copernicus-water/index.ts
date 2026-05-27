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

// AOI inicial: Lagoa dos Patos e entorno imediato.
// Produto Sentinel-2 L2A / NDWI é sensível a nuvem.
// Para enchente com nuvem, o próximo produto deve ser Sentinel-1.
const AOIS: Record<string, { name: string; geometry: unknown }> = {
  lagoa_patos: {
    name: "Lagoa dos Patos",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-52.65, -32.35],
        [-50.75, -32.35],
        [-50.75, -30.15],
        [-52.65, -30.15],
        [-52.65, -32.35],
      ]],
    },
  },
  laranjal: {
    name: "Pelotas / Laranjal",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-52.42, -31.86],
        [-52.20, -31.86],
        [-52.20, -31.68],
        [-52.42, -31.68],
        [-52.42, -31.86],
      ]],
    },
  },
  rio_grande_barra: {
    name: "Rio Grande / Barra",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-52.22, -32.17],
        [-51.95, -32.17],
        [-51.95, -31.95],
        [-52.22, -31.95],
        [-52.22, -32.17],
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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Copernicus token failed ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text);
  if (!data?.access_token) {
    throw new Error("Copernicus token response without access_token");
  }

  return data.access_token as string;
}

function buildEvalscript() {
  return `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B03", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "water", bands: 1, sampleType: "FLOAT32" },
      { id: "ndwi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function evaluatePixel(s) {
  // SCL: 3 shadow, 8/9/10 clouds/cirrus, 11 snow/ice.
  const invalid = s.dataMask === 0 || s.SCL === 3 || s.SCL === 8 || s.SCL === 9 || s.SCL === 10 || s.SCL === 11;
  const denom = s.B03 + s.B08;
  const ndwi = denom === 0 ? 0 : (s.B03 - s.B08) / denom;
  const water = (!invalid && ndwi > 0.20) ? 1 : 0;
  return {
    water: [water],
    ndwi: [ndwi],
    dataMask: [invalid ? 0 : 1]
  };
}`;
}

async function fetchWaterStats(token: string, aoiKey: string, days: number) {
  const aoi = AOIS[aoiKey] || AOIS.lagoa_patos;
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
            maxCloudCoverage: 80,
            mosaickingOrder: "mostRecent",
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
      water: {},
      ndwi: {},
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

  if (!response.ok) {
    throw new Error(`Copernicus statistics failed ${response.status}: ${text.slice(0, 500)}`);
  }

  return {
    raw: JSON.parse(text),
    aoi,
    from,
    to,
  };
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
  const b0 = bands?.B0 || bands?.["0"] || Object.values(bands || {})[0] as any;

  return {
    mean: typeof b0?.stats?.mean === "number" ? b0.stats.mean : null,
    min: typeof b0?.stats?.min === "number" ? b0.stats.min : null,
    max: typeof b0?.stats?.max === "number" ? b0.stats.max : null,
    stDev: typeof b0?.stats?.stDev === "number" ? b0.stats.stDev : null,
    sampleCount: typeof b0?.stats?.sampleCount === "number" ? b0.stats.sampleCount : null,
    noDataCount: typeof b0?.stats?.noDataCount === "number" ? b0.stats.noDataCount : null,
  };
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

  const url = new URL(req.url);
  const aoiKey = url.searchParams.get("aoi") || "lagoa_patos";
  const days = Math.min(90, Math.max(5, Number(url.searchParams.get("days") || 30)));

  try {
    const token = await getAccessToken();
    const { raw, aoi, from, to } = await fetchWaterStats(token, aoiKey, days);
    const latest = extractLatestInterval(raw);

    if (!latest) {
      return new Response(JSON.stringify({
        ok: false,
        status: "NO_VALID_INTERVAL",
        source: "Copernicus Data Space / Sentinel Hub Statistical API",
        product: "Sentinel-2 L2A NDWI water indicator",
        aoi: aoi.name,
        aoi_key: aoiKey,
        from,
        to,
        error: "Nenhum intervalo estatístico válido retornado.",
        fetched_at: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const waterStats = readStats(latest, "water");
    const ndwiStats = readStats(latest, "ndwi");
    const valid = waterStats.sampleCount && waterStats.sampleCount > 0;
    const noData = waterStats.noDataCount || 0;
    const total = (waterStats.sampleCount || 0) + noData;
    const validCoverage = total > 0 ? waterStats.sampleCount! / total : null;

    return new Response(JSON.stringify({
      ok: Boolean(valid),
      status: valid ? "OK" : "NO_VALID_PIXELS",
      source: "Copernicus Data Space / Sentinel Hub Statistical API",
      product: "Sentinel-2 L2A NDWI water indicator",
      use: "contexto hidrológico por sensoriamento remoto; não substitui Defesa Civil, CEMADEN, RADAR Lagoa ou HidroSens",
      aoi: aoi.name,
      aoi_key: aoiKey,
      period: latest.interval || { from, to },
      water_fraction: waterStats.mean,
      water_percent: typeof waterStats.mean === "number" ? Number((waterStats.mean * 100).toFixed(1)) : null,
      ndwi_mean: ndwiStats.mean,
      ndwi_min: ndwiStats.min,
      ndwi_max: ndwiStats.max,
      valid_coverage: validCoverage,
      valid_coverage_percent: typeof validCoverage === "number" ? Number((validCoverage * 100).toFixed(1)) : null,
      sample_count: waterStats.sampleCount,
      no_data_count: waterStats.noDataCount,
      threshold: "water = NDWI > 0.20 with Sentinel-2 SCL cloud/shadow/snow mask",
      limitation: "Sentinel-2 é óptico e depende de baixa nebulosidade. Para alagamento sob nuvens, usar Sentinel-1 no próximo bloco.",
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
      product: "Sentinel-2 L2A NDWI water indicator",
      error: error instanceof Error ? error.message : "Unknown error",
      fetched_at: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
