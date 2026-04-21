const VERSION = "rf-fitness-v8";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/pages/index.html",
  "/pages/aluno.html",
  "/assets/css/main.css",
  "/assets/js/aluno.js",
  "/img/logoapp-192.png",
  "/img/logoapp-512.png",
  "/img/logoapp-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
        .map((key) => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // não cachear API
  if (url.pathname.startsWith("/api")) return;

  // não cachear Google Drive / PDFs externos
  if (
    url.hostname.includes("drive.google.com") ||
    url.hostname.includes("googleusercontent.com")
  ) {
    return;
  }

  // páginas HTML: network first
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, fresh.clone());
        return fresh;
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

  // estáticos: cache first
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const fresh = await fetch(request);

      if (fresh && fresh.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, fresh.clone());
      }

      return fresh;
    } catch {
      return caches.match(request);
    }
  })());
});