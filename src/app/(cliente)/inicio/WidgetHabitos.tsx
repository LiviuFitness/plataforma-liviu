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
import { fechaLocal } from "@/lib/habitos";
import {
  COLOR_ICONO_HABITO,
  HABITOS_SUGERIDOS,
  type Habito,
  type HabitoRegistro,
} from "@/lib/tipos";
import { IconoTarjeta } from "@/componentes/ui";

const ICONOS: Record<string, LucideIcon> = {
  footprints: Footprints,
  "glass-water": GlassWater,
  moon: Moon,
  "circle-check": CircleCheck,
};

/**
 * Bloque de "Tu día": los hábitos de hoy como botones de un toque.
 *
 * Aquí solo se contesta "¿lo he hecho hoy?". Las barras de la semana
 * (2/7, 1/7…) que antes iban debajo de cada uno respondían a otra
 * pregunta, "¿cómo voy?", y se han ido a Mi progreso, que es donde se
 * mira la evolución.
 */
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
    if ("vibrate" in navigator) navigator.vibrate(10);
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
      <div className="fila">
        <IconoTarjeta Icono={CircleCheck} color="var(--color-atenuado)" tamano={34} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold leading-tight">Hábitos diarios</div>
          <div className="text-atenuado text-[12.5px] leading-snug">
            Pasos, agua y sueño, marcados cada día
          </div>
        </div>
        <button
          className="cta cta-mini !mb-0 shrink-0"
          onClick={activarSugeridos}
          disabled={creando}
        >
          {creando ? "…" : "Empezar"}
        </button>
      </div>
    );
  }

  /* Tres botones en fila, con el icono encima, mientras quepan. Con un
   * cuarto hábito o un nombre largo ("Estiramientos de cadera") pasan a
   * dos columnas con el icono al lado: en un tercio de móvil la palabra
   * se partía por la mitad. */
  const holgado = activos.length <= 3 && activos.every((h) => h.nombre.length <= 10);

  return (
    <div className="py-3 border-b border-borde last:border-b-0">
      <div className={`grid gap-2 ${holgado ? "grid-cols-3" : "grid-cols-2"}`}>
        {activos.map((h) => {
          const Icono = ICONOS[h.icono] ?? CircleCheck;
          const color = COLOR_ICONO_HABITO[h.icono] ?? COLOR_ICONO_HABITO["circle-check"];
          const hecho = marcadosHoy.has(h.id);
          return (
            <button
              key={h.id}
              className={`rounded-[12px] border px-2.5 py-2.5 flex items-center gap-1.5 min-w-0 anim-pulsable transition-colors ${
                holgado ? "flex-col" : "flex-row text-left"
              } ${pendientes.has(h.id) ? "opacity-50" : ""}`}
              style={{
                borderColor: hecho
                  ? `color-mix(in srgb, ${color} 45%, transparent)`
                  : "var(--color-borde-2)",
                background: hecho
                  ? `color-mix(in srgb, ${color} 12%, transparent)`
                  : "transparent",
              }}
              onClick={() => alternar(h.id)}
              disabled={pendientes.has(h.id)}
              aria-pressed={hecho}
            >
              <Icono
                size={18}
                strokeWidth={1.75}
                className="shrink-0"
                style={{ color: hecho ? color : "var(--color-atenuado)" }}
              />
              <span
                className={`text-[12.5px] leading-tight min-w-0 ${
                  holgado ? "text-center" : ""
                } ${hecho ? "font-semibold" : "text-texto-2"}`}
              >
                {h.nombre}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
