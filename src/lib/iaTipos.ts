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
