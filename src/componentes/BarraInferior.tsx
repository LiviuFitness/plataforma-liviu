"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Settings, Sun, Users } from "lucide-react";

/* Cada pestaña es una sección entera, no una pantalla: "Clientes" sigue
 * encendida en Invitaciones y Leads, y "Biblioteca" en Alimentos y en
 * los cuestionarios. Antes, al entrar en Alimentos desde Ajustes, la
 * barra no marcaba nada y no sabías dónde estabas. */
const PESTANAS = [
  { ruta: "/hoy", etiqueta: "Hoy", Icono: Sun, incluye: [] as string[] },
  {
    ruta: "/clientes",
    etiqueta: "Clientes",
    Icono: Users,
    incluye: ["/invitaciones", "/leads"],
  },
  {
    ruta: "/plantillas",
    etiqueta: "Biblioteca",
    Icono: Library,
    incluye: ["/ejercicios", "/alimentos", "/cuestionario", "/cuestionario-alta"],
  },
  { ruta: "/ajustes", etiqueta: "Ajustes", Icono: Settings, incluye: [] as string[] },
];

/** Navegación inferior fija del panel (estilo prototipo). */
export default function BarraInferior() {
  const ruta = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[760px] flex gap-2 z-20 border-t border-borde bg-[rgba(12,15,18,0.96)] backdrop-blur-lg px-3 pt-2"
      style={{
        /* Alto explícito, igual que en la barra del cliente: así
         * `--alto-barra-inferior` no es una suposición. */
        height: "calc(var(--alto-barra-inferior) + env(safe-area-inset-bottom))",
        paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
      }}
    >
      {PESTANAS.map((p) => {
        const activa = [p.ruta, ...p.incluye].some(
          (r) => ruta === r || ruta.startsWith(r + "/")
        );
        return (
          <Link
            key={p.ruta}
            href={p.ruta}
            className={`flex-1 flex flex-col items-center gap-0.5 font-semibold text-[11px] py-1.5 rounded-[10px] transition-colors ${
              activa ? "text-acento bg-acento/10" : "text-atenuado"
            }`}
          >
            <p.Icono size={20} strokeWidth={activa ? 2.4 : 2} />
            {p.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
