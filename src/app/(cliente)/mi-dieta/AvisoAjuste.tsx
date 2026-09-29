"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Bell } from "lucide-react";

export interface CambioVisible {
  tipo: "entreno" | "descanso";
  comida: string;
  alimento: string;
  opcion: 0 | 1;
  antes: number;
  despues: number;
}

const CLAVE = "ajuste-dieta-visto";

/**
 * "Liviu ha ajustado tu dieta": qué cantidades han cambiado en el último
 * ajuste, para que no se lleve sorpresas. Sale hasta que pulsa
 * "Entendido" (se recuerda en el móvil).
 */
export default function AvisoAjuste({ id, fecha, cambios }: { id: string; fecha: string; cambios: CambioVisible[] }) {
  const [visto, setVisto] = useState(true);

  /* localStorage solo existe en el navegador: se lee tras montar */
  useEffect(() => {
    let v = false;
    try {
      v = localStorage.getItem(CLAVE) === id;
    } catch {
      /* sin almacenamiento: se enseña */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisto(v);
  }, [id]);

  if (visto || cambios.length === 0) return null;

  function entendido() {
    try {
      localStorage.setItem(CLAVE, id);
    } catch {
      /* no pasa nada */
    }
    setVisto(true);
  }

  const tipos = (["entreno", "descanso"] as const).filter((t) => cambios.some((c) => c.tipo === t));
  const dias = Math.floor((Date.parse(new Date().toISOString()) - Date.parse(fecha)) / 86400000);

  return (
    <section className="tarjeta tarjeta-acento !p-3.5 anim-aparecer">
      <div className="flex items-center gap-2 mb-1.5">
        <Bell size={15} className="text-acento shrink-0" />
        <div className="font-bold text-[14.5px] flex-1 min-w-0">Liviu ha ajustado tu dieta</div>
        <span className="text-atenuado text-[12px] shrink-0">{dias <= 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`}</span>
      </div>
      <div className="text-[13px] text-texto-2 leading-snug mb-1">Para seguir avanzando, estas cantidades cambian:</div>
      {tipos.map((t) => (
        <div key={t}>
          {tipos.length > 1 && (
            <div className="text-[11.5px] text-atenuado tracking-wide mt-2.5 mb-0.5">
              {t === "entreno" ? "DÍA DE ENTRENO" : "DÍA DE DESCANSO"}
            </div>
          )}
          {cambios
            .filter((c) => c.tipo === t)
            .map((c, k) => (
              <div key={k} className="flex items-center gap-2 py-1.5 border-b border-borde last:border-0 text-[13.5px]">
                <span className="text-atenuado text-[12px] w-[70px] shrink-0 break-words leading-tight">
                  {c.comida}
                  {c.opcion === 1 ? " (B)" : ""}
                </span>
                <span className="flex-1 min-w-0 break-words">{c.alimento}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="text-atenuado line-through">{c.antes} g</span>
                  <ArrowRight size={12} className="inline mx-1 text-atenuado" />
                  <b className="text-acento">{c.despues} g</b>
                </span>
              </div>
            ))}
        </div>
      ))}
      <button className="ghost w-full mt-2.5" onClick={entendido}>
        Entendido
      </button>
    </section>
  );
}
