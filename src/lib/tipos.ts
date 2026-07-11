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
  rutina_vista_en: string | null;
  dieta_vista_en: string | null;
  chat_visto_en: string | null;
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
  foto_frontal_url: string | null;
  foto_lateral_url: string | null;
  foto_espalda_url: string | null;
}

/* ---- Fotos de progreso (bucket privado, URLs firmadas) ---- */

export interface FotoProgreso {
  path: string;
  url: string;
}

export interface EntradaFotosProgreso {
  id: string;
  fecha: string;
  frontal: FotoProgreso | null;
  lateral: FotoProgreso | null;
  espalda: FotoProgreso | null;
}

export interface Habito {
  id: string;
  cliente_id: string;
  nombre: string;
  icono: string;
  orden: number;
  activo: boolean;
  creado_en: string;
}

export interface HabitoRegistro {
  id: string;
  habito_id: string;
  cliente_id: string;
  fecha: string;
  completado: boolean;
}

/** Hábitos sugeridos al cliente que aún no tiene ninguno configurado. */
export const HABITOS_SUGERIDOS: { nombre: string; icono: string }[] = [
  { nombre: "Pasos", icono: "footprints" },
  { nombre: "Agua", icono: "glass-water" },
  { nombre: "Sueño", icono: "moon" },
];

/** Color por icono de hábito, para que no todos se vean del mismo azul. */
export const COLOR_ICONO_HABITO: Record<string, string> = {
  footprints: "#F2B84B",
  "glass-water": "#29ABE2",
  moon: "#9B8CF2",
  "circle-check": "#4ECB8D",
};

export interface Mensaje {
  id: string;
  cliente_id: string;
  remitente: "cliente" | "entrenador";
  texto: string;
  creado_en: string;
}

export interface Alerta {
  cliente_id: string;
  nombre: string;
  tipo: string;
  mensaje: string;
  rutina_id: string | null;
  semana_destino: number | null;
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
  tipo: "entreno" | "descanso";
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

/** Colores fijos de cada macronutriente, para reconocerlos de un
 * vistazo (dieta del cliente, editor del entrenador, plantillas…). */
export const INFO_MACRO = {
  proteina: { etiqueta: "Proteína", color: "#F2617A" },
  carbohidratos: { etiqueta: "Carbohidratos", color: "#F5C24C" },
  grasas: { etiqueta: "Grasas", color: "#4ECB8D" },
} as const;

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
