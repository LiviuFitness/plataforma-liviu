"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { fechaCorta, Sparkline } from "@/componentes/ui";
import type { PR, PuntoProgresion, SesionHistorial } from "@/lib/progresoEntreno";

const EMOJIS: Record<number, string> = { 1: "😖", 2: "😕", 3: "😐", 4: "🙂", 5: "🔥" };

/** Récords personales (con evolución al expandir) e historial de sesiones.
 * Lo usa el propio cliente en "Mi progreso" y el entrenador en la ficha
 * del cliente — pasando onBorrarSesion solo donde se permita borrar. */
export default function HistorialProgreso({
  prs,
  progresiones,
  historial,
  onBorrarSesion,
}: {
  prs: PR[];
  progresiones: Record<string, PuntoProgresion[]>;
  historial: SesionHistorial[];
  onBorrarSesion?: (id: string) => void;
}) {
  const [expandido, setExpandido] = useState<string | null>(null);

  return (
    <>
      <section className="tarjeta">
        <div className="titulo-tarjeta flex items-center gap-1.5"><Trophy size={13} className="text-aviso" /> RÉCORDS PERSONALES</div>
        {prs.length === 0 && (
          <div className="text-atenuado text-[13.5px]">
            Completa la primera sesión y las mejores marcas aparecerán aquí.
          </div>
        )}
        {prs.map((pr) => {
          const puntos = progresiones[pr.ejercicio] ?? [];
          const abierto = expandido === pr.ejercicio;
          return (
            <div key={pr.ejercicio} className="border-b border-borde last:border-0">
              <button
                className="flex justify-between items-center py-2.5 w-full text-left cursor-pointer"
                onClick={() =>
                  setExpandido(abierto ? null : puntos.length >= 2 ? pr.ejercicio : null)
                }
              >
                <span className="text-[14px]">{pr.ejercicio}</span>
                <span className="text-right">
                  <span className="text-[14px] block">
                    <b className="text-acento">{pr.kg} kg</b>
                    <span className="text-atenuado"> × {pr.reps}</span>
                    {puntos.length >= 2 && (
                      <span className="text-atenuado text-[12px] ml-1.5">
                        {abierto ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                  {pr.reps > 1 && (
                    <span className="text-atenuado text-[11.5px] block">
                      ~1RM {pr.unRM} kg
                    </span>
                  )}
                </span>
              </button>
              {abierto && puntos.length >= 2 && (
                <div className="pb-3">
                  <Sparkline datos={puntos.map((p) => p.kg)} />
                  <div className="flex justify-between text-[12px] text-atenuado -mt-1">
                    <span>{fechaCorta(puntos[0].fecha.slice(0, 10))}</span>
                    <span>{fechaCorta(puntos[puntos.length - 1].fecha.slice(0, 10))}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="tarjeta">
        <div className="titulo-tarjeta">HISTORIAL DE SESIONES</div>
        {historial.length === 0 && (
          <div className="text-atenuado text-[13.5px]">Sin sesiones todavía.</div>
        )}
        {historial.map((s) => (
          <div
            key={s.id}
            className="flex justify-between items-center border-b border-borde last:border-0 py-2.5"
          >
            <div>
              <div className="font-bold text-[14px]">{s.nombreDia}</div>
              <div className="text-atenuado text-[12.5px]">
                {new Date(s.fecha).toLocaleDateString("es-ES", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}
                {" · "}
                {s.seriesHechas} series
              </div>
            </div>
            <span className="text-[15px] flex items-center gap-2">
              {s.prsPre && <span title="Cómo llegó">{EMOJIS[s.prsPre]}</span>}
              {s.prsPre && s.sensacion && (
                <span className="text-atenuado text-[11px]">→</span>
              )}
              {s.sensacion && <span title="Cómo fue">{EMOJIS[s.sensacion]}</span>}
              {onBorrarSesion && (
                <button
                  className="mini mini-peligro"
                  onClick={() => onBorrarSesion(s.id)}
                  aria-label="Borrar sesión"
                >
                  ✕
                </button>
              )}
            </span>
          </div>
        ))}
      </section>
    </>
  );
}
