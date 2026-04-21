const CACHE_NAME = "rf-fitness-v3";

const APP_SHELL = [
  "./manifest.webmanifest",
  "./pages/index.html",
  "./pages/aluno.html",
  "./assets/css/main.css",
  "./assets/js/aluno.js",
  "./img/logoapp-192.png",
  "./img/logoapp-512.png",
  "./img/logoapp-maskable-512.png"
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

  if (request.method !== "GET") return;

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
          (await caches.match("/pages/index.html"))
        );
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});