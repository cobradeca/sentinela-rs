// sentinel-rs/public/sw.js
// Service Worker — Push Notifications + Cache offline

const CACHE_NAME = "sentinel-rs-v1";
const STATIC_ASSETS = ["/sentinel-rs/", "/sentinel-rs/index.html"];

// ── Instalação: cacheia assets estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Ativação: limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: serve do cache quando offline
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── Push: recebe notificação do Supabase Edge Function
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Sentinel·RS", body: event.data.text() };
  }

  const { title, body, risk, station, url } = payload;

  const iconByRisk = {
    CRITICO: "/sentinel-rs/icon-critico.png",
    EMERGENCIA: "/sentinel-rs/icon-emergencia.png",
    ALERTA: "/sentinel-rs/icon-alerta.png",
    ATENCAO: "/sentinel-rs/icon-atencao.png",
  };

  const badgeByRisk = {
    CRITICO: "#dc2626",
    EMERGENCIA: "#ef4444",
    ALERTA: "#f97316",
    ATENCAO: "#eab308",
  };

  event.waitUntil(
    self.registration.showNotification(title || "Sentinel·RS — Alerta", {
      body: body || "Novo evento detectado no Rio Grande do Sul.",
      icon: iconByRisk[risk] || "/sentinel-rs/icon-192.png",
      badge: "/sentinel-rs/icon-192.png",
      tag: `sentinel-${station || "rs"}`,          // agrupa por estação
      renotify: true,
      requireInteraction: risk === "CRITICO" || risk === "EMERGENCIA",
      data: { url: url || "/sentinel-rs/" },
      actions: [
        { action: "ver", title: "Ver detalhes" },
        { action: "fechar", title: "Fechar" },
      ],
    })
  );
});

// ── Clique na notificação: abre o app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "fechar") return;

  const targetUrl = event.notification.data?.url || "/sentinel-rs/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes("sentinel-rs"));
      if (existing) return existing.focus();
      return clients.openWindow(targetUrl);
    })
  );
});
