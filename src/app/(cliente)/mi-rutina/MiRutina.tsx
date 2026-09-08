"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import AvatarEjercicio from "@/componentes/AvatarEjercicio";
import IconoMancuerna from "@/componentes/IconoMancuerna";
import EstadoVacio from "@/componentes/EstadoVacio";
import { fotoEntreno } from "@/lib/fotoEntreno";
import type { DiaUI, EjercicioUI } from "@/lib/tipos";

/** Series efectivas: las de calentamiento no cuentan como trabajo. */
function seriesEfectivas(ejercicios: EjercicioUI[]) {
  return ejercicios.reduce(
    (a, e) => a + e.series.filter((s) => s.tipo !== "calentamiento").length,
    0
  );
}

/** Resumen de una línea de lo prescrito, sin repetir el detalle que ya
 * se ve dentro de la sesión: cuántas series y a qué repeticiones. */
function resumenSeries(e: EjercicioUI) {
  const efectivas = e.series.filter((s) => s.tipo !== "calentamiento");
  if (efectivas.length === 0) return "Calentamiento";
  const reps = efectivas[0].reps?.trim();
  const rir = efectivas[0].rir?.trim();
  return [
    `${efectivas.length} ${efectivas.length === 1 ? "serie" : "series"}`,
    reps ? `${reps} reps` : null,
    rir ? `RIR ${rir}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Los grupos que más se trabajan ese día, para reconocerlo de un vistazo. */
function gruposPrincipales(ejercicios: EjercicioUI[]) {
  const cuenta = new Map<string, number>();
  for (const e of ejercicios) {
    if (!e.grupo_muscular) continue;
    cuenta.set(e.grupo_muscular, (cuenta.get(e.grupo_muscular) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);
}

export default function MiRutina({
  nombreRutina,
  notas,
  semana,
  dias,
  hechosEstaSemana,
  idSiguiente,
}: {
  nombreRutina: string;
  notas: string;
  semana: number;
  dias: DiaUI[];
  hechosEstaSemana: string[];
  idSiguiente: string | null;
}) {
  const hechos = new Set(hechosEstaSemana);
  // Abierto de partida el día que toca: entrar y ver ya qué te espera
  // hoy es el 90 % de las visitas a esta pantalla.
  const [abierto, setAbierto] = useState<string | null>(idSiguiente);

  if (dias.length === 0) {
    return (
      <>
        <h1 className="h1">Mi rutina</h1>
        <div className="sub mb-4">tu plan de entrenamiento —</div>
        <EstadoVacio
          Icono={IconoMancuerna}
          color="var(--color-acento)"
          titulo="Todavía no tienes rutina"
          descripcion="En cuanto tu entrenador te asigne el plan, aquí verás cada día con sus ejercicios y podrás empezar el que quieras."
        />
      </>
    );
  }

  return (
    <>
      <h1 className="h1">Mi rutina</h1>
      <div className="sub mb-4">
        {nombreRutina ? `${nombreRutina} · ` : ""}semana {semana} —
      </div>

      {notas && (
        <div className="banner !mb-3">
          <span>{notas}</span>
        </div>
      )}

      {dias.map((dia) => {
        const efectivas = seriesEfectivas(dia.ejercicios);
        const hecho = hechos.has(dia.id);
        const esSiguiente = dia.id === idSiguiente;
        const estaAbierto = abierto === dia.id;

        return (
          <section
            key={dia.id}
            className={`tarjeta !p-0 overflow-hidden !mb-2.5 ${
              esSiguiente ? "tarjeta-acento" : ""
            }`}
          >
            <button
              className="relative overflow-hidden w-full flex items-center gap-3 px-4 py-3.5 text-left anim-pulsable"
              onClick={() => setAbierto(estaAbierto ? null : dia.id)}
              aria-expanded={estaAbierto}
            >
              {/* Foto según los músculos del día, no según su nombre: los
               * nombres son texto libre y "TORSO A + ABS" no hay quien lo
               * adivine. Se apaga antes del nombre para que el texto se
               * lea igual en las seis. */}
              <span
                aria-hidden
                className="absolute inset-y-0 right-0 w-[52%] pointer-events-none"
                style={{
                  backgroundImage: `url(${fotoEntreno(
                    dia.ejercicios.map((e) => e.grupo_muscular)
                  )})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center right",
                }}
              />
              <span
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg, var(--color-panel) 0%, var(--color-panel) 46%, color-mix(in srgb, var(--color-panel) 55%, transparent) 74%, color-mix(in srgb, var(--color-panel) 35%, transparent) 100%)",
                }}
              />
              {/* Marca de estado: hecho esta semana, o el día que toca. */}
              <span
                className={`relative w-9 h-9 rounded-full grid place-items-center shrink-0 ${
                  hecho ? "bg-verde/15" : esSiguiente ? "bg-acento/15" : "bg-campo"
                }`}
              >
                {hecho ? (
                  <Check size={17} className="text-verde" />
                ) : (
                  <IconoMancuerna
                    size={17}
                    className={esSiguiente ? "text-acento" : "text-atenuado"}
                  />
                )}
              </span>

              <span className="relative flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-bold text-[15.5px] leading-tight truncate">
                    {dia.nombre}
                  </span>
                  {esSiguiente && !hecho && (
                    <span className="text-[10px] tracking-[1.2px] uppercase text-acento shrink-0">
                      Te toca
                    </span>
                  )}
                </span>
                <span className="block text-atenuado text-[12.5px] mt-0.5">
                  {dia.ejercicios.length} ejercicios · {efectivas} series ·{" "}
                  {Math.round(efectivas * 2.5)}–{Math.round(efectivas * 3.2)} min
                </span>
                <span className="flex flex-wrap gap-1 mt-1.5">
                  {gruposPrincipales(dia.ejercicios).map((g) => (
                    <span
                      key={g}
                      className="text-[10.5px] text-atenuado bg-campo rounded-md px-1.5 py-px"
                    >
                      {g}
                    </span>
                  ))}
                </span>
              </span>

              <ChevronDown
                size={16}
                className={`icono-rotable text-atenuado shrink-0 relative ${
                  estaAbierto ? "icono-rotable-abierto" : ""
                }`}
              />
            </button>

            <div className={`acordeon ${estaAbierto ? "acordeon-abierto" : ""}`}>
              <div>
                <div className="border-t border-borde px-4 pt-1 pb-4">
                  {dia.ejercicios.map((e, i) => (
                    <div
                      key={`${e.ejercicio_id}-${i}`}
                      className="flex items-center gap-3 py-2 border-b border-borde/50 last:border-0"
                    >
                      <AvatarEjercicio videoUrl={e.video_url ?? null} tamano={44} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold leading-tight">
                          {e.nombre}
                        </div>
                        <div className="text-atenuado text-[12.5px] mt-0.5">
                          {resumenSeries(e)}
                        </div>
                      </div>
                    </div>
                  ))}

                  <Link
                    href={`/sesion/${dia.id}`}
                    className="cta anim-pulsable !mb-0 block text-center mt-3"
                  >
                    {hecho ? "Repetir este entreno →" : "Empezar este entreno →"}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
