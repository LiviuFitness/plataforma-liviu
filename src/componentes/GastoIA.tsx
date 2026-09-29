import { Sparkles } from "lucide-react";

const ETIQUETAS: Record<string, string> = {
  asistente: "Asistente de dieta",
  "asistente-foto": "Asistente (con foto)",
  entreno: "Coach del entreno",
  revision: "Revisión semanal",
  dieta: "Crear dietas",
  "mensaje-responder": "Respuestas sugeridas",
  "mensaje-reenganche": "Mensajes a clientes",
};

const dolares = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " $";

/**
 * Lo que ha gastado la IA este mes (en dólares, como lo cobra Anthropic),
 * repartido por función. Es una estimación a partir de los tokens de cada
 * llamada: la cifra exacta, en console.anthropic.com.
 */
export default function GastoIA({
  filas,
  mesPasado,
  nombreMes,
}: {
  filas: { etiqueta: string; coste_usd: number }[];
  mesPasado: number;
  nombreMes: string;
}) {
  const total = filas.reduce((s, f) => s + Number(f.coste_usd), 0);
  const porFuncion = new Map<string, { coste: number; n: number }>();
  for (const f of filas) {
    const clave = ETIQUETAS[f.etiqueta] ?? f.etiqueta;
    const x = porFuncion.get(clave) ?? { coste: 0, n: 0 };
    porFuncion.set(clave, { coste: x.coste + Number(f.coste_usd), n: x.n + 1 });
  }
  const lista = [...porFuncion.entries()].sort((a, b) => b[1].coste - a[1].coste);

  return (
    <section className="tarjeta tarjeta-morado !p-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={15} className="text-morado shrink-0" />
        <div className="titulo-tarjeta !mb-0">Inteligencia artificial</div>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="num-grande !text-[26px]">{dolares(total)}</span>
        <span className="text-atenuado text-[12.5px]">
          en {nombreMes} · {filas.length} {filas.length === 1 ? "uso" : "usos"}
        </span>
      </div>
      <div className="text-atenuado text-[12px] mb-3">Mes pasado: {dolares(mesPasado)}</div>
      {lista.length === 0 ? (
        <div className="text-atenuado text-[13px]">Todavía no se ha usado este mes.</div>
      ) : (
        lista.map(([nombre, x]) => (
          <div key={nombre} className="flex items-center gap-2 py-1.5 border-b border-borde last:border-0 text-[13.5px]">
            <span className="flex-1 min-w-0 break-words">{nombre}</span>
            <span className="text-atenuado text-[12px] shrink-0">
              {x.n} {x.n === 1 ? "vez" : "veces"}
            </span>
            <b className="shrink-0 tabular-nums w-[64px] text-right">{dolares(x.coste)}</b>
          </div>
        ))
      )}
      <div className="text-atenuado text-[11.5px] mt-2.5 leading-snug">
        Estimación por tokens. El saldo real, en console.anthropic.com.
      </div>
    </section>
  );
}
