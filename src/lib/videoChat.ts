/**
 * Vídeos del chat (técnica de un ejercicio, o lo que se quiera mandar).
 *
 * Un vídeo del iPhone de 20 s pesa 40-60 MB. Si pasa de LIGERO se
 * vuelve a grabar en el propio móvil a 720 px y ~2 Mbps (sin sonido:
 * para ver la técnica no hace falta), y se queda en 4-6 MB. Se hace
 * reproduciéndolo en un canvas y grabando el canvas, así que tarda lo
 * que dura el vídeo. Si el navegador no sabe hacerlo y el original cabe,
 * se sube tal cual.
 */

const LIGERO = 15 * 1024 * 1024;
const MAXIMO = 48 * 1024 * 1024; // el límite de Supabase por archivo es 50 MB
export const DURACION_MAX = 60;
const LADO_MAX = 720;

const EXTENSIONES = /\.(mp4|mov|m4v|webm|3gp)$/i;

export const esVideo = (ruta: string | null | undefined) =>
  !!ruta && (EXTENSIONES.test(ruta.split("?")[0]));

/** Marca de los vídeos de técnica (al principio del texto). */
export const MARCA_TECNICA = "🎥 Técnica · ";

export function leerTecnica(texto: string): { titulo: string; nota: string } | null {
  if (!texto.startsWith(MARCA_TECNICA)) return null;
  const [primera, ...resto] = texto.slice(MARCA_TECNICA.length).split("\n");
  return { titulo: primera.trim(), nota: resto.join("\n").trim() };
}

export function extensionDe(tipo: string, nombre = "") {
  if (/webm/.test(tipo)) return "webm";
  if (/quicktime/.test(tipo)) return "mov";
  const deNombre = nombre.match(EXTENSIONES)?.[1];
  return deNombre ? deNombre.toLowerCase() : "mp4";
}

export async function duracionDe(archivo: Blob): Promise<number> {
  const url = URL.createObjectURL(archivo);
  try {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.src = url;
    await new Promise<void>((ok, mal) => {
      v.onloadedmetadata = () => ok();
      v.onerror = () => mal(new Error("formato"));
    });
    return Number.isFinite(v.duration) ? v.duration : 0;
  } catch {
    return 0;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function tipoGrabacion(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

async function reducir(archivo: File, onProgreso: (p: number) => void): Promise<Blob> {
  const tipo = tipoGrabacion();
  if (!tipo) throw new Error("sin-grabador");
  const url = URL.createObjectURL(archivo);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.src = url;
  const reanudar = () => {
    if (document.visibilityState === "visible" && v.paused && !v.ended) v.play().catch(() => {});
  };
  try {
    await new Promise<void>((ok, mal) => {
      v.onloadeddata = () => ok();
      v.onerror = () => mal(new Error("formato"));
    });
    const escala = Math.min(1, LADO_MAX / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((v.videoWidth * escala) / 2) * 2;
    canvas.height = Math.round((v.videoHeight * escala) / 2) * 2;
    const ctx = canvas.getContext("2d")!;
    const grabador = new MediaRecorder(canvas.captureStream(30), { mimeType: tipo, videoBitsPerSecond: 2_000_000 });
    const trozos: Blob[] = [];
    grabador.ondataavailable = (e) => e.data.size > 0 && trozos.push(e.data);
    const fin = new Promise<void>((ok) => (grabador.onstop = () => ok()));

    /* Con temporizador y no requestAnimationFrame: ese se para en
     * cuanto la pantalla deja de repintarse y el vídeo saldría vacío */
    const pintar = () => {
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      if (v.duration) onProgreso(Math.min(1, v.currentTime / v.duration));
    };
    /* Si se bloquea el móvil o se cambia de app, el navegador pausa el
     * vídeo: se pausa también la grabación y se sigue al volver */
    v.onpause = () => grabador.state === "recording" && grabador.pause();
    v.onplay = () => grabador.state === "paused" && grabador.resume();
    document.addEventListener("visibilitychange", reanudar);
    pintar();
    grabador.start(1000);
    await v.play();
    const reloj = setInterval(pintar, 1000 / 30);
    await new Promise<void>((ok) => (v.onended = () => ok()));
    clearInterval(reloj);
    if (grabador.state === "paused") grabador.resume();
    grabador.stop();
    await fin;
    onProgreso(1);
    const blob = new Blob(trozos, { type: tipo.split(";")[0] });
    if (blob.size < 50 * 1024) throw new Error("vacio");
    return blob;
  } finally {
    document.removeEventListener("visibilitychange", reanudar);
    v.pause();
    URL.revokeObjectURL(url);
  }
}

/**
 * Deja el vídeo listo para subir. Lanza un Error con un mensaje para
 * enseñar tal cual si es demasiado largo o pesado.
 */
export async function prepararVideo(archivo: File, onProgreso: (p: number) => void = () => {}): Promise<Blob> {
  const dur = await duracionDe(archivo);
  if (dur > DURACION_MAX + 1) {
    throw new Error(`Es muy largo (${Math.round(dur)} s). Con 20-30 segundos basta: recórtalo o grábalo otra vez.`);
  }
  if (archivo.size <= LIGERO) return archivo;
  try {
    return await reducir(archivo, onProgreso);
  } catch {
    if (archivo.size <= MAXIMO) return archivo;
    throw new Error("El vídeo pesa demasiado. Grábalo más corto (20-30 segundos) y vuelve a probar.");
  }
}
