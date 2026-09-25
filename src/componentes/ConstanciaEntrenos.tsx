import type { ReactNode } from "react";

/**
 * Calendario de constancia: los últimos meses de entrenos, día a día,
 * como el de contribuciones de GitHub. Cada columna es una semana (de
 * lunes a domingo) y la barrita de debajo se enciende si esa semana
 * cumplió los días de su rutina.
 *
 * Todo llega ya en fechas AAAA-MM-DD calculadas en el servidor (hora de
 * Madrid): así lo que se pinta allí y al hidratar aquí es idéntico.
 */

const SEMANAS = 16;
const FILAS = ["L", "", "X", "", "V", "", "D"];

function sumarDias(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + n));
  return f.toISOString().slice(0, 10);
}

function diaSemana(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default function ConstanciaEntrenos({
  diasEntrenados,
  hoyISO,
  objetivo,
}: {
  diasEntrenados: string[];
  hoyISO: string;
  /** Días por semana de su rutina; 0 si no tiene. */
  objetivo: number;
}) {
  const hechos = new Set(diasEntrenados);
  const lunesHoy = sumarDias(hoyISO, -diaSemana(hoyISO));
  const primerLunes = sumarDias(lunesHoy, -(SEMANAS - 1) * 7);

  const semanas = Array.from({ length: SEMANAS }, (_, w) => {
    const lunes = sumarDias(primerLunes, w * 7);
    const dias = Array.from({ length: 7 }, (_, d) => sumarDias(lunes, d));
    const n = dias.filter((x) => hechos.has(x)).length;
    return { lunes, dias, n };
  });

  const total = semanas.reduce((a, s) => a + s.n, 0);
  /* La semana en curso solo cuenta si ya está cumplida: el lunes aún no
   * ha fallado nadie. */
  const cumplidas = objetivo > 0 ? semanas.filter((s) => s.n >= objetivo).length : 0;
  const cerradas = SEMANAS - (semanas[SEMANAS - 1].n >= objetivo ? 0 : 1);

  if (total === 0) return null;

  return (
    <section className="tarjeta">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div className="titulo-tarjeta !mb-0">CONSTANCIA</div>
        <span className="text-atenuado text-[11.5px]">últimos 4 meses</span>
      </div>

      <div
        className="grid gap-[3px] items-center"
        style={{ gridTemplateColumns: `14px repeat(${SEMANAS}, minmax(0, 1fr))` }}
      >
        {/* Meses: la etiqueta va en la semana en la que empieza cada uno */}
        <span />
        {semanas.map((s, i) => {
          const mes = Number(s.lunes.slice(5, 7)) - 1;
          const mesAntes = i > 0 ? Number(semanas[i - 1].lunes.slice(5, 7)) - 1 : -1;
          return (
            <span key={s.lunes} className="text-atenuado text-[9.5px] leading-none h-3 whitespace-nowrap overflow-visible">
              {mes !== mesAntes && i < SEMANAS - 1 ? MESES[mes] : ""}
            </span>
          );
        })}

        {FILAS.map((etiqueta, d) => (
          <Fila key={d} etiqueta={etiqueta}>
            {semanas.map((s) => {
              const iso = s.dias[d];
              const futuro = iso > hoyISO;
              const hecho = hechos.has(iso);
              return (
                <span
                  key={iso}
                  className="aspect-square rounded-[3px]"
                  style={{
                    background: futuro
                      ? "transparent"
                      : hecho
                        ? "var(--color-acento)"
                        : "var(--color-campo)",
                    outline: iso === hoyISO ? "1.5px solid var(--color-acento)" : undefined,
                    outlineOffset: -1.5,
                  }}
                  title={hecho ? `Entreno el ${iso}` : undefined}
                />
              );
            })}
          </Fila>
        ))}

        {/* Semana cumplida: una barrita dorada debajo de su columna */}
        {objetivo > 0 && (
          <>
            <span />
            {semanas.map((s) => (
              <span
                key={s.lunes}
                className="h-[3px] rounded-full mt-0.5"
                style={{ background: s.n >= objetivo ? "var(--color-dorado)" : "transparent" }}
              />
            ))}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] mt-3">
        <span>
          <b>{total}</b> <span className="text-atenuado">{total === 1 ? "entreno" : "entrenos"}</span>
        </span>
        {objetivo > 0 && (
          <span>
            <b className="text-dorado">{cumplidas}</b>
            <span className="text-atenuado"> de {cerradas} semanas cumplidas</span>
          </span>
        )}
      </div>
    </section>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <>
      <span className="text-atenuado text-[9.5px] leading-none">{etiqueta}</span>
      {children}
    </>
  );
}
