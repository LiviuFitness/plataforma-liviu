"use client";

import { useState } from "react";
import {
  macrosDe,
  r,
  r1,
  sumar,
  type Alternativa,
  type ComidaEstructurada,
} from "@/lib/dietas";

/**
 * Una comida del plan del cliente: alimentos con gramos, total de la
 * comida y equivalencias para intercambiar (como en el Excel de Liviu).
 */
export default function MiDietaComida({
  comida,
  equivalencias,
}: {
  comida: ComidaEstructurada;
  equivalencias: Map<string, Alternativa[]>;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);

  const items = (comida.dieta_comida_alimentos ?? [])
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .filter((i) => i.alimentos);

  const total = sumar(items.map((i) => macrosDe(i.alimentos!, Number(i.gramos))));

  return (
    <section className="tarjeta">
      <div className="font-bold text-[15px] mb-1">{comida.nombre}</div>

      {/* Texto libre (compatibilidad con dietas antiguas) */}
      {comida.descripcion_libre && (
        <div className="text-texto-2 text-[13.5px] mb-2">
          {comida.descripcion_libre}
        </div>
      )}

      {items.map((it) => {
        const alt = equivalencias.get(it.alimento_id) ?? [];
        const g = Number(it.gramos);
        const factor = g / 100; // los gramos de la equivalencia son por 100 g base
        return (
          <div key={it.id} className="py-2 border-b border-borde last:border-0">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[14px] flex-1">
                <b>{r(g)} g</b> {it.alimentos!.nombre}
              </span>
              {alt.length > 0 && (
                <button
                  className="text-acento text-[12.5px] shrink-0"
                  onClick={() =>
                    setAbierto(abierto === it.id ? null : it.id)
                  }
                >
                  {abierto === it.id ? "ocultar" : "cambiar ⇄"}
                </button>
              )}
            </div>
            {abierto === it.id && alt.length > 0 && (
              <div className="mt-1.5 bg-campo border border-borde-2 rounded-[10px] p-2.5">
                <div className="text-atenuado text-[11.5px] mb-1.5">
                  En su lugar puedes tomar (mismos macros):
                </div>
                {alt.map((a) => (
                  <div
                    key={a.nombre}
                    className="flex justify-between text-[13px] py-0.5"
                  >
                    <span>{a.nombre}</span>
                    <span className="text-acento font-bold">
                      {r(a.gramos * factor)} g
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {items.length > 0 && (
        <div className="flex justify-between text-[12.5px] text-atenuado mt-2 pt-2 border-t border-borde">
          <span className="font-bold text-texto-2">Total comida</span>
          <span>
            <b className="text-acento">{r(total.kcal)} kcal</b> · P{r1(total.prot)} · C{r1(total.carb)} · G{r1(total.gras)}
          </span>
        </div>
      )}
    </section>
  );
}
