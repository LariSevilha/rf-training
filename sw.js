self.addEventListener("install", () => {
    self.skipWaiting();
  });
  
  self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
  });
  
  // Intercepta fetch (obrigatório para PWA ser considerado instalável)
  self.addEventListener("fetch", (event) => {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Fallback simples se offline (opcional)
        return new Response("Offline", { status: 503 });
      })
    );
  });
