import {
  Dumbbell,
  Flame,
  Medal,
  Sparkles,
  Trophy,
  CircleCheck,
  type LucideIcon,
} from "lucide-react";

export interface Logro {
  clave: string;
  etiqueta: string;
  descripcion: string;
  Icono: LucideIcon;
}

/** Catálogo de logros: vive en código porque la condición de cada uno
 * también vive en código (evaluarLogros). La tabla logros_desbloqueados
 * solo guarda cuáles y cuándo, no el catálogo en sí. */
export const CATALOGO_LOGROS: Logro[] = [
  {
    clave: "primera_sesion",
    etiqueta: "Primer entreno",
    descripcion: "Completa tu primera sesión de entrenamiento.",
    Icono: Dumbbell,
  },
  {
    clave: "diez_sesiones",
    etiqueta: "10 entrenos",
    descripcion: "Completa 10 sesiones de entrenamiento.",
    Icono: Medal,
  },
  {
    clave: "cincuenta_sesiones",
    etiqueta: "50 entrenos",
    descripcion: "Completa 50 sesiones de entrenamiento.",
    Icono: Trophy,
  },
  {
    clave: "racha_7",
    etiqueta: "Racha de 7 días",
    descripcion: "Entrena 7 días seguidos.",
    Icono: Flame,
  },
  {
    clave: "racha_30",
    etiqueta: "Racha de 30 días",
    descripcion: "Entrena 30 días seguidos.",
    Icono: Flame,
  },
  {
    clave: "primer_habito",
    etiqueta: "Primer hábito",
    descripcion: "Marca tu primer hábito diario.",
    Icono: CircleCheck,
  },
  {
    clave: "semana_habitos",
    etiqueta: "Semana perfecta",
    descripcion: "Completa todos tus hábitos activos 7 días seguidos.",
    Icono: Sparkles,
  },
];

export interface DatosParaLogros {
  totalSesiones: number;
  racha: number;
  totalRegistrosHabitos: number;
  semanaHabitosCompleta: boolean;
}

/** Claves de logros que se cumplen con estos datos (independientemente
 * de si ya estaban desbloqueados o no — el llamador filtra los nuevos). */
export function logrosCumplidos(datos: DatosParaLogros): string[] {
  const claves: string[] = [];
  if (datos.totalSesiones >= 1) claves.push("primera_sesion");
  if (datos.totalSesiones >= 10) claves.push("diez_sesiones");
  if (datos.totalSesiones >= 50) claves.push("cincuenta_sesiones");
  if (datos.racha >= 7) claves.push("racha_7");
  if (datos.racha >= 30) claves.push("racha_30");
  if (datos.totalRegistrosHabitos >= 1) claves.push("primer_habito");
  if (datos.semanaHabitosCompleta) claves.push("semana_habitos");
  return claves;
}
