const CACHE = "rfapp-v1";
const ASSETS = [
  "/manifest.webmanifest",
  "/assets/css/styles.css",
  "/assets/js/aluno.js",
  "/assets/img/logoapp.png",
  "/pages/aluno.html"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Navegação: tenta rede, cai pro cache
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/pages/aluno.html"))
    );
    return;
  }

  // Assets: cache-first
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req))
  );
});
