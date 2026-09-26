import { ACENTO, CIFRAS, DORADO, FUENTE, cargarImagen, lineas, redondeado } from "@/lib/tarjetaEntreno";
import type { ResumenMes } from "@/lib/resumenMes";

/**
 * La imagen para compartir del resumen del mes (historia de Instagram,
 * 1080×1920), mismo estilo que la tarjeta de entreno. Las zonas que
 * tapa Instagram arriba y abajo quedan libres.
 */
const ANCHO = 1080;
const ALTO = 1920;
const M = 90;
const coma = (n: number) => String(n).replace(".", ",");

export async function generarTarjetaMes(r: ResumenMes): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    await Promise.all([
      document.fonts.load(`800 40px ${FUENTE}`),
      document.fonts.load(`700 120px ${CIFRAS}`),
      document.fonts.load(`italic 800 120px ${CIFRAS}`),
    ]);
  } catch {
    /* con la fuente del sistema también sale */
  }
  const logo = await cargarImagen("/logo-livfit.png");

  ctx.fillStyle = "#0a0c0e";
  ctx.fillRect(0, 0, ANCHO, ALTO);
  const brillo = ctx.createRadialGradient(ANCHO / 2, -150, 50, ANCHO / 2, -150, 1300);
  brillo.addColorStop(0, "rgba(226,180,41,0.30)");
  brillo.addColorStop(1, "rgba(226,180,41,0)");
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.textBaseline = "alphabetic";

  let y = 230;
  if (logo) {
    const alto = 90;
    ctx.drawImage(logo, M, y, (logo.width / logo.height) * alto, alto);
  }
  y += 200;
  ctx.fillStyle = DORADO;
  ctx.font = `800 36px ${FUENTE}`;
  ctx.letterSpacing = "6px";
  ctx.fillText(`MI ${r.mes.toUpperCase()} EN LIVFIT`, M, y);
  ctx.letterSpacing = "0px";

  y += 150;
  ctx.fillStyle = "#ffffff";
  ctx.font = `italic 800 170px ${CIFRAS}`;
  ctx.fillText(String(r.entrenos), M, y);
  const anchoN = ctx.measureText(String(r.entrenos)).width;
  ctx.font = `600 52px ${FUENTE}`;
  ctx.fillStyle = "#b9c2c9";
  ctx.fillText(r.entrenos === 1 ? "entreno" : "entrenos", M + anchoN + 24, y);
  y += 60;

  const celdas: [string, string][] = [
    [`${coma(r.toneladas)} t`, "levantadas"],
    [`${coma(r.horas)} h`, "entrenando"],
    [String(r.totalRecords), r.totalRecords === 1 ? "récord" : "récords"],
    [r.semanasTotales > 0 ? `${r.semanasCumplidas}/${r.semanasTotales}` : "—", "semanas cumplidas"],
  ];
  const gap = 24;
  const anchoC = (ANCHO - M * 2 - gap) / 2;
  const altoC = 190;
  celdas.forEach(([v, e], i) => {
    const x = M + (i % 2) * (anchoC + gap);
    const yc = y + Math.floor(i / 2) * (altoC + gap);
    redondeado(ctx, x, yc, anchoC, altoC, 32);
    ctx.fillStyle = "#111519";
    ctx.fill();
    ctx.strokeStyle = "#1e252b";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 92px ${CIFRAS}`;
    ctx.fillText(v, x + 40, yc + 105);
    ctx.fillStyle = "#8a949c";
    ctx.font = `500 34px ${FUENTE}`;
    ctx.fillText(e, x + 40, yc + 155);
  });
  y += altoC * 2 + gap + 50;

  if (r.estrella) {
    redondeado(ctx, M, y, ANCHO - M * 2, 180, 32);
    ctx.fillStyle = "rgba(226,180,41,0.10)";
    ctx.fill();
    ctx.strokeStyle = "rgba(226,180,41,0.45)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = DORADO;
    ctx.font = `800 30px ${FUENTE}`;
    ctx.letterSpacing = "5px";
    ctx.fillText("EJERCICIO ESTRELLA", M + 40, y + 60);
    ctx.letterSpacing = "0px";
    ctx.font = `italic 800 60px ${CIFRAS}`;
    const subida = `+${coma(Math.round((r.estrella.hasta - r.estrella.desde) * 10) / 10)} kg`;
    const anchoS = ctx.measureText(subida).width;
    ctx.fillText(subida, ANCHO - M - 40 - anchoS, y + 130);
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 40px ${FUENTE}`;
    const [n] = lineas(ctx, r.estrella.nombre, ANCHO - M * 2 - 120 - anchoS, 1);
    ctx.fillText(n, M + 40, y + 128);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 44px ${FUENTE}`;
  const cuenta = "@liviufitness";
  ctx.fillText(cuenta, (ANCHO - ctx.measureText(cuenta).width) / 2, ALTO - 360);
  ctx.fillStyle = "#8a949c";
  ctx.font = `500 32px ${FUENTE}`;
  const web = "Entrenado con LivFit · app.livfit.es";
  ctx.fillText(web, (ANCHO - ctx.measureText(web).width) / 2, ALTO - 308);
  ctx.fillStyle = ACENTO;

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
