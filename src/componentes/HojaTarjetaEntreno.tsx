"use client";

import { useEffect, useState } from "react";
import { Download, Share2, AlertCircle } from "lucide-react";
import { generarTarjetaEntreno, type DatosTarjeta } from "@/lib/tarjetaEntreno";

/**
 * Hoja para compartir el entreno en historias: enseña la tarjeta ya
 * dibujada y la comparte con la hoja nativa del móvil (Instagram,
 * WhatsApp, Guardar en Fotos…).
 *
 * La imagen se genera al abrir la hoja y no al pulsar "Compartir": el
 * iPhone solo deja abrir la hoja de compartir justo tras un toque, y si
 * antes hay que esperar a dibujar el canvas, Safari lo bloquea.
 */
export default function HojaTarjetaEntreno({
  datos,
  onCerrar,
}: {
  datos: DatosTarjeta;
  onCerrar: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    let creada: string | null = null;
    generarTarjetaEntreno(datos).then((blob) => {
      if (!vivo) return;
      if (!blob) {
        setError("No se pudo crear la imagen en este móvil.");
        return;
      }
      creada = URL.createObjectURL(blob);
      setArchivo(new File([blob], "entreno-livfit.png", { type: "image/png" }));
      setUrl(creada);
    });
    return () => {
      vivo = false;
      if (creada) URL.revokeObjectURL(creada);
    };
    // Se dibuja una vez al abrir: la foto es del momento en que se pide
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const puedeCompartir =
    archivo !== null &&
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [archivo] });

  async function compartir() {
    if (!archivo) return;
    try {
      await navigator.share({ files: [archivo] });
    } catch (e) {
      /* Cerrar la hoja nativa sin elegir nada también "falla": no es error */
      if ((e as Error).name !== "AbortError") setError("No se pudo compartir. Prueba a guardarla.");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[480px] max-h-[92vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="titulo-seccion !mb-0">Compártelo en tu historia</div>
          <button className="ghost shrink-0" onClick={onCerrar}>
            Cerrar
          </button>
        </div>

        {/* Vista previa en proporción de historia (9:16) */}
        <div className="mx-auto w-[58%] max-w-[240px] aspect-[9/16] rounded-[14px] overflow-hidden border border-borde bg-[#0a0c0e] mb-4">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob local, no pasa por el optimizador
            <img src={url} alt="Tarjeta de tu entreno" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-atenuado text-[12.5px]">
              {error ? "" : "Creando tu tarjeta…"}
            </div>
          )}
        </div>

        {error && <div className="text-peligro text-[13px] mb-3 text-center flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}

        {puedeCompartir ? (
          <button className="cta anim-pulsable flex items-center justify-center gap-2" onClick={compartir}>
            <Share2 size={16} /> Compartir
          </button>
        ) : (
          url && (
            <a
              className="cta anim-pulsable flex items-center justify-center gap-2"
              href={url}
              download="entreno-livfit.png"
            >
              <Download size={16} /> Guardar imagen
            </a>
          )
        )}
        <div className="text-atenuado text-[12px] text-center mt-1">
          {puedeCompartir
            ? "Elige Instagram → Historia, o guárdala en Fotos."
            : "Guárdala y súbela a tu historia desde Instagram."}
        </div>
      </div>
    </div>
  );
}
