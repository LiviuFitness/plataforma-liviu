"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleCheck,
  Footprints,
  GlassWater,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { casillasSemana, fechaLocal } from "@/lib/habitos";
import {
  COLOR_ICONO_HABITO,
  HABITOS_SUGERIDOS,
  type Habito,
  type HabitoRegistro,
} from "@/lib/tipos";
import { IconoTarjeta } from "@/componentes/ui";

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

const ICONOS: Record<string, LucideIcon> = {
  footprints: Footprints,
  "glass-water": GlassWater,
  moon: Moon,
  "circle-check": CircleCheck,
};

/** Tarjeta de Inicio: checklist de hábitos diarios + racha semanal por hábito. */
export default function WidgetHabitos({
  clienteId,
  habitos,
  registros,
}: {
  clienteId: string;
  habitos: Habito[];
  registros: HabitoRegistro[];
}) {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [pendientes, setPendientes] = useState<Set<string>>(new Set());

  const hoy = fechaLocal();
  const marcadosHoy = new Set(
    registros.filter((r) => r.fecha === hoy && r.completado).map((r) => r.habito_id)
  );

  async function activarSugeridos() {
    setCreando(true);
    const supabase = crearClienteNavegador();
    await supabase.from("habitos").insert(
      HABITOS_SUGERIDOS.map((h, i) => ({
        cliente_id: clienteId,
        nombre: h.nombre,
        icono: h.icono,
        orden: i,
      }))
    );
    setCreando(false);
    router.refresh();
  }

  async function alternar(habitoId: string) {
    setPendientes((prev) => new Set(prev).add(habitoId));
    const supabase = crearClienteNavegador();
    const hecho = marcadosHoy.has(habitoId);
    if (hecho) {
      await supabase
        .from("habitos_registros")
        .delete()
        .eq("habito_id", habitoId)
        .eq("fecha", hoy);
    } else {
      await supabase
        .from("habitos_registros")
        .upsert(
          { habito_id: habitoId, cliente_id: clienteId, fecha: hoy, completado: true },
          { onConflict: "habito_id,fecha" }
        );
    }
    setPendientes((prev) => {
      const copia = new Set(prev);
      copia.delete(habitoId);
      return copia;
    });
    router.refresh();
  }

  const activos = habitos.filter((h) => h.activo).sort((a, b) => a.orden - b.orden);

  if (activos.length === 0) {
    return (
      <section className="tarjeta anim-entrada-4">
        <div className="titulo-tarjeta">HÁBITOS DIARIOS</div>
        <div className="text-atenuado text-[13.5px] mb-3">
          Lleva el control de pasos, agua, sueño… lo que quieras marcar cada día.
        </div>
        <button className="cta !mb-0" onClick={activarSugeridos} disabled={creando}>
          {creando ? "…" : "Empezar a registrar hábitos"}
        </button>
      </section>
    );
  }

  return (
    <section className="tarjeta anim-entrada-4">
      <div className="titulo-tarjeta">HÁBITOS DE HOY</div>
      <div className="flex flex-col gap-4">
        {activos.map((h) => {
          const Icono = ICONOS[h.icono] ?? CircleCheck;
          const color = COLOR_ICONO_HABITO[h.icono] ?? COLOR_ICONO_HABITO["circle-check"];
          const hecho = marcadosHoy.has(h.id);
          const semana = casillasSemana(registros, h.id);
          const diasHechos = semana.filter(Boolean).length;
          const pct = Math.round((diasHechos / 7) * 100);
          return (
            <button
              key={h.id}
              className={`flex items-center gap-3 w-full text-left anim-pulsable ${
                pendientes.has(h.id) ? "opacity-50" : ""
              }`}
              onClick={() => alternar(h.id)}
              disabled={pendientes.has(h.id)}
              title={DIAS_SEMANA.map((d, i) => `${d}${semana[i] ? "✓" : ""}`).join(" ")}
            >
              <IconoTarjeta
                Icono={Icono}
                color={hecho ? color : "var(--color-atenuado)"}
                tamano={36}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[14px] ${hecho ? "font-semibold" : "text-texto-2"}`}>
                    {h.nombre}
                  </span>
                  <span className="texto-secundario shrink-0">{diasHechos}/7</span>
                </div>
                <div className="barra-capsula mt-1.5">
                  <div
                    className="barra-capsula-relleno"
                    style={{ "--tc": color, width: `${pct}%` } as React.CSSProperties}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
