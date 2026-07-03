"use client";

import { useEffect } from "react";

/** Registra el service worker para que la app sea instalable (PWA). */
export default function RegistroSW() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si falla el registro, la app sigue funcionando como web normal.
      });
    }
  }, []);
  return null;
}
