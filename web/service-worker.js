const VERSION = "rf-fitness-v2026-07-03-ios-internal-pdf-v17";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",

  "/pages/index.html",
  "/pages/aluno.html",
  "/pages/politica-privacidade.html",

  "/assets/css/main.css",
  "/assets/css/aluno-clean.css",
  "/assets/js/aluno.js",
  "/assets/js/aluno/parts/00-service-worker-elements-state.js",
  "/assets/js/aluno/parts/01-tabs-menu-documents-overlay.js",
  "/assets/js/aluno/parts/02-install-flow.js",
  "/assets/js/aluno/parts/03-workouts-history.js",
  "/assets/js/aluno/parts/04-sync-and-init.js",
  "/assets/js/api.js",
  "/assets/js/guard.js",
  "/assets/js/state.js",
  "/assets/js/ios-pdf-fix.js",
  "/assets/js/pdf.js",

  "/img/logoapp-192.png",
  "/img/logoapp-512.png",
  "/img/logoapp-maskable-512.png",
  "/img/logoapp-ios-180.png",
  "/img/logoapp.png",
  "/img/logo-consultoria.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      await Promise.allSettled(
        APP_SHELL.map((url) => cache.add(url))
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      clients.forEach((client) => {
        client.postMessage({
          type: "APP_UPDATED",
          version: VERSION
        });
      });
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (url.pathname.startsWith("/api")) {
    return;
  }

  if (
    url.hostname.includes("drive.google.com") ||
    url.hostname.includes("googleusercontent.com")
  ) {
    return;
  }

  const isNavigation = request.mode === "navigate";
  const isHtml = url.pathname.endsWith(".html");
  const isJs = url.pathname.endsWith(".js");
  const isCss = url.pathname.endsWith(".css");
  const isManifest = url.pathname.endsWith(".webmanifest");

  if (isNavigation || isHtml || isJs || isCss || isManifest) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request, {
      cache: "no-store"
    });

    if (fresh && fresh.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, fresh.clone());
    }

    return fresh;
  } catch {
    const cached = await caches.match(request);

    if (cached) return cached;

    if (request.mode === "navigate") {
      return (
        (await caches.match("/pages/aluno.html")) ||
        (await caches.match("/pages/index.html"))
      );
    }

    throw new Error("Sem cache disponível.");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) return cached;

  try {
    const fresh = await fetch(request);

    if (fresh && fresh.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, fresh.clone());
    }

    return fresh;
  } catch {
    return caches.match(request);
  }
}