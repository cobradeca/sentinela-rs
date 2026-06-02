const CACHE_NAME = "sentinela-rs-v20260602-1";
const APP_BASE = "/sentinela-rs/";

const APP_SHELL = [
  APP_BASE,
  APP_BASE + "index.html",
  APP_BASE + "manifest.json",
  APP_BASE + "icons/icon-192.png",
  APP_BASE + "icons/icon-512.png",
  APP_BASE + "icons/maskable-192.png",
  APP_BASE + "icons/maskable-512.png",
  APP_BASE + "icons/apple-touch-icon.png"
];

const API_HOSTS = new Set([
  "api.open-meteo.com",
  "apiprevmet3.inmet.gov.br",
  "rapidmapping.emergency.copernicus.eu",
  "riskandrecovery.emergency.copernicus.eu",
  "ykaaxrzkfeaxatrnkkxj.supabase.co"
]);

const STATIC_EXTENSIONS = [
  ".css",
  ".js",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".ico",
  ".json",
  ".woff",
  ".woff2"
];

function isStaticRequest(request, url) {
  return (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.includes("/assets/") ||
    STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))
  );
}

function isApiRequest(request, url) {
  return (
    request.destination === "" &&
    (
      API_HOSTS.has(url.hostname) ||
      url.pathname.includes("/functions/v1/")
    )
  );
}

async function putCache(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch {
    // Algumas respostas CORS ou requests no-store podem rejeitar Cache.put().
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await putCache(request, response);
  }

  return response;
}

async function networkFirst(request, fallbackRequest = request) {
  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") {
      await putCache(fallbackRequest, response);
    }
    return response;
  } catch {
    const cached = await caches.match(fallbackRequest);
    if (cached) return cached;
    throw new Error("Sem rede e sem cache disponivel");
  }
}

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

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, APP_BASE + "index.html").catch(() => caches.match(APP_BASE + "index.html"))
    );
    return;
  }

  if (isApiRequest(request, url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith(APP_BASE) && isStaticRequest(request, url)) {
    event.respondWith(cacheFirst(request));
  }
});
