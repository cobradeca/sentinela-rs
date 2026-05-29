import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

function has(name: string) {
  return Boolean(Deno.env.get(name)?.trim());
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
    },
  });
}

async function countPushSubscriptions() {
  if (!supabase) return null;
  const { count, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint", { count: "exact", head: true });

  if (error) return null;
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  const pushSubscriptions = await countPushSubscriptions();
  const vapidConfigured = has("VAPID_PRIVATE_JWK") || has("VAPID_PRIVATE_KEY");
  const resendConfigured = has("RESEND_API_KEY") && has("ALERT_EMAIL_TO");
  const twilioConfigured = has("TWILIO_ACCOUNT_SID") && has("TWILIO_AUTH_TOKEN") && has("TWILIO_FROM") && has("ALERT_SMS_TO");
  const sireneConfigured = has("SIRENE_WEBHOOK_URL");

  return jsonResponse({
    ok: true,
    source: "Sentinela-RS notification channels",
    fetched_at: new Date().toISOString(),
    channels: {
      push: {
        configured: vapidConfigured,
        subscriptions: pushSubscriptions,
        status: vapidConfigured ? "ready" : "not_configured",
        note: vapidConfigured ? "Web Push configurado no servidor." : "Configure VAPID_PRIVATE_JWK no Supabase e VITE_VAPID_PUBLIC_KEY no frontend.",
      },
      screen: {
        configured: true,
        status: "ready",
        note: "Alertas locais na tela calculados no app.",
      },
      email: {
        configured: resendConfigured,
        status: resendConfigured ? "ready" : "not_configured",
        note: resendConfigured ? "Resend configurado." : "Configure RESEND_API_KEY e ALERT_EMAIL_TO.",
      },
      defesa_civil: {
        configured: true,
        status: "ready",
        note: "RSS oficial via Edge Function defesa-civil-rs.",
      },
      sms: {
        configured: twilioConfigured,
        critical_only: true,
        status: twilioConfigured ? "ready" : "not_configured",
        note: twilioConfigured ? "Twilio configurado; uso restrito a EMERGENCIA/CRITICO." : "Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM e ALERT_SMS_TO.",
      },
      sirene: {
        configured: sireneConfigured,
        critical_only: true,
        status: sireneConfigured ? "ready" : "not_configured",
        note: sireneConfigured ? "Webhook de sirene configurado; uso restrito a CRITICO." : "Configure SIRENE_WEBHOOK_URL quando houver hardware pronto.",
      },
    },
  });
});
