import { clienteServicio, enviarAvisos, pushDisponible } from "@/lib/push";

export const dynamic = "force-dynamic";

const DIA = 86400000;

/**
 * Avisos del día. Lo llama el cron de Vercel una vez por la mañana (ver
 * vercel.json), protegido con CRON_SECRET:
 *  · Entreno: a quien lleva 2 días sin entrenar (y no más de 10: a partir
 *    de ahí es una conversación tuya, no un recordatorio automático).
 *  · Peso: los lunes, a quien aún no se ha pesado ese día.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  if (!pushDisponible()) return Response.json({ ok: true, enviados: 0, motivo: "sin claves" });

  const db = clienteServicio();
  const ahora = Date.now();
  const hoyMadrid = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const esLunes =
    new Date().toLocaleDateString("en-GB", { weekday: "long", timeZone: "Europe/Madrid" }) === "Monday";

  const [{ data: clientes }, { data: sesiones }, { data: rutinas }, { data: pesosHoy }] = await Promise.all([
    db.from("profiles").select("id, nombre, fecha_alta").eq("rol", "cliente").eq("estado", "activo"),
    db
      .from("sesiones")
      .select("cliente_id, fecha_inicio")
      .gte("fecha_inicio", new Date(ahora - 12 * DIA).toISOString())
      .order("fecha_inicio", { ascending: false }),
    db.from("rutinas").select("cliente_id").eq("activa", true).not("cliente_id", "is", null),
    db.from("medidas").select("cliente_id").eq("fecha", hoyMadrid).not("peso", "is", null),
  ]);

  const conRutina = new Set((rutinas ?? []).map((r) => r.cliente_id as string));
  const ultima = new Map<string, number>();
  for (const s of sesiones ?? []) {
    if (!ultima.has(s.cliente_id)) ultima.set(s.cliente_id, new Date(s.fecha_inicio).getTime());
  }
  const pila = new Map((clientes ?? []).map((c) => [c.id as string, String(c.nombre).split(" ")[0]]));

  /* Entreno */
  const paraEntreno = (clientes ?? [])
    .filter((c) => conRutina.has(c.id))
    .filter((c) => {
      const t = ultima.get(c.id);
      /* Sin sesiones en 12 días: o es nuevo (y aún no ha empezado) o
       * lleva mucho parado; en los dos casos no toca un aviso automático */
      if (t === undefined) return false;
      const dias = Math.floor((ahora - t) / DIA);
      return dias >= 2 && dias <= 10;
    })
    .map((c) => c.id as string);
  const enviadosEntreno = await enviarAvisos(paraEntreno, "entreno", (id) => ({
    titulo: `¿Entrenamos hoy, ${pila.get(id)}? 💪`,
    cuerpo: "Llevas un par de días sin entrenar. Tu próximo entreno te espera en la app.",
    url: "/inicio",
    etiqueta: "entreno",
  }));

  /* Peso, los lunes */
  let enviadosPeso = 0;
  if (esLunes) {
    const yaPesados = new Set((pesosHoy ?? []).map((m) => m.cliente_id as string));
    const paraPeso = (clientes ?? []).map((c) => c.id as string).filter((id) => !yaPesados.has(id));
    enviadosPeso = await enviarAvisos(paraPeso, "peso", () => ({
      titulo: "Toca pesarse ⚖️",
      cuerpo: "En ayunas y después del baño. Apúntalo en Inicio en un momento.",
      url: "/inicio",
      etiqueta: "peso",
    }));
  }

  return Response.json({ ok: true, entreno: enviadosEntreno, peso: enviadosPeso, momento: new Date().toISOString() });
}
