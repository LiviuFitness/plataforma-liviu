import { clienteServicio, enviarAvisos, pushDisponible } from "@/lib/push";
import { proximaRenovacion } from "@/lib/renovaciones";
import type { Plan } from "@/lib/tipos";

export const dynamic = "force-dynamic";

const DIA = 86400000;

/**
 * Avisos del día. Lo llama el cron de Vercel una vez por la mañana (ver
 * vercel.json), protegido con CRON_SECRET:
 *  · Entreno: a quien lleva 2 días sin entrenar (y no más de 10: a partir
 *    de ahí es una conversación tuya, no un recordatorio automático).
 *  · Peso: los lunes, a quien aún no se ha pesado ese día.
 *  · Cuestionario: los domingos, a quien aún no ha contestado el de
 *    esa semana (así el lunes, en la ronda, están todas las respuestas).
 *  · Cobros: al entrenador, si hoy renueva alguien que aún no ha pagado.
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
  const diaSemana = new Date().toLocaleDateString("en-GB", { weekday: "long", timeZone: "Europe/Madrid" });
  const esLunes = diaSemana === "Monday";
  const esDomingo = diaSemana === "Sunday";

  const [{ data: clientes }, { data: sesiones }, { data: rutinas }, { data: pesosHoy }] = await Promise.all([
    db.from("profiles").select("id, nombre, fecha_alta, plan").eq("rol", "cliente").eq("estado", "activo"),
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

  /* Cuestionario semanal, los domingos */
  let enviadosRevision = 0;
  if (esDomingo) {
    const [a, m, d] = hoyMadrid.split("-").map(Number);
    const lunes = new Date(Date.UTC(a, m - 1, d - 6)).toISOString().slice(0, 10);
    const [{ count: preguntas }, { data: respondidos }] = await Promise.all([
      db.from("preguntas_revision").select("id", { count: "exact", head: true }).eq("activa", true),
      db.from("respuestas_revision").select("cliente_id").eq("semana", lunes),
    ]);
    if ((preguntas ?? 0) > 0) {
      const ya = new Set((respondidos ?? []).map((r) => r.cliente_id as string));
      enviadosRevision = await enviarAvisos(
        (clientes ?? []).map((c) => c.id as string).filter((id) => !ya.has(id)),
        "revision",
        (id) => ({
          titulo: `¿Cómo ha ido tu semana, ${pila.get(id)}?`,
          cuerpo: "Cuéntaselo a tu entrenador en un minuto para la revisión del lunes.",
          url: "/mi-progreso",
          etiqueta: "revision",
        })
      );
    }
  }

  /* Cobros de hoy, al entrenador */
  let enviadosCobros = 0;
  const [a, m, d] = hoyMadrid.split("-").map(Number);
  const hoyFecha = new Date(a, m - 1, d);
  const renuevanHoy = (clientes ?? []).filter((c) => {
    if (!c.fecha_alta) return false;
    const r = proximaRenovacion(String(c.fecha_alta), c.plan as Plan | null, hoyFecha);
    return r?.enDias === 0;
  });
  if (renuevanHoy.length > 0) {
    const hace10 = new Date(Date.UTC(a, m - 1, d - 10)).toISOString().slice(0, 10);
    const { data: pagos } = await db
      .from("pagos")
      .select("cliente_id, importe, fecha")
      .in("cliente_id", renuevanHoy.map((c) => c.id as string))
      .order("fecha", { ascending: false });
    const pagado = new Set((pagos ?? []).filter((p) => p.fecha >= hace10).map((p) => p.cliente_id as string));
    const ultimoImporte = new Map<string, number>();
    for (const p of pagos ?? []) if (!ultimoImporte.has(p.cliente_id)) ultimoImporte.set(p.cliente_id, Number(p.importe));
    const pendientes = renuevanHoy.filter((c) => !pagado.has(c.id));
    if (pendientes.length > 0) {
      const lista = pendientes
        .map((c) => {
          const imp = ultimoImporte.get(c.id);
          return `${c.nombre}${imp ? ` (${imp.toLocaleString("es-ES")} €)` : ""}`;
        })
        .join(", ");
      const { data: entrenadores } = await db.from("profiles").select("id").eq("rol", "entrenador");
      enviadosCobros = await enviarAvisos(
        (entrenadores ?? []).map((e) => e.id as string),
        "cobros",
        () => ({
          titulo: pendientes.length === 1 ? "Hoy renueva 1 cliente" : `Hoy renuevan ${pendientes.length} clientes`,
          cuerpo: `${lista}. Toca para marcar el pago.`,
          url: "/hoy",
          etiqueta: "cobros",
        })
      );
    }
  }

  return Response.json({
    ok: true,
    entreno: enviadosEntreno,
    peso: enviadosPeso,
    revision: enviadosRevision,
    cobros: enviadosCobros,
    momento: new Date().toISOString(),
  });
}
