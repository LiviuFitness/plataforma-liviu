import type { SupabaseClient } from "@supabase/supabase-js";
import { SELECT_DIETA_COMPLETA, type Alimento, type Alternativa, type ComidaEstructurada } from "@/lib/dietas";
import { aRutinaUI, SELECT_RUTINA_COMPLETA, type FilaRutina } from "@/lib/rutinas";
import { textoCatalogo, textoCliente, textoHoy } from "@/lib/asistenteDieta";
import type { Dieta, RutinaUI } from "@/lib/tipos";

/**
 * Todo lo que la IA necesita saber de un cliente, en texto: su dieta, sus
 * equivalencias, lo que no come, su rutina, sus entrenos, sus pesajes y
 * lo que ha comido hoy. Lo usan el asistente (con la sesión del cliente)
 * y las herramientas del entrenador (con la suya: RLS le deja ver todo).
 */

export interface PlanIA {
  dieta: Dieta;
  comidas: ComidaEstructurada[];
}

export interface ContextoCliente {
  perfil: { nombre: string; objetivo: string | null; sexo: string | null; fechaNacimiento: string | null; alturaCm: number | null };
  catalogo: Alimento[];
  /** Instrucciones + catálogo van primero y se cachean (iguales para todos) */
  textoCatalogo: string;
  /** Lo de este cliente que no cambia en el día (se cachea aparte) */
  estable: string;
  /** Lo que cambia durante el día (hora, comidas hechas, entrenos, pesos) */
  hoy: string;
  entreno: PlanIA | null;
  descanso: PlanIA | null;
  rutina: RutinaUI | null;
  excluidosIds: string[];
  excluidosNombres: string[];
  ultimoPeso: number | null;
}

const aPlan = (fila: unknown): PlanIA | null => {
  const dieta = fila as Dieta | null;
  if (!dieta) return null;
  const comidas = ((dieta.dieta_comidas ?? []) as unknown as ComidaEstructurada[])
    .slice()
    .sort((a, b) => a.orden - b.orden);
  return { dieta, comidas };
};

