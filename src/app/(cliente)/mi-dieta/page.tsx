import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  SELECT_DIETA_COMPLETA,
  type Alimento,
  type Alternativa,
  type ComidaEstructurada,
} from "@/lib/dietas";
import type { Dieta } from "@/lib/tipos";
import VistaDietas, { type PlanDieta } from "./VistaDietas";
import PreferenciasAlimentos from "./PreferenciasAlimentos";

export const dynamic = "force-dynamic";

function aPlan(fila: unknown): PlanDieta | null {
  const dieta = fila as Dieta | null;
  if (!dieta) return null;
  const comidas = ((dieta.dieta_comidas ?? []) as unknown as ComidaEstructurada[])
    .slice()
    .sort((a, b) => a.orden - b.orden);
  return { dieta, comidas };
}

/** Dieta del cliente: día de entreno y día de descanso, comidas por
 * gramos y equivalencias. */
export default async function PaginaMiDieta() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: filaEntreno }, { data: filaDescanso }] = await Promise.all([
    supabase
      .from("dietas")
      .select(SELECT_DIETA_COMPLETA)
      .eq("cliente_id", user.id)
      .eq("activa", true)
      .eq("tipo", "entreno")
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("dietas")
      .select(SELECT_DIETA_COMPLETA)
      .eq("cliente_id", user.id)
      .eq("activa", true)
      .eq("tipo", "descanso")
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const entreno = aPlan(filaEntreno);
  const descanso = aPlan(filaDescanso);

  // Equivalencias de todos los alimentos que aparecen en ambas dietas
  const idsAlimentos = [
    ...new Set(
      [...(entreno?.comidas ?? []), ...(descanso?.comidas ?? [])].flatMap((c) =>
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

      {!entreno && !descanso ? (
        <section className="tarjeta">
          <div className="text-atenuado text-[14px]">
            Tu dieta está en el horno 🔥 En cuanto tu entrenador te asigne el
            plan, aparecerá aquí.
          </div>
        </section>
      ) : (
        <VistaDietas
          entreno={entreno}
          descanso={descanso}
          equivalencias={equivPorAlimento}
        />
      )}

      <PreferenciasAlimentos
        clienteId={user.id}
        catalogo={(catalogo ?? []) as Alimento[]}
        excluidosIniciales={(exclusiones ?? []).map((e) => e.alimento_id)}
      />
    </>
  );
}
