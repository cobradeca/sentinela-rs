const CACHE_NAME = "sentinela-rs-v20260530-3";
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
      fetch(request, { cache: "no-store" }).catch(() => caches.match(APP_BASE + "index.html"))
    );
    return;
  }

  if (url.pathname.includes("/assets/") || url.pathname.endsWith("index.html")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
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
