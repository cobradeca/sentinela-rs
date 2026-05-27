const NOAA_ONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt";
const NOAA_SSTOI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: {
      "Accept": "text/plain,*/*",
      "User-Agent": "SentinelaRS/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(`${url} returned ${res.status}`);
  }

  return await res.text();
}

function lastNonEmptyLine(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1) || "";
}

function toNumber(value: string | undefined) {
  if (value === undefined) return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseONI(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && /^[A-Z]{3}\s+\d{4}/i.test(line));

  const line = lines.at(-1);
  if (!line) return null;

  const parts = line.split(/\s+/);
  const season = parts[0];
  const year = parts[1];
  const value = toNumber(parts.at(-1));

  if (value === null) return null;

  return {
    season,
    year,
    oni3m: value,
    raw: line,
  };
}

function parseSSTOI(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{4}\s+\d{1,2}\s+/.test(line));

  const line = lines.at(-1);
  if (!line) return null;

  const parts = line.split(/\s+/);
  const year = parts[0];
  const month = parts[1];

  // CPC sstoi.indices columns usually follow:
  // YR MON NINO1+2 SST ANOM NINO3 SST ANOM NINO4 SST ANOM NINO3.4 SST ANOM
  // Therefore NINO3.4 anomaly is the last numeric column.
  const nino34Anom = toNumber(parts.at(-1));
  const nino34Sst = toNumber(parts.at(-2));

  if (nino34Anom === null) return null;

  return {
    year,
    month,
    nino34: nino34Anom,
    nino34Sst,
    raw: line,
  };
}

function classifyPhase(nino34: number | null, oni3m: number | null) {
  const value = typeof oni3m === "number" ? oni3m : nino34;
  if (typeof value !== "number") return "UNKNOWN";
  if (value >= 0.5) return "EL_NINO";
  if (value <= -0.5) return "LA_NINA";
  return "NEUTRAL";
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
    const [oniText, sstoiText] = await Promise.all([
      fetchText(NOAA_ONI_URL),
      fetchText(NOAA_SSTOI_URL),
    ]);

    const oni = parseONI(oniText);
    const sstoi = parseSSTOI(sstoiText);

    const nino34 = sstoi?.nino34 ?? null;
    const oni3m = oni?.oni3m ?? null;
    const phase = classifyPhase(nino34, oni3m);

    return new Response(JSON.stringify({
      ok: true,
      source: "NOAA/CPC",
      mode: "observed_indices",
      source_urls: {
        oni: NOAA_ONI_URL,
        sstoi: NOAA_SSTOI_URL,
      },
      fetched_at: new Date().toISOString(),
      enso: {
        nino34,
        oni3m,
        phase,
        referenceDate: sstoi ? `${sstoi.year}-${String(sstoi.month).padStart(2, "0")}` : (oni ? `${oni.season} ${oni.year}` : null),
        referenceSource: "NOAA/CPC — índices observados atualizados",
        dynamic: true,
        observedOnly: true,
        note: "Niño 3.4 e ONI vêm de arquivos públicos NOAA/CPC. Probabilidades IRI continuam separadas até integração específica.",
        raw: {
          oni,
          sstoi,
        },
      },
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=21600, stale-while-revalidate=21600",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      source: "NOAA/CPC",
      error: error instanceof Error ? error.message : "Unknown error",
      fetched_at: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
