import { cargarContextoCliente, textoChat, textoEstiloLiviu } from "@/lib/contextoIA";
import { ERROR_IA, pedirIA, soloEntrenador } from "@/lib/ia";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Mensajes redactados con la voz de Liviu, que él revisa antes de enviar:
 *  · "responder": la respuesta al último mensaje del cliente en el chat;
 *  · "reenganche": un mensaje para alguien que se está enfriando (o para
 *    felicitarle), a partir del motivo que ha detectado Hoy.
 */

const FORMATO = {
  type: "object",
  properties: { mensaje: { type: "string" } },
  required: ["mensaje"],
  additionalProperties: false,
} as const;

const BASE = `Eres el ayudante de Liviu, entrenador personal y dueño de LivFit. Redactas mensajes que Liviu enviará a sus clientes por el chat de la app, con su voz: tutea, cercano, motivador y directo, en español de España, con algún emoji sin pasarte. Liviu lo revisa antes de enviarlo, así que escribe el mensaje tal cual lo mandaría él: sin saludos de plantilla, sin firmas, sin explicarle nada a Liviu. Usa el nombre de pila del cliente. Mensajes cortos (de 1 a 4 frases), como se escribe por WhatsApp.

Tienes delante todo lo que la app sabe de ese cliente: úsalo para que el mensaje sea suyo, con algún detalle concreto (lo que entrenó, un récord, lo que preguntó), no genérico. Nunca inventes datos que no estén ahí. Nada de diagnósticos de salud: si el cliente habla de dolor, medicación o algo médico, el mensaje le dice que lo hablaréis (o le pide más detalles), sin dar un diagnóstico. No prometas cambios concretos en su plan: si hay que cambiar algo, di que se lo vas a mirar.`;

const MODOS = {
  responder: `Ahora toca responder a lo último que ha escrito el cliente en el chat. Responde a lo que pregunta o cuenta, con lo que sabes de él.`,
  reenganche: `Ahora toca escribirle por iniciativa de Liviu. La app ha detectado esto: se explica en el motivo. Si se está enfriando (entrena menos, no marca comidas, no se pesa), el mensaje le reengancha sin reñirle ni hacerle sentir culpable: interésate por él, recuérdale algo que hizo bien y proponle un paso pequeño y concreto para esta semana. Si el motivo es algo bueno (un récord, una semana perfecta), felicítale de forma concreta.`,
} as const;

export async function POST(request: Request) {
  const acceso = await soloEntrenador();
  if ("error" in acceso) return acceso.error;
  const { supabase } = acceso;

  const cuerpo = (await request.json().catch(() => ({}))) as {
    clienteId?: string;
    modo?: keyof typeof MODOS;
    motivo?: string;
    anterior?: string;
  };
  if (!cuerpo.clienteId || !cuerpo.modo || !(cuerpo.modo in MODOS)) {
    return Response.json({ error: "Faltan datos" }, { status: 400 });
  }

  const [ctx, chat, estilo] = await Promise.all([
    cargarContextoCliente(supabase, cuerpo.clienteId, { diasEntrenos: 14 }),
    textoChat(supabase, cuerpo.clienteId, cuerpo.modo === "responder" ? 25 : 8),
    textoEstiloLiviu(supabase),
  ]);
  if (!ctx) return Response.json({ error: "Cliente no encontrado" }, { status: 404 });

  const peticion = [
    chat,
    cuerpo.modo === "reenganche" && cuerpo.motivo ? `MOTIVO QUE HA DETECTADO LA APP: ${cuerpo.motivo.slice(0, 300)}` : "",
    cuerpo.anterior
      ? `Ya le propusiste este mensaje a Liviu y quiere otro distinto (otro enfoque, no el mismo con otras palabras):\n"${cuerpo.anterior.slice(0, 1000)}"`
      : "",
    "Escribe el mensaje.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const r = await pedirIA<{ mensaje: string }>({
    etiqueta: `mensaje-${cuerpo.modo}`,
    effort: "medium",
    schema: FORMATO,
    system: [
      { type: "text", text: `${BASE}\n\n${MODOS[cuerpo.modo]}` },
      ...(estilo ? [{ type: "text" as const, text: estilo }] : []),
      { type: "text", text: `${ctx.estable}\n\n${ctx.hoy}` },
    ],
    messages: [{ role: "user", content: peticion }],
  });
  if (!r.ok || !String(r.datos.mensaje ?? "").trim()) return Response.json({ error: ERROR_IA }, { status: 502 });
  return Response.json({ mensaje: String(r.datos.mensaje).trim() });
}
