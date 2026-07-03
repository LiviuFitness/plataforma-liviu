import { crearClienteServidor } from "@/lib/supabase/servidor";
import ListaClientes from "./ListaClientes";
import type { Invitacion, Perfil } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Pantalla "Clientes": listado, buscador e invitaciones. */
export default async function PaginaClientes() {
  const supabase = await crearClienteServidor();

  const [{ data: clientes }, { data: adherencias }, { data: alertas }, { data: invitaciones }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("rol", "cliente")
        .order("nombre"),
      supabase.from("v_adherencia").select("cliente_id, adherencia"),
      supabase.from("v_alertas").select("cliente_id"),
      supabase
        .from("invitaciones")
        .select("*")
        .eq("usada", false)
        .gt("expira", new Date().toISOString())
        .order("creada_en", { ascending: false }),
    ]);

  const mapaAdh = new Map(
    (adherencias ?? []).map((a) => [a.cliente_id, a.adherencia as number])
  );
  const numAlertas = new Map<string, number>();
  for (const a of alertas ?? []) {
    numAlertas.set(a.cliente_id, (numAlertas.get(a.cliente_id) ?? 0) + 1);
  }

  return (
    <ListaClientes
      clientes={(clientes ?? []) as Perfil[]}
      adherencias={Object.fromEntries(mapaAdh)}
      alertas={Object.fromEntries(numAlertas)}
      invitaciones={(invitaciones ?? []) as Invitacion[]}
    />
  );
}
