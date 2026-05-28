// src/hooks/usePush.js
// Registra o Service Worker e gerencia inscrição de push notifications

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePush() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window);
    checkExistingSubscription();
  }, []);

  async function checkExistingSubscription() {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    setSubscribed(!!sub);
  }

  async function subscribe(stationIds = []) {
    setLoading(true);
    setError(null);
    try {
      if (!supported) {
        throw new Error("Este navegador não oferece Push API para PWA.");
      }
      if (!VAPID_PUBLIC_KEY) {
        throw new Error("Push ainda não configurado: defina VITE_VAPID_PUBLIC_KEY no app e VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no Supabase.");
      }
      if (Notification.permission === "denied") {
        throw new Error("Permissão bloqueada no navegador. Abra as configurações do site, permita notificações para o Sentinela-RS e recarregue a página. No iOS, adicione o PWA à tela inicial antes de autorizar.");
      }
      // 1. Registra o SW
      const reg = await navigator.serviceWorker.register("/sentinela-rs/sw.js");
      await navigator.serviceWorker.ready;

      // 2. Pede permissão
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permissão não concedida. Para receber alertas, permita notificações para este site no navegador.");
      }

      // 3. Inscreve no push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 4. Salva a inscrição no Supabase
      const { error: dbError } = await supabase.from("push_subscriptions").upsert({
        endpoint: sub.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")))),
        auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")))),
        station_ids: stationIds,       // quais estações o usuário quer monitorar
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });

      if (dbError) throw dbError;
      setSubscribed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { supported, subscribed, loading, error, subscribe, unsubscribe };
}
