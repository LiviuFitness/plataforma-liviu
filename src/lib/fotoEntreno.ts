/**
 * Foto de ambiente que le toca a un día de entreno.
 *
 * No se adivina por el nombre del día — los de Liviu son texto libre
 * ("Tracciones", "TORSO A + ABS", "FEMORAL", "CUADS") y cualquier
 * coincidencia de palabras acabaría fallando. Se decide por los grupos
 * musculares reales de los ejercicios de ese día, que es un dato que la
 * app ya tiene, y gana la familia que más aparece.
 */

const FAMILIA: Record<string, string> = {
  Pectoral: "empuje",
  "Deltoides Anterior": "empuje",
  "Deltoides Lateral": "empuje",
  "Deltoides Posterior": "empuje",
  "Tríceps": "empuje",

  Dorsales: "traccion",
  Trapecio: "traccion",
  "Bíceps": "traccion",
  Antebrazo: "traccion",

  "Cuádriceps": "pierna",
  Isquiosurales: "pierna",
  Aductores: "pierna",
  Gemelos: "pierna",

  "Glúteos": "gluteo",

  Abdomen: "core",
  Lumbares: "core",
};

/** Ruta de la foto para un día, a partir de los grupos de sus ejercicios. */
export function fotoEntreno(grupos: string[]): string {
  const cuenta = new Map<string, number>();
  for (const g of grupos) {
    const familia = FAMILIA[g];
    if (familia) cuenta.set(familia, (cuenta.get(familia) ?? 0) + 1);
  }
  const ganadora = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "general";
  return `/entrenos/${ganadora}.webp`;
}
