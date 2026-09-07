"use client";

import Link from "next/link";
import { Medal } from "lucide-react";
import { CATALOGO_LOGROS } from "@/lib/logros";
import { IconoTarjeta } from "@/componentes/ui";
import Confetti from "@/componentes/Confetti";

/**
 * Acceso a la comunidad desde Inicio (feed de logros + ranking de
 * constancia). Es el ÚNICO enlace a /comunidad de toda la app, así que
 * no puede desaparecer de aquí.
 *
 * Normalmente es una sola fila: el catálogo entero ya se ve en
 * /comunidad y en la Home solo resumía. Cuando de verdad hay novedad
 * (`nuevos`) se despliega en tarjeta con los iconos y el confeti — la
 * única celebración animada de la pantalla, reservada al momento que
 * lo merece.
 */
export default function WidgetLogros({
  desbloqueados,
  nuevos,
}: {
  desbloqueados: string[];
  nuevos: string[];
}) {
  const set = new Set(desbloqueados);
  const conseguidos = CATALOGO_LOGROS.filter((l) => set.has(l.clave));
  const recienConseguidos = CATALOGO_LOGROS.filter((l) => nuevos.includes(l.clave));

  if (nuevos.length === 0) {
    return (
      <Link
        href="/comunidad"
        className="fila anim-pulsable anim-entrada-4"
      >
        <Medal size={17} className="shrink-0" style={{ color: "var(--color-dorado)" }} />
        <div className="flex-1 min-w-0 text-[13.5px]">
          <b className="text-texto-2">{conseguidos.length}</b>
          <span className="text-atenuado"> de {CATALOGO_LOGROS.length} logros</span>
        </div>
        <span className="texto-secundario shrink-0">Comunidad →</span>
      </Link>
    );
  }

  return (
    <Link
      href="/comunidad"
      className="tarjeta tarjeta-dorado anim-pulsable anim-entrada-4 flex items-center gap-3.5 w-full relative"
    >
      <Confetti />
      <IconoTarjeta Icono={Medal} color="var(--color-dorado)" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[14.5px] mb-0.5">
          {nuevos.length === 1 ? "¡Logro nuevo!" : `¡${nuevos.length} logros nuevos!`}
        </div>
        <div className="text-atenuado text-[12.5px] mb-2">
          {recienConseguidos.map((l) => l.etiqueta).join(" · ")}
        </div>
        <div className="flex items-center gap-1.5">
          {recienConseguidos.slice(0, 4).map((l) => (
            <IconoTarjeta
              key={l.clave}
              Icono={l.Icono}
              color="var(--color-dorado)"
              tamano={28}
              titulo={l.etiqueta}
              className="anim-pop"
            />
          ))}
        </div>
      </div>
      <span className="texto-secundario shrink-0">Comunidad →</span>
    </Link>
  );
}
