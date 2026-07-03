"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTANAS = [
  { ruta: "/inicio", etiqueta: "Inicio" },
  { ruta: "/mi-progreso", etiqueta: "Progreso" },
  { ruta: "/mi-dieta", etiqueta: "Dieta" },
  { ruta: "/perfil", etiqueta: "Perfil" },
];

/** Navegación inferior de la app del cliente. */
export default function BarraCliente() {
  const ruta = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] flex gap-2 z-20 border-t border-borde bg-[rgba(12,15,18,0.96)] backdrop-blur-lg px-3 pt-2.5"
      style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}
    >
      {PESTANAS.map((p) => {
        const activa = ruta === p.ruta || ruta.startsWith(p.ruta + "/");
        return (
          <Link
            key={p.ruta}
            href={p.ruta}
            className={`flex-1 text-center font-semibold text-[13.5px] py-2.5 rounded-[10px] ${
              activa ? "text-acento bg-acento/10" : "text-atenuado"
            }`}
          >
            {p.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
