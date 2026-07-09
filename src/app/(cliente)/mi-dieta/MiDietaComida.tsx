"use client";

import { useState } from "react";
import {
  Apple,
  ArrowLeftRight,
  BedDouble,
  Coffee,
  Cookie,
  Moon,
  Utensils,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  macrosDe,
  r,
  r1,
  sumar,
  type Alternativa,
  type ComidaEstructurada,
} from "@/lib/dietas";

/** Icono según el nombre de la comida (Desayuno → café, Cena → luna…). */
function IconoComida({ nombre }: { nombre: string }) {
  const n = nombre.toLowerCase();
  const props = { size: 17 } as const;
  if (n.includes("desayuno")) return <Coffee {...props} />;
  if (n.includes("media mañana") || n.includes("almuerzo")) return <Apple {...props} />;
  if (n.includes("merienda")) return <Cookie {...props} />;
  if (n.includes("recena")) return <BedDouble {...props} />;
  if (n.includes("cena")) return <Moon {...props} />;
  if (n.includes("comida")) return <UtensilsCrossed {...props} />;
  return <Utensils {...props} />;
}

const MACROS_LEYENDA = [
  { etiqueta: "P", color: "#FFFFFF" },
  { etiqueta: "C", color: "#29ABE2" },
  { etiqueta: "G", color: "#8A949C" },
] as const;

/**
 * Una comida del plan del cliente: cabecera con icono y kcal, alimentos
 * con los gramos en chip, equivalencias intercambiables y macros abajo.
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
  const valores = [total.prot, total.carb, total.gras];

  return (
    <section className="tarjeta !p-0 overflow-hidden">
      {/* Cabecera: icono + nombre + kcal de la comida */}
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5 border-b border-borde">
        <div className="w-9 h-9 rounded-[10px] bg-acento/10 text-acento flex items-center justify-center shrink-0">
          <IconoComida nombre={comida.nombre} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px] leading-tight truncate">
            {comida.nombre}
          </div>
          {items.length > 0 && (
            <div className="text-atenuado text-[11.5px]">
              {items.length} {items.length === 1 ? "alimento" : "alimentos"}
            </div>
          )}
        </div>
        {items.length > 0 && (
          <span className="shrink-0 text-[12px] font-bold text-acento bg-acento/10 rounded-full px-2.5 py-1">
            {r(total.kcal)} kcal
          </span>
        )}
      </div>

      {/* Texto libre (compatibilidad con dietas antiguas) */}
      {comida.descripcion_libre && (
        <div className="text-texto-2 text-[13.5px] px-4 pt-2.5">
          {comida.descripcion_libre}
        </div>
      )}

      <div className="px-4 pb-1">
        {items.map((it) => {
          const alt = equivalencias.get(it.alimento_id) ?? [];
          const g = Number(it.gramos);
          const factor = g / 100; // los gramos de la equivalencia son por 100 g base
          const estaAbierto = abierto === it.id;
          return (
            <div key={it.id} className="py-2 border-b border-borde last:border-0">
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 min-w-[56px] text-center text-[12.5px] font-bold bg-campo border border-borde-2 rounded-lg py-1.5 px-1.5">
                  {r(g)} g
                </span>
                <span className="flex-1 min-w-0 text-[14px] leading-tight">
                  {it.alimentos!.nombre}
                </span>
                {alt.length > 0 && (
                  <button
                    className={`mini shrink-0 ${estaAbierto ? "!border-acento !text-acento" : ""}`}
                    onClick={() => setAbierto(estaAbierto ? null : it.id)}
                    title="Ver equivalencias con los mismos macros"
                    aria-label={
                      estaAbierto ? "Ocultar equivalencias" : "Ver equivalencias"
                    }
                  >
                    {estaAbierto ? <X size={13} /> : <ArrowLeftRight size={13} />}
                  </button>
                )}
              </div>
              {estaAbierto && alt.length > 0 && (
                <div className="mt-2 bg-campo border border-borde-2 rounded-[10px] p-2.5 anim-aparecer">
                  <div className="text-atenuado text-[11.5px] mb-1.5 flex items-center gap-1">
                    <ArrowLeftRight size={11} /> En su lugar puedes tomar (mismos
                    macros):
                  </div>
                  {alt.map((a) => (
                    <div
                      key={a.nombre}
                      className="flex justify-between gap-2 text-[13px] py-1 border-b border-borde last:border-0"
                    >
                      <span className="min-w-0">{a.nombre}</span>
                      <span className="text-acento font-bold shrink-0">
                        {r(a.gramos * factor)} g
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Macros de la comida, con la misma leyenda de colores del objetivo */}
      {items.length > 0 && (
        <div className="flex items-center justify-around px-4 py-2.5 border-t border-borde bg-campo/50 text-[12.5px]">
          {MACROS_LEYENDA.map((m, i) => (
            <span key={m.etiqueta} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: m.color }}
              />
              <span className="text-atenuado">{m.etiqueta}</span>
              <b>{r1(valores[i])} g</b>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
