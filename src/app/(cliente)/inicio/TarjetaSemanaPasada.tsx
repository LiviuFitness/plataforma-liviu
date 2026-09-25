import { CalendarCheck, Trophy } from "lucide-react";
import type { ResumenSemana } from "@/lib/resumenSemana";

const coma = (n: number, dec = 1) => n.toFixed(dec).replace(".", ",");

/**
 * Los lunes y martes, un cierre de la semana anterior: lo que hizo, en
 * cifras, antes de empezar la nueva. El resto de la semana no aparece
 * (a partir del miércoles ya es historia vieja y ocupa sitio).
 */
export default function TarjetaSemanaPasada({ r }: { r: ResumenSemana }) {
  const cumplida = r.objetivo > 0 && r.entrenos >= r.objetivo;
  const celdas: { valor: string; etiqueta: string; extra?: { texto: string; bueno: boolean } }[] = [
    {
      valor: r.objetivo > 0 ? `${r.entrenos}/${r.objetivo}` : String(r.entrenos),
      etiqueta: r.entrenos === 1 ? "entreno" : "entrenos",
    },
  ];
  if (r.volumenKg > 0) {
    celdas.push({
      valor: r.volumenKg >= 1000 ? `${coma(r.volumenKg / 1000)} t` : `${Math.round(r.volumenKg)} kg`,
      etiqueta: "levantado",
      extra:
        r.volumenPct !== null && r.volumenPct !== 0
          ? { texto: `${r.volumenPct > 0 ? "+" : "−"}${Math.abs(r.volumenPct)}%`, bueno: r.volumenPct > 0 }
          : undefined,
    });
  }
  if (r.pesoMedio !== null) {
    celdas.push({
      valor: `${coma(r.pesoMedio)} kg`,
      etiqueta: "peso medio",
      /* El peso no es "bueno" ni "malo" por subir o bajar: depende del
       * objetivo. Va en gris, solo informa. */
      extra:
        r.pesoDelta !== null && Math.abs(r.pesoDelta) >= 0.05
          ? { texto: `${r.pesoDelta > 0 ? "+" : "−"}${coma(Math.abs(r.pesoDelta))}`, bueno: false }
          : undefined,
    });
  }

  return (
    <section className="tarjeta !p-4 !mb-3 anim-entrada-2">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="titulo-tarjeta !mb-0">TU SEMANA PASADA</div>
        <span className="text-atenuado text-[11.5px] text-right">{r.rango}</span>
      </div>
      <div className="flex items-center gap-1.5 font-semibold text-[15px] mb-3">
        {cumplida && <CalendarCheck size={16} className="text-acento shrink-0" />}
        <span>
          {cumplida
            ? "Cumpliste tu plan entero"
            : r.entrenos > 0
              ? `Esta semana, a por los ${r.objetivo || "que tocan"}`
              : "Esta semana volvemos a por ello"}
        </span>
      </div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${celdas.length}, minmax(0, 1fr))` }}
      >
        {celdas.map((c) => (
          <div key={c.etiqueta} className="bg-campo border border-borde rounded-[12px] px-2.5 py-2.5 min-w-0">
            <div className="font-bold text-[17px] leading-tight tabular-nums">{c.valor}</div>
            <div className="text-atenuado text-[11px] leading-tight mt-0.5">
              {c.etiqueta}
              {c.extra && (
                <span className={`font-semibold ${c.extra.bueno ? "text-acento" : "text-texto-2"}`}>
                  {" "}
                  {c.extra.texto}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {r.records > 0 && (
        <div className="flex items-center gap-1.5 text-[12.5px] mt-3">
          <Trophy size={14} className="text-dorado shrink-0" />
          <b className="text-dorado">
            {r.records} {r.records === 1 ? "récord batido" : "récords batidos"}
          </b>
        </div>
      )}
    </section>
  );
}
