"use client";

import { useEffect, useState } from "react";

/**
 * Cuenta atrás del descanso entre series.
 *
 * Es el único dato de la pantalla que cambia solo y que marca cuándo
 * volver a la barra, así que se lee de un vistazo desde lejos y con el
 * móvil apoyado: número grande, y una barra de progreso pegada al borde
 * superior que dice cuánto queda sin tener que leer la cifra.
 *
 * Los últimos segundos cambian a ámbar y laten: es el aviso de
 * "prepárate" que antes solo llegaba por el pitido — y el pitido no
 * sirve de nada en un gimnasio con música.
 *
 * Con el teclado abierto, abajo quedaría tapada: pasa a una línea fina
 * arriba de lo que se ve, con el tiempo y el progreso.
 */

const AVISO_SEG = 10;

export default function BarraDescanso({
  restante,
  total,
  onAjustar,
  onSaltar,
}: {
  restante: number;
  total: number;
  onAjustar: (deltaSeg: number) => void;
  onSaltar: () => void;
}) {
  const urgente = restante <= AVISO_SEG;
  const color = urgente ? "var(--color-aviso)" : "var(--color-acento)";
  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

  /* null = teclado cerrado; si no, dónde empieza lo visible de la pantalla */
  const [arribaTeclado, setArribaTeclado] = useState<number | null>(null);
  useEffect(() => {
    const vista = window.visualViewport;
    if (!vista) return;
    const medir = () => setArribaTeclado(window.innerHeight - vista.height > 120 ? vista.offsetTop : null);
    vista.addEventListener("resize", medir);
    vista.addEventListener("scroll", medir);
    return () => {
      vista.removeEventListener("resize", medir);
      vista.removeEventListener("scroll", medir);
    };
  }, []);

  if (arribaTeclado !== null) {
    return (
      <div
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 px-3 pt-1.5"
        style={{ top: `calc(${arribaTeclado}px + env(safe-area-inset-top))` }}
        role="timer"
        aria-live="off"
      >
        <div
          className="rounded-[12px] border overflow-hidden bg-[#0E1215]"
          style={{ borderColor: urgente ? "var(--color-aviso)" : "rgba(41,171,226,0.5)" }}
        >
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-atenuado text-[10px] tracking-[0.12em] uppercase">Descanso</span>
            <span className="font-bold text-[17px] tabular-nums leading-tight" style={{ color }}>
              {fmt(restante)}
            </span>
          </div>
          <div className="h-[2px] bg-borde-2">
            <div
              className="h-full transition-[width] duration-300 ease-linear"
              style={{ width: `${Math.max(0, Math.min(100, (restante / total) * 100))}%`, background: color }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      /* Se apoya sobre la barra de pestañas, que impone su propia altura
       * en --alto-barra-inferior (globals.css). Con el número a mano no
       * se sostiene: la del cliente mide 89 px y la del panel 68. */
      className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-3 anim-subir-barra"
      style={{ bottom: "calc(var(--alto-barra-inferior) + env(safe-area-inset-bottom))" }}
      role="timer"
      aria-live="off"
    >
      <div
        className="tarjeta !mb-2 !p-0 overflow-hidden bg-[#0E1215]"
        style={{ borderColor: urgente ? "var(--color-aviso)" : "rgba(41,171,226,0.5)" }}
      >
        {/* Progreso pegado al borde: se ve cuánto queda sin leer nada */}
        <div className="h-[3px] bg-borde-2">
          <div
            className="h-full transition-[width] duration-300 ease-linear"
            style={{
              width: `${Math.max(0, Math.min(100, (restante / total) * 100))}%`,
              background: color,
            }}
          />
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <div>
            <div className="text-atenuado text-[10px] tracking-[0.12em] uppercase leading-none mb-1.5">
              Descanso
            </div>
            <div
              className={`num-grande !text-[34px] leading-none tabular-nums ${
                urgente ? "anim-latido" : ""
              }`}
              style={{ color }}
            >
              {fmt(restante)}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              className="stepper-boton"
              onClick={() => onAjustar(-15)}
              aria-label="Restar 15 segundos al descanso"
            >
              <span className="text-[11px] font-bold">−15</span>
            </button>
            <button
              className="stepper-boton"
              onClick={() => onAjustar(15)}
              aria-label="Sumar 15 segundos al descanso"
            >
              <span className="text-[11px] font-bold">+15</span>
            </button>
            <button className="ghost shrink-0" onClick={onSaltar}>
              Saltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
