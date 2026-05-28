const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function normalizeInmetForecast(raw: any, ibgeCode: string) {
  const cityBlock = raw?.[ibgeCode];
  if (!cityBlock || typeof cityBlock !== "object") return null;

  const todayKey = Object.keys(cityBlock)[0];
  if (!todayKey) return null;

  const dayData = cityBlock[todayKey];
  const period = dayData?.manha || dayData?.tarde || dayData?.noite || Object.values(dayData || {})[0];

  if (!period || typeof period !== "object") return null;

  return {
    source: "INMET",
    official: true,
    ibgeCode,
    date: todayKey,
    city: period.entidade || "",
    resumo: period.resumo || "",
    tempMax: period.temp_max ?? null,
    tempMin: period.temp_min ?? null,
    windDirection: period.dir_vento || "",
    windIntensity: period.int_vento || "",
    humidityMax: period.umidade_max ?? null,
    humidityMin: period.umidade_min ?? null,
    weekday: period.dia_semana || "",
  };
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
  const codigoIbge = url.searchParams.get("codigo_ibge") || url.searchParams.get("ibge");

  if (!codigoIbge) {
    return new Response(JSON.stringify({
      ok: false,
      status: "MISSING_CODIGO_IBGE",
      source: "INMET",
      error: "Parâmetro obrigatório: codigo_ibge",
      fetched_at: new Date().toISOString(),
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  try {
    const endpoint = `https://apiprevmet3.inmet.gov.br/previsao/${encodeURIComponent(codigoIbge)}`;
    const res = await fetch(endpoint, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Sentinela-RS/2.2",
      },
      signal: AbortSignal.timeout(15000),
    });

    const text = await res.text();

    if (!res.ok) {
      return new Response(JSON.stringify({
        ok: false,
        status: "INMET_HTTP_ERROR",
        source: "INMET",
        http_status: res.status,
        error: text.slice(0, 500),
        fetched_at: new Date().toISOString(),
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
      });
    }

    let raw: any;
    try {
      raw = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({
        ok: false,
        status: "INVALID_JSON",
        source: "INMET",
        error: text.slice(0, 500),
        fetched_at: new Date().toISOString(),
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const latest = normalizeInmetForecast(raw, codigoIbge);

    return new Response(JSON.stringify({
      ok: Boolean(latest),
      status: latest ? "OK" : "NO_VALID_FORECAST",
      source: "INMET",
      mode: "official_forecast_proxy",
      codigo_ibge: codigoIbge,
      latest,
      fetched_at: new Date().toISOString(),
      note: "Proxy Supabase para evitar falha/CORS no navegador. Sem simulação e sem fallback sintético.",
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      status: "ERROR",
      source: "INMET",
      error: error instanceof Error ? error.message : "Unknown error",
      fetched_at: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
