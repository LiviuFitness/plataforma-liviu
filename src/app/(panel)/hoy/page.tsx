import Link from "next/link";
import { AlertTriangle, CalendarCheck, Trophy } from "lucide-react";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { haceCuanto } from "@/componentes/ui";
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

  const fecha = new Date().toLocaleDateString("es-ES", { weekday: "long" });

  return (
    <>
      <h1 className="h1">Hoy</h1>
      <div className="sub serifa">{fecha} — así va tu estudio</div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2.5 my-[18px] mb-[22px]">
        <div className="tarjeta !mb-0 text-center !p-3.5">
          <div className="num-grande !text-[26px]">
            {listaClientes.length}
          </div>
          <div className="text-[10.5px] text-atenuado mt-1">
            clientes activos
          </div>
        </div>
        <div className="tarjeta !mb-0 text-center !p-3.5">
          <div className="num-grande !text-[26px] text-acento">
            {media}%
          </div>
          <div className="text-[10.5px] text-atenuado mt-1">
            adherencia media
          </div>
        </div>
        <div className="tarjeta !mb-0 text-center !p-3.5">
          <div
            className={`num-grande !text-[26px] ${
              enRiesgo.length ? "text-peligro" : ""
            }`}
          >
            {enRiesgo.length}
          </div>
          <div className="text-[10.5px] text-atenuado mt-1">en riesgo</div>
        </div>
      </div>

      {/* Radar de riesgo de abandono — raíl cian, firma visual */}
      <div className="flex gap-3.5 mb-5">
        <div className="rail" />
        <div className="flex-1">
          <div className="titulo-tarjeta !mb-2.5 flex items-center gap-1.5">
            <AlertTriangle size={12} /> RADAR DE RIESGO DE ABANDONO
          </div>
          {enRiesgo.length === 0 && (
            <div className="text-atenuado text-[13.5px]">
              Nadie en riesgo ahora mismo — buen trabajo.
            </div>
          )}
          {enRiesgo.map((r) => (
            <Link
              key={r.clienteId}
              href={`/clientes/${r.clienteId}`}
              className="flex gap-3 w-full tarjeta !mb-2.5 !p-3.5 !rounded-xl"
            >
              <div className="rail-punto" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-[15px] truncate">{r.nombre}</div>
                  <span
                    className={`shrink-0 text-[10.5px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                      r.score >= 5
                        ? "bg-peligro/15 text-peligro"
                        : "bg-aviso/15 text-aviso"
                    }`}
                  >
                    {r.score >= 5 ? "riesgo alto" : "riesgo medio"}
                  </span>
                </div>
                {r.motivos.map((m, i) => (
                  <div key={i} className="text-texto-2 text-[13px] mt-0.5">
                    — {m}
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Récords batidos esta semana: felicítalos, dispara la retención */}
      {recordsSemana.length > 0 && (
        <section className="tarjeta !border-aviso/40">
          <div className="titulo-tarjeta !text-aviso flex items-center gap-1.5">
            <Trophy size={12} /> RÉCORDS DE LA SEMANA — ¡FELICÍTALOS!
          </div>
          {recordsSemana.map((rec, i) => (
            <Link
              key={i}
              href={`/clientes/${rec.cliente_id}`}
              className="flex justify-between items-center gap-2 border-b border-borde last:border-0 py-2.5 text-[13.5px]"
            >
              <span className="min-w-0">
                <b>{rec.nombre}</b>
                <span className="text-texto-2"> — {rec.ejercicio}</span>
              </span>
              <span className="shrink-0">
                <span className="text-atenuado">{Number(rec.kg_previo)} kg → </span>
                <b className="text-aviso">{Number(rec.kg_nuevo)} kg</b>
              </span>
            </Link>
          ))}
        </section>
      )}

      {/* Semanas completadas: listos para avanzar */}
      {listosParaAvanzar.length > 0 && (
        <section className="tarjeta !border-acento/40">
          <div className="titulo-tarjeta !text-acento flex items-center gap-1.5">
            <CalendarCheck size={12} /> LISTOS PARA AVANZAR DE SEMANA
          </div>
          {listosParaAvanzar.map((a, i) => (
            <Link
              key={i}
              href={`/clientes/${a.cliente_id}`}
              className="flex justify-between items-center gap-2 border-b border-borde last:border-0 py-2.5 text-[13.5px]"
            >
              <span>
                <b>{a.nombre}</b>
                <span className="text-texto-2"> — {a.mensaje}</span>
              </span>
              <span className="text-acento shrink-0">→</span>
            </Link>
          ))}
        </section>
      )}

      {/* Actividad reciente */}
      <section className="tarjeta">
        <div className="titulo-tarjeta">ACTIVIDAD RECIENTE</div>
        {listaClientes.length === 0 && (
          <div className="text-atenuado text-[13.5px]">
            Sin clientes todavía. Crea la primera invitación desde «Clientes».
          </div>
        )}
        {listaClientes
          .slice()
          .sort((a, b) => {
            const fa = ultimaActividad.get(a.id);
            const fb = ultimaActividad.get(b.id);
            if (!fa && !fb) return 0;
            if (!fa) return 1;
            if (!fb) return -1;
            return new Date(fb).getTime() - new Date(fa).getTime();
          })
          .map((c) => {
            const cuando = haceCuanto(ultimaActividad.get(c.id) ?? null);
            return (
              <Link
                key={c.id}
                href={`/clientes/${c.id}`}
                className="flex justify-between w-full border-b border-borde last:border-0 py-[11px] px-0.5 text-[14.5px]"
              >
                <span>{c.nombre}</span>
                <span
                  className={cuando === "Hoy" ? "text-acento" : "text-atenuado"}
                >
                  {cuando}
                </span>
              </Link>
            );
          })}
      </section>
    </>
  );
}
