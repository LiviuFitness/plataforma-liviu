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
import { HABITOS_SUGERIDOS, type Habito, type HabitoRegistro } from "@/lib/tipos";

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
      <section className="tarjeta">
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
    <section className="tarjeta">
      <div className="titulo-tarjeta">HÁBITOS DE HOY</div>
      <div className="flex flex-col gap-2.5">
        {activos.map((h) => {
          const Icono = ICONOS[h.icono] ?? CircleCheck;
          const hecho = marcadosHoy.has(h.id);
          const semana = casillasSemana(registros, h.id);
          return (
            <div key={h.id} className="flex items-center gap-3">
              <button
                className={`flex items-center gap-2.5 flex-1 text-left ${
                  pendientes.has(h.id) ? "opacity-50" : ""
                }`}
                onClick={() => alternar(h.id)}
                disabled={pendientes.has(h.id)}
              >
                <span
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
                    hecho
                      ? "bg-acento/15 border-acento text-acento"
                      : "border-borde-2 text-atenuado"
                  }`}
                >
                  <Icono size={18} />
                </span>
                <span className={`text-[14px] ${hecho ? "" : "text-texto-2"}`}>
                  {h.nombre}
                </span>
              </button>
              <div className="flex gap-1">
                {semana.map((activo, i) => (
                  <div
                    key={i}
                    title={DIAS_SEMANA[i]}
                    className={`w-2 h-2 rounded-full ${
                      activo ? "bg-acento" : "bg-borde-2"
                    }`}
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
