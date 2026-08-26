import { cargaMuscular, type VolumenMuscular } from "@/lib/musculos";
import { CABEZA, MITAD_CUERPO, REFLEJO } from "@/lib/siluetaCuerpo";

/** Zonas musculares dibujadas a brocha gorda y recortadas contra el
 * contorno del cuerpo: no hace falta que las formas sean anatómicas
 * porque el `clipPath` se encarga de que nada se salga de la silueta. */
type Zona =
  | { k: "rect"; x: number; y: number; w: number; h: number; r?: number }
  | { k: "ellipse"; cx: number; cy: number; rx: number; ry: number };

interface PiezaMuscular {
  grupo: string;
  zonas: Zona[];
}

/** Espejo horizontal de una zona, para no repetir cada músculo dos veces. */
function espejo(z: Zona): Zona {
  return z.k === "rect"
    ? { ...z, x: 200 - z.x - z.w }
    : { ...z, cx: 200 - z.cx };
}

function par(z: Zona): Zona[] {
  return [z, espejo(z)];
}

const FRONTAL: PiezaMuscular[] = [
  { grupo: "Trapecio", zonas: [{ k: "rect", x: 62, y: 44, w: 76, h: 20, r: 8 }] },
  {
    grupo: "Deltoides Lateral",
    zonas: par({ k: "ellipse", cx: 56, cy: 74, rx: 14, ry: 19 }),
  },
  {
    grupo: "Deltoides Anterior",
    zonas: par({ k: "ellipse", cx: 71, cy: 70, rx: 11, ry: 14 }),
  },
  {
    grupo: "Pectoral",
    zonas: par({ k: "rect", x: 66, y: 64, w: 33, h: 36, r: 12 }),
  },
  { grupo: "Bíceps", zonas: par({ k: "rect", x: 42, y: 88, w: 28, h: 44, r: 12 }) },
  { grupo: "Antebrazo", zonas: par({ k: "rect", x: 40, y: 132, w: 28, h: 52, r: 12 }) },
  { grupo: "Abdomen", zonas: [{ k: "rect", x: 72, y: 100, w: 56, h: 62, r: 14 }] },
  {
    grupo: "Cuádriceps",
    zonas: par({ k: "rect", x: 58, y: 198, w: 42, h: 58, r: 14 }),
  },
  { grupo: "Aductores", zonas: [{ k: "rect", x: 84, y: 194, w: 32, h: 48, r: 12 }] },
  { grupo: "Gemelos", zonas: par({ k: "rect", x: 62, y: 258, w: 38, h: 62, r: 14 }) },
];

const POSTERIOR: PiezaMuscular[] = [
  { grupo: "Trapecio", zonas: [{ k: "rect", x: 68, y: 44, w: 64, h: 46, r: 14 }] },
  {
    grupo: "Deltoides Posterior",
    zonas: par({ k: "ellipse", cx: 56, cy: 74, rx: 14, ry: 19 }),
  },
  { grupo: "Dorsales", zonas: [{ k: "rect", x: 64, y: 88, w: 72, h: 46, r: 14 }] },
  { grupo: "Lumbares", zonas: [{ k: "rect", x: 76, y: 132, w: 48, h: 30, r: 12 }] },
  { grupo: "Tríceps", zonas: par({ k: "rect", x: 42, y: 88, w: 28, h: 44, r: 12 }) },
  { grupo: "Antebrazo", zonas: par({ k: "rect", x: 40, y: 132, w: 28, h: 52, r: 12 }) },
  { grupo: "Glúteos", zonas: [{ k: "rect", x: 62, y: 160, w: 76, h: 44, r: 16 }] },
  {
    grupo: "Isquiosurales",
    zonas: par({ k: "rect", x: 58, y: 202, w: 42, h: 54, r: 14 }),
  },
  { grupo: "Gemelos", zonas: par({ k: "rect", x: 62, y: 258, w: 38, h: 62, r: 14 }) },
];

function dibujar(z: Zona, key: string, fill: string) {
  return z.k === "rect" ? (
    <rect key={key} x={z.x} y={z.y} width={z.w} height={z.h} rx={z.r} fill={fill} />
  ) : (
    <ellipse key={key} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill={fill} />
  );
}

function etiquetaDias(dias: number | null): string {
  if (dias === null) return "sin entrenar todavía";
  if (dias === 0) return "entrenado hoy";
  if (dias === 1) return "entrenado ayer";
  return `hace ${dias} días`;
}

function Vista({
  piezas,
  titulo,
  id,
  porGrupo,
}: {
  piezas: PiezaMuscular[];
  titulo: string;
  id: string;
  porGrupo: Map<string, VolumenMuscular>;
}) {
  const recorte = `recorte-cuerpo-${id}`;
  const contorno = `contorno-cuerpo-${id}`;

  return (
    <div className="flex-1 min-w-0">
      <svg
        viewBox="0 0 200 400"
        className="block w-full h-auto max-h-[240px] mx-auto"
        role="img"
        aria-label={`Vista ${titulo.toLowerCase()} del cuerpo con los músculos coloreados según su recuperación`}
      >
        <defs>
          <path id={contorno} d={MITAD_CUERPO} />
          <clipPath id={recorte}>
            <use href={`#${contorno}`} />
            <use href={`#${contorno}`} transform={REFLEJO} />
            <ellipse {...CABEZA} />
          </clipPath>
        </defs>

        {/* Cuerpo en reposo: lo que no tenga fatiga se queda así. */}
        <g fill="var(--color-borde-2)">
          <use href={`#${contorno}`} />
          <use href={`#${contorno}`} transform={REFLEJO} />
          <ellipse {...CABEZA} />
        </g>

        {/* Zonas cargadas, recortadas contra el contorno. */}
        <g clipPath={`url(#${recorte})`}>
          {piezas.map((pieza) => {
            const v = porGrupo.get(pieza.grupo);
            const carga = cargaMuscular(v?.diasDesdeUltimoEntreno ?? null);
            if (carga === 0) return null;
            const fill = `color-mix(in srgb, var(--color-peligro) ${Math.round(
              carga * 100
            )}%, var(--color-borde-2))`;
            return (
              <g key={pieza.grupo}>
                <title>
                  {pieza.grupo} · {etiquetaDias(v?.diasDesdeUltimoEntreno ?? null)} ·{" "}
                  {v?.seriesUltimos7Dias ?? 0} series esta semana
                </title>
                {pieza.zonas.map((z, i) => dibujar(z, `${pieza.grupo}-${i}`, fill))}
              </g>
            );
          })}
        </g>
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
      <div className="flex gap-3 items-start">
        <Vista piezas={FRONTAL} titulo="Frente" id="frente" porGrupo={porGrupo} />
        <Vista piezas={POSTERIOR} titulo="Espalda" id="espalda" porGrupo={porGrupo} />
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
      <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: color }} />
      {texto}
    </div>
  );
}
