/**
 * Tu semana en tres anillos, como los del reloj: entrenos, hábitos y
 * pesajes. Cerrarlos engancha más que leer tres cifras, y de un vistazo
 * se ve cuál se está quedando corto.
 */

interface Medida {
  hechos: number;
  objetivo: number;
}

const ANILLOS = [
  { clave: "entrenos", etiqueta: "Entrenos", color: "var(--color-acento)", nombreColor: "azul", r: 52 },
  { clave: "habitos", etiqueta: "Hábitos", color: "var(--color-verde)", nombreColor: "verde", r: 39 },
  { clave: "pesajes", etiqueta: "Pesajes", color: "var(--color-turquesa)", nombreColor: "turquesa", r: 26 },
] as const;

type Clave = (typeof ANILLOS)[number]["clave"];

function Anillo({ r, pct, color }: { r: number; pct: number; color: string }) {
  const c = 2 * Math.PI * r;
  const largo = Math.max(0, Math.min(1, pct)) * c;
  return (
    <>
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeOpacity="0.16" strokeWidth="11" />
      {largo > 0 && (
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${largo} ${c}`}
          transform="rotate(-90 60 60)"
          className="anillo-progreso"
          style={{ "--c": c } as React.CSSProperties}
        />
      )}
    </>
  );
}

export default function AnillosSemana({ datos }: { datos: Record<Clave, Medida> }) {
  const visibles = ANILLOS.filter((a) => datos[a.clave].objetivo > 0);
  if (visibles.length === 0) return null;

  /* Una frase: lo que falta para cerrar el anillo más cerca de cerrarse */
  const pendientes = visibles
    .map((a) => ({ ...a, falta: datos[a.clave].objetivo - datos[a.clave].hechos }))
    .filter((a) => a.falta > 0)
    .sort((x, y) => x.falta - y.falta);
  let frase = "¡Semana redonda! Los tres anillos cerrados 🔥";
  if (pendientes.length > 0) {
    const p = pendientes[0];
    const que =
      p.clave === "entrenos"
        ? p.falta === 1 ? "entreno" : "entrenos"
        : p.clave === "habitos"
          ? p.falta === 1 ? "hábito" : "hábitos"
          : p.falta === 1 ? "pesaje" : "pesajes";
    frase = `Te ${p.falta === 1 ? "falta" : "faltan"} ${p.falta} ${que} para cerrar el anillo ${p.nombreColor} 💪`;
  }

  return (
    <section className="tarjeta anim-entrada-2">
      <div className="titulo-tarjeta">TU SEMANA</div>
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 120 120" width="124" height="124" className="shrink-0" role="img" aria-label="Anillos de la semana">
          {ANILLOS.map((a) => (
            <Anillo
              key={a.clave}
              r={a.r}
              color={a.color}
              pct={datos[a.clave].objetivo > 0 ? datos[a.clave].hechos / datos[a.clave].objetivo : 0}
            />
          ))}
        </svg>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {visibles.map((a) => {
            const { hechos, objetivo } = datos[a.clave];
            return (
              <div key={a.clave}>
                <div className="text-[11.5px] font-bold uppercase tracking-[0.06em]" style={{ color: a.color }}>
                  {a.etiqueta}
                </div>
                <div className="num-grande !text-[22px] leading-none">
                  {Math.min(hechos, objetivo)} de {objetivo}
                  {hechos >= objetivo && " ✓"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-atenuado text-[12.5px] mt-3 leading-snug">{frase}</div>
    </section>
  );
}
