/** Formas de lo que devuelven las rutas de IA (compartidas con el panel) */

export interface RevisionIA {
  resumen: string;
  delta_kcal: number;
  propuesta: string;
  mensaje: string;
}

export interface BorradorComidaIA {
  nombre: string;
  items: { alimentoId: string; gramos: number }[];
  nombreB: string;
  itemsB: { alimentoId: string; gramos: number }[] | null;
}

export interface BorradorDietaIA {
  comidas: BorradorComidaIA[];
  explicacion: string;
  totales: { kcal: number; prot: number; carb: number; gras: number };
}

export interface RespuestaCoachIA {
  respuesta: string;
  /** Nombre exacto de una de sus alternativas, si le propone cambiar */
  alternativa: string | null;
  derivar: boolean;
}

export interface SerieRutinaIA {
  reps: number;
  /** 0 si es un número fijo de repeticiones */
  reps_max: number;
  /** null si la serie lleva técnica en vez de RIR */
  rir: number | null;
  /** "P", "myo"… o "" */
  tecnica: string;
}

export interface BorradorRutinaIA {
  dias: {
    nombre: string;
    ejercicios: { ejercicioId: string; nombre: string; grupo: string; series: SerieRutinaIA[] }[];
  }[];
  semanas: number;
  /** Series efectivas por semana de cada músculo, de más a menos */
  volumen: [string, number][];
  explicacion: string;
}
