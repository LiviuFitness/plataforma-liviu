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
  /** Fechas (AAAA-MM-DD) de comidas marcadas en las 3 últimas semanas. */
  comidas?: Map<string, string[]>;
  /** Fechas de pesajes recientes. */
  pesajes?: Map<string, string[]>;
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

  const hace = (dias: number) => new Date(d.ahora - dias * DIA).toLocaleDateString("sv-SE");
  for (const c of d.clientes) {
    const fechas = d.sesiones.get(c.id) ?? [];
    /* Señales de que se enfría: juntas en una sola tarjeta por persona */
    const motivos: string[] = [];
    /* La clave no cambia mientras duren los mismos motivos: descartada, no vuelve cada día */
    const claves: string[] = [];
    let desde = 0;
    /* Sin entrenar entre 5 y 14 días: después ya es otra conversación */
    if (fechas.length > 0) {
      const dias = Math.floor((d.ahora - new Date(fechas[0]).getTime()) / DIA);
      if (dias >= 5 && dias <= 14) {
        motivos.push(`${dias} días sin entrenar`);
        claves.push(`e${fechas[0].slice(0, 10)}`);
        desde = new Date(fechas[0]).getTime() + 3 * DIA;
      }
    }
    /* Antes marcaba sus comidas y estos 5 días, ninguna */
    const comidas = d.comidas?.get(c.id) ?? [];
    const antes = comidas.filter((f) => f >= hace(19) && f < hace(5)).length;
    const ahora = comidas.filter((f) => f >= hace(5)).length;
    if (antes >= 8 && ahora === 0) {
      motivos.push("antes marcaba sus comidas y estos días, ninguna");
      const ultima = comidas.slice().sort().at(-1);
      claves.push(`c${ultima}`);
      desde = Math.max(desde, ultima ? new Date(ultima + "T12:00:00").getTime() : 0);
    }
    /* Se pesaba y lleva más de 2 semanas sin hacerlo */
    const pesajes = (d.pesajes?.get(c.id) ?? []).slice().sort();
    const ultimoPeso = pesajes.at(-1);
    if (ultimoPeso && pesajes.length >= 3 && ultimoPeso < hace(14) && ultimoPeso >= hace(35)) {
      const dias = Math.floor((d.ahora - new Date(ultimoPeso + "T12:00:00").getTime()) / DIA);
      motivos.push(`no se pesa desde hace ${dias} días`);
      claves.push(`p${ultimoPeso}`);
      desde = Math.max(desde, new Date(ultimoPeso + "T12:00:00").getTime() + 7 * DIA);
    }
    if (motivos.length > 0 && !escritoDesde(c.id, desde)) {
      const motivo = motivos.join(" · ");
      res.push({
        clave: `inactivo:${c.id}:${claves.join("-")}`,
        tipo: "inactivo",
        clienteId: c.id,
        nombre: c.nombre,
        motivo: motivo.charAt(0).toUpperCase() + motivo.slice(1),
        texto: `Hola ${pila(c.nombre)}, ¿todo bien? Hace unos días que no te veo por la app. Si necesitas que ajustemos algo, dímelo 🙌`,
      });
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
