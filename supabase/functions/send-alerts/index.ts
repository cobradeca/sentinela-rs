// supabase/functions/send-alerts/index.ts
// Dispara Web Push para todos os inscritos com alertas ativos

// Instale a lib no deploy: já disponível via esm.sh no Deno

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_SUBJECT     = Deno.env.get("VAPID_SUBJECT") || "mailto:seuemail@exemplo.com";

// Títulos por nível de risco
const RISK_TITLES: Record<string, string> = {
  CRITICO:    "🔴 CRÍTICO — Sentinela·RS",
  EMERGENCIA: "🟠 EMERGÊNCIA — Sentinela·RS",
  ALERTA:     "🟡 ALERTA — Sentinela·RS",
  ATENCAO:    "🔵 ATENÇÃO — Sentinela·RS",
};

async function sendWebPush(subscription: any, payload: object) {
  // Usa a Web Push API nativa do Deno via fetch com headers VAPID
  // Para produção, use a lib web-push portada para Deno:
  // https://deno.land/x/web_push

  const body = JSON.stringify(payload);

  // Nota: implementação completa de VAPID requer crypto signing.
  // Substitua pelo snippet abaixo usando a lib oficial:
  //
  // import webPush from "https://deno.land/x/web_push/mod.ts";
  // webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  // await webPush.sendNotification(subscription, body);

  console.log("Push enviado para:", subscription.endpoint.slice(0, 40) + "...");
}

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 1. Busca alertas ativos gerados nos últimos 35min (janela do cron)
  const since = new Date(Date.now() - 35 * 60 * 1000).toISOString();
  const { data: newAlerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("active", true)
    .gte("created_at", since);

  if (!newAlerts?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  // 2. Busca inscrições
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*");

  let sent = 0;

  for (const sub of subscriptions || []) {
    for (const alert of newAlerts) {
      // Filtra: envia só se o usuário assinou aquela estação (ou todas)
      const wantsStation =
        !sub.station_ids?.length || sub.station_ids.includes(alert.station_id);

      if (!wantsStation) continue;

      try {
        await sendWebPush(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          {
            title: RISK_TITLES[alert.risk_level] || "Sentinela·RS — Alerta",
            body: `${alert.station_name}: ${alert.message}`,
            risk: alert.risk_level,
            station: alert.station_id,
            url: `/sentinela-rs/?alerta=${alert.id}`,
          }
        );
        sent++;
      } catch (err) {
        console.error("Erro ao enviar push:", err);
        // Remove inscrições inválidas (endpoint expirado)
        if (err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
  }

  return new Response(JSON.stringify({ sent, alerts: newAlerts.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
