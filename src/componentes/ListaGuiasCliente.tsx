"use client";

import { useState } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import VisorGuia from "@/componentes/VisorGuia";
import { minutosLectura, type Guia } from "@/lib/guias";

/** Las guías del entrenador, para leerlas cuando quiera el cliente. */
export default function ListaGuiasCliente({ guias }: { guias: Guia[] }) {
  const [abierta, setAbierta] = useState<Guia | null>(null);
  if (guias.length === 0) return null;
  return (
    <section className="tarjeta">
      <div className="titulo-tarjeta flex items-center gap-1.5">
        <BookOpen size={13} /> GUÍAS DE TU ENTRENADOR
      </div>
      {guias.map((g) => (
        <button
          key={g.id}
          className="w-full flex items-center gap-3 py-2.5 border-b border-borde last:border-0 text-left cursor-pointer anim-pulsable"
          onClick={() => setAbierta(g)}
        >
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-semibold leading-tight break-words">{g.titulo}</span>
            <span className="block text-atenuado text-[12px]">
              {minutosLectura(g.contenido)} min{g.video_url ? " · con vídeo" : ""}
            </span>
          </span>
          <ChevronRight size={16} className="text-atenuado shrink-0" />
        </button>
      ))}
      {abierta && <VisorGuia id={abierta.id} guia={abierta} onCerrar={() => setAbierta(null)} />}
    </section>
  );
}
