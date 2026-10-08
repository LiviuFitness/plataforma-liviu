"use client";

import { useEffect } from "react";

/**
 * El número rojo sobre el icono de LivFit (app instalada): al cliente,
 * los mensajes sin leer; al entrenador, los clientes esperando respuesta.
 * Se pone también al llegar un aviso (lo hace el service worker) y aquí
 * se corrige cada vez que se abre una pantalla.
 */
export default function InsigniaApp({ n }: { n: number }) {
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge) return;
    (n > 0 ? nav.setAppBadge(n) : (nav.clearAppBadge?.() ?? nav.setAppBadge(0))).catch(() => {
      /* sin permiso de avisos: no pasa nada */
    });
  }, [n]);
  return null;
}
