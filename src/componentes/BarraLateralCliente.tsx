"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/componentes/ui";
import BotonSalir from "@/componentes/BotonSalir";
import { PESTANAS_CLIENTE } from "./navegacionCliente";

/** Navegación lateral de la app del cliente en pantallas de escritorio
 * (md+); en móvil la sustituye BarraCliente (barra inferior). */
export default function BarraLateralCliente({
  chatSinLeer = false,
}: {
  chatSinLeer?: boolean;
}) {
  const ruta = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-borde px-4 py-6 min-h-screen sticky top-0">
      <div className="mb-8 px-1">
        <Logo tamano={34} />
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {PESTANAS_CLIENTE.map((p) => {
          const activa = ruta === p.ruta || ruta.startsWith(p.ruta + "/");
          return (
            <Link
              key={p.ruta}
              href={p.ruta}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] font-semibold text-[14px] transition-colors ${
                activa ? "text-acento bg-acento/10" : "text-atenuado hover:text-texto-2"
              }`}
            >
              <p.Icono size={19} strokeWidth={activa ? 2.4 : 2} />
              {p.etiqueta}
              {p.ruta === "/chat" && chatSinLeer && (
                <span className="absolute top-2 left-7 w-2 h-2 rounded-full bg-peligro" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="px-1">
        <BotonSalir />
      </div>
    </aside>
  );
}
