"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PESTANAS_CLIENTE } from "./navegacionCliente";

/** Navegación inferior de la app del cliente (solo móvil; en escritorio
 * la sustituye BarraLateralCliente). Cada sección con su color (el de sus
 * tarjetas) y una píldora detrás del icono activo: se ve de un vistazo
 * dónde estás. */
export default function BarraCliente({
  chatSinLeer = 0,
  revisionSinLeer = false,
}: {
  /** Mensajes del entrenador sin leer (sale el número) */
  chatSinLeer?: number;
  revisionSinLeer?: boolean;
}) {
  const ruta = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] flex gap-1.5 z-20 border-t border-borde bg-[rgba(12,15,18,0.96)] backdrop-blur-lg px-2 pt-2"
      style={{
        /* Alto explícito para que `--alto-barra-inferior` no sea una
         * suposición: el chat se coloca justo encima con esa medida. */
        height: "calc(var(--alto-barra-inferior) + env(safe-area-inset-bottom))",
        paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
      }}
    >
      {PESTANAS_CLIENTE.map((p) => {
        const activa = ruta === p.ruta || ruta.startsWith(p.ruta + "/");
        const color = activa ? p.color : "var(--color-atenuado)";
        /* La revisión de kcal avisaba en la pestaña Progreso, que ya no
         * está en la barra: el aviso pasa a Inicio (un punto). El chat
         * lleva el número de mensajes sin leer. */
        const numero = p.ruta === "/chat" ? chatSinLeer : 0;
        const punto = p.ruta === "/inicio" && revisionSinLeer;
        return (
          <Link key={p.ruta} href={p.ruta} className="anim-pulsable flex-1 flex flex-col items-center gap-1.5 py-1">
            <span
              className="relative h-9 w-14 rounded-full grid place-items-center transition-colors"
              style={{ color, background: activa ? `color-mix(in srgb, ${p.color} 17%, transparent)` : undefined }}
            >
              <p.Icono size={21} strokeWidth={activa ? 2.2 : 1.75} />
              {numero > 0 && (
                <span className="absolute -top-1.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-peligro text-white text-[10.5px] font-bold grid place-items-center border-2 border-fondo tabular-nums">
                  {numero > 9 ? "9+" : numero}
                </span>
              )}
              {punto && <span className="absolute top-0 right-2 w-2.5 h-2.5 rounded-full bg-peligro border-2 border-fondo" />}
            </span>
            <span className="text-[10.5px] font-semibold transition-colors" style={{ color }}>
              {p.etiqueta}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
