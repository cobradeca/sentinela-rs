const INPE_DAILY_BR_URL = "https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil";
const MAX_ROWS_PER_DAY = 50000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type FireFocus = {
  id: string;
  lat: number | null;
  lon: number | null;
  datahora: string | null;
  satelite: string | null;
  municipio: string | null;
  estado: string | null;
  bioma: string | null;
  risco_fogo: number | null;
  frp: number | null;
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

function ymd(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function getDateKeys(days: number) {
  const now = new Date();
  return Array.from({ length: days }, (_, idx) => {
    const date = new Date(now.getTime() - idx * 24 * 60 * 60 * 1000);
    return ymd(date);
  });
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }

  out.push(cur.trim());
  return out;
}

function numberOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(" ", "T") + "Z";
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date.toISOString() : value.trim();
}

function toFocus(headers: string[], values: string[]): FireFocus | null {
  const row: Record<string, string> = {};
  headers.forEach((header, idx) => {
    row[header] = values[idx] ?? "";
  });

  if (row.estado !== "RIO GRANDE DO SUL") return null;

  return {
    id: row.id || `${row.data_hora_gmt}-${row.lat}-${row.lon}`,
    lat: numberOrNull(row.lat),
    lon: numberOrNull(row.lon),
    datahora: normalizeDate(row.data_hora_gmt),
    satelite: row.satelite || null,
    municipio: row.municipio || null,
    estado: row.estado || null,
    bioma: row.bioma || null,
    risco_fogo: numberOrNull(row.risco_fogo),
    frp: numberOrNull(row.frp),
  };
}

async function fetchDailyRs(dateKey: string) {
  const sourceUrl = `${INPE_DAILY_BR_URL}/focos_diario_br_${dateKey}.csv`;
  const response = await fetch(sourceUrl, {
    headers: { Accept: "text/csv,text/plain,*/*", "User-Agent": "SentinelaRS/1.0" },
    signal: AbortSignal.timeout(20000),
  });

  if (response.status === 404) {
    return { dateKey, sourceUrl, ok: false, status: response.status, records: [] as FireFocus[], error: "arquivo diario ainda indisponivel" };
  }

  if (!response.ok) {
    return { dateKey, sourceUrl, ok: false, status: response.status, records: [] as FireFocus[], error: `INPE HTTP ${response.status}` };
  }

  const text = await response.text();
  const lines = text.split(/\r?\n/).filter(Boolean).slice(0, MAX_ROWS_PER_DAY);
  const headers = parseCsvLine(lines[0] || "");
  const records = lines.slice(1)
    .map((line) => toFocus(headers, parseCsvLine(line)))
    .filter((item): item is FireFocus => Boolean(item));

  return { dateKey, sourceUrl, ok: true, status: response.status, records, error: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return jsonResponse({ ok: false, error: "Method not allowed" }, 405, "no-store");

  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") || 2), 1), 7);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 500);
  const dateKeys = getDateKeys(days);

  try {
    const daily = await Promise.all(dateKeys.map(fetchDailyRs));
    const records = daily.flatMap((day) => day.records)
      .sort((a, b) => new Date(b.datahora || 0).getTime() - new Date(a.datahora || 0).getTime());
    const byMunicipio = records.reduce<Record<string, number>>((acc, focus) => {
      const key = focus.municipio || "SEM MUNICIPIO";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const latest = records[0]?.datahora || null;

    return jsonResponse({
      ok: daily.some((day) => day.ok),
      source: "INPE BDQueimadas / Dados Abertos CSV",
      mode: "daily_csv_rs",
      fetched_at: new Date().toISOString(),
      period_days: days,
      count: records.length,
      latest,
      records: records.slice(0, limit),
      by_municipio: byMunicipio,
      files: daily.map(({ dateKey, sourceUrl, ok, status, error, records }) => ({
        dateKey,
        sourceUrl,
        ok,
        status,
        error,
        count_rs: records.length,
      })),
      operational_use: "Foco real de fogo ativo por satelite. Pode ficar vazio sem indicar falha quando nao houver foco no RS.",
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      source: "INPE BDQueimadas / Dados Abertos CSV",
      error: error instanceof Error ? error.message : "Unknown error",
      records: [],
      count: 0,
      fetched_at: new Date().toISOString(),
    }, 200, "no-store");
  }
});
