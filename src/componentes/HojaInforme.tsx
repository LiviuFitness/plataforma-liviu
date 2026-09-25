"use client";

import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { cargarInforme } from "@/lib/informeProgreso";
import { generarTarjetaInforme } from "@/lib/tarjetaInforme";

/**
 * Informe de progreso de un cliente, listo para mandárselo: se cargan
 * sus datos, se dibuja la imagen y se comparte con la hoja nativa
 * (WhatsApp, por ejemplo). Todo al abrir, para que "Enviar" abra la hoja
 * de compartir al momento (Safari solo lo permite justo tras un toque).
 */
export default function HojaInforme({
  clienteId,
  nombre,
  onCerrar,
}: {
  clienteId: string;
  nombre: string;
  onCerrar: () => void;
}) {
  const pila = nombre.split(" ")[0];
  const [archivo, setArchivo] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    let creada: string | null = null;
    (async () => {
      const datos = await cargarInforme(crearClienteNavegador(), clienteId);
      if (!vivo) return;
      if (!datos) {
        setError("No se pudieron cargar sus datos.");
        return;
      }
      const blob = await generarTarjetaInforme(datos);
      if (!vivo) return;
      if (!blob) {
        setError("No se pudo crear la imagen en este móvil.");
        return;
      }
      creada = URL.createObjectURL(blob);
      setArchivo(new File([blob], `progreso-${pila.toLowerCase()}.png`, { type: "image/png" }));
      setUrl(creada);
    })();
    return () => {
      vivo = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [clienteId, pila]);

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
      if ((e as Error).name !== "AbortError") setError("No se pudo compartir. Prueba a guardarla.");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[480px] max-h-[92vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="titulo-seccion !mb-0 break-words min-w-0">Informe de {pila}</div>
          <button className="ghost shrink-0" onClick={onCerrar}>
            Cerrar
          </button>
        </div>

        <div className="mx-auto w-[78%] max-w-[330px] aspect-[4/5] rounded-[14px] overflow-hidden border border-borde bg-[#0a0c0e] mb-4">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob local
            <img src={url} alt={`Informe de progreso de ${pila}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-atenuado text-[12.5px] px-4 text-center">
              {error ? "—" : "Sumando sus meses contigo…"}
            </div>
          )}
        </div>

        {error && <div className="text-peligro text-[13px] mb-3 text-center">— {error}</div>}

        {puedeCompartir ? (
          <button className="cta !mb-0 flex items-center justify-center gap-2" onClick={compartir}>
            <Share2 size={16} /> Enviar a {pila}
          </button>
        ) : (
          url && (
            <a className="cta !mb-0 flex items-center justify-center gap-2" href={url} download={archivo?.name}>
              <Download size={16} /> Guardar imagen
            </a>
          )
        )}
        <div className="text-atenuado text-[12px] text-center mt-2 leading-snug">
          Las fotos salen solo si tiene al menos dos de frente. Nadie más lo ve hasta que lo mandas.
        </div>
      </div>
    </div>
  );
}
