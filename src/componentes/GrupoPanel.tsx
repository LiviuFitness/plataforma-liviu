import type { LucideIcon } from "lucide-react";

/**
 * Un apartado del panel ("CLIENTES", "DIETA"…) en su propio bloque: borde
 * y fondo muy suaves de su color, e icono y título en ese color. Así se
 * ve de un vistazo dónde empieza y dónde acaba cada tema.
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
    <section
      className="mb-4 rounded-[18px] p-3 min-w-0"
      style={{
        background: `color-mix(in srgb, ${color} 5%, var(--color-fondo))`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-7 h-7 rounded-[8px] grid place-items-center shrink-0"
          style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}
        >
          <Icono size={15} strokeWidth={2.3} style={{ color }} />
        </span>
        <span className="text-[12px] font-bold tracking-[0.14em] shrink-0" style={{ color }}>
          {titulo}
        </span>
        <span className="flex-1 h-px" style={{ background: `color-mix(in srgb, ${color} 30%, transparent)` }} />
      </div>
      {/* Lo de dentro trae su propio margen inferior: el último no lo necesita */}
      <div className="min-w-0 [&>*:last-child]:!mb-0">{children}</div>
    </section>
  );
}
