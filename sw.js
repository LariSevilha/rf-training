const CACHE = "rfapp-v3";  // ← mude para v3 ou v4

const ASSETS = [
  "/manifest.webmanifest",
  "/assets/css/styles.css",
  "/assets/js/aluno.js",
  "/web/img/logoapp-192.png",
  "/web/img/logoapp-512.png",
  "/web/img/logoapp-maskable-512.png",
  "/pages/aluno.html", 
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/pages/aluno.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});