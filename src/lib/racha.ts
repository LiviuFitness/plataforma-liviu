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
