/**
 * Mensajes sugeridos en Hoy: momentos en los que un mensaje tuyo
 * cuenta (un récord, una racha que se enfría, una semana perfecta), con
 * el texto ya escrito. Se calculan con datos que Hoy ya carga.
 *
 * Una sugerencia desaparece sola si ya le has escrito a esa persona
 * después de que pasara, para no sugerir lo que ya hiciste.
 */

export type TipoSugerencia = "record" | "inactivo" | "semana";

export interface Sugerencia {
  /** Estable mientras dure el motivo: sirve para descartarla. */
  clave: string;
  tipo: TipoSugerencia;
  clienteId: string;
  nombre: string;
  motivo: string;
  texto: string;
}

const pila = (nombre: string) => nombre.split(" ")[0];
const kgTexto = (kg: number) => String(kg).replace(".", ",");
const DIA = 86400000;

export function calcularSugerencias(d: {
  ahora: number;
  clientes: { id: string; nombre: string; fechaAlta: string | null }[];
  records: { cliente_id: string; ejercicio: string; kg_nuevo: number }[];
  /** Fechas de sesión por cliente, de la más reciente a la más antigua. */
  sesiones: Map<string, string[]>;
  /** Último mensaje del entrenador a cada cliente. */
  ultimoMensajeTuyo: Map<string, number>;
  /** Días por semana de la rutina de cada uno. */
  objetivo: Map<string, number>;
  /** Lunes de esta semana y de la anterior (medianoche). */
  lunes: Date;
  lunesPasado: Date;
}): Sugerencia[] {
  const res: Sugerencia[] = [];
  const escritoDesde = (id: string, t: number) => (d.ultimoMensajeTuyo.get(id) ?? 0) >= t;
  const nombreDe = new Map(d.clientes.map((c) => [c.id, c.nombre]));

  /* Récords: el mejor de cada uno esta semana */
  const vistos = new Set<string>();
  for (const r of d.records) {
    if (vistos.has(r.cliente_id) || !nombreDe.has(r.cliente_id)) continue;
    vistos.add(r.cliente_id);
    if (escritoDesde(r.cliente_id, d.ahora - 2 * DIA)) continue;
    const n = nombreDe.get(r.cliente_id)!;
    res.push({
      clave: `record:${r.cliente_id}:${r.ejercicio}:${r.kg_nuevo}`,
      tipo: "record",
      clienteId: r.cliente_id,
      nombre: n,
      motivo: `Récord en ${r.ejercicio.toLowerCase()}`,
      texto: `¡${pila(n)}, ${kgTexto(Number(r.kg_nuevo))} kg en ${r.ejercicio.toLowerCase()}! 🔥 Ese trabajo se nota. Sigue así 💪`,
    });
  }

  for (const c of d.clientes) {
    const fechas = d.sesiones.get(c.id) ?? [];
    /* Sin entrenar entre 5 y 14 días: después ya es otra conversación */
    if (fechas.length > 0) {
      const dias = Math.floor((d.ahora - new Date(fechas[0]).getTime()) / DIA);
      if (dias >= 5 && dias <= 14 && !escritoDesde(c.id, new Date(fechas[0]).getTime() + 3 * DIA)) {
        res.push({
          clave: `inactivo:${c.id}:${fechas[0].slice(0, 10)}`,
          tipo: "inactivo",
          clienteId: c.id,
          nombre: c.nombre,
          motivo: `${dias} días sin entrenar`,
          texto: `Hola ${pila(c.nombre)}, ¿todo bien? Hace unos días que no te veo por la app. Si necesitas que ajustemos algo, dímelo 🙌`,
        });
      }
    }

    /* Semana pasada cumplida entera: de lunes a miércoles */
    const obj = d.objetivo.get(c.id) ?? 0;
    const diaSemana = (new Date(d.ahora).getDay() + 6) % 7;
    if (obj > 0 && diaSemana <= 2) {
      const diasPasada = new Set(
        fechas
          .filter((f) => {
            const t = new Date(f);
            return t >= d.lunesPasado && t < d.lunes;
          })
          .map((f) => new Date(f).toLocaleDateString("sv-SE"))
      );
      if (diasPasada.size >= obj && !escritoDesde(c.id, d.lunes.getTime())) {
        res.push({
          clave: `semana:${c.id}:${d.lunes.toLocaleDateString("sv-SE")}`,
          tipo: "semana",
          clienteId: c.id,
          nombre: c.nombre,
          motivo: "Semana pasada cumplida entera",
          texto: `¡${pila(c.nombre)}, ${diasPasada.size} de ${obj} la semana pasada! Así se hace 👏`,
        });
      }
    }
  }

  /* Primero lo que se enfría (inactivos), luego las alegrías */
  const peso: Record<TipoSugerencia, number> = { inactivo: 0, record: 1, semana: 2 };
  return res.sort((a, b) => peso[a.tipo] - peso[b.tipo]).slice(0, 6);
}
