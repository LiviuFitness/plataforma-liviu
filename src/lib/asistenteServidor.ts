import { clienteServicio } from "@/lib/push";
import { LIMITE_DIARIO, inicioDiaMadrid, type AlternativaAsistente, type MensajeAsistente } from "@/lib/asistenteDieta";

/**
 * Lo del asistente que solo hace el servidor: contar las preguntas del día
 * y guardar cada pregunta con su respuesta (con la clave de servicio: el
 * cliente no puede escribir respuestas).
 */

export const CAMPOS_ASISTENTE = "id, rol, texto, alternativas, derivado, creado_en";

export async function preguntasDeHoy(clienteId: string): Promise<number> {
  const { count } = await clienteServicio()
    .from("asistente_mensajes")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .eq("rol", "cliente")
    .gte("creado_en", inicioDiaMadrid().toISOString());
  return count ?? 0;
}

export const limiteAgotado = () =>
  Response.json(
    { error: "Por hoy ya has hecho todas tus preguntas. Mañana más, o escríbele a Liviu por el chat.", restantes: 0 },
    { status: 429 }
  );

export async function guardarConversacion(
  clienteId: string,
  pregunta: string,
  r: { respuesta: string; alternativas: AlternativaAsistente[]; derivar: boolean }
): Promise<{ pregunta: MensajeAsistente | null; respuesta: MensajeAsistente }> {
  const ahora = Date.now();
  const { data, error } = await clienteServicio()
    .from("asistente_mensajes")
    .insert([
      /* Las dos filas con las mismas columnas: al insertar varias a la vez,
       * lo que falta en una llega como NULL (no como su valor por defecto)
       * y "derivado" no admite NULL — se perdían las dos. */
      {
        cliente_id: clienteId,
        rol: "cliente",
        texto: pregunta.slice(0, 4000),
        alternativas: null,
        derivado: false,
        creado_en: new Date(ahora).toISOString(),
      },
      {
        cliente_id: clienteId,
        rol: "asistente",
        texto: r.respuesta.slice(0, 4000),
        alternativas: r.alternativas.length > 0 ? r.alternativas : null,
        derivado: r.derivar,
        creado_en: new Date(ahora + 1).toISOString(),
      },
    ])
    .select(CAMPOS_ASISTENTE);
  if (error) console.error("[asistente] guardar", error.message);
  const lista = ((data ?? []) as MensajeAsistente[]).sort((a, b) => a.creado_en.localeCompare(b.creado_en));
  return {
    pregunta: lista.find((m) => m.rol === "cliente") ?? null,
    respuesta: lista.find((m) => m.rol === "asistente") ?? {
      id: `local-${ahora}`,
      rol: "asistente",
      texto: r.respuesta,
      alternativas: r.alternativas,
      derivado: r.derivar,
      creado_en: new Date(ahora + 1).toISOString(),
    },
  };
}

export { LIMITE_DIARIO };
