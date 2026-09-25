import type { Plan } from "@/lib/tipos";

const MESES_PLAN: Record<Plan, number> = { mensual: 1, trimestral: 3 };

/** Suma meses sin desbordar: 31 de enero + 1 mes = 28/29 de febrero,
 * no 3 de marzo. */
function sumarMeses(base: Date, meses: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth() + meses, 1);
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(base.getDate(), ultimoDia));
  return d;
}

export interface Renovacion {
  fecha: Date;
  /** 0 = hoy, 1 = mañana… */
  enDias: number;
  /** Meses que lleva contigo cuando renueve. */
  meses: number;
}

/**
 * Próxima renovación de un cliente contando desde su alta, cada 1 mes
 * (mensual) o cada 3 (trimestral). Devuelve la primera que cae hoy o
 * después; sin plan no hay renovación que avisar.
 */
export function proximaRenovacion(fechaAlta: string, plan: Plan | null, hoy: Date): Renovacion | null {
  if (!plan) return null;
  const paso = MESES_PLAN[plan];
  const [a, m, d] = fechaAlta.slice(0, 10).split("-").map(Number);
  const alta = new Date(a, m - 1, d);
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let meses = paso;
  let fecha = sumarMeses(alta, meses);
  /* Tope de 20 años: un dato raro no puede colgar la página */
  while (fecha < inicioHoy && meses < 240) {
    meses += paso;
    fecha = sumarMeses(alta, meses);
  }
  const enDias = Math.round((fecha.getTime() - inicioHoy.getTime()) / 86400000);
  return { fecha, enDias, meses };
}

/** "hoy" · "mañana" · "el jueves 2" */
export function cuandoRenueva(r: Renovacion): string {
  if (r.enDias === 0) return "hoy";
  if (r.enDias === 1) return "mañana";
  return `el ${r.fecha.toLocaleDateString("es-ES", { weekday: "long", day: "numeric" })}`;
}
