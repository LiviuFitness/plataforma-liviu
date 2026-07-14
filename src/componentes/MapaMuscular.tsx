import { Dumbbell } from "lucide-react";
import type { VolumenMuscular } from "@/lib/musculos";
import EstadoVacio from "./EstadoVacio";

/** Intensidad del color según series efectivas en los últimos 7 días. */
function opacidadPorSeries(n: number): number {
  if (n === 0) return 0.08;
  if (n <= 2) return 0.3;
  if (n <= 4) return 0.55;
  if (n <= 6) return 0.8;
  return 1;
}

function etiquetaDias(dias: number | null): string {
  if (dias === null) return "Nunca entrenado";
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  return `Hace ${dias} días`;
}

/** Agrupación fija de los 16 grupos musculares del método en 3 zonas
 * corporales, solo para presentación (no altera el cálculo de volumen). */
const ZONAS: { nombre: string; grupos: string[] }[] = [
  {
    nombre: "Tren superior",
    grupos: [
      "Pectoral",
      "Dorsales",
      "Trapecio",
      "Deltoides Lateral",
      "Deltoides Posterior",
      "Deltoides Anterior",
      "Bíceps",
      "Tríceps",
      "Antebrazo",
    ],
  },
  { nombre: "Core", grupos: ["Abdomen", "Lumbares"] },
  {
    nombre: "Tren inferior",
    grupos: ["Cuádriceps", "Isquiosurales", "Glúteos", "Aductores", "Gemelos"],
  },
];

/** Mapa de calor de los 16 grupos musculares: cuánto se han trabajado
 * en la última semana y cuánto hace del último entreno de cada uno.
 * Lo usa tanto el cliente en Mi Progreso como el entrenador en la
 * ficha del cliente. */
export default function MapaMuscular({ volumen }: { volumen: VolumenMuscular[] }) {
  const hayDatos = volumen.some((v) => v.diasDesdeUltimoEntreno !== null);
  const porGrupo = new Map(volumen.map((v) => [v.grupo, v]));
  let indice = 0;

  if (!hayDatos) {
    return (
      <section className="tarjeta">
        <div className="titulo-tarjeta">MAPA MUSCULAR</div>
        <EstadoVacio
          Icono={Dumbbell}
          titulo="Empieza a entrenar para descubrir tu mapa muscular"
          descripcion="En cuanto registres sesiones, aquí verás qué grupos musculares has trabajado más y cuáles llevan tiempo sin tocarse."
        />
      </section>
    );
  }

  return (
    <section className="tarjeta">
      <div className="titulo-tarjeta">MAPA MUSCULAR — últimos 7 días</div>
      <div className="flex flex-col gap-4">
        {ZONAS.map((zona) => (
          <div key={zona.nombre}>
            <div className="text-atenuado text-[10.5px] font-semibold tracking-[1px] uppercase mb-2">
              {zona.nombre}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {zona.grupos.map((nombre) => {
                const v = porGrupo.get(nombre);
                const series = v?.seriesUltimos7Dias ?? 0;
                const opacidad = opacidadPorSeries(series);
                const i = indice++;
                return (
                  <div
                    key={nombre}
                    title={`${nombre} · ${series} series · ${etiquetaDias(v?.diasDesdeUltimoEntreno ?? null)}`}
                    className="anim-aparecer rounded-[14px] px-1.5 py-3 text-center border border-borde-2"
                    style={{
                      animationDelay: `${i * 25}ms`,
                      background: `linear-gradient(135deg, color-mix(in srgb, var(--color-acento) ${
                        opacidad * 100
                      }%, transparent), color-mix(in srgb, var(--color-acento) ${
                        opacidad * 55
                      }%, transparent))`,
                    }}
                  >
                    <div
                      className={`text-[10.5px] font-semibold leading-tight ${
                        series > 4 ? "text-fondo" : "text-texto-2"
                      }`}
                    >
                      {nombre}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
