/**
 * Catálogo comercial de los planes que ve quien AÚN NO es cliente
 * (página pública /planes, a la que se llega por QR) y de los estados
 * por los que pasa un lead en el panel.
 *
 * Los precios viven aquí y solo aquí: si Liviu los cambia, se cambian
 * en este archivo y la página pública se entera sola.
 */

/**
 * El QR se imprime y se cuelga en una pared: tiene que apuntar a
 * producción SIEMPRE, aunque Liviu lo genere desde una vista previa o
 * desde localhost. Se puede sobrescribir con NEXT_PUBLIC_URL_APP.
 */
export const URL_PUBLICA = process.env.NEXT_PUBLIC_URL_APP ?? "https://app.livfit.es";

export type ClavePlan = "automatico" | "presencial";

export type Plan = {
  clave: ClavePlan;
  nombre: string;
  /** Para el selector del formulario, donde no cabe el nombre largo. */
  corto: string;
  gancho: string;
  /** Precio principal, el que se lee grande. */
  precio: string;
  periodo: string;
  /** La otra forma de pagarlo, en pequeño. */
  alterno: string;
  distintivo: string;
  incluye: string[];
  /** Lo que NO trae — dicho en claro para que nadie se lleve sorpresas. */
  excluye: string[];
};

export const PLANES: Plan[] = [
  {
    clave: "automatico",
    nombre: "Automático",
    corto: "Automático",
    gancho: "Mi método completo dentro de la app, sin sesiones presenciales.",
    precio: "39 €",
    periodo: "al mes",
    alterno: "o 99 € el trimestre — te ahorras un 15 %",
    distintivo: "Sin lista de espera",
    incluye: [
      "Rutina y dieta asignadas según tu objetivo",
      "Ajustes automáticos con la revisión semanal",
      "Seguimiento de peso, medidas y hábitos",
      "Biblioteca de ejercicios con vídeo y técnica",
      "Chat conmigo para dudas",
    ],
    excluye: ["Sesiones presenciales", "Respuesta inmediata en el chat"],
  },
  {
    clave: "presencial",
    nombre: "Coaching presencial",
    corto: "Presencial",
    gancho: "Nos vemos, corrijo tu técnica y te lo ajusto todo a ti.",
    precio: "300 €",
    periodo: "al trimestre",
    alterno: "100 € al mes",
    distintivo: "Plazas limitadas",
    incluye: [
      "Todo lo del plan Automático",
      "Revisiones presenciales conmigo",
      "Entrenamiento y nutrición individualizados",
      "Correcciones de técnica en directo",
      "Seguimiento cercano por chat",
    ],
    excluye: [],
  },
];

export const NOMBRE_PLAN: Record<ClavePlan, string> = {
  automatico: "Automático",
  presencial: "Coaching presencial",
};

/* ---------------- Leads ---------------- */

export type EstadoLead = "nuevo" | "contactado" | "cliente" | "descartado";

export type Lead = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  plan: ClavePlan | null;
  mensaje: string | null;
  origen: string | null;
  estado: EstadoLead;
  notas: string | null;
  creado_en: string;
};

export const ESTADOS_LEAD: { clave: EstadoLead; etiqueta: string; color: string }[] = [
  { clave: "nuevo", etiqueta: "Nuevo", color: "text-acento" },
  { clave: "contactado", etiqueta: "Contactado", color: "text-aviso" },
  { clave: "cliente", etiqueta: "Ya es cliente", color: "text-verde" },
  { clave: "descartado", etiqueta: "Descartado", color: "text-atenuado" },
];

export const ETIQUETA_ESTADO: Record<EstadoLead, string> = Object.fromEntries(
  ESTADOS_LEAD.map((e) => [e.clave, e.etiqueta])
) as Record<EstadoLead, string>;
