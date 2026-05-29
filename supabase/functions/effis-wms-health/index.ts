const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const EFFIS_WMS_URL = "https://maps.effis.emergency.copernicus.eu/effis";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = `${EFFIS_WMS_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetCapabilities`;
    const startedAt = Date.now();
    const res = await fetch(url, {
      headers: { Accept: "application/xml,text/xml,*/*" },
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    const ok = res.ok && /WMT_MS_Capabilities|WMS_Capabilities/i.test(text);

    return new Response(JSON.stringify({
      ok,
      source: "Copernicus EFFIS WMS",
      mode: "wms_health",
      endpoint: EFFIS_WMS_URL,
      status: res.status,
      latency_ms: Date.now() - startedAt,
      operational_use: "Camada complementar de perigo/focos/area queimada. No Sentinela-RS nao dispara alerta automatico sem cruzamento espacial validado para RS.",
      coverage_note: "EFFIS e voltado a Europa, Oriente Medio e Norte da Africa; para cobertura global/Brasil, avaliar GWIS ou FIRMS como proxima integracao.",
      fetched_at: new Date().toISOString(),
    }), {
      status: ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      source: "Copernicus EFFIS WMS",
      mode: "wms_health",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      fetched_at: new Date().toISOString(),
    }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
