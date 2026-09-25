import { OBJETIVOS, type Plan } from "@/lib/tipos";

export interface FilaLote {
  linea: number;
  nombre: string;
  email: string;
  plan: Plan;
  objetivo: string;
  /** null = se puede invitar */
  problema: string | null;
}

/* Suelto a propósito: "juan@gmail" se reconoce como un email mal
 * escrito en vez de tomarse por parte del nombre. */
const RE_EMAIL = /[^\s,;<>()"']+@[^\s,;<>()"']*/;

function leerPlan(t: string): Plan | null {
  if (/trimestr/i.test(t)) return "trimestral";
  if (/mensual/i.test(t)) return "mensual";
  return null;
}

function leerObjetivo(t: string): string | null {
  const s = t.toLowerCase();
  if (/p[ée]rdida|grasa|defini/.test(s)) return OBJETIVOS[0];
  if (/ganancia|volumen|m[úu]sculo|hipertrofia/.test(s)) return OBJETIVOS[1];
  if (/recomp/.test(s)) return OBJETIVOS[2];
  if (/salud/.test(s)) return OBJETIVOS[3];
  return null;
}

/** "ana lópez" → "Ana López" (si viene todo en minúsculas o mayúsculas) */
function capitalizar(nombre: string): string {
  if (nombre !== nombre.toLowerCase() && nombre !== nombre.toUpperCase()) return nombre;
  return nombre
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (p.length > 2 || /^[a-záéíóúñ]/.test(p) ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(" ");
}

/**
 * Lee una lista pegada tal cual: una persona por línea, con el nombre y
 * el email en cualquier orden y separados por comas, tabuladores (copiado
 * de una hoja de cálculo) o espacios. Si en la línea pone "trimestral" o
 * el objetivo ("pérdida de grasa", "ganancia"…), se usa; si no, lo que
 * esté elegido por defecto.
 */
export function leerLista(
  texto: string,
  opciones: {
    planPorDefecto: Plan;
    objetivoPorDefecto: string;
    /** Emails con invitación pendiente o que ya son clientes, en minúsculas. */
    pendientes: Set<string>;
    clientes: Set<string>;
  }
): FilaLote[] {
  const filas: FilaLote[] = [];
  const vistos = new Set<string>();

  texto.split(/\r?\n/).forEach((cruda, i) => {
    const linea = cruda.trim();
    if (!linea) return;
    const m = linea.match(RE_EMAIL);
    const email = m ? m[0].toLowerCase().replace(/[.,;]+$/, "") : "";
    const resto = (m ? linea.replace(m[0], " ") : linea).replace(/[<>()"]/g, " ");
    const trozos = resto
      .split(/[,;\t|]/)
      .map((t) => t.trim())
      .filter(Boolean);

    let nombre = "";
    let plan: Plan | null = null;
    let objetivo: string | null = null;
    for (const t of trozos) {
      const p = leerPlan(t);
      const o = leerObjetivo(t);
      if (!nombre && !p && !o) nombre = t;
      else {
        plan ??= p;
        objetivo ??= o;
      }
    }
    nombre = capitalizar(nombre.replace(/\s+/g, " ").replace(/^[-–·•*\d.)\s]+/, "").trim());

    let problema: string | null = null;
    if (!email) problema = "Falta el email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) problema = "Email mal escrito";
    else if (opciones.clientes.has(email)) problema = "Ya es cliente";
    else if (opciones.pendientes.has(email)) problema = "Ya tiene invitación pendiente";
    else if (vistos.has(email)) problema = "Repetido en la lista";
    else if (!nombre) problema = "Falta el nombre";
    if (email) vistos.add(email);

    filas.push({
      linea: i + 1,
      nombre,
      email,
      plan: plan ?? opciones.planPorDefecto,
      objetivo: objetivo ?? opciones.objetivoPorDefecto,
      problema,
    });
  });

  return filas;
}
