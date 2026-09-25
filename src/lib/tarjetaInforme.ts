import { ACENTO, DORADO, FUENTE, cargarImagen, lineas, redondeado } from "@/lib/tarjetaEntreno";
import type { DatosInforme } from "@/lib/informeProgreso";

/**
 * Informe de progreso en imagen (1080×1350, el formato vertical que
 * WhatsApp e Instagram enseñan entero), para mandárselo al cliente antes
 * de renovar. Se dibuja en el móvil del entrenador.
 */

const ANCHO = 1080;
const ALTO = 1350;
const M = 70;

const coma = (n: number, dec = 1) => n.toFixed(dec).replace(".", ",").replace(/,0$/, "");
const signo = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
const fechaLarga = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
};
const mesCorto = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-ES", { month: "short" }).replace(".", "").toUpperCase();
};

/** Dibuja la imagen recortada para llenar el hueco (como object-fit: cover). */
function dibujarCubriendo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const escala = Math.max(w / img.width, h / img.height);
  const sw = w / escala;
  const sh = h / escala;
  const sx = (img.width - sw) / 2;
  const sy = Math.max(0, (img.height - sh) * 0.3); // un poco hacia arriba: la cara y el torso
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export function tituloMeses(meses: number): string {
  if (meses < 1) return "TUS PRIMERAS SEMANAS";
  if (meses === 1) return "1 MES CONTIGO";
  return `${meses} MESES CONTIGO`;
}

