import { crearClienteServidor } from "@/lib/supabase/servidor";
import ListaClientes from "./ListaClientes";
import type { Invitacion, Perfil } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Pantalla "Clientes": listado, buscador e invitaciones. */
export default async function PaginaClientes() {
  const supabase = await crearClienteServidor();

  const [
    { data: clientes },
    { data: adherencias },
    { data: alertas },
    { data: invitaciones },
    { data: sesiones },
    { data: mensajes },
  ] = await Promise.all([
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
    supabase
      .from("sesiones")
      .select("cliente_id, fecha_inicio")
      .order("fecha_inicio", { ascending: false })
      .limit(300),
    supabase
      .from("mensajes")
      .select("cliente_id, remitente")
      .order("creado_en", { ascending: false })
      .limit(500),
  ]);

  const mapaAdh = new Map(
    (adherencias ?? []).map((a) => [a.cliente_id, a.adherencia as number])
  );
  const numAlertas = new Map<string, number>();
  for (const a of alertas ?? []) {
    numAlertas.set(a.cliente_id, (numAlertas.get(a.cliente_id) ?? 0) + 1);
  }

  // Semáforo de cumplimiento: días desde la última sesión de cada cliente
  const diasSinEntrenar = new Map<string, number>();
  for (const s of sesiones ?? []) {
    if (!diasSinEntrenar.has(s.cliente_id)) {
      diasSinEntrenar.set(
        s.cliente_id,
        Math.floor((Date.now() - new Date(s.fecha_inicio).getTime()) / 86400000)
      );
    }
  }

  // Chat pendiente de responder: el último mensaje del hilo lo mandó el cliente
  const chatSinLeer = new Map<string, boolean>();
  for (const m of mensajes ?? []) {
    if (!chatSinLeer.has(m.cliente_id)) {
      chatSinLeer.set(m.cliente_id, m.remitente === "cliente");
    }
  }

  return (
    <ListaClientes
      clientes={(clientes ?? []) as Perfil[]}
      adherencias={Object.fromEntries(mapaAdh)}
      alertas={Object.fromEntries(numAlertas)}
      diasSinEntrenar={Object.fromEntries(diasSinEntrenar)}
      chatSinLeer={Object.fromEntries(chatSinLeer)}
      invitaciones={(invitaciones ?? []) as Invitacion[]}
    />
  );
}
