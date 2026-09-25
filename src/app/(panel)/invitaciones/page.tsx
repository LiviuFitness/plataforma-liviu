import { crearClienteServidor } from "@/lib/supabase/servidor";
import SeccionesPanel from "@/componentes/SeccionesPanel";
import { contadoresPanel } from "@/lib/contadoresPanel";
import Invitaciones from "./Invitaciones";
import type { Invitacion } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Invitaciones: crear el enlace de alta y seguir a quien no ha entrado. */
export default async function PaginaInvitaciones() {
  const supabase = await crearClienteServidor();

  const [{ data: invitaciones }, contadores, { data: clientes }] = await Promise.all([
    /* Sin filtrar por fecha: una invitación caducada desaparecía sin
     * dejar rastro, y el cliente veía "enlace no válido" sin que aquí
     * hubiera nada pendiente que explicara por qué. */
    supabase
      .from("invitaciones")
      .select("*")
      .eq("usada", false)
      .order("creada_en", { ascending: false }),
    contadoresPanel(supabase),
    supabase.from("profiles").select("email").eq("rol", "cliente"),
  ]);

  const ahora = new Date().getTime();

  return (
    <>
      <SeccionesPanel grupo="personas" contadores={contadores} />
      <Invitaciones
        invitaciones={(invitaciones ?? []) as Invitacion[]}
        emailsClientes={(clientes ?? []).map((c) => String(c.email ?? "").toLowerCase()).filter(Boolean)}
        ahora={ahora}
      />
    </>
  );
}
