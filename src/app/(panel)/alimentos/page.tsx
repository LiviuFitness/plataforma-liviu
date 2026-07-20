import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import CatalogoAlimentos from "./CatalogoAlimentos";
import type { Alimento, Alternativa } from "@/lib/dietas";

export const dynamic = "force-dynamic";

/** Catálogo de alimentos del entrenador: ver y editar las alternativas
 * (equivalencias) de cada uno, sin tocar la tabla en Supabase a mano. */
export default async function PaginaAlimentos() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const [{ data: alimentos }, { data: alternativas }] = await Promise.all([
    supabase
      .from("alimentos")
      .select("id, nombre, kcal_100, prot_100, carb_100, gras_100, fibra_100, categoria")
      .neq("nombre", "Añadir alimento")
      .order("nombre"),
    supabase
      .from("alimento_alternativas")
      .select("alimento_id, nombre, gramos, orden")
      .order("orden"),
  ]);

  return (
    <CatalogoAlimentos
      alimentos={(alimentos ?? []) as Alimento[]}
      alternativas={(alternativas ?? []) as Alternativa[]}
    />
  );
}
