"use client";

import { Flame } from "lucide-react";
import { IconoTarjeta } from "@/componentes/ui";
import { useCountUp } from "@/lib/useCountUp";

/**
 * Racha en línea, sin tarjeta propia — vive junto al saludo. No debe
 * competir visualmente con el entreno de hoy, que es la protagonista
 * real de la pantalla; por eso es una fila ligera, no una caja.
 */
export default function RachaInline({ racha }: { racha: number }) {
  const animada = useCountUp(racha);
  if (racha <= 0) return null;
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <IconoTarjeta Icono={Flame} color="var(--color-dorado)" tamano={30} />
      <div className="text-[14px]">
        <b className="text-dorado tabular-nums">{animada}</b>{" "}
        <span className="text-atenuado">
          {racha === 1 ? "día de racha" : "días de racha"} — ¡no la rompas!
        </span>
      </div>
    </div>
  );
}
