// supabase/functions/send-alerts/index.ts
// Envia alertas reais pelos canais configurados. Canal sem secret fica como skipped.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPushHTTPRequest } from "npm:@pushforge/builder";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const VAPID_PRIVATE_JWK = Deno.env.get("VAPID_PRIVATE_JWK") || Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:alertas@sentinela-rs.local";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ALERT_EMAIL_TO = Deno.env.get("ALERT_EMAIL_TO");
const ALERT_EMAIL_FROM = Deno.env.get("ALERT_EMAIL_FROM") || "Sentinela RS <alertas@sentinela-rs.local>";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM = Deno.env.get("TWILIO_FROM");
const ALERT_SMS_TO = Deno.env.get("ALERT_SMS_TO");

const SIRENE_WEBHOOK_URL = Deno.env.get("SIRENE_WEBHOOK_URL");
const SIRENE_WEBHOOK_TOKEN = Deno.env.get("SIRENE_WEBHOOK_TOKEN");

const RISK_TITLES: Record<string, string> = {
  CRITICO: "CRITICO - Sentinela-RS",
  EMERGENCIA: "EMERGENCIA - Sentinela-RS",
  ALERTA: "ALERTA - Sentinela-RS",
  ATENCAO: "ATENCAO - Sentinela-RS",
};

function alertBody(alert: any) {
  return `${alert.station_name}: ${alert.message || alert.risk_level}`;
}

function isCritical(alert: any) {
  return alert.risk_level === "CRITICO" || alert.risk_level === "EMERGENCIA";
}

async function sendWebPush(subscription: any, payload: object) {
  if (!VAPID_PRIVATE_JWK) throw new Error("VAPID_PRIVATE_JWK ausente");

  const { endpoint, headers, body } = await buildPushHTTPRequest({
    privateJWK: JSON.parse(VAPID_PRIVATE_JWK),
    subscription,
    message: {
      payload,
      adminContact: VAPID_SUBJECT,
      options: { ttl: 86400, urgency: "high" },
    },
  });

  const response = await fetch(endpoint, { method: "POST", headers, body });
  if (!response.ok && response.status !== 201) {
    const text = await response.text().catch(() => "");
    const err = new Error(`push ${response.status}: ${text}`);
    (err as any).statusCode = response.status;
    throw err;
  }
}

async function sendEmail(alert: any) {
  if (!RESEND_API_KEY || !ALERT_EMAIL_TO) return "skipped";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ALERT_EMAIL_FROM,
      to: ALERT_EMAIL_TO.split(",").map((v) => v.trim()).filter(Boolean),
      subject: RISK_TITLES[alert.risk_level] || "Sentinela-RS - Alerta",
      text: alertBody(alert),
    }),
  });

  if (!response.ok) throw new Error(`resend ${response.status}: ${await response.text()}`);
  return "sent";
}

async function sendSms(alert: any) {
  if (!isCritical(alert)) return "skipped";
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM || !ALERT_SMS_TO) return "skipped";

  const body = new URLSearchParams({
    From: TWILIO_FROM,
    To: ALERT_SMS_TO,
    Body: `[Sentinela-RS] ${alertBody(alert)}`.slice(0, 1500),
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) throw new Error(`twilio ${response.status}: ${await response.text()}`);
  return "sent";
}

async function triggerSirene(alert: any) {
  if (alert.risk_level !== "CRITICO") return "skipped";
  if (!SIRENE_WEBHOOK_URL) return "skipped";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (SIRENE_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${SIRENE_WEBHOOK_TOKEN}`;

  const response = await fetch(SIRENE_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source: "sentinela-rs",
      action: "trigger",
      risk: alert.risk_level,
      station_id: alert.station_id,
      station_name: alert.station_name,
      alert_id: alert.id,
      created_at: alert.created_at,
    }),
  });

  if (!response.ok) throw new Error(`sirene ${response.status}: ${await response.text()}`);
  return "sent";
}

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const since = new Date(Date.now() - 35 * 60 * 1000).toISOString();
  const { data: newAlerts, error: alertsError } = await supabase
    .from("alerts")
    .select("*")
    .eq("active", true)
    .gte("created_at", since);

  if (alertsError) {
    return new Response(JSON.stringify({ ok: false, error: alertsError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!newAlerts?.length) {
    return new Response(JSON.stringify({ ok: true, alerts: 0, channels: {} }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: subscriptions } = await supabase.from("push_subscriptions").select("*");
  const channels = {
    push: { sent: 0, skipped: VAPID_PRIVATE_JWK ? 0 : 1, errors: 0 },
    email: { sent: 0, skipped: RESEND_API_KEY && ALERT_EMAIL_TO ? 0 : 1, errors: 0 },
    sms: { sent: 0, skipped: TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM && ALERT_SMS_TO ? 0 : 1, errors: 0 },
    sirene: { sent: 0, skipped: SIRENE_WEBHOOK_URL ? 0 : 1, errors: 0 },
  };

  for (const alert of newAlerts) {
    for (const sub of subscriptions || []) {
      const wantsStation = !sub.station_ids?.length || sub.station_ids.includes(alert.station_id);
      if (!wantsStation) continue;

      try {
        await sendWebPush(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          {
            title: RISK_TITLES[alert.risk_level] || "Sentinela-RS - Alerta",
            body: alertBody(alert),
            risk: alert.risk_level,
            station: alert.station_id,
            url: `/sentinela-rs/?alerta=${alert.id}`,
          }
        );
        channels.push.sent++;
      } catch (err) {
        channels.push.errors++;
        console.error("Erro push:", err);
        if ((err as any).statusCode === 410 || (err as any).statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    try {
      const result = await sendEmail(alert);
      result === "sent" ? channels.email.sent++ : channels.email.skipped++;
    } catch (err) {
      channels.email.errors++;
      console.error("Erro e-mail:", err);
    }

    try {
      const result = await sendSms(alert);
      result === "sent" ? channels.sms.sent++ : channels.sms.skipped++;
    } catch (err) {
      channels.sms.errors++;
      console.error("Erro SMS:", err);
    }

    try {
      const result = await triggerSirene(alert);
      result === "sent" ? channels.sirene.sent++ : channels.sirene.skipped++;
    } catch (err) {
      channels.sirene.errors++;
      console.error("Erro sirene:", err);
    }
  }

  return new Response(JSON.stringify({ ok: true, alerts: newAlerts.length, channels }), {
    headers: { "Content-Type": "application/json" },
  });
});
