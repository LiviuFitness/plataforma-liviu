"use client";

import { Check, ChevronRight, MessageCircle } from "lucide-react";
import type { Vista } from "./FichaCliente";

export interface PasoArranque {
  clave: string;
  texto: string;
  hecho: boolean;
  /** Qué hacer si falta: abrir una sección o pedírselo por chat. */
  accion?: { tipo: "abrir"; vista: Vista; etiqueta: string } | { tipo: "pedir"; mensaje: string; etiqueta: string };
}

/**
 * Lo que le falta a un cliente recién llegado para arrancar bien. Solo
 * sale en sus primeras semanas y desaparece sola cuando está todo.
 */
export default function ListaArranque({
  pila,
  pasos,
  abrir,
  pedir,
}: {
  pila: string;
  pasos: PasoArranque[];
  abrir: (v: Vista) => void;
  /** Abre el chat con el mensaje ya escrito (sin enviarlo). */
  pedir: (mensaje: string) => void;
}) {
  const hechos = pasos.filter((p) => p.hecho).length;
  if (hechos === pasos.length) return null;

  return (
    <section className="tarjeta tarjeta-acento">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="titulo-tarjeta !mb-0 break-words min-w-0">PARA ARRANCAR CON {pila.toUpperCase()}</div>
        <span className="text-acento text-[12.5px] font-bold shrink-0 tabular-nums">
          {hechos} de {pasos.length}
        </span>
      </div>
      <div className="barra-capsula !h-1.5 mb-2">
        <div className="barra-capsula-relleno" style={{ width: `${(hechos / pasos.length) * 100}%` }} />
      </div>
      {pasos.map((p) => (
        <div key={p.clave} className="flex items-center gap-2.5 py-2 border-b border-borde last:border-0">
          <span
            className={`w-[20px] h-[20px] rounded-full grid place-items-center shrink-0 ${
              p.hecho ? "bg-acento text-fondo" : "border border-borde-2"
            }`}
          >
            {p.hecho && <Check size={12} strokeWidth={3} />}
          </span>
          <span className={`flex-1 min-w-0 text-[14px] break-words ${p.hecho ? "text-atenuado line-through" : ""}`}>
            {p.texto}
          </span>
          {!p.hecho && p.accion && (
            <button
              className="chip !text-acento !border-acento/40 flex items-center gap-1 shrink-0"
              onClick={() =>
                p.accion!.tipo === "abrir" ? abrir(p.accion!.vista) : pedir(p.accion!.mensaje)
              }
            >
              {p.accion.tipo === "pedir" ? <MessageCircle size={12} /> : <ChevronRight size={12} />}
              {p.accion.etiqueta}
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