export async function generarTarjetaInforme(d: DatosInforme): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    await Promise.all([
      document.fonts.load(`800 80px ${FUENTE}`),
      document.fonts.load(`600 34px ${FUENTE}`),
    ]);
  } catch {
    /* sin la fuente se dibuja con la de sistema */
  }
  const [antes, ahora] = await Promise.all([
    d.fotoAntes ? cargarImagen(d.fotoAntes.url, true) : Promise.resolve(null),
    d.fotoAhora ? cargarImagen(d.fotoAhora.url, true) : Promise.resolve(null),
  ]);
  const hayFotos = !!(antes && ahora);

  ctx.fillStyle = "#0a0c0e";
  ctx.fillRect(0, 0, ANCHO, ALTO);
  const brillo = ctx.createRadialGradient(ANCHO / 2, -200, 50, ANCHO / 2, -200, 1100);
  brillo.addColorStop(0, "rgba(41,171,226,0.32)");
  brillo.addColorStop(1, "rgba(41,171,226,0)");
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.textBaseline = "alphabetic";

  /* Sin fotos hay sitio de sobra: todo baja un poco y crece */
  let y = hayFotos ? 110 : 190;
  ctx.fillStyle = ACENTO;
  ctx.font = `800 32px ${FUENTE}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(tituloMeses(d.meses), M, y);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 84px ${FUENTE}`;
  const [nombre] = lineas(ctx, d.nombre, ANCHO - M * 2, 1);
  y += 94;
  ctx.fillText(nombre, M, y);
  y += 52;
  ctx.fillStyle = "#8a949c";
  ctx.font = `500 32px ${FUENTE}`;
  ctx.fillText(`del ${fechaLarga(d.desde)} al ${fechaLarga(d.hasta)}`, M, y);
  y += 40;

  /* Antes y después */
  if (hayFotos) {
    const gap = 20;
    const w = (ANCHO - M * 2 - gap) / 2;
    const h = 470;
    [
      [antes!, d.fotoAntes!.fecha, 0],
      [ahora!, d.fotoAhora!.fecha, 1],
    ].forEach(([img, fecha, i]) => {
      const x = M + (i as number) * (w + gap);
      ctx.save();
      redondeado(ctx, x, y, w, h, 28);
      ctx.clip();
      dibujarCubriendo(ctx, img as HTMLImageElement, x, y, w, h);
      ctx.restore();
      ctx.font = `800 26px ${FUENTE}`;
      const etiqueta = mesCorto(fecha as string);
      const ancho = ctx.measureText(etiqueta).width + 28;
      redondeado(ctx, x + 16, y + h - 58, ancho, 42, 10);
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(etiqueta, x + 30, y + h - 27);
    });
    y += h + 30;
  } else {
    y += 20;
  }

  /* Cifras */
  const celdas: [string, string][] = [];
  if (d.pesoInicio !== null && d.pesoAhora !== null && d.pesoInicio !== d.pesoAhora) {
    const delta = d.pesoAhora - d.pesoInicio;
    celdas.push([`${signo(delta)}${coma(Math.abs(delta))} kg`, "de peso"]);
  }
  if (d.cinturaInicio !== null && d.cinturaAhora !== null && d.cinturaInicio !== d.cinturaAhora) {
    const delta = d.cinturaAhora - d.cinturaInicio;
    celdas.push([`${signo(delta)}${coma(Math.abs(delta))} cm`, "de cintura"]);
  }
  celdas.push([String(d.entrenos), d.entrenos === 1 ? "entreno" : "entrenos"]);
  const gapC = 18;
  const anchoC = (ANCHO - M * 2 - gapC * (celdas.length - 1)) / celdas.length;
  const altoC = hayFotos ? 150 : 240;
  celdas.forEach(([valor, etiqueta], i) => {
    const x = M + i * (anchoC + gapC);
    redondeado(ctx, x, y, anchoC, altoC, 26);
    ctx.fillStyle = "#111519";
    ctx.fill();
    ctx.strokeStyle = "#1e252b";
    ctx.lineWidth = 3;
    ctx.stroke();
    let tam = hayFotos ? 58 : 72;
    ctx.font = `800 ${tam}px ${FUENTE}`;
    while (ctx.measureText(valor).width > anchoC - 60 && tam > 34) {
      tam -= 2;
      ctx.font = `800 ${tam}px ${FUENTE}`;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillText(valor, x + 30, y + altoC / 2 + 8);
    ctx.fillStyle = "#8a949c";
    ctx.font = `500 28px ${FUENTE}`;
    ctx.fillText(etiqueta, x + 30, y + altoC / 2 + 50);
  });
  y += altoC + (hayFotos ? 28 : 50);

  /* Récords: de su primera marca a la de ahora */
  const maxRecords = hayFotos ? 2 : 3;
  const lista = d.records.slice(0, maxRecords);
  if (lista.length > 0) {
    const alto = 86 + lista.length * 56;
    redondeado(ctx, M, y, ANCHO - M * 2, alto, 26);
    ctx.fillStyle = "rgba(226,180,41,0.10)";
    ctx.fill();
    ctx.strokeStyle = "rgba(226,180,41,0.45)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = DORADO;
    ctx.font = `800 28px ${FUENTE}`;
    ctx.letterSpacing = "5px";
    ctx.fillText(
      `🏆  MÁS FUERTE EN ${d.totalRecords} ${d.totalRecords === 1 ? "EJERCICIO" : "EJERCICIOS"}`,
      M + 32,
      y + 56
    );
    ctx.letterSpacing = "0px";
    lista.forEach((r, i) => {
      const yl = y + 112 + i * 56;
      ctx.font = `800 34px ${FUENTE}`;
      const kg = `${coma(r.antes)} → ${coma(r.ahora)} kg`;
      const anchoKg = ctx.measureText(kg).width;
      ctx.fillStyle = DORADO;
      ctx.fillText(kg, ANCHO - M - 32 - anchoKg, yl);
      ctx.font = `600 34px ${FUENTE}`;
      ctx.fillStyle = "#ffffff";
      const [n] = lineas(ctx, r.nombre, ANCHO - M * 2 - 64 - anchoKg - 24, 1);
      ctx.fillText(n, M + 32, yl);
    });
  }

  /* Cierre, si queda sitio: el informe se manda para seguir, no para
   * despedirse */
  if (lista.length > 0) y += 86 + lista.length * 56;
  if (y < ALTO - 260) {
    const pila = d.nombre.split(" ")[0];
    ctx.fillStyle = "#b9c2c9";
    ctx.font = `600 40px ${FUENTE}`;
    const cierre = `Esto es solo el principio, ${pila} 💪`;
    const [linea] = lineas(ctx, cierre, ANCHO - M * 2, 1);
    ctx.fillText(linea, (ANCHO - ctx.measureText(linea).width) / 2, ALTO - 150);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 36px ${FUENTE}`;
  const cuenta = "@liviufitness";
  ctx.fillText(cuenta, (ANCHO - ctx.measureText(cuenta).width) / 2, ALTO - 56);

  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/png");
    } catch {
      resolve(null);
    }
  });
}
