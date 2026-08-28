import { Check } from "lucide-react";

const INICIALES = ["L", "M", "X", "J", "V", "S", "D"];

/** Los siete días de la semana con los ya entrenados marcados.
 *
 * Es la respuesta a "¿cómo voy?", que hasta ahora la Home solo daba en
 * una línea de texto pequeño dentro del saludo. Ocupa el sitio que tenía
 * la frase del día porque contesta algo que al cliente le importa de
 * verdad nada más abrir la app. */
export default function SemanaEntrenos({
  diasEntrenados,
  objetivoSemana,
}: {
  /** Lunes a domingo. */
  diasEntrenados: boolean[];
  /** Días de entreno que tiene su rutina, para el "de X". */
  objetivoSemana: number;
}) {
  const hoy = (new Date().getDay() + 6) % 7;
  const hechas = diasEntrenados.filter(Boolean).length;

  return (
    <section className="tarjeta anim-entrada-1">
      <div className="flex items-baseline justify-between mb-3">
        <span className="titulo-tarjeta !mb-0">Esta semana</span>
        <span className="text-[12.5px] text-atenuado tabular-nums">
          <b className="text-texto-2">{hechas}</b>
          {objetivoSemana > 0 ? ` de ${objetivoSemana}` : ""} entrenos
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {INICIALES.map((inicial, i) => {
          const hecho = diasEntrenados[i];
          const esHoy = i === hoy;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span
                className={`text-[10.5px] font-semibold ${
                  esHoy ? "text-acento" : "text-atenuado"
                }`}
              >
                {inicial}
              </span>
              <span
                className={`w-full aspect-square max-w-[34px] rounded-[10px] flex items-center justify-center border ${
                  hecho
                    ? "bg-acento/15 border-acento/45 text-acento"
                    : esHoy
                      ? "border-acento/45 border-dashed"
                      : "border-borde-2"
                }`}
                aria-label={`${inicial}${hecho ? ": entrenado" : ""}${esHoy ? " (hoy)" : ""}`}
              >
                {hecho && <Check size={14} strokeWidth={3} />}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
