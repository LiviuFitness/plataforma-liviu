export type NivelEstado = "riesgo" | "atencion" | "al-dia";

export interface EstadoCliente {
  nivel: NivelEstado;
  motivo: string | null;
}

/**
 * Estado único de "cómo va" un cliente — sustituye los tres sistemas de
 * color que convivían sin relación (anillo de adherencia 80/60, semáforo
 * de días 3/7, score del radar de riesgo ≥3/≥5). Reutiliza los mismos
 * umbrales que ya usaba cada uno por separado, solo centralizados: el
 * mismo criterio decide el punto de color en Clientes y en Hoy.
 */
export function estadoCliente({
  diasSinEntrenar,
  diasDesdeAlta = 0,
  adherencia,
  scoreRiesgo = 0,
}: {
  /** Días desde la última sesión; undefined = nunca ha entrenado. */
  diasSinEntrenar: number | undefined;
  /** Días desde el alta — para no marcar "riesgo" a quien acaba de entrar. */
  diasDesdeAlta?: number;
  /** Adherencia media 0-100. */
  adherencia: number;
  /** Score enriquecido del radar de Hoy (sensaciones, peso estancado…), opcional. */
  scoreRiesgo?: number;
}): EstadoCliente {
  if (diasSinEntrenar === undefined) {
    return diasDesdeAlta >= 7
      ? { nivel: "riesgo", motivo: "Nunca ha registrado una sesión" }
      : { nivel: "al-dia", motivo: null };
  }
  if (scoreRiesgo >= 3 || diasSinEntrenar >= 7) {
    return {
      nivel: "riesgo",
      motivo: `Sin entrenar ${diasSinEntrenar} día${diasSinEntrenar === 1 ? "" : "s"}`,
    };
  }
  if (diasSinEntrenar >= 3) {
    return {
      nivel: "atencion",
      motivo: `Sin entrenar ${diasSinEntrenar} día${diasSinEntrenar === 1 ? "" : "s"}`,
    };
  }
  if (adherencia < 60) {
    return { nivel: "atencion", motivo: `Adherencia ${adherencia}%` };
  }
  return { nivel: "al-dia", motivo: null };
}
