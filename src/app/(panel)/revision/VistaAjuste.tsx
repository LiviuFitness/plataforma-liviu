"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { PropuestaAjuste } from "@/lib/ajusteDieta";

const n = (x: number) => Math.round(x).toLocaleString("es-ES");

/** Qué cantidades cambian con el ajuste, en su dieta de entreno y en la de descanso */
export default function VistaAjuste({ propuestas }: { propuestas: PropuestaAjuste[] }) {
  const [tipo, setTipo] = useState<"entreno" | "descanso">("entreno");
  if (propuestas.length === 0) return null;
  const p = propuestas.find((x) => x.tipo === tipo) ?? propuestas[0];
  const real = Math.round(p.despues.kcal - p.antes.kcal);

  return (
    <div className="mt-3">
      {propuestas.length > 1 && (
        <div className="flex gap-4 border-b border-borde mb-1 text-[13px]" role="tablist">
          {propuestas.map((x) => (
            <button
              key={x.tipo}
              role="tab"
              aria-selected={x.tipo === p.tipo}
              className={`pb-1.5 -mb-px border-b-2 cursor-pointer ${
                x.tipo === p.tipo ? "border-acento font-semibold text-white" : "border-transparent text-atenuado"
              }`}
              onClick={() => setTipo(x.tipo)}
            >
              Día de {x.tipo}
            </button>
          ))}
        </div>
      )}
      {p.cambios.length === 0 ? (
        <div className="text-atenuado text-[13px] py-2">
          En esta dieta no hay hidratos ni grasas que ajustar: hazlo a mano en su dieta.
        </div>
      ) : (
        p.cambios.map((c) => (
          <div key={c.itemId} className="flex items-center gap-2 py-2 border-b border-borde last:border-0 text-[13.5px]">
            <span className="text-atenuado text-[12px] w-[70px] shrink-0 break-words leading-tight">
              {c.comida}
              {c.opcion === 1 ? " (B)" : ""}
            </span>
            <span className="flex-1 min-w-0 break-words">{c.alimento}</span>
            <span className="shrink-0 tabular-nums">
              <span className="text-atenuado line-through">{c.antes} g</span>
              <ArrowRight size={12} className="inline mx-1 text-atenuado" />
              <b className="text-acento">{c.despues} g</b>
            </span>
          </div>
        ))
      )}
      <div className="text-atenuado text-[12px] mt-2 leading-snug">
        {n(p.antes.kcal)} → {n(p.despues.kcal)} kcal ({real > 0 ? "+" : ""}
        {real}) · P {n(p.antes.prot)} → {n(p.despues.prot)} · H {n(p.antes.carb)} → {n(p.despues.carb)} · G {n(p.antes.gras)} →{" "}
        {n(p.despues.gras)}
      </div>
    </div>
  );
}
