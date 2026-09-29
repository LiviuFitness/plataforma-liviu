"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, History } from "lucide-react";
import type { Medida, RevisionKcal } from "@/lib/tipos";

const DIA = 86400000;
const coma = (n: number) => n.toFixed(1).replace(".", ",");

/** Media de peso entre dos instantes (null si no se pesó) */
function media(medidas: Medida[], desde: number, hasta: number): number | null {
  const v = medidas
    .filter((m) => m.peso !== null)
    .filter((m) => {
      const t = new Date(m.fecha + "T12:00:00").getTime();
      return t >= desde && t < hasta;
    })
    .map((m) => Number(m.peso));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/**
 * Cada ajuste de su dieta, del más reciente al más antiguo: cuándo, cuánto,
 * qué alimentos cambiaron y cómo respondió el peso en las 2 semanas
 * siguientes. Así se ve de un vistazo qué le ha funcionado.
 */
export default function HistorialAjustes({ revisiones, medidas }: { revisiones: RevisionKcal[]; medidas: Medida[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [ahora] = useState(() => new Date().getTime());
  if (revisiones.length === 0) return null;

  return (
    <>
      <div className="titulo-seccion flex items-center gap-2 mt-6">
        <History size={16} className="text-acento" /> Historial de ajustes
      </div>
      <div className="superficie px-4 mb-6">
        {revisiones.map((r) => {
          const t = new Date(r.creado_en).getTime();
          const antes = media(medidas, t - 7 * DIA, t);
          const despues = media(medidas, t + 7 * DIA, t + 21 * DIA);
          const reciente = ahora - t < 14 * DIA;
          const cambio = antes !== null && despues !== null ? despues - antes : null;
          const cambios = r.cambios ?? [];
          const verCambios = abierto === r.id;
          return (
            <div key={r.id} className="py-3 border-b border-borde last:border-0">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold leading-tight">
                    <span className={Number(r.delta) < 0 ? "text-aviso" : "text-verde"}>
                      {Number(r.delta) > 0 ? "+" : "−"}
                      {Math.abs(Number(r.delta))} kcal
                    </span>{" "}
                    <span className="text-atenuado font-normal text-[12.5px]">
                      · {Math.round(Number(r.kcal_anterior)).toLocaleString("es-ES")} → {Math.round(Number(r.kcal_nuevo)).toLocaleString("es-ES")}
                    </span>
                  </div>
                  <div className="text-atenuado text-[12px] mt-0.5">
                    {new Date(r.creado_en).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div className="text-right shrink-0 max-w-[48%]">
                  <div className="text-[11px] text-atenuado">peso después</div>
                  <div className="text-[13px] font-semibold">
                    {cambio !== null ? (
                      <span className="text-turquesa">
                        {cambio > 0 ? "+" : cambio < 0 ? "−" : ""}
                        {coma(Math.abs(cambio))} kg
                      </span>
                    ) : (
                      <span className="text-atenuado font-normal">{reciente ? "aún pronto" : "sin pesajes"}</span>
                    )}
                  </div>
                </div>
              </div>
              {cambios.length > 0 && (
                <>
                  <button
                    className="text-acento text-[12.5px] font-semibold mt-1.5 inline-flex items-center gap-1 cursor-pointer"
                    onClick={() => setAbierto(verCambios ? null : r.id)}
                    aria-expanded={verCambios}
                  >
                    {cambios.length} {cambios.length === 1 ? "alimento cambiado" : "alimentos cambiados"}
                    <ChevronDown size={13} className={`transition-transform ${verCambios ? "rotate-180" : ""}`} />
                  </button>
                  {verCambios &&
                    cambios.map((c, k) => (
                      <div key={k} className="flex items-center gap-2 py-1.5 text-[13px]">
                        <span className="text-atenuado text-[11.5px] w-[76px] shrink-0 break-words leading-tight">
                          {c.tipo === "descanso" ? "Descanso · " : ""}
                          {c.comida}
                          {c.opcion === 1 ? " (B)" : ""}
                        </span>
                        <span className="flex-1 min-w-0 break-words">{c.alimento}</span>
                        <span className="shrink-0 tabular-nums">
                          <span className="text-atenuado line-through">{c.antes} g</span>
                          <ArrowRight size={11} className="inline mx-1 text-atenuado" />
                          <b className="text-acento">{c.despues} g</b>
                        </span>
                      </div>
                    ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
