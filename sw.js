const VERSION = "rfapp-v8";
const PRECACHE = `precache-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;

const APP_SHELL = [
  "/manifest.webmanifest",
  "/pages/index.html",
  "/pages/aluno.html",
  "/assets/css/main.css",
  "/assets/js/aluno.js",
  "/img/logoapp.png",
  "/img/logoapp-192.png",
  "/img/logoapp-512.png",
  "/img/logoapp-maskable-512.png",
  "/img/logoapp-ios-180.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PRECACHE).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map(k => {
        if (k !== PRECACHE && k !== RUNTIME) return caches.delete(k);
      })
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (new URL(req.url).origin !== location.origin) return;

  // HTML navigation → network first, fallback para cache
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/pages/aluno.html") || caches.match("/pages/index.html"))
    );
    return;
  }

  // Assets estáticos → cache first
  if (
    req.url.includes("/assets/") ||
    req.url.includes("/img/") ||
    req.destination === "style" ||
    req.destination === "script" ||
    req.destination === "image"
  ) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
    return;
  }

  // Outros → network first
  event.respondWith(fetch(req));
});