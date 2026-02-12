const VERSION = "rfapp-v7";
const PRECACHE = `precache-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;

// App shell (o que precisa pra abrir offline)
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

function offlineHTML() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <title>Offline • RF Fitness</title>
  <meta name="theme-color" content="#000000"/>
  <style>
    body{ margin:0; font-family: system-ui,-apple-system,Segoe UI,Roboto; background:#000; color:#fff; }
    .wrap{ min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
    .card{ width:min(520px,100%); border-radius:22px; padding:18px;
      border:1px solid rgba(255,255,255,.10);
      background: radial-gradient(900px 420px at 20% 0%, rgba(206,172,94,.14), transparent 60%),
                  linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.55));
    }
    .t{ font-weight:900; font-size:18px; margin:0 0 8px; }
    .p{ opacity:.78; line-height:1.5; margin:0 0 14px; }
    .btn{ width:100%; padding:14px 16px; border-radius:16px; border:1px solid rgba(255,255,255,.10);
      background: rgba(206,172,94,.18); color:#fff; font-weight:900; cursor:pointer;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <p class="t">Você está offline</p>
      <p class="p">Sem conexão no momento. Volte para a página anterior ou tente novamente.</p>
      <button class="btn" onclick="location.reload()">Tentar novamente</button>
    </div>
  </div>
</body>
</html>`;
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k !== PRECACHE && k !== RUNTIME) return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  const cache = await caches.open(RUNTIME);
  cache.put(req, res.clone()).catch(() => {});
  return res;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    const cache = await caches.open(RUNTIME);
    cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response(offlineHTML(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: 200,
    });
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Só trata o mesmo domínio
  if (url.origin !== location.origin) return;

  // Navegação (HTML): network-first (pra atualizar), fallback cache, fallback offline page
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Assets estáticos: cache-first
  const isStatic =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/img/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webp");

  if (isStatic) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Outros: tenta network, cai no cache
  event.respondWith(networkFirst(req));
});
