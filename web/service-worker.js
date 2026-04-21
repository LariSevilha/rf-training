const CACHE_NAME = "rf-fitness-v4";

const APP_SHELL = [
  "/manifest.webmanifest",
  "/pages/index.html",
  "/pages/aluno.html",
  "/assets/css/main.css",
  "/assets/js/aluno.js",
  "/img/logoapp-192.png",
  "/img/logoapp-maskable-192.png",
  "/img/logoapp-512.png",
  "/img/logoapp-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await Promise.allSettled(
      APP_SHELL.map(async (url) => {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) throw new Error(`Falha ao baixar ${url}`);
        await cache.put(url, res.clone());
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  // Navegação de páginas
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      } catch (err) {
        return (
          (await caches.match(request)) ||
          (await caches.match("/pages/aluno.html")) ||
          (await caches.match("/pages/index.html"))
        );
      }
    })());
    return;
  }

  // Assets estáticos
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (err) {
      return caches.match(request);
    }
  })());
});