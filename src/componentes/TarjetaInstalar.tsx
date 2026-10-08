"use client";

import { useState, useSyncExternalStore } from "react";
import { Play, X } from "lucide-react";

/**
 * "Instala LivFit": solo si el cliente la tiene abierta en el navegador
 * del móvil (no desde el icono). Con el vídeo de su sistema; "Ahora no"
 * la esconde unos días y, una vez instalada, no vuelve a salir.
 */

type Plataforma = "ios" | "android";
const CLAVE = "instalar-oculta-hasta";
const DIAS_OCULTA = 3;

function leer(): Plataforma | null {
  const instalada =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (instalada) return null;
  try {
    if (Number(localStorage.getItem(CLAVE) ?? 0) > Date.now()) return null;
  } catch {
    /* sin almacenamiento: se enseña */
  }
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  return null;
}

const nada = () => () => {};

export default function TarjetaInstalar() {
  const plataforma = useSyncExternalStore(nada, leer, () => null);
  const [oculta, setOculta] = useState(false);
  const [viendo, setViendo] = useState(false);
  if (!plataforma || oculta) return null;

  /* Navegadores de dentro de Instagram, WhatsApp…: desde ahí no se instala */
  const dentroDeApp = /instagram|fban|fbav|whatsapp|line\//i.test(navigator.userAgent);
  const sistema = plataforma === "ios" ? "iPhone" : "Android";
  const video = `/instalar/${plataforma === "ios" ? "iphone" : "android"}`;

  function esconder() {
    try {
      localStorage.setItem(CLAVE, String(Date.now() + DIAS_OCULTA * 86_400_000));
    } catch {
      /* da igual: se esconde en esta visita */
    }
    setViendo(false);
    setOculta(true);
  }

  return (
    <>
      <section className="tarjeta tarjeta-acento !p-0 !mb-3 overflow-hidden flex anim-entrada-1">
        <button
          type="button"
          onClick={() => setViendo(true)}
          className="relative w-[92px] shrink-0 bg-black cursor-pointer"
          aria-label="Ver el vídeo de cómo instalarla"
        >
          <video
            src={`${video}.mp4`}
            poster={`${video}.jpg`}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-8 h-8 rounded-full bg-black/55 border border-white/40 flex items-center justify-center">
              <Play size={14} fill="white" className="ml-0.5" />
            </span>
          </span>
        </button>
        <div className="p-3.5 min-w-0 flex-1">
          <div className="font-bold text-[15.5px] leading-tight">Instala LivFit en tu {sistema}</div>
          <div className="text-atenuado text-[12.5px] leading-snug mt-1 mb-3">
            {dentroDeApp
              ? `Primero ábrela en ${plataforma === "ios" ? "Safari" : "Chrome"} (menú ··· › Abrir en el navegador) y sigue el vídeo.`
              : "Ábrela desde un icono, a pantalla completa y con mis avisos al día. Son 20 segundos."}
          </div>
          <div className="flex gap-2">
            <button type="button" className="cta !mb-0 !py-2 !text-[13.5px] flex-1" onClick={() => setViendo(true)}>
              Ver cómo
            </button>
            <button type="button" className="ghost !py-2 !text-[13px] shrink-0" onClick={esconder}>
              Ahora no
            </button>
          </div>
        </div>
      </section>

      {viendo && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 anim-fondo-aparece"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        >
          <button
            type="button"
            className="absolute right-4 mini"
            style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
            onClick={() => setViendo(false)}
            aria-label="Cerrar el vídeo"
          >
            <X size={18} />
          </button>
          <video
            src={`${video}.mp4`}
            poster={`${video}.jpg`}
            autoPlay
            muted
            loop
            playsInline
            controls
            className="max-h-[calc(100dvh-140px)] max-w-full rounded-[14px]"
          />
          <button type="button" className="cta !mb-0 !mt-3 !w-auto px-6" onClick={esconder}>
            Hecho, ya la tengo
          </button>
        </div>
      )}
    </>
  );
}
