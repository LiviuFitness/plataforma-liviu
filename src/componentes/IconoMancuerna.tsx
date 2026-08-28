/** Mancuerna vista de lado: barra con dos discos a cada extremo.
 *
 * Sustituye a `Dumbbell` de lucide, que dibuja la pesa en diagonal y a
 * tamaño pequeño se lee más como un aspa o una hélice que como algo de
 * gimnasio. Mismo lenguaje que el resto de iconos de la app (trazo de
 * línea, sin relleno, extremos redondeados) y hereda `currentColor`, así
 * que sirve igual en cualquier color y tamaño — que es justo lo que no
 * daría una imagen exportada de una herramienta de diseño.
 *
 * La firma imita la de lucide (`size`, `strokeWidth`…) para poder pasarlo
 * donde ya se espera un icono suyo, como `IconoTarjeta`.
 */
export default function IconoMancuerna({
  size = 24,
  strokeWidth = 2,
  className = "",
  ...resto
}: {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
} & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...resto}
    >
      {/* Discos exteriores */}
      <path d="M3 10v4" />
      <path d="M21 10v4" />
      {/* Discos interiores, más altos */}
      <path d="M6.5 7.5v9" />
      <path d="M17.5 7.5v9" />
      {/* Barra */}
      <path d="M6.5 12h11" />
    </svg>
  );
}
