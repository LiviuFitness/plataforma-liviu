import type { VolumenMuscular } from "@/lib/musculos";

/** Intensidad del color según series efectivas en los últimos 7 días. */
function opacidadPorSeries(n: number): string {
  if (n === 0) return "0.08";
  if (n <= 2) return "0.3";
  if (n <= 4) return "0.55";
  if (n <= 6) return "0.8";
  return "1";
}

function etiquetaDias(dias: number | null): string {
  if (dias === null) return "Nunca entrenado";
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  return `Hace ${dias} días`;
}

/** Mapa de calor de los 16 grupos musculares: cuánto se han trabajado
 * en la última semana y cuánto hace del último entreno de cada uno.
 * Lo usa tanto el cliente en Mi Progreso como el entrenador en la
 * ficha del cliente. */
export default function MapaMuscular({ volumen }: { volumen: VolumenMuscular[] }) {
  const hayDatos = volumen.some((v) => v.diasDesdeUltimoEntreno !== null);

  if (!hayDatos) {
    return (
      <section className="tarjeta">
        <div className="titulo-tarjeta">MAPA MUSCULAR</div>
        <div className="text-atenuado text-[13.5px]">
          En cuanto haya sesiones registradas, aquí se verá qué grupos
          musculares se han trabajado más y cuáles llevan tiempo sin tocarse.
        </div>
      </section>
    );
  }

  return (
    <section className="tarjeta">
      <div className="titulo-tarjeta">MAPA MUSCULAR — últimos 7 días</div>
      <div className="grid grid-cols-4 gap-2">
        {volumen.map((v) => (
          <div
            key={v.grupo}
            title={`${v.grupo} · ${v.seriesUltimos7Dias} series · ${etiquetaDias(v.diasDesdeUltimoEntreno)}`}
            className="rounded-[10px] px-1.5 py-2.5 text-center border border-borde-2"
            style={{ background: `rgba(41, 171, 226, ${opacidadPorSeries(v.seriesUltimos7Dias)})` }}
          >
            <div
              className={`text-[10.5px] font-semibold leading-tight ${
                v.seriesUltimos7Dias > 4 ? "text-fondo" : "text-texto-2"
              }`}
            >
              {v.grupo}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
