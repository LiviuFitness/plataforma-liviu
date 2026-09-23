/** Racha: días de calendario consecutivos con sesión, terminando hoy o ayer. */
export function calcularRacha(fechas: string[]): number {
  const dias = new Set(
    fechas.map((f) => new Date(f).toLocaleDateString("sv-SE")) // AAAA-MM-DD local
  );
  const cursor = new Date();
  let racha = 0;
  // Si hoy no hay sesión todavía, la racha puede seguir viva desde ayer
  if (!dias.has(cursor.toLocaleDateString("sv-SE"))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dias.has(cursor.toLocaleDateString("sv-SE"))) {
    racha++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

/** Lunes de la semana de `d`, en AAAA-MM-DD local. */
function claveSemana(d: Date): string {
  const lunes = new Date(d);
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  return lunes.toLocaleDateString("sv-SE");
}

/**
 * Racha en semanas: semanas seguidas (de lunes a domingo) en las que
 * entrenó al menos `objetivo` días distintos.
 *
 * La de días seguidos no sirve para una rutina de 4 días: el que cumple
 * a la perfección la pierde en cada día de descanso, y "no la rompas"
 * le empuja a entrenar justo cuando le toca descansar. Esta premia lo
 * que de verdad se le pide.
 *
 * La semana en curso suma en cuanto se cumple, pero mientras siga
 * abierta no rompe la racha: el lunes nadie ha fallado todavía.
 *
 * El objetivo es el de la rutina actual; si en semanas anteriores tenía
 * menos días pautados, se le exige el número de ahora. Se prefiere
 * quedarse corto a inflar la racha.
 */
export function calcularRachaSemanas(fechas: string[], objetivo: number): number {
  if (objetivo <= 0) return 0;
  const dias = new Map<string, Set<string>>();
  for (const f of fechas) {
    const d = new Date(f);
    const clave = claveSemana(d);
    if (!dias.has(clave)) dias.set(clave, new Set());
    dias.get(clave)!.add(d.toLocaleDateString("sv-SE"));
  }
  const cumple = (d: Date) => (dias.get(claveSemana(d))?.size ?? 0) >= objetivo;

  const cursor = new Date();
  let racha = cumple(cursor) ? 1 : 0;
  cursor.setDate(cursor.getDate() - 7);
  while (cumple(cursor)) {
    racha++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return racha;
}
