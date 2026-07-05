"use client";

import { fechaCorta } from "@/componentes/ui";
import type { EntradaFotosProgreso } from "@/lib/tipos";

/** Galería de fotos de progreso agrupadas por fecha. Si se pasa
 * onBorrar, cada entrada muestra un botón para eliminarla. */
export default function GaleriaFotosProgreso({
  entradas,
  onBorrar,
}: {
  entradas: EntradaFotosProgreso[];
  onBorrar?: (entrada: EntradaFotosProgreso) => void;
}) {
  if (entradas.length === 0) {
    return (
      <div className="text-atenuado text-[13.5px]">
        Sin fotos de progreso todavía.
      </div>
    );
  }

  return (
    <div>
      {entradas.map((en) => (
        <div
          key={en.id}
          className="border-t border-borde pt-2.5 mt-2.5 first:border-0 first:pt-0 first:mt-0"
        >
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-atenuado text-[12.5px]">
              {fechaCorta(en.fecha)}
            </span>
            {onBorrar && (
              <button
                className="mini mini-peligro"
                onClick={() => onBorrar(en)}
                aria-label="Borrar fotos"
              >
                ✕
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[en.frontal, en.lateral, en.espalda].map((foto, i) =>
              foto ? (
                <a
                  key={i}
                  href={foto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-[3/4] rounded-[10px] overflow-hidden bg-campo block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.url} alt="" className="w-full h-full object-cover" />
                </a>
              ) : (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-[10px] bg-campo border border-borde-2"
                />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
