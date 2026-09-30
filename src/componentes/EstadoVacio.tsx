import Image from "next/image";
import type { IconoApp } from "./ui";
import { IconoTarjeta } from "./ui";

/**
 * Estado vacío consistente para toda la app: icono (o ilustración) +
 * título + texto útil + acción opcional. Sustituye a los
 * `<div className="text-atenuado">texto</div>` sueltos de antes.
 */
export default function EstadoVacio({
  Icono,
  color = "var(--color-atenuado)",
  titulo,
  descripcion,
  accion,
  imagen,
}: {
  Icono: IconoApp;
  color?: string;
  titulo: string;
  descripcion: string;
  accion?: React.ReactNode;
  /** Ilustración (Liviu en 3D) en lugar del icono: /vacios/… */
  imagen?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2.5 py-6 px-2">
      {imagen ? (
        <Image
          src={imagen}
          alt=""
          width={168}
          height={168}
          className="rounded-[24px] mb-1"
          /* El borde de abajo se funde con la tarjeta: el personaje no
           * queda "cortado" por un filo */
          style={{
            maskImage: "linear-gradient(to bottom, black 72%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, black 72%, transparent)",
          }}
        />
      ) : (
        <IconoTarjeta Icono={Icono} color={color} tamano={44} />
      )}
      <div className="font-bold text-[14.5px]">{titulo}</div>
      <div className="text-atenuado text-[13.5px] max-w-[280px] leading-snug">{descripcion}</div>
      {accion && <div className="mt-1.5">{accion}</div>}
    </div>
  );
}
