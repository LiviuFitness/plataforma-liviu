import Link from "next/link";
import {
  CalendarCheck,
  ChevronRight,
  Inbox,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Avatar, PuntoEstado } from "@/componentes/ui";
import type { Alerta } from "@/lib/tipos";

interface RecordSemana {
  cliente_id: string;
  nombre: string;
  ejercicio: string;
  kg_nuevo: number;
  kg_previo: number;
}

export const dynamic = "force-dynamic";

interface Riesgo {
  clienteId: string;
  nombre: string;
  score: number;
  motivos: string[];
}

const DIA_MS = 86400000;

/** Pantalla "Hoy": estado del estudio de un vistazo. */
export default async function PaginaHoy() {
  const supabase = await crearClienteServidor();

  const [
    { data: clientes },
    { data: adherencias },
    { data: alertas },
    { data: sesiones },
    { data: medidas },
    { data: records },
    { count: leadsNuevos },
    { data: mensajes },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nombre, fecha_alta")
      .eq("rol", "cliente")
      .eq("estado", "activo")
      .order("nombre"),
    supabase.from("v_adherencia").select("cliente_id, adherencia"),
    supabase.from("v_alertas").select("cliente_id, nombre, tipo, mensaje"),
    supabase
      .from("sesiones")
      .select("cliente_id, fecha_inicio, sensacion")
      .order("fecha_inicio", { ascending: false })
      .limit(300),
    supabase
      .from("medidas")
      .select("cliente_id, fecha")
      .order("fecha", { ascending: false })
      .limit(300),
    supabase
      .from("v_records_semana")
      .select("*")
      .order("kg_nuevo", { ascending: false })
      .limit(20),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("estado", "nuevo"),
    supabase
      .from("mensajes")
      .select("cliente_id, remitente")
      .order("creado_en", { ascending: false })
      .limit(500),
  ]);

  const listaClientes = clientes ?? [];
  const listaAlertas = (alertas ?? []) as Alerta[];

  // Adherencia media de los clientes activos
  const mapaAdh = new Map(
    (adherencias ?? []).map((a) => [a.cliente_id, a.adherencia as number])
  );
  const media =
    listaClientes.length > 0
      ? Math.round(
          listaClientes.reduce((s, c) => s + (mapaAdh.get(c.id) ?? 0), 0) /
            listaClientes.length
        )
      : 0;

  // Sesiones y última medida por cliente
  const sesionesPorCliente = new Map<
    string,
    { fecha: string; sensacion: number | null }[]
  >();
  for (const s of sesiones ?? []) {
    const lista = sesionesPorCliente.get(s.cliente_id) ?? [];
    lista.push({ fecha: s.fecha_inicio, sensacion: s.sensacion });
    sesionesPorCliente.set(s.cliente_id, lista);
  }
  const ultimaMedida = new Map<string, string>();
  for (const m of medidas ?? []) {
    if (!ultimaMedida.has(m.cliente_id)) ultimaMedida.set(m.cliente_id, m.fecha);
  }

  /* "Última actividad" se ha ido con la lista que lo usaba: ahora la
   * rejilla de la semana enseña lo mismo y con más detalle. */

  // Alertas agrupadas por cliente
  const alertasPorCliente = new Map<string, Alerta[]>();
  for (const a of listaAlertas) {
    const lista = alertasPorCliente.get(a.cliente_id) ?? [];
    lista.push(a);
    alertasPorCliente.set(a.cliente_id, lista);
  }

  /* --------- Radar de riesgo de abandono ---------
     Puntúa señales negativas por cliente con los datos que ya hay:
     inactividad, adherencia baja, sensaciones bajas, sin pesarse
     y peso estancado. No usa IA: es un cálculo directo. */
  const riesgos: Riesgo[] = listaClientes.map((c) => {
    const motivos: string[] = [];
    let score = 0;

    const ses = sesionesPorCliente.get(c.id) ?? [];
    if (ses.length === 0) {
      const diasAlta = c.fecha_alta
        ? Math.floor((Date.now() - new Date(c.fecha_alta).getTime()) / DIA_MS)
        : 0;
      if (diasAlta >= 7) {
        score += 2;
        motivos.push("Nunca ha registrado una sesión");
      }
    } else {
      const dias = Math.floor(
        (Date.now() - new Date(ses[0].fecha).getTime()) / DIA_MS
      );
      if (dias >= 7) {
        score += 3;
        motivos.push(`Sin entrenar ${dias} días`);
      } else if (dias >= 5) {
        score += 2;
        motivos.push(`Sin entrenar ${dias} días`);
      } else if (dias >= 3) {
        score += 1;
        motivos.push(`Sin entrenar ${dias} días`);
      }
      const sens = ses
        .map((x) => x.sensacion)
        .filter((v): v is number => v !== null)
        .slice(0, 3);
      if (sens.length >= 2 && sens.reduce((a, b) => a + b, 0) / sens.length <= 2.4) {
        score += 2;
        motivos.push("Sensaciones bajas en sus últimos entrenos");
      }
    }

    const adh = mapaAdh.get(c.id) ?? 0;
    if (adh < 40) {
      score += 2;
      motivos.push(`Adherencia ${adh}% (últimas 4 semanas)`);
    } else if (adh < 70) {
      score += 1;
      motivos.push(`Adherencia ${adh}% (últimas 4 semanas)`);
    }

    const medida = ultimaMedida.get(c.id);
    if (medida && (Date.now() - new Date(medida).getTime()) / DIA_MS >= 14) {
      score += 1;
      motivos.push("Sin registrar peso en 2+ semanas");
    }

    for (const a of alertasPorCliente.get(c.id) ?? []) {
      if (a.tipo === "peso_estancado") {
        score += 1;
        motivos.push(a.mensaje);
      }
      if (a.tipo === "sin_valoracion") motivos.push(a.mensaje);
    }

    return { clienteId: c.id, nombre: c.nombre, score, motivos };
  });

  const enRiesgo = riesgos
    .filter((r) => r.score >= 3)
    .sort((a, b) => b.score - a.score);

  // Avisos positivos: semanas completadas listas para avanzar
  const listosParaAvanzar = listaAlertas.filter((a) => a.tipo === "semana_completa");
  const recordsSemana = (records ?? []) as RecordSemana[];

  /* Chat pendiente: el último mensaje del hilo lo mandó el cliente.
   * Mismo criterio que la lista de clientes, para que no digan cosas
   * distintas. */
  const chatSinResponder = new Map<string, boolean>();
  for (const m of mensajes ?? []) {
    if (!chatSinResponder.has(m.cliente_id)) {
      chatSinResponder.set(m.cliente_id, m.remitente === "cliente");
    }
  }
  const esperandoRespuesta = listaClientes.filter((c) => chatSinResponder.get(c.id));

  /* La semana, cliente a cliente: siete casillas de lunes a domingo.
   * Sustituye a "Actividad reciente", que repetía los mismos nombres que
   * "Para hoy" con otras palabras. */
  const lunes = new Date();
  lunes.setHours(0, 0, 0, 0);
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  const lunesPasado = new Date(lunes.getTime() - 7 * DIA_MS);

  const semanaPorCliente = new Map<string, boolean[]>();
  let entrenosEstaSemana = 0;
  let entrenosSemanaPasada = 0;
  for (const c of listaClientes) semanaPorCliente.set(c.id, [false, false, false, false, false, false, false]);
  for (const ses of sesiones ?? []) {
    const t = new Date(ses.fecha_inicio);
    if (t >= lunes) {
      entrenosEstaSemana++;
      const fila = semanaPorCliente.get(ses.cliente_id);
      if (fila) fila[(t.getDay() + 6) % 7] = true;
    } else if (t >= lunesPasado) {
      entrenosSemanaPasada++;
    }
  }

  const fecha = new Date().toLocaleDateString("es-ES", { weekday: "long" });

  const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

  return (
    <>
      <h1 className="h1">Hoy</h1>
      <div className="sub mb-4">{fecha} — así va tu estudio</div>

      {/* Las cifras, cada una con de qué habla. Un número solo ("6%") no
        * dice si eso es bueno, malo o normal. En el móvil van compactas en
        * fila: apiladas a tarjeta entera se comían la pantalla antes de
        * enseñar nada que hacer. */}
      <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3 mb-5">
        <div className="tarjeta !mb-0 flex-1 min-w-0 !p-3 sm:!p-4 text-center sm:text-left">
          <div className="titulo-tarjeta !text-[10px] sm:!text-[11.5px]">Clientes</div>
          <div className="num-grande !text-[23px] sm:!text-[30px]">
            {listaClientes.length}
          </div>
          <div className="hidden sm:block text-atenuado text-[12px] mt-1.5 leading-snug">
            {esperandoRespuesta.length === 0
              ? "Nadie esperando respuesta"
              : `${esperandoRespuesta.length} esperando respuesta en el chat`}
          </div>
        </div>

        <div className="tarjeta !mb-0 flex-1 min-w-0 !p-3 sm:!p-4 text-center sm:text-left">
          <div className="titulo-tarjeta !text-[10px] sm:!text-[11.5px]">
            Entrenos
          </div>
          <div className="flex items-baseline gap-2 justify-center sm:justify-start flex-wrap">
            <span className="num-grande !text-[23px] sm:!text-[30px]">
              {entrenosEstaSemana}
            </span>
            {/* La comparación se calcula con las sesiones reales de las dos
              * semanas, no con la adherencia: mezclar métricas en una
              * flecha es la forma más fácil de mentir sin querer. */}
            {entrenosSemanaPasada > 0 && (
              <span
                className="hidden sm:flex items-center gap-0.5 text-[12px] font-semibold"
                style={{
                  color:
                    entrenosEstaSemana >= entrenosSemanaPasada
                      ? "var(--color-verde)"
                      : "var(--color-aviso)",
                }}
              >
                {entrenosEstaSemana >= entrenosSemanaPasada ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {entrenosEstaSemana - entrenosSemanaPasada > 0 ? "+" : ""}
                {entrenosEstaSemana - entrenosSemanaPasada}
              </span>
            )}
          </div>
          <div className="hidden sm:block text-atenuado text-[12px] mt-1.5 leading-snug">
            Esta semana · la pasada, {entrenosSemanaPasada}
          </div>
        </div>

        <div className="tarjeta !mb-0 flex-1 min-w-0 !p-3 sm:!p-4 text-center sm:text-left">
          <div className="titulo-tarjeta !text-[10px] sm:!text-[11.5px]">En riesgo</div>
          <div
            className={`num-grande !text-[23px] sm:!text-[30px] ${
              enRiesgo.length > 0 ? "text-peligro" : ""
            }`}
          >
            {enRiesgo.length}
          </div>
          <div className="hidden sm:block text-atenuado text-[12px] mt-1.5 leading-snug">
            Adherencia media {media}% · últimos 28 días
          </div>
        </div>
      </div>

      {/* Un lead sin contestar es lo único que caduca de verdad */}
      {(leadsNuevos ?? 0) > 0 && (
        <Link href="/leads" className="tarjeta tarjeta-acento !p-4 mb-5 flex items-center gap-3">
          <Inbox size={20} className="text-acento shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14.5px]">
              {leadsNuevos} {leadsNuevos === 1 ? "lead nuevo" : "leads nuevos"} sin
              contestar
            </div>
            <div className="text-atenuado text-[12.5px]">del QR de planes</div>
          </div>
          <ChevronRight size={16} className="text-atenuado shrink-0" />
        </Link>
      )}

      {/* Dos columnas en escritorio: a la izquierda lo que pide hacer
        * algo, a la derecha el pulso del estudio. Antes era una sola
        * columna de 760 px en mitad de la pantalla. En móvil se apila. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] lg:gap-x-5">
        <div>
          <div className="titulo-seccion">Para hoy</div>
          <div className="superficie px-4 mb-6">
            {enRiesgo.length === 0 && listosParaAvanzar.length === 0 && (
              <div className="text-atenuado text-[13.5px] py-4 text-center">
                Nada pendiente — todos al día.
              </div>
            )}

            {enRiesgo.map((r) => (
              <Link key={r.clienteId} href={`/clientes/${r.clienteId}`} className="fila">
                <Avatar nombre={r.nombre} tamano={34} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14.5px] leading-tight flex items-center gap-2">
                    {r.nombre}
                    <PuntoEstado nivel={r.score >= 5 ? "riesgo" : "atencion"} />
                  </div>
                  <div className="text-texto-2 text-[12.5px] break-words">{r.motivos[0]}</div>
                </div>
                <ChevronRight size={16} className="text-atenuado shrink-0" />
              </Link>
            ))}

            {listosParaAvanzar.map((a, i) => (
              <Link key={`av-${i}`} href={`/clientes/${a.cliente_id}`} className="fila">
                <Avatar nombre={a.nombre} tamano={34} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14.5px] leading-tight">{a.nombre}</div>
                  <div className="text-texto-2 text-[12.5px] break-words">{a.mensaje}</div>
                </div>
                <CalendarCheck size={17} className="text-acento shrink-0" />
              </Link>
            ))}
          </div>

          {esperandoRespuesta.length > 0 && (
            <>
              <div className="titulo-seccion">Te han escrito</div>
              <div className="superficie px-4 mb-6">
                {esperandoRespuesta.map((c) => (
                  <Link key={c.id} href={`/clientes/${c.id}?vista=chat`} className="fila">
                    <Avatar nombre={c.nombre} tamano={34} />
                    <span className="flex-1 min-w-0 text-[14px] font-semibold leading-tight">
                      {c.nombre}
                    </span>
                    <MessageCircle
                      size={16}
                      className="text-acento shrink-0"
                      fill="currentColor"
                    />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <div className="titulo-seccion">La semana</div>
          <div className="superficie px-4 mb-6">
            {listaClientes.length === 0 ? (
              <div className="text-atenuado text-[13.5px] py-3">
                Sin clientes todavía. Crea la primera desde Clientes › Invitaciones.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 py-2 border-b border-borde">
                  <span className="flex-1" />
                  {DIAS_SEMANA.map((d, i) => (
                    <span
                      key={i}
                      className="w-5 text-center text-atenuado text-[10.5px] font-bold"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                {listaClientes.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clientes/${c.id}`}
                    className="flex items-center gap-2 py-2"
                  >
                    <span className="flex-1 min-w-0 text-[13px] leading-tight break-words">
                      {c.nombre.split(" ")[0]}
                    </span>
                    {(semanaPorCliente.get(c.id) ?? []).map((hecho, i) => (
                      <span
                        key={i}
                        className="w-5 h-5 rounded-[6px] shrink-0"
                        style={{
                          background: hecho ? "var(--color-acento)" : "var(--color-campo)",
                          border: hecho ? "none" : "1px solid var(--color-borde-2)",
                          opacity: hecho ? 0.9 : 1,
                        }}
                      />
                    ))}
                  </Link>
                ))}
                <Link href="/clientes" className="fila text-acento text-[13px] !border-b-0">
                  Ver todos →
                </Link>
              </>
            )}
          </div>

          {recordsSemana.length > 0 && (
            <>
              <div className="titulo-seccion">Récords de la semana</div>
              <div className="superficie px-4 mb-6">
                {recordsSemana.slice(0, 5).map((rec, i) => (
                  <Link key={i} href={`/clientes/${rec.cliente_id}?vista=progreso`} className="fila">
                    <Trophy size={15} className="text-dorado shrink-0" />
                    <span className="flex-1 min-w-0 text-[13px] leading-snug">
                      <b>{rec.nombre.split(" ")[0]}</b>
                      <span className="text-texto-2"> — {rec.ejercicio}</span>
                    </span>
                    <span className="shrink-0 text-[13px]">
                      <span className="text-atenuado">{Number(rec.kg_previo)} → </span>
                      <b className="text-dorado">{Number(rec.kg_nuevo)} kg</b>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
