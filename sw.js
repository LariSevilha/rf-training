const CACHE = "rfapp-v5";

const ASSETS = [
  "/manifest.webmanifest",

  "/assets/css/styles.css",
  "/assets/js/aluno.js",

  "/img/logoapp.png",
  "/img/logoapp-192.png",
  "/img/logoapp-512.png",
  "/img/logoapp-maskable-512.png",

  "/pages/index.html",
  "/pages/aluno.html"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Navegação (HTML): tenta rede, se falhar cai no cache
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/pages/index.html"))
    );
    return;
  }

  // Assets: cache-first
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req))
  );
});
