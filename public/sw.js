/* Service worker: hace la app instalable (PWA) y recibe las
   notificaciones push (mensajes, recordatorios de entreno y de peso). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Paso directo a red. Requisito mínimo de instalabilidad en Chrome.
});

self.addEventListener("push", (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = { titulo: "LivFit", cuerpo: evento.data ? evento.data.text() : "" };
  }
  const titulo = datos.titulo || "LivFit";
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo || "",
      icon: "/icono-192.png",
      badge: "/icono-192.png",
      tag: datos.etiqueta || undefined,
      data: { url: datos.url || "/" },
    })
  );
});

/* Al tocarla: si la app ya está abierta, se va a esa pantalla; si no, se abre */
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = new URL((evento.notification.data && evento.notification.data.url) || "/", self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if ("focus" in v) {
          v.navigate(url).catch(() => {});
          return v.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
