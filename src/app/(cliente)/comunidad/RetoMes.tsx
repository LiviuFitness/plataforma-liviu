import { Flame } from "lucide-react";
import { IconoTarjeta } from "@/componentes/ui";

interface Participante {
  cliente_id: string;
  nombre: string;
  entrenos: number;
  objetivo: number;
}

/** "Marcos Ruiz" → "Marcos R." */
const corto = (nombre: string) => {
  const [n, a] = nombre.trim().split(/\s+/);
  return a ? `${n} ${a[0].toUpperCase()}.` : n;
};

/**
 * Reto del mes: cada uno contra su propio objetivo (los días de su
 * rutina × 4), así quien entrena 3 días compite en igualdad con quien
 * entrena 5. La clasificación ordena por % del objetivo cumplido.
 */
export default function RetoMes({
  hoyISO,
  misEntrenos,
  miObjetivo,
  yoId,
  participantes,
}: {
  hoyISO: string;
  misEntrenos: number;
  miObjetivo: number;
  yoId: string;
  participantes: Participante[];
}) {
  const [a, m] = hoyISO.split("-").map(Number);
  const mes = new Date(a, m - 1, 1).toLocaleDateString("es-ES", { month: "long" });
  const diasMes = new Date(a, m, 0).getDate();
  const quedan = diasMes - Number(hoyISO.slice(8));
  const faltan = Math.max(0, miObjetivo - misEntrenos);

  const tabla = participantes
    .map((p) => ({ ...p, pct: Math.min(1, p.entrenos / Math.max(1, p.objetivo)) }))
    .sort((x, y) => y.pct - x.pct || y.entrenos - x.entrenos)
    .slice(0, 10);

  return (
    <section className="tarjeta tarjeta-dorado">
      <div className="flex items-center gap-3 mb-3">
        <IconoTarjeta Icono={Flame} color="var(--color-dorado)" tamano={40} />
        <div className="flex-1 min-w-0">
          <div className="titulo-tarjeta !mb-0">RETO DE {mes.toUpperCase()}</div>
          <div className="font-bold text-[17px] leading-tight">{miObjetivo} entrenos en el mes</div>
        </div>
        <span className="text-atenuado text-[12px] shrink-0">
          {quedan === 0 ? "último día" : `quedan ${quedan} ${quedan === 1 ? "día" : "días"}`}
        </span>
      </div>
      <div className="flex justify-between text-[13px] mb-1">
        <span>
          Tú: <b>{misEntrenos} de {miObjetivo}</b>
        </span>
        <span className="text-dorado font-semibold">
          {faltan === 0 ? "¡Reto cumplido! 🏅" : `¡${faltan} más!`}
        </span>
      </div>
      <div className="barra-capsula !h-2 mb-4">
        <div
          className="barra-capsula-relleno"
          style={{ width: `${Math.min(100, (misEntrenos / miObjetivo) * 100)}%`, "--tc": "var(--color-dorado)" } as React.CSSProperties}
        />
      </div>

      {tabla.length > 1 &&
        tabla.map((p, i) => {
          const yo = p.cliente_id === yoId;
          return (
            <div key={p.cliente_id} className="flex items-center gap-2.5 py-1.5">
              <span className="w-4 text-atenuado text-[12.5px] tabular-nums shrink-0">{i + 1}</span>
              <span className={`w-[84px] text-[13.5px] leading-tight shrink-0 break-words ${yo ? "font-bold text-dorado" : ""}`}>
                {yo ? "Tú" : corto(p.nombre)}
              </span>
              <div className="flex-1 h-1.5 rounded bg-borde-2 overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${p.pct * 100}%`, background: p.pct >= 1 ? "var(--color-verde)" : "var(--color-dorado)" }}
                />
              </div>
              <span className="text-[12px] tabular-nums shrink-0 text-atenuado">
                {p.entrenos}/{p.objetivo}
              </span>
            </div>
          );
        })}
      <div className="text-atenuado text-[12px] mt-2 leading-snug">
        Cada uno contra su propio objetivo: los días de su rutina × 4. Quien lo cumple se lleva el
        logro «Reto del mes» 🏅
      </div>
    </section>
  );
}
