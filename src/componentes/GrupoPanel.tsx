import type { LucideIcon } from "lucide-react";

/**
 * Separador de un grupo del panel ("CLIENTES", "DIETA"…): cada tema con
 * su título, para que en Hoy se sepa de un vistazo dónde está cada cosa.
 */
export default function GrupoPanel({
  titulo,
  Icono,
  color = "var(--color-acento)",
  children,
}: {
  titulo: string;
  Icono: LucideIcon;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <div className="flex items-center gap-2 mb-3 mt-1">
        <Icono size={15} style={{ color }} className="shrink-0" />
        <span className="text-[11.5px] font-bold tracking-[0.16em] text-texto-2 shrink-0">{titulo}</span>
        <span className="flex-1 h-px bg-borde" />
      </div>
      {children}
    </section>
  );
}
