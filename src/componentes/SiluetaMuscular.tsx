import { cargaMuscular, type VolumenMuscular } from "@/lib/musculos";

/** Formas simples (rectángulos redondeados y elipses) en vez de trazados
 * anatómicos: mismo lenguaje visual que la silueta de medidas y mucho
 * más fácil de retocar si algún grupo se ve raro. */
type Forma =
  | { k: "rect"; x: number; y: number; w: number; h: number; r: number }
  | { k: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { k: "path"; d: string };

interface PiezaMuscular {
  grupo: string;
  formas: Forma[];
}

/** Piezas neutras que no son grupos entrenables (cabeza, manos, pies):
 * dan forma de cuerpo pero nunca se colorean. */
const BASE: Forma[] = [
  { k: "ellipse", cx: 60, cy: 17, rx: 10.5, ry: 13.5 },
  { k: "rect", x: 55.5, y: 28, w: 9, h: 8, r: 3.5 },
  { k: "rect", x: 27, y: 118, w: 10, h: 12, r: 4 },
  { k: "rect", x: 83, y: 118, w: 10, h: 12, r: 4 },
  { k: "rect", x: 46, y: 106, w: 28, h: 18, r: 8 },
  { k: "rect", x: 47, y: 228, w: 12, h: 9, r: 3 },
  { k: "rect", x: 61, y: 228, w: 12, h: 9, r: 3 },
];

const FRONTAL: PiezaMuscular[] = [
  {
    grupo: "Trapecio",
    formas: [{ k: "path", d: "M45 39 Q60 31 75 39 L77 45 Q60 38 43 45 Z" }],
  },
  {
    grupo: "Deltoides Lateral",
    formas: [
      { k: "ellipse", cx: 37, cy: 51, rx: 7.5, ry: 10 },
      { k: "ellipse", cx: 83, cy: 51, rx: 7.5, ry: 10 },
    ],
  },
  {
    grupo: "Deltoides Anterior",
    formas: [
      { k: "ellipse", cx: 46, cy: 48, rx: 6, ry: 7.5 },
      { k: "ellipse", cx: 74, cy: 48, rx: 6, ry: 7.5 },
    ],
  },
  {
    grupo: "Pectoral",
    formas: [
      { k: "rect", x: 44, y: 46, w: 15, h: 22, r: 7 },
      { k: "rect", x: 61, y: 46, w: 15, h: 22, r: 7 },
    ],
  },
  {
    grupo: "Bíceps",
    formas: [
      { k: "rect", x: 31, y: 61, w: 11, h: 26, r: 5.5 },
      { k: "rect", x: 78, y: 61, w: 11, h: 26, r: 5.5 },
    ],
  },
  {
    grupo: "Antebrazo",
    formas: [
      { k: "rect", x: 28, y: 89, w: 10, h: 28, r: 5 },
      { k: "rect", x: 82, y: 89, w: 10, h: 28, r: 5 },
    ],
  },
  {
    grupo: "Abdomen",
    formas: [{ k: "rect", x: 49, y: 70, w: 22, h: 34, r: 8 }],
  },
  {
    grupo: "Cuádriceps",
    formas: [
      { k: "rect", x: 45, y: 126, w: 14, h: 52, r: 7 },
      { k: "rect", x: 61, y: 126, w: 14, h: 52, r: 7 },
    ],
  },
  {
    grupo: "Aductores",
    formas: [{ k: "rect", x: 55, y: 128, w: 10, h: 38, r: 5 }],
  },
  {
    grupo: "Gemelos",
    formas: [
      { k: "rect", x: 47, y: 182, w: 12, h: 44, r: 6 },
      { k: "rect", x: 61, y: 182, w: 12, h: 44, r: 6 },
    ],
  },
];

const POSTERIOR: PiezaMuscular[] = [
  {
    grupo: "Trapecio",
    formas: [{ k: "path", d: "M44 38 Q60 30 76 38 L71 63 Q60 57 49 63 Z" }],
  },
  {
    grupo: "Deltoides Posterior",
    formas: [
      { k: "ellipse", cx: 37, cy: 51, rx: 7.5, ry: 10 },
      { k: "ellipse", cx: 83, cy: 51, rx: 7.5, ry: 10 },
    ],
  },
  {
    grupo: "Dorsales",
    formas: [{ k: "path", d: "M43 58 L77 58 L71 90 Q60 95 49 90 Z" }],
  },
  {
    grupo: "Lumbares",
    formas: [{ k: "rect", x: 50, y: 90, w: 20, h: 16, r: 6 }],
  },
  {
    grupo: "Tríceps",
    formas: [
      { k: "rect", x: 31, y: 61, w: 11, h: 26, r: 5.5 },
      { k: "rect", x: 78, y: 61, w: 11, h: 26, r: 5.5 },
    ],
  },
  {
    grupo: "Antebrazo",
    formas: [
      { k: "rect", x: 28, y: 89, w: 10, h: 28, r: 5 },
      { k: "rect", x: 82, y: 89, w: 10, h: 28, r: 5 },
    ],
  },
  {
    grupo: "Glúteos",
    formas: [
      { k: "rect", x: 46, y: 108, w: 14, h: 20, r: 8 },
      { k: "rect", x: 60, y: 108, w: 14, h: 20, r: 8 },
    ],
  },
  {
    grupo: "Isquiosurales",
    formas: [
      { k: "rect", x: 45, y: 130, w: 14, h: 48, r: 7 },
      { k: "rect", x: 61, y: 130, w: 14, h: 48, r: 7 },
    ],
  },
  {
    grupo: "Gemelos",
    formas: [
      { k: "rect", x: 47, y: 182, w: 12, h: 44, r: 6 },
      { k: "rect", x: 61, y: 182, w: 12, h: 44, r: 6 },
    ],
  },
];

function dibujar(forma: Forma, key: string, fill: string) {
  const comun = { fill, stroke: "var(--color-fondo)", strokeWidth: 1 };
  if (forma.k === "rect")
    return (
      <rect
        key={key}
        x={forma.x}
        y={forma.y}
        width={forma.w}
        height={forma.h}
        rx={forma.r}
        {...comun}
      />
    );
  if (forma.k === "ellipse")
    return (
      <ellipse key={key} cx={forma.cx} cy={forma.cy} rx={forma.rx} ry={forma.ry} {...comun} />
    );
  return <path key={key} d={forma.d} {...comun} />;
}

function etiquetaDias(dias: number | null): string {
  if (dias === null) return "sin entrenar todavía";
  if (dias === 0) return "entrenado hoy";
  if (dias === 1) return "entrenado ayer";
  return `hace ${dias} días`;
}

/** Una de las dos vistas del cuerpo, coloreada por fatiga acumulada. */
function Vista({
  piezas,
  titulo,
  porGrupo,
}: {
  piezas: PiezaMuscular[];
  titulo: string;
  porGrupo: Map<string, VolumenMuscular>;
}) {
  return (
    <div className="flex-1 min-w-0">
      <svg
        viewBox="0 0 120 240"
        className="block w-full h-auto max-h-[230px] mx-auto"
        role="img"
        aria-label={`Vista ${titulo.toLowerCase()} del cuerpo con los músculos coloreados según su recuperación`}
      >
        {BASE.map((f, i) => dibujar(f, `base-${i}`, "var(--color-borde-2)"))}
        {piezas.map((pieza) => {
          const v = porGrupo.get(pieza.grupo);
          const carga = cargaMuscular(v?.diasDesdeUltimoEntreno ?? null);
          // Del gris de reposo al rojo de fatiga, sin pasos intermedios
          // hardcodeados: la mezcla la calcula el propio navegador.
          const fill =
            carga === 0
              ? "var(--color-borde-2)"
              : `color-mix(in srgb, var(--color-peligro) ${Math.round(carga * 100)}%, var(--color-borde-2))`;
          return (
            <g key={pieza.grupo}>
              <title>
                {pieza.grupo} · {etiquetaDias(v?.diasDesdeUltimoEntreno ?? null)} ·{" "}
                {v?.seriesUltimos7Dias ?? 0} series esta semana
              </title>
              {pieza.formas.map((f, i) => dibujar(f, `${pieza.grupo}-${i}`, fill))}
            </g>
          );
        })}
      </svg>
      <div className="text-center text-atenuado text-[10.5px] uppercase tracking-[1px] font-semibold mt-1">
        {titulo}
      </div>
    </div>
  );
}

/** Las dos caras del cuerpo con cada grupo coloreado según cuánto le
 * queda por recuperarse. Cuenta el mismo dato que ya calculaba el mapa
 * de calor, pero respondiendo a la pregunta que de verdad se hace el
 * cliente: qué puede entrenar hoy. */
export default function SiluetaMuscular({ volumen }: { volumen: VolumenMuscular[] }) {
  const porGrupo = new Map(volumen.map((v) => [v.grupo, v]));

  return (
    <div>
      <div className="flex gap-2 items-start">
        <Vista piezas={FRONTAL} titulo="Frente" porGrupo={porGrupo} />
        <Vista piezas={POSTERIOR} titulo="Espalda" porGrupo={porGrupo} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-3">
        <Leyenda color="var(--color-peligro)" texto="Cargado" />
        <Leyenda
          color="color-mix(in srgb, var(--color-peligro) 40%, var(--color-borde-2))"
          texto="A medias"
        />
        <Leyenda color="var(--color-borde-2)" texto="Recuperado" />
      </div>
    </div>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11.5px] text-texto-2">
      <span
        className="w-2.5 h-2.5 rounded-[3px] shrink-0"
        style={{ background: color }}
      />
      {texto}
    </div>
  );
}
