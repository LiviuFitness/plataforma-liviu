import { CircleCheck, Footprints, GlassWater, Moon, type LucideIcon } from "lucide-react";
import { casillasSemana } from "@/lib/habitos";
import { COLOR_ICONO_HABITO, type Habito, type HabitoRegistro } from "@/lib/tipos";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

const ICONOS: Record<string, LucideIcon> = {
  footprints: Footprints,
  "glass-water": GlassWater,
  moon: Moon,
  "circle-check": CircleCheck,
};

/**
 * Hábitos de la semana en curso, día a día. Vivía en Inicio como una
 * barra por hábito; allí ahora solo se marca el de hoy, y la pregunta
 * "¿cómo voy esta semana?" se contesta aquí, junto al peso.
 *
 * Casillas en vez de barra: "2/7" en una barra no dice si fueron lunes
 * y martes o martes y domingo, y eso es justo lo que se quiere ver.
 */
export default function HabitosSemana({
  habitos,
  registros,
}: {
  habitos: Habito[];
  registros: HabitoRegistro[];
}) {
  const activos = habitos.filter((h) => h.activo).sort((a, b) => a.orden - b.orden);
  if (activos.length === 0) return null;
  const hoy = (new Date().getDay() + 6) % 7;

  return (
    <section className="tarjeta">
      <div className="titulo-tarjeta">HÁBITOS ESTA SEMANA</div>
      <div className="flex flex-col gap-3">
        {activos.map((h) => {
          const Icono = ICONOS[h.icono] ?? CircleCheck;
          const color = COLOR_ICONO_HABITO[h.icono] ?? COLOR_ICONO_HABITO["circle-check"];
          const semana = casillasSemana(registros, h.id);
          return (
            <div key={h.id} className="flex items-center gap-3">
              <Icono size={17} strokeWidth={1.75} className="shrink-0" style={{ color }} />
              <span className="flex-1 min-w-0 text-[13.5px] text-texto-2 leading-tight break-words">
                {h.nombre}
              </span>
              <div className="flex gap-1 shrink-0">
                {semana.map((hecho, i) => (
                  <span
                    key={i}
                    className="w-[18px] h-[18px] rounded-[5px] border"
                    title={DIAS[i]}
                    style={{
                      background: hecho
                        ? `color-mix(in srgb, ${color} 70%, transparent)`
                        : "transparent",
                      borderColor: hecho
                        ? "transparent"
                        : i === hoy
                          ? `color-mix(in srgb, ${color} 55%, transparent)`
                          : "var(--color-borde-2)",
                      borderStyle: !hecho && i === hoy ? "dashed" : "solid",
                    }}
                  />
                ))}
              </div>
              <span className="text-atenuado text-[12px] tabular-nums w-7 text-right shrink-0">
                {semana.filter(Boolean).length}/7
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 justify-end mt-2 pr-10">
        {DIAS.map((d) => (
          <span key={d} className="w-[18px] text-center text-atenuado text-[9.5px] font-bold">
            {d}
          </span>
        ))}
      </div>
    </section>
  );
}
