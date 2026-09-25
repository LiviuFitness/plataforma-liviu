"use client";

import { useEffect } from "react";
import { Eye } from "lucide-react";
import MiRutina from "@/app/(cliente)/mi-rutina/MiRutina";
import VistaDietas, { type PlanDieta } from "@/app/(cliente)/mi-dieta/VistaDietas";
import type { Alternativa, ComidaEstructurada } from "@/lib/dietas";
import type { Dieta, RutinaUI } from "@/lib/tipos";

function aPlan(dieta: Dieta | null): PlanDieta | null {
  if (!dieta) return null;
  const comidas = ((dieta.dieta_comidas ?? []) as unknown as ComidaEstructurada[])
    .slice()
    .sort((a, b) => a.orden - b.orden);
  return { dieta, comidas };
}

/**
 * "Ver como el cliente": su pantalla de Mi entreno o Mi dieta tal cual,
 * con los mismos componentes que usa su app, para comprobar cómo le
 * llega lo pautado sin pedirle capturas.
 *
 * Solo lectura en lo que importa: se puede abrir un día o una comida y
 * mirar equivalencias (estado local, no escribe nada), pero los enlaces
 * no navegan: "Empezar" llevaría a una sesión del cliente, y el panel
 * del entrenador no debe arrancar entrenos ajenos desde aquí.
 */
export default function VistaComoCliente({
  que,
  nombreCliente,
  rutina,
  diasHechosSemana,
  ultimoDiaId,
  dieta,
  dietaDescanso,
  alternativas,
  onSalir,
}: {
  que: "entreno" | "dieta";
  nombreCliente: string;
  rutina: RutinaUI | null;
  diasHechosSemana: string[];
  ultimoDiaId: string | null;
  dieta: Dieta | null;
  dietaDescanso: Dieta | null;
  alternativas: Alternativa[];
  onSalir: () => void;
}) {
  const pila = nombreCliente.split(" ")[0];

  /* Fondo quieto mientras se mira la vista previa */
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, []);

  /* Mismo cálculo que su pantalla: solo la semana en curso, y el día que
   * toca es el siguiente al último que entrenó. */
  const dias = rutina ? rutina.dias.filter((d) => d.semana === rutina.semana_actual) : [];
  const indiceUltimo = dias.findIndex((d) => d.id === ultimoDiaId);
  const idSiguiente =
    dias.length > 0 ? dias[indiceUltimo >= 0 ? (indiceUltimo + 1) % dias.length : 0].id : null;

  const equivalencias = new Map<string, Alternativa[]>();
  for (const a of alternativas) {
    const lista = equivalencias.get(a.alimento_id) ?? [];
    lista.push(a);
    equivalencias.set(a.alimento_id, lista);
  }
  const entreno = aPlan(dieta);
  const descanso = aPlan(dietaDescanso);

  return (
    <div className="fixed inset-0 z-50 bg-fondo overflow-y-auto">
      <div className="max-w-[480px] w-full mx-auto px-[18px] pt-4 pb-16">
        <div className="banner banner-accion !mb-4 items-center sticky top-3 z-10">
          <Eye size={14} className="shrink-0" />
          <span className="flex-1 min-w-0">
            Así lo ve {pila} en su móvil. Solo lectura.
          </span>
          <button className="underline underline-offset-2 font-semibold shrink-0 cursor-pointer" onClick={onSalir}>
            Salir
          </button>
        </div>

        <div
          onClickCapture={(e) => {
            if ((e.target as HTMLElement).closest("a")) e.preventDefault();
          }}
        >
          {que === "entreno" ? (
            <>
              <MiRutina
                nombreRutina={rutina?.nombre ?? ""}
                notas={rutina?.notas ?? ""}
                semana={rutina?.semana_actual ?? 1}
                dias={dias}
                hechosEstaSemana={diasHechosSemana}
                idSiguiente={idSiguiente}
              />
            </>
          ) : (
            <>
              <h1 className="h1">Mi dieta</h1>
              <div className="sub mb-4">tu plan de hoy —</div>
              {!entreno && !descanso ? (
                <div className="tarjeta text-atenuado text-[13.5px]">
                  {pila} todavía no tiene dieta: ve la pantalla vacía.
                </div>
              ) : (
                <VistaDietas entreno={entreno} descanso={descanso} equivalencias={equivalencias} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
