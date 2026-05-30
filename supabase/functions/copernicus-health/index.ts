const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const DEFAULT_TOKEN_URLS = [
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
  "https://sh.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
];

async function requestToken(tokenUrl: string, clientId: string, clientSecret: string) {
  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "User-Agent": "SentinelaRS/1.0",
    },
    body,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }

  return {
    ok: res.ok && typeof json?.access_token === "string",
    status: res.status,
    tokenUrl,
    json,
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

  const clientId = Deno.env.get("COPERNICUS_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("COPERNICUS_CLIENT_SECRET") || "";
  const configuredTokenUrl = Deno.env.get("COPERNICUS_TOKEN_URL") || "";

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({
      ok: false,
      status: "NOT_CONFIGURED",
      source: "Copernicus Data Space / Sentinel Hub",
      mode: "auth_health",
      configured: false,
      missing: [
        !clientId ? "COPERNICUS_CLIENT_ID" : null,
        !clientSecret ? "COPERNICUS_CLIENT_SECRET" : null,
      ].filter(Boolean),
      fetched_at: new Date().toISOString(),
      note: "Configure os Supabase Secrets para ativar APIs reais do Copernicus. Nenhuma credencial deve ir para o App.jsx.",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const tokenUrls = configuredTokenUrl
    ? [configuredTokenUrl, ...DEFAULT_TOKEN_URLS.filter((u) => u !== configuredTokenUrl)]
    : DEFAULT_TOKEN_URLS;

  const attempts = [];

  for (const tokenUrl of tokenUrls) {
    try {
      const attempt = await requestToken(tokenUrl, clientId, clientSecret);
      attempts.push({
        ok: attempt.ok,
        status: attempt.status,
        tokenUrl: attempt.tokenUrl,
        error: attempt.ok ? null : (attempt.json?.error || attempt.json?.error_description || attempt.json?.raw || null),
      });

      if (attempt.ok) {
        const expiresIn = Number(attempt.json?.expires_in || 0);

        return new Response(JSON.stringify({
          ok: true,
          status: "AUTH_OK",
          source: "Copernicus Data Space / Sentinel Hub",
          mode: "auth_health",
          configured: true,
          tokenUrl,
          token_type: attempt.json?.token_type || "Bearer",
          expires_in: Number.isFinite(expiresIn) ? expiresIn : null,
          fetched_at: new Date().toISOString(),
          note: "Autenticação Copernicus validada. Esta função verifica apenas credenciais e token. Produtos reais devem ser validados nos endpoints específicos: copernicus-water, copernicus-sentinel1-water, copernicus-ndvi e copernicus-ems.",
          attempts,
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }
    } catch (error) {
      attempts.push({
        ok: false,
        status: null,
        tokenUrl,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return new Response(JSON.stringify({
    ok: false,
    status: "AUTH_FAILED",
    source: "Copernicus Data Space / Sentinel Hub",
    mode: "auth_health",
    configured: true,
    fetched_at: new Date().toISOString(),
    note: "Secrets encontrados, mas a autenticação falhou. Confira client_id, client_secret e token URL.",
    attempts,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
});
