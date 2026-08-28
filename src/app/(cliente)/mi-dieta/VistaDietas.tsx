"use client";

import { useState } from "react";
import { Dumbbell, Footprints, UtensilsCrossed } from "lucide-react";
import {
  macrosDe,
  r,
  r1,
  sumar,
  type Alternativa,
  type ComidaEstructurada,
} from "@/lib/dietas";
import { INFO_MACRO, type Dieta } from "@/lib/tipos";
import MiDietaComida from "./MiDietaComida";
import EstadoVacio from "@/componentes/EstadoVacio";
import { useCountUp } from "@/lib/useCountUp";

export interface PlanDieta {
  dieta: Dieta;
  comidas: ComidaEstructurada[];
}

/** Vista de la dieta del cliente con selector entre día de entreno y
 * día de descanso (si el entrenador ha creado la segunda). */
export default function VistaDietas({
  entreno,
  descanso,
  equivalencias,
}: {
  entreno: PlanDieta | null;
  descanso: PlanDieta | null;
  equivalencias: Map<string, Alternativa[]>;
}) {
  const [tipo, setTipo] = useState<"entreno" | "descanso">(
    entreno ? "entreno" : "descanso"
  );
  const plan = tipo === "entreno" ? entreno : descanso;
  const hayAmbas = !!entreno && !!descanso;
  const kcalAnimado = useCountUp(plan?.dieta.kcal_obj ?? 0);

  if (!plan) return null;

  const { dieta, comidas } = plan;
  const totalesPlan = sumar(
    comidas.flatMap((c) =>
      (c.dieta_comida_alimentos ?? [])
        .filter((i) => i.alimentos)
        .map((i) => macrosDe(i.alimentos!, Number(i.gramos)))
    )
  );
  const hayAlimentos = comidas.some(
    (c) => (c.dieta_comida_alimentos ?? []).length > 0
  );

  return (
    <>
      {hayAmbas && (
        <div className="flex gap-1.5 mb-3.5">
          <button
            className={`${tipo === "entreno" ? "chip chip-activo" : "chip"} flex items-center gap-1.5`}
            onClick={() => setTipo("entreno")}
          >
            <Dumbbell size={13} /> Día de entreno
          </button>
          <button
            className={`${tipo === "descanso" ? "chip chip-activo" : "chip"} flex items-center gap-1.5`}
            onClick={() => setTipo("descanso")}
          >
            <Footprints size={13} /> Día de descanso
          </button>
        </div>
      )}

      <section className="tarjeta tarjeta-verde">
        <div className="titulo-tarjeta">
          OBJETIVO DIARIO{hayAmbas ? ` · ${tipo === "entreno" ? "ENTRENO" : "DESCANSO"}` : ""}
        </div>
        {/* El número grande es lo que suma el plan, no el objetivo: lo que
         * el cliente quiere saber es cuánto va a comer hoy, y el objetivo
         * es la referencia contra la que se lee. Antes estaba al revés —
         * 34 px para el objetivo y letra pequeña para el plan. */}
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="num-grande !text-[32px]" style={{ color: "var(--color-verde)" }}>
            {hayAlimentos ? r(totalesPlan.kcal) : kcalAnimado}
          </span>
          <span className="text-atenuado text-[14px]">
            {hayAlimentos ? `/ ${dieta.kcal_obj} kcal` : "kcal"}
          </span>
        </div>
        {hayAlimentos && (
          <div className="barra-capsula mb-4">
            <div
              className="barra-capsula-relleno"
              style={{
                width: `${Math.min(100, (totalesPlan.kcal / dieta.kcal_obj) * 100)}%`,
                "--tc": totalesPlan.kcal > dieta.kcal_obj * 1.05 ? "#E2B429" : "var(--color-verde)",
              } as React.CSSProperties}
            />
          </div>
        )}

        {/* Los tres macros en fila. Apilados con su barra cada uno se
         * comían media pantalla antes de llegar a las comidas, que es a
         * lo que se entra en realidad. El punto de color de cada etiqueta
         * sobraba: la barra de debajo ya lleva ese mismo color. */}
        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              ["Proteína", dieta.prot_obj, totalesPlan.prot, INFO_MACRO.proteina.color],
              ["Carbos", dieta.carb_obj, totalesPlan.carb, INFO_MACRO.carbohidratos.color],
              ["Grasas", dieta.gras_obj, totalesPlan.gras, INFO_MACRO.grasas.color],
            ] as const
          ).map(([etiqueta, objetivo, plan2, color]) => (
            <div key={etiqueta}>
              <div className="text-atenuado text-[11.5px] mb-0.5">{etiqueta}</div>
              <div className="text-[13.5px] mb-1.5 tabular-nums leading-none">
                {hayAlimentos && (
                  <>
                    <b style={{ color }}>{r1(plan2)}</b>
                    <span className="text-atenuado">/</span>
                  </>
                )}
                <span className={hayAlimentos ? "text-atenuado" : "font-bold"}>
                  {objetivo}
                  <span className="text-[11px]"> g</span>
                </span>
              </div>
              {hayAlimentos && (
                <div className="barra-capsula !h-1">
                  <div
                    className="barra-capsula-relleno"
                    style={{
                      width: `${Math.min(100, (plan2 / (objetivo || 1)) * 100)}%`,
                      "--tc": plan2 > objetivo * 1.05 ? "#E2B429" : color,
                    } as React.CSSProperties}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {comidas.length === 0 && (
        <section className="tarjeta">
          <EstadoVacio
            Icono={UtensilsCrossed}
            color="var(--color-verde)"
            titulo="Sin comidas definidas todavía"
            descripcion="En cuanto tu entrenador añada las comidas de este plan, aparecerán aquí con sus cantidades exactas."
          />
        </section>
      )}

      {comidas.map((c) => (
        <MiDietaComida key={c.id} comida={c} equivalencias={equivalencias} />
      ))}

      <p className="text-atenuado text-[12.5px]">
        Los alimentos con <span className="text-texto-2">›</span> tienen
        sustitutos con los mismos macros. ¿Dudas? Escríbeselo a tu entrenador.
      </p>
    </>
  );
}
