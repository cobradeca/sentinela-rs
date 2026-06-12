const AWC_METAR_URL = "https://aviationweather.gov/api/data/metar";

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

function normalizeMetar(row: any) {
  const icao = String(row?.icaoId || row?.icao || "").toUpperCase();
  const aerodrome = AERODROMES.find((item) => item.icao === icao);
  const tetoFt = lowestCeilingFt(row?.clouds);
  const gust = toNumber(row?.wgst);

  return {
    ok: true,
    icao,
    cidade: aerodrome?.cidade || row?.name || icao,
    ventoDir: toNumber(row?.wdir),
    ventoKt: toNumber(row?.wspd),
    rajadaKt: typeof gust === "number" && gust > 0 ? gust : null,
    visKm: visibilityMilesToKm(row?.visib),
    tetoFt,
    class: row?.fltCat || null,
    obs: row?.wxString || "METAR",
    raw: row?.rawOb || null,
    reportTime: row?.reportTime || null,
    receiptTime: row?.receiptTime || null,
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

  const params = new URLSearchParams({
    ids: AERODROMES.map((item) => item.icao).join(","),
    format: "json",
  });

  try {
    const response = await fetch(`${AWC_METAR_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`AWC METAR HTTP ${response.status}`);
    }

    const data = await response.json();
    const rows = Array.isArray(data) ? data.map(normalizeMetar).filter((row) => row.icao) : [];
    const byIcao = new Map(rows.map((row) => [row.icao, row]));
    const aerodromos = AERODROMES.map((item) => byIcao.get(item.icao) || {
      ok: false,
      icao: item.icao,
      cidade: item.cidade,
      ventoDir: null,
      ventoKt: null,
      rajadaKt: null,
      visKm: null,
      tetoFt: null,
      class: "SEM METAR",
      obs: "Sem METAR recente na AWC",
      raw: null,
      reportTime: null,
      receiptTime: null,
    });

    return new Response(JSON.stringify({
      ok: aerodromos.some((item) => item.ok),
      source: "Aviation Weather Center / NOAA",
      source_url: "https://aviationweather.gov/data/api/",
      fetched_at: new Date().toISOString(),
      aerodromos,
      note: "METAR operacional observado. Visibilidade convertida de milhas estatutarias para km quando necessario.",
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
      error: err?.message || "falha ao consultar AWC METAR",
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
