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
            <div className="mb-3">
              <span className="num-grande !text-[30px]">{dieta.kcal_obj}</span>
              <span className="text-atenuado text-[14px]"> kcal</span>
              {hayAlimentos && (
                <span className="text-atenuado text-[13px]">
                  {" "}
                  · plan {r(totalesPlan.kcal)} kcal
                </span>
              )}
            </div>
            {(
              [
                ["Proteína", dieta.prot_obj, totalesPlan.prot, "#fff"],
                ["Carbohidratos", dieta.carb_obj, totalesPlan.carb, "#29ABE2"],
                ["Grasas", dieta.gras_obj, totalesPlan.gras, "#8A949C"],
              ] as const
            ).map(([etiqueta, objetivo, plan, color]) => (
              <div
                key={etiqueta}
                className="flex justify-between items-center py-2 border-b border-borde last:border-0"
              >
                <span className="text-[14px]">
                  {etiqueta}
                  {hayAlimentos && (
                    <span className="text-atenuado text-[12px]">
                      {" "}
                      · {r1(plan)} g
                    </span>
                  )}
                </span>
                <span className="font-bold text-[14.5px]" style={{ color }}>
                  {objetivo} g
                </span>
              </div>
            ))}
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
            Toca «cambiar» en un alimento para ver equivalencias con los mismos
            macros. ¿Dudas? Escríbeselo a tu entrenador.
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
