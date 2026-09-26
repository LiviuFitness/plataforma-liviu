"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, Dumbbell, MessageCircle, Repeat, SendHorizontal, X, Zap } from "lucide-react";
import type { EjercicioSesion } from "@/componentes/SesionEnCurso";
import type { AlternativaSesion } from "@/lib/alternativasSesion";
import type { RespuestaCoachIA } from "@/lib/iaTipos";

interface Turno {
  pregunta: string;
  respuesta?: RespuestaCoachIA;
  error?: string;
}

const RAPIDAS: [typeof Zap, string][] = [
  [Zap, "¿Cuánto peso pongo hoy?"],
  [Dumbbell, "Me molesta algo en este ejercicio"],
  [MessageCircle, "¿Cómo se hace bien?"],
];

/**
 * "Pregúntame" dentro del entreno, para un ejercicio: sabe lo pautado,
 * lo que lleva hecho hoy y sus últimas veces. Si propone cambiar a una
 * de sus alternativas, se cambia con un toque; si hay molestias, Liviu
 * se entera.
 */
export default function HojaCoachEntreno({
  ejercicio,
  onCambiar,
  onCerrar,
}: {
  ejercicio: EjercicioSesion;
  onCambiar: (alt: AlternativaSesion) => void;
  onCerrar: () => void;
}) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [turnos, pensando]);

  async function preguntar(pregunta: string) {
    const p = pregunta.trim();
    if (!p || pensando) return;
    setTexto("");
    setTurnos((t) => [...t, { pregunta: p }]);
    setPensando(true);
    const e = ejercicio;
    const datos = {
      nombre: e.nombre,
      grupo: e.grupo,
      pautadas: e.series.map((s) => ({ tipo: s.tipo, kg: s.kgPrescrito, reps: s.repsPrescrito, rir: s.rirPrescrito })),
      hechasHoy: e.series.filter((s) => s.completada).map((s) => ({ kg: s.kg, reps: s.reps, rir: s.rir })),
      historial: (e.historial ?? []).map((h) => ({ cuando: h.cuando, series: h.items.map((i) => i.texto).join(" · ") })),
      tecnica: e.tecnica,
      notas: e.notas,
      notaPropia: e.notaPropia ?? null,
      alternativas: (e.alternativas ?? []).map((a) => a.nombre),
    };
    let turno: Turno = { pregunta: p };
    try {
      const r = await fetch("/api/ia/entreno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: p, ejercicio: datos }),
      });
      const d = (await r.json()) as RespuestaCoachIA & { error?: string };
      turno = r.ok ? { pregunta: p, respuesta: d } : { pregunta: p, error: d.error ?? "No se ha podido responder." };
    } catch {
      turno = { pregunta: p, error: "Sin conexión. Prueba otra vez." };
    }
    setTurnos((t) => [...t.slice(0, -1), turno]);
    setPensando(false);
  }

  const altPorNombre = new Map((ejercicio.alternativas ?? []).map((a) => [a.nombre, a]));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece" onClick={onCerrar}>
      <div
        className="w-full max-w-[480px] max-h-[82dvh] flex flex-col bg-[#0E1215] border border-borde rounded-t-[20px] anim-hoja-sube"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-[18px] pb-3 border-b border-borde">
          <Image src="/asistente.webp" alt="" width={38} height={38} className="rounded-full shrink-0 ring-1 ring-acento/40" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15.5px]">Pregúntame</div>
            <div className="text-atenuado text-[12px] break-words">{ejercicio.nombre}</div>
          </div>
          <button className="ghost shrink-0 !px-2" onClick={onCerrar} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-[18px] py-3 flex flex-col gap-2.5">
          {turnos.map((t, k) => (
            <div key={k} className="contents">
              <div className="self-end max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[14px] leading-snug break-words bg-acento text-fondo">
                {t.pregunta}
              </div>
              {t.respuesta && (
                <div className="self-start max-w-[92%] rounded-[16px] px-3.5 py-2.5 text-[14px] leading-snug break-words whitespace-pre-line bg-panel border border-borde text-texto-2">
                  {t.respuesta.respuesta}
                  {t.respuesta.alternativa && altPorNombre.has(t.respuesta.alternativa) && (
                    <button
                      className="mt-2.5 w-full flex items-center justify-center gap-2 bg-acento text-fondo font-semibold rounded-[10px] py-2.5 text-[14px] cursor-pointer"
                      onClick={() => onCambiar(altPorNombre.get(t.respuesta!.alternativa!)!)}
                    >
                      <Repeat size={15} /> Cambiar a {t.respuesta.alternativa}
                    </button>
                  )}
                  {t.respuesta.derivar && <div className="text-aviso text-[12px] mt-2">Liviu ya está avisado.</div>}
                </div>
              )}
              {t.error && (
                <div className="self-start text-peligro text-[13px] flex items-start gap-1.5">
                  <AlertCircle size={14} className="shrink-0 mt-[3px]" />
                  <span className="min-w-0">{t.error}</span>
                </div>
              )}
            </div>
          ))}
          {pensando && (
            <div className="self-start rounded-[16px] px-4 py-3 bg-panel border border-borde flex gap-1.5" aria-label="Pensando">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-atenuado animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          )}
          {turnos.length === 0 && !pensando && (
            <div className="flex flex-col gap-1.5">
              {RAPIDAS.map(([Icono, t]) => (
                <button
                  key={t}
                  className="chip !justify-start !py-2.5 !px-3.5 !text-[13.5px] w-full flex items-center gap-2 text-left"
                  onClick={() => preguntar(t)}
                >
                  <Icono size={14} className="text-acento shrink-0" /> {t}
                </button>
              ))}
            </div>
          )}
          <div ref={finRef} />
        </div>

        <div className="p-3 border-t border-borde flex items-end gap-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          <input
            className="flex-1 min-w-0 bg-campo border border-borde-2 rounded-[12px] text-white px-3 py-2.5 text-[16px] focus:outline-none focus:border-acento"
            placeholder="Pregunta lo que quieras…"
            maxLength={500}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && preguntar(texto)}
          />
          <button
            className="w-11 h-11 rounded-full bg-acento text-fondo grid place-items-center shrink-0 disabled:opacity-40 cursor-pointer"
            onClick={() => preguntar(texto)}
            disabled={!texto.trim() || pensando}
            aria-label="Enviar"
          >
            <SendHorizontal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
