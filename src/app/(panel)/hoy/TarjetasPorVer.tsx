"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Mic, Square, Trophy, X } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/componentes/ui";

export interface EntrenoPorVer {
  id: string;
  clienteId: string;
  nombre: string;
  foto: string | null;
  dia: string;
  /** "hoy", "ayer"… */
  cuando: string;
  minutos: number;
  volumen: number;
  /** Series por debajo de lo pautado */
  cortas: number;
  prsPre: number | null;
  sensacion: number | null;
  comentario: string | null;
  /** Su mejor récord de la semana, si lo hay */
  record: string | null;
}

type Reaccion = "fuego" | "fuerza" | "aplauso";
const REACCIONES: { valor: Reaccion; emoji: string; etiqueta: string }[] = [
  { valor: "fuego", emoji: "🔥", etiqueta: "fuego" },
  { valor: "fuerza", emoji: "💪", etiqueta: "fuerza" },
  { valor: "aplauso", emoji: "👏", etiqueta: "aplausos" },
];
/* Misma escala de caras que la sesión (antes y después de entrenar) */
const CARAS = ["😖", "😕", "😐", "🙂", "🔥"];
const MAX_SEG = 60;
const ahoraMs = () => Date.now();
const CHIP = "text-[12px] px-2 py-0.5 rounded-full bg-campo border border-borde-2 text-texto-2 tabular-nums";

function avisar(sesionId: string) {
  void fetch("/api/avisos/visto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sesionId }),
    keepalive: true,
  }).catch(() => {
    /* sin aviso no pasa nada: la reacción está guardada */
  });
}

/** Lo que pasa en una tarjeta: hecha (reacción/nota), grabando, enviando. */
interface Estado {
  vista?: boolean;
  reaccion?: Reaccion;
  voz?: "grabando" | "enviando" | "enviada";
  error?: string;
}

