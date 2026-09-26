/**
 * "Tu mes en LivFit": las cifras de un mes cerrado, para las pantallas
 * tipo historia que el cliente ve los primeros días del mes siguiente.
 * Solo datos reales; lo que no hay (sin pesajes, sin récords) no sale.
 */

interface Serie {
  kg: number | null;
  reps: number | null;
  reps_extra: number | null;
  completada: boolean;
  tipo: string;
  ejercicio_sustituto_id: string | null;
  rutina_ejercicios: { ejercicios: { nombre: string } | null } | null;
}

export interface SesionMes {
  fecha_inicio: string;
  fecha_fin: string | null;
  series_realizadas: Serie[];
}

export interface ResumenMes {
  /** "septiembre" */
  mes: string;
  entrenos: number;
  horas: number;
  /** Entrenos del mes anterior a este (para comparar), o null */
  entrenosAntes: number | null;
  toneladas: number;
  records: { nombre: string; antes: number; ahora: number }[];
  totalRecords: number;
  estrella: { nombre: string; desde: number; hasta: number } | null;
  peso: { desde: number; hasta: number } | null;
  semanasCumplidas: number;
  semanasTotales: number;
}

const madrid = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

/** "2026-09" → primer y último día (AAAA-MM-DD) */
function limites(mes: string): [string, string] {
  const [a, m] = mes.split("-").map(Number);
  const fin = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return [`${mes}-01`, `${mes}-${String(fin).padStart(2, "0")}`];
}

/** El mes anterior a uno dado, "AAAA-MM" */
export function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

export function nombreMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("es-ES", { month: "long" });
}

export function calcularResumenMes(d: {
  mes: string;
  /** Sesiones del mes y de los meses anteriores (para récords) */
  sesiones: SesionMes[];
  /** Pesajes, cualquier orden */
  medidas: { fecha: string; peso: number | null }[];
  /** Días de entreno por semana de su rutina (0 si no tiene) */
  objetivo: number;
}): ResumenMes {
  const [desde, hasta] = limites(d.mes);
  const [desdeAntes, hastaAntes] = limites(mesAnterior(d.mes));
  const delMes = d.sesiones.filter((s) => {
    const f = madrid(s.fecha_inicio);
    return f >= desde && f <= hasta;
  });
  const previas = d.sesiones.filter((s) => madrid(s.fecha_inicio) < desde);
  const entrenosAntes = previas.filter((s) => {
    const f = madrid(s.fecha_inicio);
    return f >= desdeAntes && f <= hastaAntes;
  }).length;

  /* Tiempo: cada sesión cuenta como mucho 3 h (alguna se queda abierta) */
  const horas =
    delMes.reduce((a, s) => {
      if (!s.fecha_fin) return a;
      const seg = (new Date(s.fecha_fin).getTime() - new Date(s.fecha_inicio).getTime()) / 1000;
      return a + Math.min(Math.max(seg, 0), 3 * 3600);
    }, 0) / 3600;

  let kgTotales = 0;
  const mejorEnMes = new Map<string, number>();
  const primeraEnMes = new Map<string, number>();
  const cronologico = delMes.slice().sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
  for (const s of cronologico) {
    const enSesion = new Map<string, number>();
    for (const x of s.series_realizadas ?? []) {
      if (!x.completada) continue;
      if (x.kg !== null) kgTotales += Number(x.kg) * ((x.reps ?? 0) + (x.reps_extra ?? 0));
      const nombre = x.rutina_ejercicios?.ejercicios?.nombre;
      if (!nombre || x.tipo === "calentamiento" || x.kg === null || x.ejercicio_sustituto_id) continue;
      enSesion.set(nombre, Math.max(enSesion.get(nombre) ?? 0, Number(x.kg)));
    }
    for (const [n, kg] of enSesion) {
      if (!primeraEnMes.has(n)) primeraEnMes.set(n, kg);
      mejorEnMes.set(n, Math.max(mejorEnMes.get(n) ?? 0, kg));
    }
  }
  const mejorAntes = new Map<string, number>();
  for (const s of previas) {
    for (const x of s.series_realizadas ?? []) {
      const nombre = x.rutina_ejercicios?.ejercicios?.nombre;
      if (!nombre || !x.completada || x.tipo === "calentamiento" || x.kg === null || x.ejercicio_sustituto_id) continue;
      mejorAntes.set(nombre, Math.max(mejorAntes.get(nombre) ?? 0, Number(x.kg)));
    }
  }

  const records = [...mejorEnMes.entries()]
    .filter(([n, kg]) => mejorAntes.has(n) && kg > mejorAntes.get(n)!)
    .map(([nombre, ahora]) => ({ nombre, antes: mejorAntes.get(nombre)!, ahora }))
    .sort((a, b) => b.ahora - b.antes - (a.ahora - a.antes));

  /* Ejercicio estrella: el que más kilos ha subido (desde su mejor marca
   * anterior o, si es nuevo, desde su primera vez en el mes) */
  let estrella: ResumenMes["estrella"] = null;
  for (const [nombre, hastaKg] of mejorEnMes) {
    const desdeKg = mejorAntes.get(nombre) ?? primeraEnMes.get(nombre)!;
    const subida = hastaKg - desdeKg;
    if (subida > 0 && (!estrella || subida > estrella.hasta - estrella.desde)) {
      estrella = { nombre, desde: desdeKg, hasta: hastaKg };
    }
  }

  const pesos = d.medidas
    .filter((m) => m.peso !== null && m.fecha >= desde && m.fecha <= hasta)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((m) => Number(m.peso));
  const peso = pesos.length >= 2 ? { desde: pesos[0], hasta: pesos[pesos.length - 1] } : null;

  /* Semanas (de lunes a domingo) que empiezan dentro del mes */
  const dias = new Set(delMes.map((s) => madrid(s.fecha_inicio)));
  let semanasTotales = 0;
  let semanasCumplidas = 0;
  const [a, m] = d.mes.split("-").map(Number);
  for (let dia = 1; dia <= Number(hasta.slice(8)); dia++) {
    const f = new Date(Date.UTC(a, m - 1, dia));
    if (f.getUTCDay() !== 1) continue;
    semanasTotales++;
    let n = 0;
    for (let k = 0; k < 7; k++) {
      const iso = new Date(Date.UTC(a, m - 1, dia + k)).toISOString().slice(0, 10);
      if (dias.has(iso)) n++;
    }
    if (d.objetivo > 0 && n >= d.objetivo) semanasCumplidas++;
  }

  return {
    mes: nombreMes(d.mes),
    entrenos: delMes.length,
    horas: Math.round(horas * 10) / 10,
    entrenosAntes: previas.length > 0 ? entrenosAntes : null,
    toneladas: Math.round((kgTotales / 1000) * 10) / 10,
    records: records.slice(0, 3),
    totalRecords: records.length,
    estrella,
    peso,
    semanasCumplidas,
    semanasTotales: d.objetivo > 0 ? semanasTotales : 0,
  };
}
