/* ============================================================
   Tipos del modelo de datos (espejo del esquema de Supabase)
   ============================================================ */

export type Rol = "entrenador" | "cliente";
export type Plan = "mensual" | "trimestral";
export type Estado = "activo" | "pausado" | "baja";
export type TipoSerie = "calentamiento" | "efectiva" | "dropset" | "fallo";

export interface Perfil {
  id: string;
  rol: Rol;
  nombre: string;
  email: string;
  fecha_alta: string;
  objetivo: string | null;
  plan: Plan | null;
  estado: Estado;
  notas_entrenador: string | null;
  consentimiento_salud: string | null;
  avatar_url: string | null;
  // Datos físicos (para el auto-cálculo de macros)
  fecha_nacimiento: string | null;
  altura_cm: number | null;
  sexo: "hombre" | "mujer" | "otro" | null;
  factor_actividad: number;
  objetivo_ritmo_semanal_pct: number | null;
}

export interface Invitacion {
  id: string;
  token: string;
  email: string;
  nombre: string;
  objetivo: string | null;
  plan: Plan | null;
  usada: boolean;
  creada_en: string;
  expira: string;
}

export interface Ejercicio {
  id: string;
  nombre: string;
  nombre_en: string | null;
  grupo_muscular: string;
  material: string | null;
  instrucciones: string | null;
  video_url: string | null;
  creado_por: string | null;
}

export interface Medida {
  id: string;
  cliente_id: string;
  fecha: string;
  peso: number | null;
  cintura: number | null;
  pecho: number | null;
  brazo: number | null;
  pierna: number | null;
}

export interface Alerta {
  cliente_id: string;
  nombre: string;
  tipo: string;
  mensaje: string;
}

export interface DietaComida {
  id: string;
  dieta_id: string;
  orden: number;
  nombre: string;
  descripcion_libre: string | null;
}

export interface Dieta {
  id: string;
  cliente_id: string | null;
  es_plantilla: boolean;
  nombre: string | null;
  kcal_obj: number;
  prot_obj: number;
  carb_obj: number;
  gras_obj: number;
  activa: boolean;
  dieta_comidas?: DietaComida[];
}

/* ---- Estructura de rutina en la interfaz (editor) ---- */

export interface SerieUI {
  tipo: TipoSerie;
  kg: string; // texto en el editor; se convierte a número al guardar
  reps: string;
  rir: string;
}

export interface EjercicioUI {
  ejercicio_id: string;
  nombre: string;
  grupo_muscular: string;
  descanso_seg: number;
  notas: string;
  series: SerieUI[];
  grupoSuperserie: string | null;
}

export interface DiaUI {
  id: string;
  orden: number;
  nombre: string;
  semana: number;
  ejercicios: EjercicioUI[];
}

export interface RutinaUI {
  id: string;
  nombre: string;
  notas: string | null;
  semana_actual: number;
  dias: DiaUI[];
}

/* Etiquetas y colores de los tipos de serie (estilo Hevy del prototipo v2) */
export const INFO_TIPO_SERIE: Record<
  TipoSerie,
  { etiqueta: string; color: string }
> = {
  calentamiento: { etiqueta: "Calent.", color: "#8A949C" },
  efectiva: { etiqueta: "Efectiva", color: "#29ABE2" },
  dropset: { etiqueta: "Dropset", color: "#E2B429" },
  fallo: { etiqueta: "Al fallo", color: "#E25529" },
};

export const ORDEN_TIPOS: TipoSerie[] = [
  "calentamiento",
  "efectiva",
  "dropset",
  "fallo",
];

export const OBJETIVOS = [
  "Pérdida de grasa",
  "Ganancia muscular",
  "Recomposición",
  "Salud general",
];

/* Grupos musculares del método de Liviu (como en su SUMMARY_MESO) */
export const GRUPOS_MUSCULARES = [
  "Pectoral",
  "Dorsales",
  "Trapecio",
  "Lumbares",
  "Deltoides Lateral",
  "Deltoides Posterior",
  "Deltoides Anterior",
  "Bíceps",
  "Tríceps",
  "Antebrazo",
  "Abdomen",
  "Cuádriceps",
  "Isquiosurales",
  "Glúteos",
  "Aductores",
  "Gemelos",
];
