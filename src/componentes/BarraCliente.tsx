"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PESTANAS_CLIENTE } from "./navegacionCliente";

/** Navegación inferior de la app del cliente (solo móvil; en escritorio
 * la sustituye BarraLateralCliente). */
export default function BarraCliente({ chatSinLeer = false }: { chatSinLeer?: boolean }) {
  const ruta = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] flex gap-2 z-20 border-t border-borde bg-[rgba(12,15,18,0.96)] backdrop-blur-lg px-3 pt-2"
      style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
    >
      {PESTANAS_CLIENTE.map((p) => {
        const activa = ruta === p.ruta || ruta.startsWith(p.ruta + "/");
        return (
          <Link
            key={p.ruta}
            href={p.ruta}
            className="relative flex-1 flex justify-center py-1"
          >
            <span
              className={`relative flex flex-col items-center gap-0.5 font-semibold text-[11px] w-full py-1.5 rounded-full border transition-all duration-200 ${
                activa
                  ? "text-acento bg-acento/12 border-acento/30 scale-100"
                  : "text-atenuado border-transparent scale-[0.97]"
              }`}
            >
              <p.Icono size={20} strokeWidth={1.75} />
              {p.ruta === "/chat" && chatSinLeer && (
                <span className="absolute top-0.5 right-[calc(50%-16px)] w-2 h-2 rounded-full bg-peligro" />
              )}
              {p.etiqueta}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
