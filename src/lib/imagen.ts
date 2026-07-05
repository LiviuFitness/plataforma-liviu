/** Redimensiona una imagen en el navegador antes de subirla (las fotos de
 * móvil pesan varios MB y no hace falta guardarlas a tamaño completo). */
export function redimensionarImagen(
  archivo: File,
  tamanoMax: number,
  calidad = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const escala = Math.min(1, tamanoMax / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala);
      const h = Math.round(img.height * escala);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("blob"))),
        "image/jpeg",
        calidad
      );
    };
    img.onerror = () => reject(new Error("imagen invalida"));
    img.src = url;
  });
}
