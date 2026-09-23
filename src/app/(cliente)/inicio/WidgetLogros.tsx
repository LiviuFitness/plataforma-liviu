"use client";

import Link from "next/link";
import { Medal } from "lucide-react";
import { CATALOGO_LOGROS } from "@/lib/logros";
import Confetti from "@/componentes/Confetti";

/**
 * Mosaico de Comunidad (feed de logros + ranking de constancia). Es el
 * ÚNICO enlace a /comunidad de toda la app, así que no puede
 * desaparecer de Inicio.
 *
 * Normalmente solo dice cuántos lleva. Cuando de verdad hay novedad
 * (`nuevos`) se tiñe de dorado y suelta el confeti — la única
 * celebración animada de la pantalla, reservada al momento que lo
 * merece.
 */
export default function WidgetLogros({
  desbloqueados,
  nuevos,
}: {
  desbloqueados: string[];
  nuevos: string[];
}) {
  const set = new Set(desbloqueados);
  const conseguidos = CATALOGO_LOGROS.filter((l) => set.has(l.clave)).length;
  const recienConseguidos = CATALOGO_LOGROS.filter((l) => nuevos.includes(l.clave));
  const hayNuevos = recienConseguidos.length > 0;

  return (
    <Link
      href="/comunidad"
      className={`tarjeta !mb-0 !p-4 anim-pulsable relative min-w-0 ${
        hayNuevos ? "tarjeta-dorado" : ""
      }`}
    >
      {hayNuevos && <Confetti />}
      <Medal size={18} className="text-dorado mb-2.5" />
      <div className="font-semibold text-[14px] leading-tight">
        {hayNuevos
          ? recienConseguidos.length === 1
            ? "¡Logro nuevo!"
            : `¡${recienConseguidos.length} logros nuevos!`
          : "Comunidad"}
      </div>
      <div className="text-atenuado text-[12.5px] mt-0.5 leading-snug break-words">
        {hayNuevos
          ? recienConseguidos.map((l) => l.etiqueta).join(" · ")
          : `${conseguidos} de ${CATALOGO_LOGROS.length} logros`}
      </div>
    </Link>
  );
}
