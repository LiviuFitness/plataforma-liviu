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
    /* Sin filtrar por fecha: una invitación caducada desaparecía de la
     * pantalla sin dejar rastro. El cliente veía "enlace no válido" y
     * aquí no había nada pendiente que explicara por qué. */
    supabase
      .from("invitaciones")
      .select("*")
      .eq("usada", false)
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

  /* Una sola lectura del reloj para toda la pantalla: los días sin
   * entrenar, los días desde el alta y lo que le queda a cada invitación
   * se cuentan contra el mismo instante. Además baja como dato al
   * componente de cliente, para que el navegador no vuelva a mirar la
   * hora al hidratar y diga "5 días" donde el servidor dijo "6". */
  const ahora = new Date().getTime();

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
        Math.floor((ahora - new Date(s.fecha_inicio).getTime()) / 86400000)
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

  // Días desde el alta — para no marcar "riesgo" a quien acaba de entrar
  // y todavía no ha tenido tiempo de registrar su primera sesión.
  const diasDesdeAlta = new Map<string, number>();
  for (const c of clientes ?? []) {
    diasDesdeAlta.set(
      c.id,
      Math.floor((ahora - new Date(c.fecha_alta).getTime()) / 86400000)
    );
  }

  return (
    <ListaClientes
      clientes={(clientes ?? []) as Perfil[]}
      adherencias={Object.fromEntries(mapaAdh)}
      alertas={Object.fromEntries(numAlertas)}
      diasSinEntrenar={Object.fromEntries(diasSinEntrenar)}
      diasDesdeAlta={Object.fromEntries(diasDesdeAlta)}
      chatSinLeer={Object.fromEntries(chatSinLeer)}
      invitaciones={(invitaciones ?? []) as Invitacion[]}
      ahora={ahora}
    />
  );
}
