import Link from "next/link";
import { CalendarCheck, ChevronRight, Inbox } from "lucide-react";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { haceCuanto, PuntoEstado } from "@/componentes/ui";
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

  // Última actividad por cliente (sesión o medida, lo más reciente)
  const ultimaActividad = new Map<string, string>();
  for (const [id, ses] of sesionesPorCliente) ultimaActividad.set(id, ses[0].fecha);
  for (const [id, fecha] of ultimaMedida) {
    const previa = ultimaActividad.get(id);
    if (!previa || new Date(fecha) > new Date(previa))
      ultimaActividad.set(id, fecha);
  }

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

  const actividadOrdenada = listaClientes.slice().sort((a, b) => {
    const fa = ultimaActividad.get(a.id);
    const fb = ultimaActividad.get(b.id);
    if (!fa && !fb) return 0;
    if (!fa) return 1;
    if (!fb) return -1;
    return new Date(fb).getTime() - new Date(fa).getTime();
  });

  const fecha = new Date().toLocaleDateString("es-ES", { weekday: "long" });

  return (
    <>
      <h1 className="h1">Hoy</h1>
      <div className="sub mb-4">{fecha} — así va tu estudio</div>

      {/* Las cifras del estudio, arriba. Antes iban sueltas en mitad de
       * la pantalla, entre dos listas y sin título: un resumen colocado
       * después de lo que resume no lo lee nadie. */}
      <div className="superficie grid grid-cols-3 divide-x divide-borde mb-5">
        {[
          { n: `${listaClientes.length}`, t: "activos", alerta: false },
          { n: `${media}%`, t: "adherencia", alerta: false },
          { n: `${enRiesgo.length}`, t: "en riesgo", alerta: enRiesgo.length > 0 },
        ].map((k) => (
          <div key={k.t} className="px-3 py-3 text-center">
            <div
              className={`num-grande !text-[22px] ${k.alerta ? "text-peligro" : ""}`}
            >
              {k.n}
            </div>
            <div className="text-atenuado text-[11.5px] mt-0.5">{k.t}</div>
          </div>
        ))}
      </div>

      {/* Un lead sin contestar es lo único que caduca de verdad: sale
       * antes que nada y solo cuando lo hay. */}
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

      {/* PARA HOY: las dos listas que piden hacer algo, juntas. Antes
       * estaban separadas por la actividad reciente y los récords, así
       * que había que cruzar información pasiva para encontrar la
       * segunda cosa pendiente. */}
      <div className="titulo-seccion">Para hoy</div>
      <div className="superficie px-4 mb-6">
        {enRiesgo.length === 0 && listosParaAvanzar.length === 0 && (
          <div className="text-atenuado text-[13.5px] py-3">
            Nada pendiente ahora mismo — buen trabajo.
          </div>
        )}

        {enRiesgo.map((r) => (
          <Link key={r.clienteId} href={`/clientes/${r.clienteId}`} className="fila">
            <PuntoEstado nivel={r.score >= 5 ? "riesgo" : "atencion"} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[14.5px] truncate">{r.nombre}</div>
              <div className="text-texto-2 text-[12.5px] truncate">{r.motivos[0]}</div>
            </div>
            <ChevronRight size={16} className="text-atenuado shrink-0" />
          </Link>
        ))}

        {listosParaAvanzar.map((a, i) => (
          <Link key={`av-${i}`} href={`/clientes/${a.cliente_id}`} className="fila">
            <CalendarCheck size={17} className="text-acento shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[14.5px] truncate">{a.nombre}</div>
              <div className="text-texto-2 text-[12.5px] truncate">{a.mensaje}</div>
            </div>
            <ChevronRight size={16} className="text-atenuado shrink-0" />
          </Link>
        ))}
      </div>

      {recordsSemana.length > 0 && (
        <>
          <div className="titulo-seccion">Récords de la semana</div>
          <div className="superficie px-4 mb-6">
            {recordsSemana.map((rec, i) => (
              <Link key={i} href={`/clientes/${rec.cliente_id}`} className="fila">
                <span className="flex-1 min-w-0 truncate text-[13.5px]">
                  <b>{rec.nombre}</b>
                  <span className="text-texto-2"> — {rec.ejercicio}</span>
                </span>
                <span className="shrink-0 text-[13.5px]">
                  <span className="text-atenuado">{Number(rec.kg_previo)} kg → </span>
                  <b className="text-aviso">{Number(rec.kg_nuevo)} kg</b>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="titulo-seccion">Actividad reciente</div>
      <div className="superficie px-4 mb-6">
        {listaClientes.length === 0 ? (
          <div className="text-atenuado text-[13.5px] py-3">
            Sin clientes todavía. Crea la primera invitación desde «Clientes».
          </div>
        ) : (
          <>
            {actividadOrdenada.slice(0, 7).map((c) => {
              const cuando = haceCuanto(ultimaActividad.get(c.id) ?? null);
              return (
                <Link key={c.id} href={`/clientes/${c.id}`} className="fila">
                  <span className="flex-1 min-w-0 truncate text-[14px]">{c.nombre}</span>
                  <span
                    className={`text-[12.5px] shrink-0 ${cuando === "Hoy" ? "text-acento" : "text-atenuado"}`}
                  >
                    {cuando}
                  </span>
                </Link>
              );
            })}
            {actividadOrdenada.length > 7 && (
              <Link href="/clientes" className="fila text-acento text-[13px]">
                Ver todos →
              </Link>
            )}
          </>
        )}
      </div>

    </>
  );
}
