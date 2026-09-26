"use client";

import { useEffect } from "react";
import { AlertCircle, Check, RefreshCw, Sparkles } from "lucide-react";
import type { RevisionIA } from "@/lib/iaTipos";

/**
 * La revisión que prepara la IA para un cliente de la ronda: cómo ha ido
 * su semana, qué cambiaría y el mensaje para él (editable, y se envía al
 * pasar al siguiente si está marcado). Se pide sola al abrir a alguien
 * pendiente; lo ya revisado solo si la pides.
 */
export default function RevisionConIA({
  estado,
  revisado,
  mensaje,
  onMensaje,
  enviar,
  onEnviar,
  enviado,
  pedir,
}: {
  estado: { cargando: boolean; datos?: RevisionIA; error?: string } | undefined;
  revisado: boolean;
  mensaje: string;
  onMensaje: (t: string) => void;
  enviar: boolean;
  onEnviar: (v: boolean) => void;
  enviado: boolean;
  pedir: (rehacer?: boolean) => void;
}) {
  useEffect(() => {
    if (!estado && !revisado) pedir();
    // Solo al abrir a este cliente (el componente lleva su id como key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!estado) {
    return (
      <button className="ghost w-full mb-3 flex items-center justify-center gap-1.5" onClick={() => pedir()}>
        <Sparkles size={14} className="text-morado" /> Preparar la revisión con IA
      </button>
    );
  }

  return (
    <section className="tarjeta tarjeta-morado !p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={15} className="text-morado shrink-0" />
        <div className="titulo-tarjeta !mb-0 flex-1 min-w-0">Resumen de la semana</div>
        {estado.datos && (
          <button
            className="text-atenuado text-[12px] flex items-center gap-1 shrink-0 cursor-pointer"
            onClick={() => pedir(true)}
            disabled={estado.cargando}
          >
            <RefreshCw size={12} /> Otra
          </button>
        )}
      </div>

      {estado.cargando ? (
        <div className="flex flex-col gap-2 py-1" aria-label="Preparando la revisión">
          {[92, 100, 76].map((w) => (
            <div key={w} className="h-3 rounded bg-borde/70 animate-pulse" style={{ width: `${w}%` }} />
          ))}
          <div className="text-atenuado text-[12px] mt-1">Mirando su semana…</div>
        </div>
      ) : estado.error || !estado.datos ? (
        <div className="text-[13px] text-peligro flex items-start gap-1.5">
          <AlertCircle size={14} className="shrink-0 mt-[3px]" />
          <span className="min-w-0 flex-1">{estado.error ?? "No se ha podido preparar."}</span>
          <button className="text-acento font-semibold shrink-0 cursor-pointer" onClick={() => pedir()}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="text-[14px] text-texto-2 leading-relaxed mb-3 break-words">{estado.datos.resumen}</div>
          <div className="bg-campo border border-borde rounded-[12px] p-3 mb-3">
            <div className="text-[11.5px] text-atenuado mb-1 tracking-wide">PROPUESTA</div>
            <div className="text-[14px] text-white leading-snug break-words">
              {estado.datos.delta_kcal !== 0 && (
                <b>
                  {estado.datos.delta_kcal > 0 ? "+" : "−"}
                  {Math.abs(estado.datos.delta_kcal)} kcal.{" "}
                </b>
              )}
              {estado.datos.propuesta}
            </div>
          </div>

          <div className="flex items-center justify-between mb-1">
            <div className="text-[11.5px] text-atenuado tracking-wide">MENSAJE PARA SU CHAT</div>
            {enviado && (
              <span className="text-acento text-[12px] font-semibold flex items-center gap-1">
                <Check size={13} strokeWidth={3} /> Enviado
              </span>
            )}
          </div>
          <textarea
            className="w-full bg-campo border border-borde rounded-[12px] text-texto-2 px-3 py-2.5 text-[13.5px] leading-snug resize-none font-cuerpo focus:outline-none focus:border-acento"
            rows={6}
            value={mensaje}
            onChange={(e) => onMensaje(e.target.value)}
            disabled={enviado}
          />
          {!enviado && (
            <label className="flex items-center gap-2 text-[13px] text-texto-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[var(--color-acento)]"
                checked={enviar}
                onChange={(e) => onEnviar(e.target.checked)}
              />
              Enviarle este mensaje al pasar al siguiente
            </label>
          )}
        </>
      )}
    </section>
  );
}
