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
            className="anim-pulsable flex-1 flex flex-col items-center gap-1 py-1"
          >
            <span className={`caja-nav ${activa ? "caja-nav-activa" : ""}`}>
              <p.Icono
                size={20}
                strokeWidth={1.75}
                className={activa ? "text-acento" : "text-atenuado"}
              />
              {p.ruta === "/chat" && chatSinLeer && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-peligro" />
              )}
            </span>
            <span
              className={`text-[10.5px] font-semibold transition-colors ${
                activa ? "text-acento" : "text-atenuado"
              }`}
            >
              {p.etiqueta}
            </span>
            {activa && <span className="w-4 h-[2px] rounded-full bg-acento anim-aparecer" />}
          </Link>
        );
      })}
    </nav>
  );
}
