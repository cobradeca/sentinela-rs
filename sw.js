const CACHE_NAME = "sentinela-rs-v1";
const APP_BASE = "/sentinela-rs/";

const APP_SHELL = [
  APP_BASE,
  APP_BASE + "index.html",
  APP_BASE + "manifest.json",
  APP_BASE + "icons/icon-192.png",
  APP_BASE + "icons/icon-512.png",
  APP_BASE + "icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (!url.pathname.startsWith(APP_BASE)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(APP_BASE + "index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          const responseClone = response.clone();

          if (response.ok && url.origin === self.location.origin) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => cached);
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() };
  }

  const title = payload.title || "Sentinela-RS";
  const options = {
    body: payload.body || "Novo alerta operacional.",
    icon: APP_BASE + "icons/icon-192.png",
    badge: APP_BASE + "icons/icon-192.png",
    data: { url: payload.url || APP_BASE },
    tag: payload.risk ? `sentinela-${payload.risk}-${payload.station || "rs"}` : "sentinela-alerta",
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || APP_BASE;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(APP_BASE) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
