const VERSION = "v6";                // ⬅️ troque a cada deploy
const CACHE = `rfapp-${VERSION}`;

// Coloque aqui só o que é “core” (precisa abrir mesmo offline)
const CORE_ASSETS = [
  "/",
  "/manifest.webmanifest",

  // Páginas
  "/pages/index.html",
  "/pages/aluno.html",
  "/pages/admin.html",

  // CSS/JS principais (ajuste se seus nomes forem outros)
  "/assets/css/main.css",
  "/assets/js/index.js",
  "/assets/js/aluno.js",
  "/assets/js/admin.js",
  "/assets/js/router.js",
  "/assets/js/api.js",
  "/assets/js/guard.js",
  "/assets/js/state.js",
  "/assets/js/ui.js",
  "/assets/js/pdf.js",

  // Ícones
  "/img/logoapp.png",
  "/img/logoapp-192.png",
  "/img/logoapp-512.png",
  "/img/logoapp-maskable-512.png",
  "/img/logoapp-ios-180.png"
];

// --- Install: pré-cache + ativa logo
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
});

// --- Activate: limpa caches antigos + assume controle
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("rfapp-") && k !== CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Helper: decide se vale cachear
function shouldCache(req) {
  // Só GET
  if (req.method !== "GET") return false;

  const url = new URL(req.url);

  // Não cacheia API
  if (url.pathname.startsWith("/api")) return false;

  // Não cacheia links do Drive / externos
  if (url.origin !== self.location.origin) return false;

  return true;
}

// Estratégias:
// - Navegação (HTML): Network-first (pra atualizar rápido), fallback pro cache
// - Assets (css/js/img/font): Stale-while-revalidate (rápido + atualiza no fundo)

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Ignore requests não cacheáveis
  if (!shouldCache(req)) return;

  // 1) Navegação / páginas
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          // atualiza cache da página
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          // fallback
          const cached = await caches.match(req);
          return cached || caches.match("/pages/index.html");
        }
      })()
    );
    return;
  }

  // 2) Assets (css/js/img/fonts) — stale-while-revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const fetchPromise = fetch(req)
        .then(async (res) => {
          // só cacheia se ok
          if (res && res.ok) {
            const cache = await caches.open(CACHE);
            cache.put(req, res.clone()).catch(() => {});
          }
          return res;
        })
        .catch(() => null);

      // se tem cache, devolve cache já e atualiza no fundo
      if (cached) {
        fetchPromise.catch(() => {});
        return cached;
      }

      // se não tem cache, tenta rede
      const net = await fetchPromise;
      return net || cached;
    })()
  );
});

// --- Mensagens (opcional): forçar atualização manual
// No client você pode chamar:
// navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" })
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
