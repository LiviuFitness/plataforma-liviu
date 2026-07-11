import Link from "next/link";
import { CATALOGO_LOGROS } from "@/lib/logros";

/** Tarjeta de Inicio: resumen de logros desbloqueados, con acceso a
 * la comunidad (feed de logros + ranking de constancia). */
export default function WidgetLogros({
  desbloqueados,
  nuevos,
}: {
  desbloqueados: string[];
  nuevos: string[];
}) {
  const set = new Set(desbloqueados);
  const conseguidos = CATALOGO_LOGROS.filter((l) => set.has(l.clave));
  const ultimos = conseguidos.slice(-4).reverse();

  return (
    <Link
      href="/comunidad"
      className="tarjeta !mb-2.5 flex items-center gap-3.5 w-full"
    >
      <div className="flex-1 min-w-0">
        <div className="titulo-tarjeta !mb-1">TUS LOGROS</div>
        {ultimos.length > 0 ? (
          <div className="flex items-center gap-2">
            {ultimos.map((l) => (
              <span
                key={l.clave}
                className={`w-8 h-8 rounded-full bg-acento/10 border border-acento/40 flex items-center justify-center text-acento shrink-0 ${
                  nuevos.includes(l.clave) ? "anim-pop" : ""
                }`}
                title={l.etiqueta}
              >
                <l.Icono size={16} />
              </span>
            ))}
            <span className="text-atenuado text-[13px]">
              {conseguidos.length} de {CATALOGO_LOGROS.length}
            </span>
          </div>
        ) : (
          <div className="text-atenuado text-[13.5px]">
            Entrena y marca hábitos para desbloquear tus primeros logros.
          </div>
        )}
      </div>
      <span className="text-acento text-[13.5px] shrink-0">Comunidad →</span>
    </Link>
  );
}
