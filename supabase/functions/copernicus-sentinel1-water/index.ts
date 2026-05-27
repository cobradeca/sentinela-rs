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

// AOIs operacionais iniciais. Coordenadas em CRS84: [lon, lat].
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
  if (!data?.access_token) throw new Error("Copernicus token response without access_token");
  return data.access_token as string;
}

function buildEvalscript() {
  return `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["VV", "VH", "dataMask"] }],
    output: [
      { id: "water_like", bands: 1, sampleType: "FLOAT32" },
      { id: "vv_db", bands: 1, sampleType: "FLOAT32" },
      { id: "vh_db", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function toDb(x) {
  return 10 * Math.log(x) / Math.LN10;
}

function evaluatePixel(s) {
  if (s.dataMask === 0 || s.VV <= 0 || s.VH <= 0) {
    return { water_like: [0], vv_db: [0], vh_db: [0], dataMask: [0] };
  }

  var vv = toDb(s.VV);
  var vh = toDb(s.VH);

  // Indicador conservador de baixa retroespalhamento SAR compatível com água.
  // Não é máscara oficial de inundação; é contexto remoto para apoiar triagem.
  var water = (vv < -17 && vh < -24) ? 1 : 0;

  return {
    water_like: [water],
    vv_db: [vv],
    vh_db: [vh],
    dataMask: [1]
  };
}`;
}

async function fetchSentinel1Stats(token: string, aoiKey: string, days: number) {
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
          type: "sentinel-1-grd",
          dataFilter: {
            timeRange: { from, to },
            mosaickingOrder: "mostRecent",
            acquisitionMode: "IW",
            polarization: "DV",
          },
          processing: {
            backCoeff: "SIGMA0_ELLIPSOID",
            orthorectify: true,
            demInstance: "COPERNICUS_30",
            speckleFilter: {
              type: "LEE",
              windowSizeX: 3,
              windowSizeY: 3,
            },
          },
        },
      ],
    },
    aggregation: {
      timeRange: { from, to },
      aggregationInterval: { of: "P12D" },
      width: 512,
      height: 512,
      evalscript: buildEvalscript(),
    },
    calculations: {
      water_like: {},
      vv_db: {},
      vh_db: {},
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
    throw new Error(`Copernicus Sentinel-1 statistics failed ${response.status}: ${text.slice(0, 700)}`);
  }

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

function qualityLabel(validCoverage: number | null, waterLikePercent: number | null) {
  if (validCoverage === null || validCoverage < 0.25) return "BAIXA_COBERTURA";
  if (waterLikePercent === null) return "SEM_INDICADOR";
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
  const aoiKey = url.searchParams.get("aoi") || "lagoa_patos";
  const days = Math.min(60, Math.max(6, Number(url.searchParams.get("days") || 18)));

  try {
    const token = await getAccessToken();
    const { raw, aoi, from, to } = await fetchSentinel1Stats(token, aoiKey, days);
    const latest = extractLatestInterval(raw);

    if (!latest) {
      return new Response(JSON.stringify({
        ok: false,
        status: "NO_VALID_INTERVAL",
        source: "Copernicus Data Space / Sentinel Hub Statistical API",
        product: "Sentinel-1 GRD SAR water-like backscatter indicator",
        aoi: aoi.name,
        aoi_key: aoiKey,
        from,
        to,
        error: "Nenhum intervalo estatístico válido retornado.",
        fetched_at: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } });
    }

    const waterStats = readStats(latest, "water_like");
    const vvStats = readStats(latest, "vv_db");
    const vhStats = readStats(latest, "vh_db");

    const validSamples = waterStats.sampleCount || vvStats.sampleCount || 0;
    const noData = waterStats.noDataCount || 0;
    const total = validSamples + noData;
    const validCoverage = total > 0 ? validSamples / total : null;
    const waterLikePercent = typeof waterStats.mean === "number" ? Number((waterStats.mean * 100).toFixed(1)) : null;
    const status = qualityLabel(validCoverage, waterLikePercent);

    return new Response(JSON.stringify({
      ok: status === "OK",
      status,
      source: "Copernicus Data Space / Sentinel Hub Statistical API",
      product: "Sentinel-1 GRD SAR water-like backscatter indicator",
      use: "contexto hidrológico por radar SAR; útil sob nuvens/noite; não é alerta oficial nem máscara validada de inundação",
      aoi: aoi.name,
      aoi_key: aoiKey,
      period: latest.interval || { from, to },
      water_like_fraction: waterStats.mean,
      water_like_percent: waterLikePercent,
      vv_db_mean: vvStats.mean,
      vh_db_mean: vhStats.mean,
      valid_coverage: validCoverage,
      valid_coverage_percent: typeof validCoverage === "number" ? Number((validCoverage * 100).toFixed(1)) : null,
      sample_count: validSamples,
      no_data_count: noData,
      method: "Sentinel-1 GRD IW/DV; SIGMA0_ELLIPSOID; orthorectified; LEE 3x3; water-like = VV < -17 dB and VH < -24 dB",
      limitation: "Indicador SAR de baixa retroespalhamento compatível com água. Pode falhar em áreas urbanas, vegetação inundada, vento forte sobre água, sombras de relevo e superfícies muito lisas. Confirmar com Defesa Civil, CEMADEN, RADAR Lagoa, HidroSens e órgãos responsáveis.",
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
      product: "Sentinel-1 GRD SAR water-like backscatter indicator",
      error: error instanceof Error ? error.message : "Unknown error",
      fetched_at: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
