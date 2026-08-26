/** Contorno del cuerpo compartido por la pantalla de medidas y por el
 * mapa de recuperación muscular, en un viewBox de 200×400.
 *
 * Se dibuja solo la mitad izquierda, cerrada contra el eje central
 * (x=100), y se refleja con un `<use transform="translate(200,0) scale(-1,1)">`
 * para la derecha: así el cuerpo sale perfectamente simétrico y —lo
 * importante— sin las costuras que se veían cuando era un montón de
 * rectángulos sueltos, que parecía un muñeco articulado y no una persona. */
export const MITAD_CUERPO = `M100 40 L90 42
  C80 45 70 50 62 60
  C56 68 52 80 50 94
  C48 112 46 134 45 154
  C44 166 44 174 46 179
  C49 184 55 183 57 177
  C59 166 60 148 62 130
  C63 116 65 100 68 88
  C69 98 70 110 71 122
  C72 134 71 144 70 154
  C68 166 65 176 64 190
  C62 206 62 224 64 244
  C66 262 68 276 70 292
  C71 306 72 322 72 336
  C72 344 75 348 82 348
  C88 348 90 344 90 336
  C90 320 91 302 93 284
  C95 264 97 240 98 216
  L100 200 Z`;

/** Cabeza, aparte del contorno porque va suelta sobre el cuello. */
export const CABEZA = { cx: 100, cy: 24, rx: 15, ry: 18 };

export const REFLEJO = "translate(200,0) scale(-1,1)";
