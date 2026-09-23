import type { crearClienteServidor } from "@/lib/supabase/servidor";
import type { ContadoresPanel } from "@/componentes/SeccionesPanel";

/**
 * Lo pendiente de la sección Clientes: invitaciones sin usar y leads sin
 * contestar. Lo carga cada página y no el layout, porque en Next 16 los
 * layouts no se vuelven a pintar al navegar y el número se quedaría
 * congelado en el de la primera visita.
 */
export async function contadoresPanel(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>
): Promise<ContadoresPanel> {
  const [{ count: invitaciones }, { count: leads }] = await Promise.all([
    supabase
      .from("invitaciones")
      .select("id", { count: "exact", head: true })
      .eq("usada", false),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("estado", "nuevo"),
  ]);
  return { invitaciones: invitaciones ?? 0, leads: leads ?? 0 };
}
