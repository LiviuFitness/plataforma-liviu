"use client";

import Link from "next/link";
import { Medal } from "lucide-react";
import { CATALOGO_LOGROS } from "@/lib/logros";
import { IconoTarjeta } from "@/componentes/ui";
import Confetti from "@/componentes/Confetti";

/** Tarjeta de Inicio: resumen de logros desbloqueados, con acceso a
 * la comunidad (feed de logros + ranking de constancia). Si `nuevos`
 * trae algo, dispara un confeti breve — la única celebración animada
 * de la Home, reservada a un momento que de verdad lo merece. */
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
  const pct = Math.round((conseguidos.length / CATALOGO_LOGROS.length) * 100);

  return (
    <Link
      href="/comunidad"
      className="tarjeta tarjeta-dorado anim-pulsable anim-entrada-4 flex items-center gap-3.5 w-full relative"
    >
      {nuevos.length > 0 && <Confetti />}
      <IconoTarjeta Icono={Medal} color="var(--color-dorado)" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span className="num-grande !text-[20px]" style={{ color: "var(--color-dorado)" }}>
            {conseguidos.length}
          </span>
          <span className="text-atenuado text-[13px]">de {CATALOGO_LOGROS.length} desbloqueados</span>
        </div>
        <div className="barra-capsula mb-2" style={{ maxWidth: 160 }}>
          <div
            className="barra-capsula-relleno"
            style={{ "--tc": "var(--color-dorado)", width: `${pct}%` } as React.CSSProperties}
          />
        </div>
        {ultimos.length > 0 ? (
          <div className="flex items-center gap-1.5">
            {ultimos.map((l) => (
              <IconoTarjeta
                key={l.clave}
                Icono={l.Icono}
                color="var(--color-dorado)"
                tamano={28}
                titulo={l.etiqueta}
                className={nuevos.includes(l.clave) ? "anim-pop" : ""}
              />
            ))}
          </div>
        ) : (
          <div className="text-atenuado text-[13px]">
            Entrena y marca hábitos para desbloquear tus primeros logros.
          </div>
        )}
      </div>
      <span className="texto-secundario shrink-0">Comunidad →</span>
    </Link>
  );
}
