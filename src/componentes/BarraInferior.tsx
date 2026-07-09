"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Settings, Sun, Users } from "lucide-react";

const PESTANAS = [
  { ruta: "/hoy", etiqueta: "Hoy", Icono: Sun },
  { ruta: "/clientes", etiqueta: "Clientes", Icono: Users },
  { ruta: "/plantillas", etiqueta: "Plantillas", Icono: ClipboardList },
  { ruta: "/ajustes", etiqueta: "Ajustes", Icono: Settings },
];

/** Navegación inferior fija del panel (estilo prototipo). */
export default function BarraInferior() {
  const ruta = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[760px] flex gap-2 z-20 border-t border-borde bg-[rgba(12,15,18,0.96)] backdrop-blur-lg px-3 pt-2"
      style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
    >
      {PESTANAS.map((p) => {
        const activa = ruta === p.ruta || ruta.startsWith(p.ruta + "/");
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
