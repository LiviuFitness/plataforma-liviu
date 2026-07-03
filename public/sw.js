/* Service worker mínimo: hace la app instalable (PWA).
   En Fase 4 se ampliará con caché offline y notificaciones push. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Paso directo a red. Requisito mínimo de instalabilidad en Chrome.
});