export async function cargarContextoCliente(
  supabase: SupabaseClient,
  clienteId: string,
  { diasEntrenos = 7 }: { diasEntrenos?: number } = {}
): Promise<ContextoCliente | null> {
  const dietaDe = (tipo: "entreno" | "descanso") =>
    supabase
      .from("dietas")
      .select(SELECT_DIETA_COMPLETA)
      .eq("cliente_id", clienteId)
      .eq("activa", true)
      .eq("tipo", tipo)
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle();
  const desde = new Date();
  desde.setDate(desde.getDate() - diasEntrenos);
  const hoyMadrid = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

  const [
    { data: perfil },
    { data: filaEntreno },
    { data: filaDescanso },
    { data: catalogo },
    { data: excluidos },
    { data: filaRutina },
    { data: sesiones },
    { data: medidas },
    { data: hechas },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("nombre, objetivo, sexo, fecha_nacimiento, altura_cm")
      .eq("id", clienteId)
      .maybeSingle(),
    dietaDe("entreno"),
    dietaDe("descanso"),
    supabase
      .from("alimentos")
      .select("id, nombre, kcal_100, prot_100, carb_100, gras_100, fibra_100, categoria")
      .neq("nombre", "Añadir alimento")
      .order("nombre")
      .order("id"),
    supabase.from("alimentos_excluidos").select("alimento_id, alimentos ( nombre )").eq("cliente_id", clienteId),
    supabase
      .from("rutinas")
      .select(SELECT_RUTINA_COMPLETA)
      .eq("cliente_id", clienteId)
      .eq("activa", true)
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sesiones")
      .select("fecha_inicio, dia_id")
      .eq("cliente_id", clienteId)
      .gte("fecha_inicio", desde.toISOString())
      .order("fecha_inicio"),
    supabase
      .from("medidas")
      .select("peso, fecha")
      .eq("cliente_id", clienteId)
      .not("peso", "is", null)
      .order("fecha", { ascending: false })
      .limit(8),
    supabase.from("comidas_hechas").select("comida").eq("cliente_id", clienteId).eq("fecha", hoyMadrid),
  ]);
  if (!perfil) return null;

  const rutina = filaRutina ? aRutinaUI(filaRutina as unknown as FilaRutina) : null;
  const nombreDia = new Map((rutina?.dias ?? []).map((d) => [d.id, d.nombre]));
  const entreno = aPlan(filaEntreno);
  const descanso = aPlan(filaDescanso);

  const nombresPorId = new Map<string, string>();
  for (const c of [...(entreno?.comidas ?? []), ...(descanso?.comidas ?? [])]) {
    for (const i of c.dieta_comida_alimentos ?? []) if (i.alimentos) nombresPorId.set(i.alimento_id, i.alimentos.nombre);
  }
  let equivalencias: (Alternativa & { alimento: string })[] = [];
  if (nombresPorId.size > 0) {
    const { data: alt } = await supabase
      .from("alimento_alternativas")
      .select("alimento_id, nombre, gramos, orden")
      .in("alimento_id", [...nombresPorId.keys()])
      .order("orden");
    equivalencias = ((alt ?? []) as Alternativa[])
      .map((a) => ({ ...a, alimento: nombresPorId.get(a.alimento_id) ?? "" }))
      .sort((a, b) => a.alimento.localeCompare(b.alimento, "es") || a.orden - b.orden);
  }
  const excluidosNombres = (excluidos ?? [])
    .map((e) => (e.alimentos as unknown as { nombre: string } | null)?.nombre)
    .filter((x): x is string => !!x);
  const pesos = (medidas ?? []).map((m) => ({ fecha: String(m.fecha), peso: Number(m.peso) }));

  const cat = (catalogo ?? []) as Alimento[];
  return {
    perfil: {
      nombre: String(perfil.nombre ?? ""),
      objetivo: (perfil.objetivo as string | null) ?? null,
      sexo: (perfil.sexo as string | null) ?? null,
      fechaNacimiento: (perfil.fecha_nacimiento as string | null) ?? null,
      alturaCm: perfil.altura_cm === null ? null : Number(perfil.altura_cm),
    },
    catalogo: cat,
    textoCatalogo: textoCatalogo(cat),
    estable: textoCliente({
      nombre: String(perfil.nombre ?? ""),
      objetivo: perfil.objetivo as string | null,
      sexo: perfil.sexo as string | null,
      entreno,
      descanso,
      equivalencias,
      excluidos: excluidosNombres,
      rutina,
    }),
    hoy: textoHoy({
      hoy: new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" }),
      hora: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }),
      comidasHechas: (hechas ?? []).map((h) => String(h.comida)),
      diasEntrenos,
      entrenos: (sesiones ?? []).map((x) => ({
        fecha: new Date(x.fecha_inicio as string).toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "short",
          timeZone: "Europe/Madrid",
        }),
        dia: nombreDia.get(x.dia_id as string) ?? "entreno",
      })),
      pesos: pesos.slice(0, diasEntrenos > 7 ? 8 : 5),
    }),
    entreno,
    descanso,
    rutina,
    excluidosIds: (excluidos ?? []).map((e) => String(e.alimento_id)),
    excluidosNombres,
    ultimoPeso: pesos[0]?.peso ?? null,
  };
}

/** "Hace 3 días" / "hoy" para fechas de mensajes */
export function haceCuanto(iso: string, ahora = new Date()): string {
  const dias = Math.floor((ahora.getTime() - new Date(iso).getTime()) / 86400000);
  return dias <= 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`;
}

/** Los últimos mensajes del chat con Liviu, en texto */
export async function textoChat(supabase: SupabaseClient, clienteId: string, n = 20): Promise<string> {
  const { data } = await supabase
    .from("mensajes")
    .select("remitente, texto, imagen, creado_en")
    .eq("cliente_id", clienteId)
    .order("creado_en", { ascending: false })
    .limit(n);
  const lista = (data ?? []).reverse();
  if (lista.length === 0) return "CHAT CON LIVIU: todavía no se han escrito.";
  const ahora = new Date();
  return `CHAT CON LIVIU (del más antiguo al más reciente)\n${lista
    .map(
      (m) =>
        `[${haceCuanto(m.creado_en as string, ahora)}] ${m.remitente === "entrenador" ? "Liviu" : "Cliente"}: ${
          String(m.texto ?? "").trim() || (m.imagen ? "(foto)" : "")
        }`
    )
    .join("\n")}`;
}

/** Cómo escribe Liviu: sus últimos mensajes a clientes, para imitar su tono */
export async function textoEstiloLiviu(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from("mensajes")
    .select("texto")
    .eq("remitente", "entrenador")
    .not("texto", "is", null)
    .order("creado_en", { ascending: false })
    .limit(40);
  const ejemplos = (data ?? [])
    .map((m) => String(m.texto ?? "").trim())
    .filter((t) => t.length >= 15 && !t.startsWith("[guia:"))
    .slice(0, 12);
  if (ejemplos.length === 0) return "";
  return `ASÍ ESCRIBE LIVIU (mensajes reales suyos a clientes, para imitar su tono, no su contenido)\n${ejemplos
    .map((t) => `- ${t.replace(/\n+/g, " ")}`)
    .join("\n")}`;
}
