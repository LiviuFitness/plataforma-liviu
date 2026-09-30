"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Settings, Sun, Users } from "lucide-react";

/* Cada pestaña es una sección entera, no una pantalla: "Clientes" sigue
 * encendida en Invitaciones y Leads, y "Biblioteca" en Alimentos y en
 * los cuestionarios. Antes, al entrar en Alimentos desde Ajustes, la
 * barra no marcaba nada y no sabías dónde estabas. Cada una con su
 * color, el mismo que sus apartados. */
const PESTANAS = [
  {
    ruta: "/hoy",
    etiqueta: "Hoy",
    Icono: Sun,
    color: "var(--color-dorado)",
    incluye: ["/estadisticas", "/revision", "/muro"],
  },
  {
    ruta: "/clientes",
    etiqueta: "Clientes",
    Icono: Users,
    color: "var(--color-acento)",
    incluye: ["/invitaciones", "/leads"],
  },
  {
    ruta: "/plantillas",
    etiqueta: "Biblioteca",
    Icono: Library,
    color: "var(--color-verde)",
    incluye: ["/ejercicios", "/alimentos", "/cuestionario", "/cuestionario-alta", "/guias"],
  },
  { ruta: "/ajustes", etiqueta: "Ajustes", Icono: Settings, color: "#ffffff", incluye: [] as string[] },
];

/** Navegación inferior fija del panel. En Clientes, cuántos te han
 * escrito y esperan respuesta. */
export default function BarraInferior({ esperando = 0 }: { esperando?: number }) {
  const ruta = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[760px] flex gap-1.5 z-20 border-t border-borde bg-[rgba(12,15,18,0.96)] backdrop-blur-lg px-2 pt-2"
      style={{
        /* Alto explícito, igual que en la barra del cliente: así
         * `--alto-barra-inferior` no es una suposición. */
        height: "calc(var(--alto-barra-inferior) + env(safe-area-inset-bottom))",
        paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
      }}
    >
      {PESTANAS.map((p) => {
        const activa = [p.ruta, ...p.incluye].some((r) => ruta === r || ruta.startsWith(r + "/"));
        const color = activa ? p.color : "var(--color-atenuado)";
        return (
          <Link
            key={p.ruta}
            href={p.ruta}
            className="flex-1 flex flex-col items-center gap-1 font-semibold text-[11px] py-0.5"
            style={{ color }}
          >
            <span
              className="relative h-8 w-14 rounded-full grid place-items-center transition-colors"
              style={activa ? { background: `color-mix(in srgb, ${p.color} 17%, transparent)` } : undefined}
            >
              <p.Icono size={20} strokeWidth={activa ? 2.4 : 2} />
              {p.ruta === "/clientes" && esperando > 0 && (
                <span className="absolute -top-1.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-peligro text-white text-[10.5px] font-bold grid place-items-center border-2 border-fondo tabular-nums">
                  {esperando > 9 ? "9+" : esperando}
                </span>
              )}
            </span>
            {p.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
