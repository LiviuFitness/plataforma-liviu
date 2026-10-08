import { FRONTAL, POSTERIOR, dibujar } from "@/componentes/SiluetaMuscular";
import { CABEZA, MITAD_CUERPO, REFLEJO } from "@/lib/siluetaCuerpo";

/** Músculos que se ven mejor de espaldas */
const DE_ESPALDAS = new Set(["Dorsales", "Lumbares", "Deltoides Posterior", "Tríceps", "Glúteos", "Isquiosurales"]);

/**
 * Muñequito con un grupo muscular en rojo, para los filtros por músculo
 * (como el de las apps de gimnasio). "Todos" pinta el cuerpo entero.
 */
export default function IconoMusculo({ grupo, activo = false, alto = 46 }: { grupo: string; activo?: boolean; alto?: number }) {
  const espalda = DE_ESPALDAS.has(grupo);
  const piezas = (espalda ? POSTERIOR : FRONTAL).filter((p) => grupo === "Todos" || p.grupo === grupo);
  const id = `ico-${grupo.replace(/\W/g, "")}`;
  const rojo = activo ? "#ff4d5e" : "#e0505e";
  return (
    <svg viewBox="40 30 120 300" height={alto} width={alto * 0.4} aria-hidden="true" className="block">
      <defs>
        <path id={`${id}-c`} d={MITAD_CUERPO} />
        <clipPath id={`${id}-r`}>
          <use href={`#${id}-c`} />
          <use href={`#${id}-c`} transform={REFLEJO} />
          <ellipse {...CABEZA} />
        </clipPath>
      </defs>
      <g fill={activo ? "#4a5560" : "#39424b"}>
        <use href={`#${id}-c`} />
        <use href={`#${id}-c`} transform={REFLEJO} />
        <ellipse {...CABEZA} />
      </g>
      <g clipPath={`url(#${id}-r)`}>
        {piezas.map((p) => p.zonas.map((z, i) => dibujar(z, `${p.grupo}-${i}`, rojo)))}
      </g>
    </svg>
  );
}
