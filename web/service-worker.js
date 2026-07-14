const VERSION = "rf-fitness-v2026-07-14-pdfjs-v1";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",

  "/pages/index.html",
  "/pages/aluno.html",
  "/pages/admin.html",
  "/pages/politica-privacidade.html",

  "/assets/css/main.css",
  "/assets/css/aluno-clean.css",
  "/assets/css/admin-clean.css",
  "/assets/css/base/tokens.css",
  "/assets/css/base/reset.css",
  "/assets/css/base/global.css",
  "/assets/css/components.css",
  "/assets/css/layouts/admin.css",
  "/assets/css/pages/login.css",
  "/assets/css/pages/aluno.css",
  "/assets/css/pages/pdf.css",
  "/assets/css/pages/politica-privacidade.css",
  "/assets/css/utilities/responsive.css",

  "/assets/js/index.js",
  "/assets/js/admin.js",
  "/assets/js/aluno.js",
  "/assets/js/api.js",
  "/assets/js/guard.js",
  "/assets/js/state.js",
  "/assets/js/pdf.js",
  "/assets/js/router.js",
  "/assets/js/ui.js",
  "/assets/js/helpers/report.js",

  "/assets/js/aluno/parts/00-service-worker-elements-state.js",
  "/assets/js/aluno/parts/01-tabs-menu-documents-overlay.js",
  "/assets/js/aluno/parts/02-install-flow.js",
  "/assets/js/aluno/parts/03-workouts-history.js",
  "/assets/js/aluno/parts/04-sync-and-init.js",

  "/assets/js/admin/parts/00-bootstrap-elements-state.js",
  "/assets/js/admin/parts/01-admin-core-students.js",
  "/assets/js/admin/parts/02-dashboard-profile.js",
  "/assets/js/admin/parts/03-admin-events-documents.js",
  "/assets/js/admin/parts/04-workout-builder.js",
  "/assets/js/admin/parts/05-catalogs-muscles-videos-exercises.js",
  "/assets/js/admin/parts/06-student-records.js",
  "/assets/js/admin/parts/07-techniques.js",
  "/assets/js/admin/parts/08-extra-items.js",
  "/assets/js/admin/parts/09-navigation-search-init.js",

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
    url.hostname.includes("googleusercontent.com") ||
    url.hostname.includes("youtube.com") ||
    url.hostname.includes("youtu.be")
  ) {
    return;
  }

  const isNavigation = request.mode === "navigate";
  const isHtml = url.pathname.endsWith(".html");
  const isStatic =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico");

  if (isNavigation || isHtml) {
    event.respondWith(networkFirstWithTimeout(request, 1200));
    return;
  }

  if (isStatic) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirstWithTimeout(request, timeoutMs = 1200) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await caches.match(request);

  const networkRequest = fetch(request)
    .then(async (fresh) => {
      if (fresh && fresh.ok) {
        await cache.put(request, fresh.clone());
      }

      return fresh;
    });

  if (cached) {
    const timeout = new Promise((resolve) => {
      setTimeout(() => resolve(cached), timeoutMs);
    });

    try {
      return await Promise.race([networkRequest, timeout]);
    } catch {
      return cached;
    }
  }

  try {
    return await networkRequest;
  } catch {
    if (request.mode === "navigate") {
      return (
        (await caches.match("/pages/aluno.html")) ||
        (await caches.match("/pages/index.html"))
      );
    }

    throw new Error("Sem cache disponível.");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await caches.match(request);

  const networkRequest = fetch(request)
    .then(async (fresh) => {
      if (fresh && fresh.ok) {
        await cache.put(request, fresh.clone());
      }

      return fresh;
    })
    .catch(() => cached);

  return cached || networkRequest;
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
