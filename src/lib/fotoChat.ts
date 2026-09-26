/**
 * Fotos del chat: se reducen en el propio móvil antes de subir (una foto
 * del iPhone pesa 3-5 MB; a 1280 px y JPEG al 80 % se queda en unos
 * 200 KB y se ve igual en la pantalla del chat).
 */

const LADO_MAX = 1280;

export async function reducirFoto(archivo: File): Promise<Blob> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = mal;
      i.src = url;
    });
    const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.8));
    return blob ?? archivo;
  } catch {
    /* Formato que el navegador no sabe dibujar: se sube tal cual */
    return archivo;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Texto para avisos y vistas previas de un mensaje que puede ser solo foto. */
export function resumenMensaje(texto: string, imagen: string | null | undefined): string {
  if (texto.trim()) return texto;
  return imagen ? "📷 Foto" : "";
}
