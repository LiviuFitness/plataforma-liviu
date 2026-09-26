"use client";

import { useId, useMemo, useState } from "react";

type Rango = "1M" | "3M" | "Todo";
const DIAS: Record<Rango, number | null> = { "1M": 31, "3M": 92, Todo: null };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const W = 320;
const H = 150;
const ARRIBA = 12;
const ABAJO = 22; // sitio para los meses
const LADO = 8;

const coma = (n: number, d = 1) => n.toFixed(d).replace(".", ",");
function aFecha(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

/**
 * Evolución del peso: curva suave con degradado, meses abajo y, al tocar
 * (o arrastrar), el dato exacto de ese día. El eje X es de fechas reales:
 * si un mes se pesó poco, la curva no lo "aprieta" como hacía el
 * Sparkline, que ponía cada registro a la misma distancia.
 */
export default function GraficaPeso({
  medidas,
  color = "var(--color-turquesa)",
}: {
  /** Registros con peso, de más antiguo a más reciente. */
  medidas: { fecha: string; peso: number }[];
  color?: string;
}) {
  const idGrad = useId();
  const primera = medidas[0] ? aFecha(medidas[0].fecha) : null;
  const ultima = medidas.length ? aFecha(medidas[medidas.length - 1].fecha) : null;
  const diasTotales = primera && ultima ? (ultima.getTime() - primera.getTime()) / 86400000 : 0;
  const [rango, setRango] = useState<Rango>(diasTotales > 100 ? "3M" : "Todo");
  const [sel, setSel] = useState<number | null>(null);

  const datos = useMemo(() => {
    const limite = DIAS[rango];
    if (!limite || !ultima) return medidas;
    const desde = ultima.getTime() - limite * 86400000;
    return medidas.filter((m) => aFecha(m.fecha).getTime() >= desde);
  }, [medidas, rango, ultima]);

  if (medidas.length < 2) {
    return (
      <div className="text-atenuado text-[13.5px] py-4">
        Con dos pesajes empezarás a ver aquí tu evolución.
      </div>
    );
  }

  const t0 = aFecha(datos[0].fecha).getTime();
  const t1 = aFecha(datos[datos.length - 1].fecha).getTime();
  const valores = datos.map((d) => d.peso);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const margen = Math.max(0.4, (max - min) * 0.15);
  const yMin = min - margen;
  const yMax = max + margen;
  const x = (t: number) => (t1 === t0 ? W / 2 : LADO + ((t - t0) / (t1 - t0)) * (W - LADO * 2));
  const y = (p: number) => ARRIBA + ((yMax - p) / (yMax - yMin)) * (H - ARRIBA - ABAJO);
  const pts = datos.map((d) => [x(aFecha(d.fecha).getTime()), y(d.peso)] as const);

  /* Curva suave (Bézier con puntos de control a mitad de camino) */
  let camino = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    camino += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  const base = H - ABAJO;
  const area = `${camino} L ${pts[pts.length - 1][0]} ${base} L ${pts[0][0]} ${base} Z`;

  /* Meses: una etiqueta al principio de cada mes que cabe */
  const marcas: { x: number; texto: string }[] = [];
  const cursor = new Date(t0);
  cursor.setDate(1);
  cursor.setMonth(cursor.getMonth() + 1);
  while (cursor.getTime() <= t1) {
    marcas.push({ x: x(cursor.getTime()), texto: MESES[cursor.getMonth()] });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const paso = Math.ceil(marcas.length / 6);

  const delta = datos[datos.length - 1].peso - datos[0].peso;
  const iSel = sel !== null && sel < datos.length ? sel : null;

  function elegir(e: React.PointerEvent<SVGSVGElement>) {
    const caja = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - caja.left) / caja.width) * W;
    let mejor = 0;
    for (let i = 1; i < pts.length; i++) {
      if (Math.abs(pts[i][0] - px) < Math.abs(pts[mejor][0] - px)) mejor = i;
    }
    setSel(mejor);
  }

  const cajaTooltip = iSel !== null ? Math.min(W - 92, Math.max(2, pts[iSel][0] - 45)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[12.5px] font-semibold" style={{ color }}>
          {Math.abs(delta) < 0.05
            ? "Estable"
            : `${delta > 0 ? "+" : "−"}${coma(Math.abs(delta))} kg`}
          <span className="text-atenuado font-normal">
            {" "}
            {rango === "Todo" ? "desde el principio" : rango === "1M" ? "en un mes" : "en 3 meses"}
          </span>
        </span>
        <div className="flex gap-1 shrink-0">
          {(["1M", "3M", "Todo"] as Rango[]).map((r) => (
            <button
              key={r}
              className={`chip !py-0.5 !px-2.5 !text-[11.5px] ${rango === r ? "chip-activo" : ""}`}
              onClick={() => {
                setRango(r);
                setSel(null);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none cursor-crosshair"
        onPointerDown={elegir}
        onPointerMove={(e) => e.buttons > 0 && elegir(e)}
        role="img"
        aria-label={`Evolución del peso: de ${coma(datos[0].peso)} a ${coma(datos[datos.length - 1].peso)} kg`}
      >
        <defs>
          <linearGradient id={idGrad} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${idGrad})`} />
        <path d={camino} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {/* El último, siempre marcado */}
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill={color} stroke="#0a0c0e" strokeWidth="2" />
        {marcas
          .filter((_, i) => i % paso === 0)
          .map((m) => (
            <text key={m.x} x={m.x} y={H - 6} fontSize="10" fill="#8a949c" textAnchor="middle">
              {m.texto}
            </text>
          ))}
        {iSel !== null && (
          <>
            <line x1={pts[iSel][0]} x2={pts[iSel][0]} y1={4} y2={base} stroke="white" strokeOpacity="0.3" strokeDasharray="3 3" />
            <circle cx={pts[iSel][0]} cy={pts[iSel][1]} r="5" fill={color} stroke="#0a0c0e" strokeWidth="2" />
            <g transform={`translate(${cajaTooltip} ${Math.max(2, pts[iSel][1] - 44)})`}>
              <rect width="90" height="32" rx="8" fill="#1b2127" />
              <text x="45" y="14" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">
                {coma(datos[iSel].peso)} kg
              </text>
              <text x="45" y="26" textAnchor="middle" fontSize="9.5" fill="#8a949c">
                {aFecha(datos[iSel].fecha).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
              </text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
}
