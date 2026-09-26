/**
 * Aviso al móvil de que hay un mensaje nuevo en el chat. Se pide al
 * servidor (que es quien tiene las claves para mandar notificaciones) y
 * no se espera la respuesta: si falla, el mensaje ya está en el chat.
 *
 * El entrenador pasa a qué clientes ha escrito; un cliente no pasa nada
 * (el aviso va al entrenador).
 */
export function avisarMensaje(clienteIds: string[] = []) {
  void fetch("/api/avisos/mensaje", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clienteIds }),
    keepalive: true,
  }).catch(() => {
    /* sin aviso no pasa nada: el mensaje está guardado */
  });
}

/**
 * Aviso al cliente de que su rutina o su dieta ha cambiado. El servidor
 * lo manda como mucho una vez cada 30 minutos: si editas varios días
 * seguidos, le llega uno solo.
 */
export function avisarCambio(clienteId: string, que: "rutina" | "dieta") {
  void fetch("/api/avisos/cambio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clienteId, que }),
    keepalive: true,
  }).catch(() => {
    /* sin aviso no pasa nada: el cambio está guardado */
  });
}
