const CACHE_NAME = "rf-fitness-v4";

const APP_SHELL = [
  "/manifest.webmanifest",
  "/pages/index.html",
  "/pages/aluno.html",
  "/assets/css/main.css",
  "/assets/js/aluno.js",
  "/assets/js/index.js",
  "/img/logoapp-192.png",
  "/img/logoapp-512.png",
  "/img/logoapp-maskable-512.png",
  "/img/logoapp-ios-180.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    for (const url of APP_SHELL) {
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (res.ok) {
          await cache.put(url, res.clone());
        }
      } catch (err) {
        console.warn("Falha no preload:", url, err);
      }
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // ignora chrome-extension, data:, blob:, etc.
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
        return response;
      } catch {
        return (
          (await caches.match(request)) ||
          (await caches.match("/pages/aluno.html")) ||
          (await caches.match("/pages/index.html"))
        );
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);

      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    } catch {
      return caches.match(request);
    }
  })());
});