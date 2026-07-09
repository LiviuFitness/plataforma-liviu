import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  SELECT_DIETA_COMPLETA,
  macrosDe,
  r,
  r1,
  sumar,
  type Alimento,
  type Alternativa,
  type ComidaEstructurada,
} from "@/lib/dietas";
import type { Dieta } from "@/lib/tipos";
import MiDietaComida from "./MiDietaComida";
import PreferenciasAlimentos from "./PreferenciasAlimentos";

export const dynamic = "force-dynamic";

/** Dieta del cliente: objetivos, comidas por gramos y equivalencias. */
export default async function PaginaMiDieta() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("dietas")
    .select(SELECT_DIETA_COMPLETA)
    .eq("cliente_id", user.id)
    .eq("activa", true)
    .order("creada_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dieta = data as Dieta | null;
  const comidas = ((dieta?.dieta_comidas ?? []) as unknown as ComidaEstructurada[])
    .slice()
    .sort((a, b) => a.orden - b.orden);

  // Equivalencias de todos los alimentos que aparecen en la dieta
  const idsAlimentos = [
    ...new Set(
      comidas.flatMap((c) =>
        (c.dieta_comida_alimentos ?? []).map((i) => i.alimento_id)
      )
    ),
  ];
  let equivalencias: Alternativa[] = [];
  if (idsAlimentos.length > 0) {
    const { data: alt } = await supabase
      .from("alimento_alternativas")
      .select("alimento_id, nombre, gramos, orden")
      .in("alimento_id", idsAlimentos)
      .order("orden");
    equivalencias = (alt ?? []) as Alternativa[];
  }
  const equivPorAlimento = new Map<string, Alternativa[]>();
  for (const e of equivalencias) {
    const lista = equivPorAlimento.get(e.alimento_id) ?? [];
    lista.push(e);
    equivPorAlimento.set(e.alimento_id, lista);
  }

  // Totales reales del plan (suma de alimentos)
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

  const [{ data: catalogo }, { data: exclusiones }] = await Promise.all([
    supabase
      .from("alimentos")
      .select("id, nombre, kcal_100, prot_100, carb_100, gras_100, fibra_100, categoria")
      .neq("nombre", "Añadir alimento")
      .order("nombre"),
    supabase
      .from("alimentos_excluidos")
      .select("alimento_id")
      .eq("cliente_id", user.id),
  ]);

  return (
    <>
      <h1 className="h1">Mi dieta</h1>
      <div className="sub mb-4">tu plan de hoy —</div>

      {!dieta ? (
        <section className="tarjeta">
          <div className="text-atenuado text-[14px]">
            Tu dieta está en el horno 🔥 En cuanto tu entrenador te asigne el
            plan, aparecerá aquí.
          </div>
        </section>
      ) : (
        <>
          <section className="tarjeta">
            <div className="titulo-tarjeta">OBJETIVO DIARIO</div>
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
                      totalesPlan.kcal > dieta.kcal_obj * 1.05
                        ? "#E2B429"
                        : "#29ABE2",
                  }}
                />
              </div>
            )}
            <div className="space-y-3">
              {(
                [
                  ["Proteína", dieta.prot_obj, totalesPlan.prot, "#FFFFFF"],
                  ["Carbohidratos", dieta.carb_obj, totalesPlan.carb, "#29ABE2"],
                  ["Grasas", dieta.gras_obj, totalesPlan.gras, "#8A949C"],
                ] as const
              ).map(([etiqueta, objetivo, plan, color]) => (
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
                          <b style={{ color }}>{r1(plan)}</b>
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
                          width: `${Math.min(100, (plan / (objetivo || 1)) * 100)}%`,
                          background:
                            plan > objetivo * 1.05 ? "#E2B429" : color,
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
            <MiDietaComida
              key={c.id}
              comida={c}
              equivalencias={equivPorAlimento}
            />
          ))}

          <p className="text-atenuado text-[12.5px]">
            Toca ⇄ en un alimento para ver equivalencias con los mismos macros.
            ¿Dudas? Escríbeselo a tu entrenador.
          </p>
        </>
      )}

      <PreferenciasAlimentos
        clienteId={user.id}
        catalogo={(catalogo ?? []) as Alimento[]}
        excluidosIniciales={(exclusiones ?? []).map((e) => e.alimento_id)}
      />
    </>
  );
}
