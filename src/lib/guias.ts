/**
 * Guías del entrenador: textos (y vídeo opcional) que escribe una vez y
 * manda por el chat a quien los necesite.
 *
 * En el chat viajan como un mensaje normal con una marca al final
 * ("[guia:<id>]"): así no hace falta otra tabla ni otro tipo de
 * mensaje, y el hilo la pinta como una tarjeta que se abre.
 */

export interface Guia {
  id: string;
  titulo: string;
  contenido: string;
  video_url: string | null;
  orden: number;
}

const MARCA = /\[guia:([0-9a-f-]{36})\]\s*$/i;

export function mensajeDeGuia(g: Pick<Guia, "id" | "titulo">): string {
  return `📘 ${g.titulo}\n[guia:${g.id}]`;
}

/** Si el mensaje es una guía, su id y su título. */
export function leerGuia(texto: string): { id: string; titulo: string } | null {
  const m = texto.match(MARCA);
  if (!m) return null;
  return { id: m[1], titulo: texto.replace(MARCA, "").replace(/^📘\s*/, "").trim() };
}

/** Para vistas previas de una línea: sin la marca. */
export function textoVisible(texto: string): string {
  return texto.replace(MARCA, "").trim();
}

/** Minutos de lectura aproximados (200 palabras por minuto). */
export function minutosLectura(contenido: string): number {
  const palabras = contenido.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palabras / 200));
}
