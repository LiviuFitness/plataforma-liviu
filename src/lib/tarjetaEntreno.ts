/**
 * Tarjeta para compartir un entreno en historias de Instagram (1080×1920).
 *
 * Se dibuja en un canvas en el propio móvil del cliente: sin servidor,
 * sin esperas y sin subir nada. Cada cliente que la comparte enseña el
 * trabajo de LivFit con su marca y la cuenta de Liviu.
 */

export interface DatosTarjeta {
  nombreDia: string;
  fecha: Date;
  duracionSeg: number;
  tonelajeKg: number;
  series: number;
  repeticiones: number;
  records: { nombre: string; kg: number }[];
}

const ANCHO = 1080;
const ALTO = 1920;
const FUENTE = '"Inter Variable", "Inter", -apple-system, "Segoe UI", sans-serif';
const ACENTO = "#29abe2";
const DORADO = "#e2b429";

function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Parte un texto en líneas que caben en `ancho`, como mucho `max`. La
 * última, si no cabe, se acorta con "…" (en una imagen no puede bajar
 * de línea sin fin). */
function lineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number, max: number): string[] {
  const palabras = texto.split(/\s+/);
  const res: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width <= ancho) actual = prueba;
    else {
      if (actual) res.push(actual);
      actual = p;
    }
  }
  if (actual) res.push(actual);
  if (res.length > max) {
    const cortadas = res.slice(0, max);
    let ultima = cortadas[max - 1];
    while (ctx.measureText(`${ultima}…`).width > ancho && ultima.length > 1) ultima = ultima.slice(0, -1);
    cortadas[max - 1] = `${ultima}…`;
    return cortadas;
  }
  return res;
}

function redondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const duracion = (seg: number) => {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
};
const volumen = (kg: number) =>
  kg >= 1000 ? `${(kg / 1000).toFixed(1).replace(".", ",")} t` : `${Math.round(kg)} kg`;
const kgTexto = (kg: number) => `${String(kg).replace(".", ",")} kg`;

