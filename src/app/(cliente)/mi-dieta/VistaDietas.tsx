"use client";

import { useState } from "react";
import { Dumbbell, Footprints } from "lucide-react";
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

      <section className="tarjeta">
        <div className="titulo-tarjeta">
          OBJETIVO DIARIO{hayAmbas ? ` · ${tipo === "entreno" ? "ENTRENO" : "DESCANSO"}` : ""}
        </div>
        <div className="flex items-baseline justify-between mb-1.5">
          <div>
            <span className="num-grande !text-[32px]">{dieta.kcal_obj}</span>
            <span className="text-atenuado text-[14px]"> kcal</span>
          </div>
          {hayAlimentos && (
            <span className="text-[12.5px] text-atenuado">
              plan <b className="text-acento">{r(totalesPlan.kcal)} kcal</b>
            </span>
          )}
        </div>
        {hayAlimentos && (
          <div className="h-1.5 rounded bg-borde-2 overflow-hidden mb-4">
            <div
              className="h-full rounded"
              style={{
                width: `${Math.min(100, (totalesPlan.kcal / dieta.kcal_obj) * 100)}%`,
                background:
                  totalesPlan.kcal > dieta.kcal_obj * 1.05 ? "#E2B429" : "#29ABE2",
              }}
            />
          </div>
        )}
        <div className="space-y-3">
          {(
            [
              [INFO_MACRO.proteina.etiqueta, dieta.prot_obj, totalesPlan.prot, INFO_MACRO.proteina.color],
              [INFO_MACRO.carbohidratos.etiqueta, dieta.carb_obj, totalesPlan.carb, INFO_MACRO.carbohidratos.color],
              [INFO_MACRO.grasas.etiqueta, dieta.gras_obj, totalesPlan.gras, INFO_MACRO.grasas.color],
            ] as const
          ).map(([etiqueta, objetivo, plan2, color]) => (
            <div key={etiqueta}>
              <div className="flex justify-between items-baseline mb-1 text-[13.5px]">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: color }}
                  />
                  {etiqueta}
                </span>
                <span>
                  {hayAlimentos && (
                    <>
                      <b style={{ color }}>{r1(plan2)}</b>
                      <span className="text-atenuado"> / </span>
                    </>
                  )}
                  <span className={hayAlimentos ? "text-atenuado" : "font-bold"}>
                    {objetivo} g
                  </span>
                </span>
              </div>
              {hayAlimentos && (
                <div className="h-1 rounded bg-borde-2 overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${Math.min(100, (plan2 / (objetivo || 1)) * 100)}%`,
                      background: plan2 > objetivo * 1.05 ? "#E2B429" : color,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {comidas.length === 0 && (
        <section className="tarjeta">
          <div className="text-atenuado text-[13.5px]">
            Sin comidas definidas todavía.
          </div>
        </section>
      )}

      {comidas.map((c) => (
        <MiDietaComida key={c.id} comida={c} equivalencias={equivalencias} />
      ))}

      <p className="text-atenuado text-[12.5px]">
        Toca ⇄ en un alimento para ver equivalencias con los mismos macros.
        ¿Dudas? Escríbeselo a tu entrenador.
      </p>
    </>
  );
}
