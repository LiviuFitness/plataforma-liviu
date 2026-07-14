import type { LucideIcon } from "lucide-react";
import { IconoTarjeta } from "./ui";

/**
 * Estado vacío consistente para toda la app: icono + título + texto útil +
 * acción opcional. Sustituye a los `<div className="text-atenuado">texto</div>`
 * sueltos de antes.
 */
export default function EstadoVacio({
  Icono,
  color = "var(--color-atenuado)",
  titulo,
  descripcion,
  accion,
}: {
  Icono: LucideIcon;
  color?: string;
  titulo: string;
  descripcion: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2.5 py-6 px-2">
      <IconoTarjeta Icono={Icono} color={color} tamano={44} />
      <div className="font-bold text-[14.5px]">{titulo}</div>
      <div className="text-atenuado text-[13.5px] max-w-[280px] leading-snug">{descripcion}</div>
      {accion && <div className="mt-1.5">{accion}</div>}
    </div>
  );
}