export async function generarTarjetaEntreno(d: DatosTarjeta): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  /* La fuente tiene que estar cargada antes de dibujar, o el canvas usa
   * la del sistema y la tarjeta sale con otra letra. */
  try {
    await Promise.all([
      document.fonts.load(`800 120px ${FUENTE}`),
      document.fonts.load(`600 40px ${FUENTE}`),
    ]);
  } catch {
    /* sin la fuente se dibuja con la de sistema: la tarjeta sigue saliendo */
  }
  const logo = await cargarImagen("/logo-livfit.png");

  /* Fondo: el oscuro de la app con el brillo cian arriba, como su cabecera */
  ctx.fillStyle = "#0a0c0e";
  ctx.fillRect(0, 0, ANCHO, ALTO);
  const brillo = ctx.createRadialGradient(ANCHO / 2, -200, 50, ANCHO / 2, -200, 1300);
  brillo.addColorStop(0, "rgba(41,171,226,0.34)");
  brillo.addColorStop(1, "rgba(41,171,226,0)");
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  /* Instagram tapa unos 220 px arriba (barra de progreso y nombre) y
   * unos 250 abajo (el cuadro de responder): todo lo importante va
   * entre medias. */
  const M = 90; // margen lateral
  const ARRIBA = 230;
  let y = ARRIBA;

  if (logo) {
    const alto = 90;
    const ancho = (logo.width / logo.height) * alto;
    ctx.drawImage(logo, M, y, ancho, alto);
  }
  y += 205;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ACENTO;
  ctx.font = `800 36px ${FUENTE}`;
  ctx.letterSpacing = "6px";
  ctx.fillText("ENTRENO COMPLETADO", M, y);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 108px ${FUENTE}`;
  for (const l of lineas(ctx, d.nombreDia || "Entreno", ANCHO - M * 2, 2)) {
    y += 118;
    ctx.fillText(l, M, y);
  }
  y += 76;
  ctx.fillStyle = "#8a949c";
  ctx.font = `500 38px ${FUENTE}`;
  const fecha = d.fecha.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  ctx.fillText(fecha.charAt(0).toUpperCase() + fecha.slice(1), M, y);
  y += 56;

  /* Cuatro cifras en una rejilla de 2×2. La cifra se encoge si no cabe
   * ("1 h 10 min" a 76 px ya tocaba el borde). */
  const celdas: [string, string][] = [
    [duracion(d.duracionSeg), "duración"],
    [volumen(d.tonelajeKg), "levantadas"],
    [String(d.series), d.series === 1 ? "serie" : "series"],
    [String(d.repeticiones), "repeticiones"],
  ];
  const gap = 24;
  const anchoCelda = (ANCHO - M * 2 - gap) / 2;
  const altoCelda = 190;
  const PAD = 40;
  celdas.forEach(([valor, etiqueta], i) => {
    const x = M + (i % 2) * (anchoCelda + gap);
    const yc = y + Math.floor(i / 2) * (altoCelda + gap);
    redondeado(ctx, x, yc, anchoCelda, altoCelda, 32);
    ctx.fillStyle = "#111519";
    ctx.fill();
    ctx.strokeStyle = "#1e252b";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    let tam = 76;
    ctx.font = `800 ${tam}px ${FUENTE}`;
    while (ctx.measureText(valor).width > anchoCelda - PAD * 2 && tam > 40) {
      tam -= 2;
      ctx.font = `800 ${tam}px ${FUENTE}`;
    }
    ctx.fillText(valor, x + PAD, yc + 100);
    ctx.fillStyle = "#8a949c";
    ctx.font = `500 34px ${FUENTE}`;
    ctx.fillText(etiqueta, x + PAD, yc + 150);
  });
  y += altoCelda * 2 + gap + 40;

  /* Récords: el momento que más se comparte, en dorado. Dos como mucho
   * en la lista (el título dice cuántos fueron) para no invadir la zona
   * que tapa Instagram. */
  if (d.records.length > 0) {
    const lista = d.records.slice(0, 2);
    const altoBloque = 100 + lista.length * 66;
    redondeado(ctx, M, y, ANCHO - M * 2, altoBloque, 32);
    ctx.fillStyle = "rgba(226,180,41,0.10)";
    ctx.fill();
    ctx.strokeStyle = "rgba(226,180,41,0.45)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = DORADO;
    ctx.font = `800 34px ${FUENTE}`;
    ctx.letterSpacing = "5px";
    ctx.fillText(
      d.records.length === 1 ? "🏆  NUEVO RÉCORD" : `🏆  ${d.records.length} RÉCORDS`,
      M + PAD,
      y + 66
    );
    ctx.letterSpacing = "0px";
    lista.forEach((r, i) => {
      const yl = y + 132 + i * 66;
      ctx.font = `800 38px ${FUENTE}`;
      const kg = kgTexto(r.kg);
      const anchoKg = ctx.measureText(kg).width;
      ctx.fillStyle = DORADO;
      ctx.fillText(kg, ANCHO - M - PAD - anchoKg, yl);
      ctx.font = `600 38px ${FUENTE}`;
      ctx.fillStyle = "#ffffff";
      const [nombre] = lineas(ctx, r.nombre, ANCHO - M * 2 - PAD * 2 - anchoKg - 30, 1);
      ctx.fillText(nombre, M + PAD, yl);
    });
  }

  /* Pie: la cuenta de Liviu, que es a quien lleva la historia. Por
   * encima del cuadro de responder. */
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 44px ${FUENTE}`;
  const cuenta = "@liviufitness";
  ctx.fillText(cuenta, (ANCHO - ctx.measureText(cuenta).width) / 2, ALTO - 360);
  ctx.fillStyle = "#8a949c";
  ctx.font = `500 32px ${FUENTE}`;
  const web = "Entrenado con LivFit · app.livfit.es";
  ctx.fillText(web, (ANCHO - ctx.measureText(web).width) / 2, ALTO - 308);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
