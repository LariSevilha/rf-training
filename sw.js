self.addEventListener("install", () => {
    self.skipWaiting();
  });
  
  self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
  });
  
  // Sem cache agressivo por enquanto (seguro).
  self.addEventListener("fetch", () => {});
  