"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { embedYoutube } from "@/lib/rutinas";
import { minutosLectura, type Guia } from "@/lib/guias";

/**
 * Una guía abierta, a pantalla casi completa. Si solo se tiene el id
 * (desde un mensaje del chat), se carga al abrir.
 */
export default function VisorGuia({
  id,
  guia: inicial,
  onCerrar,
}: {
  id: string;
  guia?: Guia;
  onCerrar: () => void;
}) {
  const [guia, setGuia] = useState<Guia | null>(inicial ?? null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (inicial) return;
    let vivo = true;
    crearClienteNavegador()
      .from("guias")
      .select("id, titulo, contenido, video_url, orden")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!vivo) return;
        if (data) setGuia(data as Guia);
        else setError(true);
      });
    return () => {
      vivo = false;
    };
  }, [id, inicial]);

  /* Fondo quieto mientras se lee */
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, []);

  const video = guia?.video_url ? embedYoutube(guia.video_url) : null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[560px] h-[92vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3 sticky top-0 bg-[#0E1215] pb-2 -mt-1 pt-1 z-10">
          <span className="text-acento text-[12px] font-bold tracking-[0.08em] uppercase flex items-center gap-1.5">
            <BookOpen size={14} /> Guía
          </span>
          <button className="ghost shrink-0" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        {!guia ? (
          <div className="text-atenuado text-[13.5px] text-center py-10">
            {error ? "Esta guía ya no está disponible." : "Cargando…"}
          </div>
        ) : (
          <article>
            <h1 className="h1 !mb-1 break-words">{guia.titulo}</h1>
            <div className="text-atenuado text-[12.5px] mb-4">
              {minutosLectura(guia.contenido)} min de lectura{video ? " · con vídeo" : ""}
            </div>
            {video && (
              <div className="rounded-[12px] overflow-hidden aspect-video border border-borde-2 mb-4">
                <iframe
                  src={`${video}?rel=0`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`Vídeo: ${guia.titulo}`}
                />
              </div>
            )}
            {guia.video_url && !video && (
              <a
                href={guia.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-acento text-[13.5px] underline underline-offset-2 block mb-4"
              >
                Abrir el vídeo
              </a>
            )}
            <div className="text-[15px] leading-relaxed text-texto-2 whitespace-pre-line break-words pb-8">
              {guia.contenido}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
