"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Segunda fila de navegación del panel: las pantallas que viven bajo una
 * misma pestaña de la barra inferior.
 *
 *  · Clientes   → Clientes · Invitaciones · Leads. Es el camino entero de
 *    una persona: se interesa (lead), la invitas y entra (cliente).
 *  · Biblioteca → Plantillas · Ejercicios · Alimentos · Preguntas · Guías. Tu
 *    método, lo que reutilizas con todos. ("Preguntas" y no
 *    "Cuestionarios": con cuatro pestañas no cabía en un iPhone.)
 *
 * Antes todo lo que no era Hoy, Clientes o Plantillas acababa dentro de
 * Ajustes, mezclado con la contraseña.
 */
const GRUPOS = {
  personas: [
    { href: "/clientes", etiqueta: "Clientes", contador: null },
    { href: "/invitaciones", etiqueta: "Invitaciones", contador: "invitaciones" },
    { href: "/leads", etiqueta: "Leads", contador: "leads" },
  ],
  biblioteca: [
    { href: "/plantillas", etiqueta: "Plantillas", contador: null },
    { href: "/ejercicios", etiqueta: "Ejercicios", contador: null },
    { href: "/alimentos", etiqueta: "Alimentos", contador: null },
    { href: "/cuestionario", etiqueta: "Preguntas", contador: null },
    { href: "/guias", etiqueta: "Guías", contador: null },
  ],
} as const;

/** Rutas que cuentan como "dentro" de cada entrada, además de la suya. */
const TAMBIEN: Record<string, string[]> = {
  "/cuestionario": ["/cuestionario-alta"],
};

export type ContadoresPanel = { invitaciones: number; leads: number };

export default function SeccionesPanel({
  grupo,
  contadores,
}: {
  grupo: keyof typeof GRUPOS;
  contadores?: ContadoresPanel;
}) {
  const ruta = usePathname();
  /* Con cinco pestañas, letra y huecos un punto más pequeños para que
   * quepan enteras en un iPhone de 375 px */
  const apretado = GRUPOS[grupo].length > 4;
  return (
    <nav className={`flex ${apretado ? "gap-1" : "gap-1.5"} mb-5`} aria-label="Secciones">
      {GRUPOS[grupo].map((s) => {
        const activa =
          ruta === s.href || (TAMBIEN[s.href] ?? []).some((r) => ruta === r);
        const n = s.contador && contadores ? contadores[s.contador] : 0;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`tab text-center ${apretado ? "!text-[12px] !px-0.5" : "!text-[13px] !px-1"} flex items-center justify-center gap-1.5 min-w-0 ${
              activa ? "tab-activa" : ""
            }`}
            aria-current={activa ? "page" : undefined}
          >
            <span className="min-w-0">{s.etiqueta}</span>
            {n > 0 && (
              <span
                className={`text-[11px] font-bold rounded-full px-1.5 leading-[18px] shrink-0 ${
                  activa ? "bg-fondo/25" : "bg-acento text-fondo"
                }`}
              >
                {n}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
