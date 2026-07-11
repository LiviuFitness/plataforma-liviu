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
              <div className="grid grid-cols-[repeat(28,minmax(0,1fr))] gap-[3px]">
                {dias.map((f) => (
                  <div
                    key={f}
                    title={f}
                    className="aspect-square rounded-[2px]"
                    style={{ background: marcados.has(f) ? color : "var(--color-borde-2)" }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
