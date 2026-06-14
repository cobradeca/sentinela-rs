const AWC_METAR_URL = "https://aviationweather.gov/api/data/metar";
const AWC_TAF_URL = "https://aviationweather.gov/api/data/taf";

const AERODROMES = [
  { icao: "SBPA", cidade: "Porto Alegre" },
  { icao: "SBPK", cidade: "Pelotas" },
  { icao: "SBRG", cidade: "Rio Grande" },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.toUpperCase() === "VRB") return null;
  const parsed = Number(String(value || "").replace("+", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function visibilityMilesToKm(value: unknown) {
  if (value === "6+" || value === "10+" || value === "9999") return 10;
  const miles = toNumber(value);
  if (miles === null) return null;
  return Math.round(miles * 1.60934 * 10) / 10;
}

function lowestCeilingFt(clouds: unknown) {
  if (!Array.isArray(clouds)) return null;
  const ceilings = clouds
    .filter((cloud) => ["BKN", "OVC", "VV"].includes(String(cloud?.cover || "").toUpperCase()))
    .map((cloud) => toNumber(cloud?.base))
    .filter((base): base is number => typeof base === "number");
  return ceilings.length ? Math.min(...ceilings) : null;
}

function classifyFromWeather(visKm: number | null, tetoFt: number | null) {
  if (typeof visKm !== "number" || typeof tetoFt !== "number") return "SEM METAR";
  if (visKm < 1.6 || tetoFt < 500) return "LIFR";
  if (visKm < 5 || tetoFt < 1000) return "IFR";
  if (visKm < 8 || tetoFt < 3000) return "MVFR";
  return "VFR";
}

function normalizeMetar(row: any, airport: { icao: string; cidade: string }) {
  const icao = String(row?.icaoId || row?.icao || airport.icao).toUpperCase();
  const tetoFt = lowestCeilingFt(row?.clouds);
  const gust = toNumber(row?.wgst);

  return {
    ok: true,
    icao,
    cidade: airport?.cidade || row?.name || icao,
    ventoDir: row?.wdir === "VRB" ? null : toNumber(row?.wdir),
    ventoKt: toNumber(row?.wspd),
    rajadaKt: typeof gust === "number" && gust > 0 ? gust : null,
    visKm: visibilityMilesToKm(row?.visib),
    tetoFt,
    class: row?.fltCat || classifyFromWeather(visibilityMilesToKm(row?.visib), tetoFt),
    obs: row?.wxString || "METAR",
    raw: row?.rawOb || null,
    reportTime: row?.reportTime || null,
    receiptTime: row?.receiptTime || null,
  };
}

function normalizeTafForecast(fcst: any) {
  if (!fcst || typeof fcst !== "object") return null;
  const tetoFt = lowestCeilingFt(fcst?.clouds);
  const gust = toNumber(fcst?.wgst);
  const visKm = visibilityMilesToKm(fcst?.visib);

  return {
    timeFrom: fcst.timeFrom || null,
    timeTo: fcst.timeTo || null,
    change: fcst.fcstChange || null,
    probability: fcst.probability || null,
    ventoDir: fcst?.wdir === "VRB" ? null : toNumber(fcst?.wdir),
    ventoKt: toNumber(fcst?.wspd),
    rajadaKt: typeof gust === "number" && gust > 0 ? gust : null,
    visKm,
    tetoFt,
    class: classifyFromWeather(visKm, tetoFt),
    obs: fcst?.wxString || null,
  };
}

function buildTafSummary(taf: any) {
  if (!taf || !Array.isArray(taf.fcsts) || !taf.fcsts.length) return null;
  const current = taf.fcsts.find((fcst: any) => !fcst.fcstChange) || taf.fcsts[0];
  const windDir = current?.wdir == null ? "VRB" : `${current.wdir}°`;
  const wind = current?.wspd == null ? null : `${windDir} ${current.wspd} kt`;
  const vis = current?.visib == null ? null : current.visib === "6+" || current.visib === "10+" ? "10 km ou mais" : `${Math.round(Number(current.visib) * 1.60934 * 10) / 10} km`;
  const cloud = Array.isArray(current?.clouds) && current.clouds.length
    ? current.clouds
      .filter((item: any) => item?.cover)
      .map((item: any) => `${item.cover}${item.base ? ` ${item.base} ft` : ""}`)
      .join(", ")
    : null;
  const pieces = [wind, vis, cloud].filter(Boolean);
  return pieces.length ? pieces.join(" • ") : "TAF disponivel";
}

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchAirport(airport: { icao: string; cidade: string }) {
  const [metar, taf] = await Promise.all([
    fetchJson(`${AWC_METAR_URL}?ids=${airport.icao}&format=json`),
    fetchJson(`${AWC_TAF_URL}?ids=${airport.icao}&format=json`),
  ]);

  const metarRow = Array.isArray(metar) ? metar[0] : metar;
  const tafRow = Array.isArray(taf) ? taf[0] : taf;
  const normalizedMetar = metarRow ? normalizeMetar(metarRow, airport) : null;
  const normalizedTaf = tafRow ? normalizeTafForecast((tafRow.fcsts || []).find((fcst: any) => !fcst.fcstChange) || tafRow.fcsts?.[0]) : null;

  return {
    ok: Boolean(normalizedMetar || normalizedTaf),
    icao: airport.icao,
    cidade: airport.cidade,
    ...(normalizedMetar || {}),
    class: normalizedMetar?.class || normalizedTaf?.class || "SEM METAR",
    obs: normalizedMetar?.obs || "Sem METAR recente na AWC",
    taf: normalizedTaf,
    tafSummary: buildTafSummary(tafRow),
    rawTaf: tafRow?.rawTAF || null,
    tafIssueTime: tafRow?.issueTime || null,
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

  try {
    const aerodromos = await Promise.all(AERODROMES.map((airport) => fetchAirport(airport)));

    return new Response(JSON.stringify({
      ok: aerodromos.some((item) => item.ok),
      source: "Aviation Weather Center / NOAA",
      source_url: "https://aviationweather.gov/data/api/",
      fetched_at: new Date().toISOString(),
      aerodromos,
      note: "METAR operacional observado. TAF incluído como contexto de previsão curta.",
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      source: "Aviation Weather Center / NOAA",
      error: err?.message || "falha ao consultar AWC",
      fetched_at: new Date().toISOString(),
      aerodromos: AERODROMES.map((item) => ({
        ok: false,
        icao: item.icao,
        cidade: item.cidade,
        class: "INDISPONIVEL",
        obs: "Fonte indisponivel",
      })),
    }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
