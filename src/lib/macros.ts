/* ============================================================
   Auto-cálculo de objetivos nutricionales.
   TMB con Mifflin-St Jeor (más precisa que Harris-Benedict),
   TDEE con factor de actividad y ajuste según objetivo.
   ============================================================ */

export interface DatosAutoCalculo {
  pesoKg: number | null; // última medida registrada
  alturaCm: number | null;
  fechaNacimiento: string | null; // ISO
  sexo: "hombre" | "mujer" | null;
  factorActividad: number;
  objetivo: string | null;
}

export interface ResultadoMacros {
  kcal: number;
  prot: number;
  carb: number;
  gras: number;
  tmb: number; // metabolismo basal, para mostrar el desglose
  tdee: number; // mantenimiento
}

export const FACTORES_ACTIVIDAD = [
  { valor: 1.2, etiqueta: "Sedentario (sin ejercicio)" },
  { valor: 1.375, etiqueta: "Ligero (1-3 días/semana)" },
  { valor: 1.55, etiqueta: "Moderado (3-5 días/semana)" },
  { valor: 1.725, etiqueta: "Alto (6-7 días/semana)" },
  { valor: 1.9, etiqueta: "Muy alto (trabajo físico + entrenos)" },
];

/** Devuelve qué datos faltan para poder calcular, en español legible. */
export function datosQueFaltan(d: DatosAutoCalculo): string[] {
  const faltan: string[] = [];
  if (!d.pesoKg) faltan.push("peso (añade una medida en Progreso)");
  if (!d.alturaCm) faltan.push("altura");
  if (!d.fechaNacimiento) faltan.push("fecha de nacimiento");
  if (!d.sexo) faltan.push("sexo");
  return faltan;
}

/** Calcula kcal y macros. Devuelve null si faltan datos. */
export function calcularMacros(d: DatosAutoCalculo): ResultadoMacros | null {
  if (!d.pesoKg || !d.alturaCm || !d.fechaNacimiento || !d.sexo) return null;

  const edad = Math.floor(
    (Date.now() - new Date(d.fechaNacimiento).getTime()) / 31557600000
  );
  if (edad < 14 || edad > 100) return null;

  // Mifflin-St Jeor
  const tmb =
    10 * d.pesoKg +
    6.25 * d.alturaCm -
    5 * edad +
    (d.sexo === "hombre" ? 5 : -161);

  const tdee = tmb * d.factorActividad;

  // Ajuste por objetivo y proteína por kg
  let ajuste = 1.0;
  let protPorKg = 1.8;
  const objetivo = (d.objetivo ?? "").toLowerCase();
  if (objetivo.includes("pérdida")) {
    ajuste = 0.85; // déficit del 15 %
    protPorKg = 2.0;
  } else if (objetivo.includes("ganancia")) {
    ajuste = 1.1; // superávit del 10 %
    protPorKg = 1.8;
  } else if (objetivo.includes("recomposición")) {
    ajuste = 1.0;
    protPorKg = 2.0;
  } else {
    protPorKg = 1.6;
  }

  const kcal = Math.round((tdee * ajuste) / 10) * 10;
  const prot = Math.round((protPorKg * d.pesoKg) / 5) * 5;
  // Grasas: 25 % de las kcal, nunca por debajo de 0,8 g/kg
  const gras =
    Math.round(Math.max((kcal * 0.25) / 9, 0.8 * d.pesoKg) / 5) * 5;
  const carb = Math.max(
    0,
    Math.round((kcal - prot * 4 - gras * 9) / 4 / 5) * 5
  );

  return { kcal, prot, carb, gras, tmb: Math.round(tmb), tdee: Math.round(tdee) };
}
