import { CATALOGO_LOGROS } from "@/lib/logros";
import { IconoTarjeta } from "./ui";

/** Grid completa de las 7 insignias del catálogo, bloqueadas/desbloqueadas.
 * Versión ampliada del resumen de Inicio (`WidgetLogros`), para Mi Progreso. */
export default function GridLogros({ desbloqueados }: { desbloqueados: string[] }) {
  const set = new Set(desbloqueados);
  return (
    <section className="tarjeta tarjeta-dorado">
      <div className="flex items-center justify-between mb-3.5">
        <div className="titulo-tarjeta !mb-0">LOGROS</div>
        <span className="texto-secundario">
          {set.size} de {CATALOGO_LOGROS.length}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-4">
        {CATALOGO_LOGROS.map((l) => {
          const conseguido = set.has(l.clave);
          return (
            <div
              key={l.clave}
              className="flex flex-col items-center gap-1.5 text-center"
              title={l.descripcion}
            >
              <IconoTarjeta
                Icono={l.Icono}
                color={conseguido ? "var(--color-dorado)" : "var(--color-borde-2)"}
                tamano={44}
              />
              <span
                className={`text-[10.5px] leading-tight ${
                  conseguido ? "text-texto-2" : "text-atenuado"
                }`}
              >
                {l.etiqueta}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