export default function TarjetasPorVer({ entrenos }: { entrenos: EntrenoPorVer[] }) {
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const [segundos, setSegundos] = useState(0);
  const grabacion = useRef<{ id: string; rec: MediaRecorder; trozos: Blob[]; cancelada: boolean } | null>(null);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);

  const pendientes = entrenos.filter((e) => !estados[e.id]?.vista).length;

  function poner(id: string, cambio: Estado) {
    setEstados((prev) => ({ ...prev, [id]: { ...prev[id], ...cambio } }));
  }

  /* Al salir de la pantalla con el micro abierto, se suelta */
  useEffect(
    () => () => {
      if (reloj.current) clearInterval(reloj.current);
      grabacion.current?.rec.stream.getTracks().forEach((t) => t.stop());
    },
    []
  );

  async function reaccionar(e: EntrenoPorVer, reaccion: Reaccion) {
    const antes = estados[e.id];
    poner(e.id, { vista: true, reaccion, error: undefined });
    const { error } = await crearClienteNavegador()
      .from("sesiones")
      .update({ vista_en: new Date().toISOString(), reaccion_entrenador: reaccion })
      .eq("id", e.id);
    if (error) {
      poner(e.id, { vista: antes?.vista, reaccion: antes?.reaccion, error: "No se pudo guardar. Prueba otra vez." });
      return;
    }
    avisar(e.id);
  }

  async function empezarVoz(e: EntrenoPorVer) {
    if (grabacion.current) return;
    poner(e.id, { error: undefined });
    let flujo: MediaStream;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      poner(e.id, { error: "Sin permiso para el micrófono. Actívalo en los ajustes del navegador." });
      return;
    }
    /* iPhone graba en mp4; Chrome y Android en webm */
    const tipo = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(
      (t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)
    );
    const rec = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined);
    const g = { id: e.id, rec, trozos: [] as Blob[], cancelada: false };
    grabacion.current = g;
    rec.ondataavailable = (ev) => ev.data.size > 0 && g.trozos.push(ev.data);
    rec.onstop = () => {
      flujo.getTracks().forEach((t) => t.stop());
      if (reloj.current) clearInterval(reloj.current);
      grabacion.current = null;
      if (g.cancelada) {
        poner(e.id, { voz: undefined });
        return;
      }
      void enviarVoz(e, new Blob(g.trozos, { type: rec.mimeType || tipo || "audio/mp4" }));
    };
    rec.start();
    setSegundos(0);
    const inicio = ahoraMs();
    reloj.current = setInterval(() => {
      const s = Math.floor((ahoraMs() - inicio) / 1000);
      setSegundos(s);
      if (s >= MAX_SEG) rec.stop();
    }, 250);
    poner(e.id, { voz: "grabando" });
  }

  function pararVoz(cancelar: boolean) {
    const g = grabacion.current;
    if (!g) return;
    g.cancelada = cancelar;
    g.rec.stop();
  }

  async function enviarVoz(e: EntrenoPorVer, audio: Blob) {
    poner(e.id, { voz: "enviando" });
    const supabase = crearClienteNavegador();
    const ext = /webm/.test(audio.type) ? "webm" : "m4a";
    const ruta = `${e.clienteId}/voz-${crypto.randomUUID()}.${ext}`;
    const { error: e1 } = await supabase.storage.from("chat").upload(ruta, audio, { contentType: audio.type });
    const { error: e2 } = e1
      ? { error: e1 }
      : await supabase
          .from("mensajes")
          .insert({ cliente_id: e.clienteId, remitente: "entrenador", texto: `🎙 Nota de voz sobre tu ${e.dia}`, imagen: ruta });
    const { error: e3 } =
      e1 || e2
        ? { error: e1 ?? e2 }
        : await supabase
            .from("sesiones")
            .update({ vista_en: new Date().toISOString(), nota_voz: ruta })
            .eq("id", e.id);
    if (e1 || e2 || e3) {
      poner(e.id, { voz: undefined, error: "No se pudo enviar la nota. Prueba otra vez." });
      return;
    }
    poner(e.id, { voz: "enviada", vista: true });
    avisar(e.id);
  }

  async function marcarTodos() {
    const ids = entrenos.filter((e) => !estados[e.id]?.vista).map((e) => e.id);
    if (ids.length === 0) return;
    setEstados((prev) => Object.fromEntries([...Object.entries(prev), ...ids.map((id) => [id, { ...prev[id], vista: true }])]));
    await crearClienteNavegador().from("sesiones").update({ vista_en: new Date().toISOString() }).in("id", ids);
  }

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div className="titulo-seccion !mb-0">Entrenos por ver · {pendientes}</div>
        {pendientes > 0 && (
          <button type="button" className="text-acento text-[12.5px] font-semibold cursor-pointer shrink-0" onClick={marcarTodos}>
            Marcar todos vistos
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {entrenos.map((e) => {
          const st = estados[e.id] ?? {};
          const grabandoEsta = st.voz === "grabando";
          const otraGrabando = entrenos.some((o) => o.id !== e.id && estados[o.id]?.voz === "grabando");
          return (
            <div
              key={e.id}
              className={`superficie p-3 flex flex-col gap-2.5 transition-opacity duration-300 ${st.vista && !grabandoEsta ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar nombre={e.nombre} tamano={36} foto={e.foto} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14.5px] leading-tight break-words">{e.nombre}</div>
                  <div className="text-atenuado text-[12.5px] break-words">
                    {e.dia} · {e.cuando}
                    {e.prsPre !== null && e.sensacion !== null && ` · ${CARAS[e.prsPre - 1] ?? ""} → ${CARAS[e.sensacion - 1] ?? ""}`}
                  </div>
                </div>
                <Link href={`/clientes/${e.clienteId}?vista=progreso`} className="text-atenuado text-[12.5px] font-semibold shrink-0">
                  Ver
                </Link>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className={CHIP}>{e.minutos} min</span>
                {e.volumen > 0 && <span className={CHIP}>{e.volumen.toLocaleString("es-ES")} kg</span>}
                {e.record && (
                  <span className={`${CHIP} !text-dorado !border-dorado/40 inline-flex items-center gap-1`}>
                    <Trophy size={11} /> {e.record}
                  </span>
                )}
                {e.cortas > 0 && (
                  <span className={`${CHIP} !text-aviso`}>
                    ▼ {e.cortas} {e.cortas === 1 ? "serie corta" : "series cortas"}
                  </span>
                )}
              </div>

              {e.comentario && (
                <div className="text-texto-2 text-[13px] bg-campo border-l-2 border-turquesa rounded-r-[8px] px-2.5 py-1.5 break-words">
                  «{e.comentario}»
                </div>
              )}

              {grabandoEsta ? (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="w-10 h-[38px] rounded-[11px] border border-borde-2 bg-campo grid place-items-center cursor-pointer shrink-0"
                    onClick={() => pararVoz(true)}
                    aria-label="Cancelar la nota de voz"
                  >
                    <X size={16} />
                  </button>
                  <button
                    type="button"
                    className="flex-1 h-[38px] rounded-[11px] border border-peligro text-peligro bg-peligro/10 font-semibold text-[13px] inline-flex items-center justify-center gap-2 cursor-pointer"
                    onClick={() => pararVoz(false)}
                  >
                    <span className="w-2 h-2 rounded-full bg-peligro animate-pulse" />
                    0:{String(segundos).padStart(2, "0")} · Enviar
                    <Square size={12} fill="currentColor" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  {REACCIONES.map((r) => (
                    <button
                      key={r.valor}
                      type="button"
                      className={`w-[42px] h-[38px] rounded-[11px] border text-[18px] cursor-pointer anim-pulsable shrink-0 ${
                        st.reaccion === r.valor ? "border-acento bg-acento/15" : "border-borde-2 bg-campo"
                      }`}
                      onClick={() => reaccionar(e, r.valor)}
                      aria-label={`Reaccionar con ${r.etiqueta} al entreno de ${e.nombre}`}
                      aria-pressed={st.reaccion === r.valor}
                    >
                      {r.emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`flex-1 min-w-0 h-[38px] rounded-[11px] border font-semibold text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      st.voz === "enviada" ? "border-verde text-verde bg-campo" : "border-borde-2 bg-campo"
                    }`}
                    onClick={() => empezarVoz(e)}
                    disabled={st.voz === "enviando" || otraGrabando}
                  >
                    {st.voz === "enviada" ? (
                      <>
                        <Check size={14} /> Nota enviada
                      </>
                    ) : st.voz === "enviando" ? (
                      "Enviando…"
                    ) : (
                      <>
                        <Mic size={14} /> Nota de voz
                      </>
                    )}
                  </button>
                </div>
              )}
              {st.error && <div className="text-peligro text-[12.5px]">{st.error}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
