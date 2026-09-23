"use client";

import {
  CircleCheck,
  Footprints,
  GlassWater,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { AnilloAdherencia } from "@/componentes/ui";
import { consistencia, fechaLocal } from "@/lib/habitos";
import { COLOR_ICONO_HABITO, type Habito, type HabitoRegistro } from "@/lib/tipos";

const SEMANAS = 4;

const ICONOS: Record<string, LucideIcon> = {
  footprints: Footprints,
  "glass-water": GlassWater,
  moon: Moon,
  "circle-check": CircleCheck,
};

/** Últimos `SEMANAS * 7` días, del más antiguo al más reciente. */
function ultimosDias(): string[] {
  const dias: string[] = [];
  for (let i = SEMANAS * 7 - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(fechaLocal(d));
  }
  return dias;
}

/** Pestaña Hábitos: consistencia diaria de cada hábito en las últimas 4 semanas. */
export default function TabHabitos({
  habitos,
  registros,
}: {
  habitos: Habito[];
  registros: HabitoRegistro[];
}) {
  const activos = habitos.filter((h) => h.activo).sort((a, b) => a.orden - b.orden);
  const dias = ultimosDias();
  const global = consistencia(habitos, registros, SEMANAS);
  const hoy = dias[dias.length - 1];

  if (activos.length === 0) {
    return (
      <section className="tarjeta">
        <div className="titulo-tarjeta">HÁBITOS</div>
        <div className="text-atenuado text-[13.5px]">
          Este cliente todavía no ha configurado ningún hábito diario.
        </div>
      </section>
    );
  }

  return (
    <section className="tarjeta">
      <div className="flex justify-between items-center mb-3">
        <div className="titulo-tarjeta !mb-0">CONSISTENCIA — últimas 4 semanas</div>
        <AnilloAdherencia valor={global} tamano={40} />
      </div>

      <div className="flex flex-col gap-4">
        {activos.map((h) => {
          const Icono = ICONOS[h.icono] ?? CircleCheck;
          const color = COLOR_ICONO_HABITO[h.icono] ?? COLOR_ICONO_HABITO["circle-check"];
          const marcados = new Set(
            registros
              .filter((r) => r.habito_id === h.id && r.completado)
              .map((r) => r.fecha)
          );
          const pct = consistencia([h], registros, SEMANAS);
          return (
            <div key={h.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icono size={16} className="shrink-0" style={{ color }} />
                <span className="font-bold text-[14px] flex-1">{h.nombre}</span>
                <span className="text-atenuado text-[12.5px]">{pct}%</span>
              </div>
              {/* Cuatro bloques de siete, uno por semana: 28 casillas
                * seguidas no dejaban ver dónde empezaba cada semana. La
                * última casilla es hoy y va recuadrada. */}
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((w) => (
                  <div key={w} className="grid grid-cols-7 gap-[2px]">
                    {dias.slice(w * 7, w * 7 + 7).map((f) => (
                      <div
                        key={f}
                        title={f}
                        className="aspect-square rounded-[2px]"
                        style={{
                          background: marcados.has(f) ? color : "var(--color-borde-2)",
                          outline: f === hoy ? "1px solid var(--color-texto-2)" : undefined,
                          outlineOffset: 1,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-2 mt-2 text-atenuado text-[10.5px] font-semibold">
        {/* Son tramos de siete días hacia atrás desde hoy, no semanas de
          * lunes a domingo: las etiquetas lo dicen así. */}
        <span>Hace 4 sem.</span>
        <span>Hace 3 sem.</span>
        <span>Hace 2 sem.</span>
        <span className="text-right">Últimos 7 días</span>
      </div>
    </section>
  );
}
