const CEMADEN_BASE_URL = "https://sws.cemaden.gov.br/PED/rest";

const MONITORED_CITIES = [
  { id: "rs_porto_alegre", name: "Porto Alegre", codibge: "4314902" },
  { id: "rs_pelotas", name: "Pelotas", codibge: "4314407" },
  { id: "rs_rio_grande", name: "Rio Grande", codibge: "4315602" },
  { id: "rs_santa_maria", name: "Santa Maria", codibge: "4316907" },
  { id: "rs_caxias_sul", name: "Caxias do Sul", codibge: "4305108" },
  { id: "rs_passo_fundo", name: "Passo Fundo", codibge: "4314100" },
  { id: "rs_lajeado", name: "Lajeado", codibge: "4311403" },
  { id: "rs_canoas", name: "Canoas", codibge: "4304606" },
  { id: "rs_sao_leopoldo", name: "São Leopoldo", codibge: "4318705" },
  { id: "rs_cachoeira_sul", name: "Cachoeira do Sul", codibge: "4303004" },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function maxNumber(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!valid.length) return null;
  return Math.max(...valid);
}

function normalizeAccum(item: any, city: { id: string; name: string; codibge: string }) {
  const acc1hr = toNumber(item?.acc1hr);
  const acc3hr = toNumber(item?.acc3hr);
  const acc6hr = toNumber(item?.acc6hr);
  const acc12hr = toNumber(item?.acc12hr);
  const acc24hr = toNumber(item?.acc24hr);
  const acc48hr = toNumber(item?.acc48hr);
  const acc72hr = toNumber(item?.acc72hr);
  const acc96hr = toNumber(item?.acc96hr);
  const acc120hr = toNumber(item?.acc120hr);

  return {
    city_id: city.id,
    city: city.name,
    codibge: city.codibge,
    station_code: item?.codestacao || null,
    station_id: item?.id_estacao || null,
    measured_at: item?.datahora || null,
    acc1hr,
    acc3hr,
    acc6hr,
    acc12hr,
    acc24hr,
    acc48hr,
    acc72hr,
    acc96hr,
    acc120hr,
    max_recent: maxNumber([acc1hr, acc3hr, acc6hr, acc12hr, acc24hr]),
  };
}

function summarizeCity(city: { id: string; name: string; codibge: string }, records: any[]) {
  const normalized = records.map((item) => normalizeAccum(item, city));

  return {
    city_id: city.id,
    city: city.name,
    codibge: city.codibge,
    stations_count: normalized.length,
    max_acc1hr: maxNumber(normalized.map((r) => r.acc1hr)),
    max_acc3hr: maxNumber(normalized.map((r) => r.acc3hr)),
    max_acc6hr: maxNumber(normalized.map((r) => r.acc6hr)),
    max_acc12hr: maxNumber(normalized.map((r) => r.acc12hr)),
    max_acc24hr: maxNumber(normalized.map((r) => r.acc24hr)),
    latest_measured_at: normalized
      .map((r) => r.measured_at)
      .filter(Boolean)
      .sort()
      .at(-1) || null,
    stations: normalized,
  };
}

async function fetchAccumForCity(token: string, city: { id: string; name: string; codibge: string }) {
  const url = `${CEMADEN_BASE_URL}/pcds-acum/acumulados-recentes?codibge=${city.codibge}&formato=JSON`;

  const response = await fetch(url, {
    headers: {
      "token": token,
      "accept": "application/json",
    },
  });

  const text = await response.text();

  if (!response.ok) {
    return {
      ok: false,
      city_id: city.id,
      city: city.name,
      codibge: city.codibge,
      error: `CEMADEN returned ${response.status}`,
      raw: text.slice(0, 300),
    };
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      city_id: city.id,
      city: city.name,
      codibge: city.codibge,
      error: "Invalid JSON returned by CEMADEN",
      raw: text.slice(0, 300),
    };
  }

  if (!Array.isArray(data)) {
    return {
      ok: false,
      city_id: city.id,
      city: city.name,
      codibge: city.codibge,
      error: data?.Alerta || "Unexpected CEMADEN payload",
      raw: data,
    };
  }

  return {
    ok: true,
    ...summarizeCity(city, data),
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

  const token = Deno.env.get("CEMADEN_PED_TOKEN");

  if (!token) {
    return new Response(JSON.stringify({
      ok: false,
      source: "CEMADEN PED",
      error: "Missing CEMADEN_PED_TOKEN Supabase secret",
      cities: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  try {
    const results = await Promise.all(
      MONITORED_CITIES.map((city) => fetchAccumForCity(token, city))
    );

    return new Response(JSON.stringify({
      ok: true,
      source: "CEMADEN PED",
      mode: "recent_accumulations",
      fetched_at: new Date().toISOString(),
      count: results.filter((r) => r.ok).length,
      cities: results,
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      source: "CEMADEN PED",
      error: error instanceof Error ? error.message : "Unknown error",
      cities: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
