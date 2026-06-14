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

function getCheckwxKey() {
  return Deno.env.get("CHECKWX_API_KEY") || "";
}

async function fetchCheckwx(path: string, key: string) {
  const response = await fetch(`https://api.checkwx.com/v2/${path}`, {
    headers: { "X-API-Key": key, Accept: "application/json" },
  });
  if (!response.ok) return null;
  const json = await response.json().catch(() => null);
  if (!json || !Array.isArray(json.data) || !json.data.length) return null;
  return json.data[0];
}

// CheckWX retorna METAR decodificado em JSON (results.data[0]), com
// shape: { raw_text, wind: {degrees, speed_kts, gust_kts}, visibility: {meters},
// ceiling: {feet}, flight_category, observed }
function normalizeCheckwxMetar(row: any, airport: { icao: string; cidade: string }) {
  if (!row) return null;
  const visMeters = row?.visibility?.meters ?? row?.visibility?.meters_float ?? null;
  const visKm = typeof visMeters === "number" ? Math.round((visMeters / 1000) * 10) / 10 : null;
  const tetoFt = typeof row?.ceiling?.feet === "number" ? row.ceiling.feet : null;

  return {
    ok: true,
    icao: airport.icao,
    cidade: airport.cidade,
    ventoDir: typeof row?.wind?.degrees === "number" ? row.wind.degrees : null,
    ventoKt: typeof row?.wind?.speed_kts === "number" ? row.wind.speed_kts : null,
    rajadaKt: typeof row?.wind?.gust_kts === "number" && row.wind.gust_kts > 0 ? row.wind.gust_kts : null,
    visKm,
    tetoFt,
    class: row?.flight_category || classifyFromWeather(visKm, tetoFt),
    obs: Array.isArray(row?.conditions) && row.conditions.length
      ? row.conditions.map((c: any) => c?.text).filter(Boolean).join(", ")
      : "METAR",
    raw: row?.raw_text || null,
    reportTime: row?.observed || null,
    receiptTime: null,
  };
}

function normalizeCheckwxTaf(row: any) {
  if (!row) return null;
  const forecast = Array.isArray(row?.forecast) && row.forecast.length ? row.forecast[0] : null;
  const visMeters = forecast?.visibility?.meters ?? null;
  const visKm = typeof visMeters === "number" ? Math.round((visMeters / 1000) * 10) / 10 : null;
  const tetoFt = typeof forecast?.ceiling?.feet === "number" ? forecast.ceiling.feet : null;

  return {
    timeFrom: row?.timestamp?.from || null,
    timeTo: row?.timestamp?.to || null,
    change: forecast?.change?.indicator?.code || null,
    probability: forecast?.change?.probability || null,
    ventoDir: typeof forecast?.wind?.degrees === "number" ? forecast.wind.degrees : null,
    ventoKt: typeof forecast?.wind?.speed_kts === "number" ? forecast.wind.speed_kts : null,
    rajadaKt: typeof forecast?.wind?.gust_kts === "number" && forecast.wind.gust_kts > 0 ? forecast.wind.gust_kts : null,
    visKm,
    tetoFt,
    class: classifyFromWeather(visKm, tetoFt),
    obs: null,
    raw: row?.raw_text || null,
    issueTime: row?.timestamp?.issued || null,
  };
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
  let normalizedMetar = metarRow ? normalizeMetar(metarRow, airport) : null;
  let normalizedTaf = tafRow ? normalizeTafForecast((tafRow.fcsts || []).find((fcst: any) => !fcst.fcstChange) || tafRow.fcsts?.[0]) : null;
  let tafSummary = buildTafSummary(tafRow);
  let rawTaf = tafRow?.rawTAF || null;
  let tafIssueTime = tafRow?.issueTime || null;
  let metarSource = normalizedMetar ? "Aviation Weather Center / NOAA" : null;
  let tafSource = normalizedTaf ? "Aviation Weather Center / NOAA" : null;

  // Complemento: CheckWX preenche METAR e/ou TAF quando o AWC não retorna
  // leitura recente para o aeródromo (comum em SBPK/SBRG).
  const checkwxKey = getCheckwxKey();
  if (checkwxKey && (!normalizedMetar || !normalizedTaf)) {
    const [checkwxMetar, checkwxTaf] = await Promise.all([
      !normalizedMetar ? fetchCheckwx(`metar/${airport.icao}/decoded`, checkwxKey) : Promise.resolve(null),
      !normalizedTaf ? fetchCheckwx(`taf/${airport.icao}/decoded`, checkwxKey) : Promise.resolve(null),
    ]);

    if (!normalizedMetar && checkwxMetar) {
      normalizedMetar = normalizeCheckwxMetar(checkwxMetar, airport);
      metarSource = "CheckWX (complementar)";
    }
    if (!normalizedTaf && checkwxTaf) {
      normalizedTaf = normalizeCheckwxTaf(checkwxTaf);
      tafSummary = tafSummary || buildTafSummary({ fcsts: checkwxTaf?.forecast ? [checkwxTaf.forecast[0]] : [] }) || "TAF disponível (CheckWX)";
      rawTaf = rawTaf || checkwxTaf?.raw_text || null;
      tafIssueTime = tafIssueTime || checkwxTaf?.timestamp?.issued || null;
      tafSource = "CheckWX (complementar)";
    }
  }

  return {
    ok: Boolean(normalizedMetar || normalizedTaf),
    icao: airport.icao,
    cidade: airport.cidade,
    ...(normalizedMetar || {}),
    class: normalizedMetar?.class || normalizedTaf?.class || "SEM METAR",
    obs: normalizedMetar?.obs || "Sem METAR recente na AWC",
    metarSource,
    taf: normalizedTaf,
    tafSummary,
    rawTaf,
    tafIssueTime,
    tafSource,
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
      note: "METAR operacional observado (AWC/NOAA). TAF incluído como contexto de previsão curta. Quando o AWC não tem leitura recente, CheckWX é usado como complemento, sempre rotulado na origem.",
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
