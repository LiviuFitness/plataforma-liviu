"use client";

import IconoMusculo from "@/componentes/IconoMusculo";
import { GRUPOS_MUSCULARES } from "@/lib/tipos";

/* Nombres que no caben bajo el muñequito */
const CORTO: Record<string, string> = {
  "Deltoides Lateral": "Hombro lat.",
  "Deltoides Posterior": "Hombro post.",
  "Deltoides Anterior": "Hombro ant.",
  Isquiosurales: "Isquios",
};

/**
 * Fila deslizable de muñequitos con el músculo en rojo para filtrar
 * ejercicios ("Todos" + cada grupo). Con `cuentas`, cuántos hay de cada.
 */
export default function FiltroMusculos({
  activo,
  onCambio,
  cuentas,
}: {
  activo: string;
  onCambio: (grupo: string) => void;
  cuentas?: Record<string, number>;
}) {
  /* Llega hasta el borde de la pantalla (-mx). Ancho 0 + mínimo del
   * hueco: si no, en el móvil la fila ensancha toda la página */
  return (
    <div className="flex gap-1.5 overflow-x-auto scroll-sin-barra pb-2.5 -mx-[18px] px-[18px] w-0 min-w-[calc(100%+36px)]">
      {["Todos", ...GRUPOS_MUSCULARES].map((g) => {
        const on = g === activo;
        return (
          <button
            key={g}
            type="button"
            onClick={() => onCambio(g)}
            aria-pressed={on}
            className={`shrink-0 w-[68px] rounded-[14px] border flex flex-col items-center pt-2 pb-1.5 gap-1 transition-colors cursor-pointer ${
              on ? "border-acento bg-acento/12" : "border-borde bg-campo/60"
            }`}
          >
            <IconoMusculo grupo={g} activo={on} />
            <span className={`text-[10.5px] leading-tight text-center px-0.5 ${on ? "text-acento font-bold" : "text-texto-2"}`}>
              {CORTO[g] ?? g}
            </span>
            {cuentas && <span className="text-[9.5px] text-atenuado -mt-0.5">{cuentas[g] ?? 0}</span>}
          </button>
        );
      })}
    </div>
  );
}
