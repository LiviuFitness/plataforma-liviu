"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleUserRound,
  Home,
  MessageCircle,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";

const PESTANAS = [
  { ruta: "/inicio", etiqueta: "Inicio", Icono: Home },
  { ruta: "/mi-progreso", etiqueta: "Progreso", Icono: TrendingUp },
  { ruta: "/mi-dieta", etiqueta: "Dieta", Icono: UtensilsCrossed },
  { ruta: "/chat", etiqueta: "Chat", Icono: MessageCircle },
  { ruta: "/perfil", etiqueta: "Perfil", Icono: CircleUserRound },
];

/** Navegación inferior de la app del cliente. */
export default function BarraCliente({ chatSinLeer = false }: { chatSinLeer?: boolean }) {
  const ruta = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] flex gap-2 z-20 border-t border-borde bg-[rgba(12,15,18,0.96)] backdrop-blur-lg px-3 pt-2"
      style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
    >
      {PESTANAS.map((p) => {
        const activa = ruta === p.ruta || ruta.startsWith(p.ruta + "/");
        return (
          <Link
            key={p.ruta}
            href={p.ruta}
            className={`relative flex-1 flex flex-col items-center gap-0.5 font-semibold text-[11px] py-1.5 rounded-[10px] transition-colors ${
              activa ? "text-acento bg-acento/10" : "text-atenuado"
            }`}
          >
            <p.Icono size={20} strokeWidth={activa ? 2.4 : 2} />
            {p.ruta === "/chat" && chatSinLeer && (
              <span className="absolute top-1 right-[calc(50%-16px)] w-2 h-2 rounded-full bg-peligro" />
            )}
            {p.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
