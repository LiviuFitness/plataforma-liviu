"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { IconoTarjeta } from "@/componentes/ui";
import VisorGuia from "@/componentes/VisorGuia";
import { minutosLectura, type Guia } from "@/lib/guias";

/** Ideas para empezar, si aún no hay ninguna */
const IDEAS = ["Cómo pesarte bien", "Comer fuera sin romper la dieta", "Qué es el RIR", "Cómo hacer las fotos de progreso"];

/**
 * Biblioteca › Guías: lo que explicas una y otra vez, escrito una vez.
 * Desde el chat de cualquier cliente se manda con el botón del libro.
 */
export default function GestionGuias({ guias }: { guias: Guia[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Guia | "nueva" | null>(null);
  const [viendo, setViendo] = useState<Guia | null>(null);
  const [tituloInicial, setTituloInicial] = useState("");

  async function borrar(g: Guia) {
    if (!confirm(`¿Borrar la guía «${g.titulo}»? Quien la tenga en el chat ya no podrá abrirla.`)) return;
    await crearClienteNavegador().from("guias").delete().eq("id", g.id);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="h1 !mb-0">Guías</h1>
          <div className="sub mb-4">lo que explicas siempre, escrito una vez —</div>
        </div>
        <button
          className="cta cta-mini shrink-0 flex items-center gap-1"
          onClick={() => {
            setTituloInicial("");
            setEditando("nueva");
          }}
        >
          <Plus size={15} /> Nueva
        </button>
      </div>

      {guias.length === 0 ? (
        <section className="tarjeta">
          <div className="text-texto-2 text-[13.5px] mb-3 leading-relaxed">
            Escribe aquí las explicaciones que repites a cada cliente. Luego las mandas desde su chat con
            un toque y las lee cuando quiera. Para empezar:
          </div>
          <div className="flex flex-wrap gap-2">
            {IDEAS.map((t) => (
              <button
                key={t}
                className="chip"
                onClick={() => {
                  setTituloInicial(t);
                  setEditando("nueva");
                }}
              >
                + {t}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="superficie px-4 mb-4">
          {guias.map((g) => (
            <div key={g.id} className="fila">
              <IconoTarjeta Icono={BookOpen} color="var(--color-acento)" tamano={34} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14.5px] leading-tight break-words">{g.titulo}</div>
                <div className="text-atenuado text-[12px]">
                  {minutosLectura(g.contenido)} min{g.video_url ? " · con vídeo" : ""}
                </div>
              </div>
              <button className="mini shrink-0" onClick={() => setViendo(g)} aria-label={`Ver ${g.titulo}`}>
                <Eye size={14} />
              </button>
              <button className="mini shrink-0" onClick={() => setEditando(g)} aria-label={`Editar ${g.titulo}`}>
                <Pencil size={14} />
              </button>
              <button className="mini mini-peligro shrink-0" onClick={() => borrar(g)} aria-label={`Borrar ${g.titulo}`}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-atenuado text-[12.5px] leading-relaxed">
        Tus clientes las encuentran también en su Perfil, en «Guías de tu entrenador».
      </p>

      {editando && (
        <EditorGuia
          guia={editando === "nueva" ? null : editando}
          tituloInicial={tituloInicial}
          orden={guias.length}
          onHecho={() => {
            setEditando(null);
            router.refresh();
          }}
          onCerrar={() => setEditando(null)}
        />
      )}
      {viendo && <VisorGuia id={viendo.id} guia={viendo} onCerrar={() => setViendo(null)} />}
    </>
  );
}

function EditorGuia({
  guia,
  tituloInicial,
  orden,
  onHecho,
  onCerrar,
}: {
  guia: Guia | null;
  tituloInicial: string;
  orden: number;
  onHecho: () => void;
  onCerrar: () => void;
}) {
  const [titulo, setTitulo] = useState(guia?.titulo ?? tituloInicial);
  const [contenido, setContenido] = useState(guia?.contenido ?? "");
  const [video, setVideo] = useState(guia?.video_url ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    if (!titulo.trim()) {
      setError("Ponle un título.");
      return;
    }
    if (video.trim() && !/^https?:\/\//i.test(video.trim())) {
      setError("El enlace del vídeo tiene que empezar por https://");
      return;
    }
    setGuardando(true);
    setError("");
    const datos = {
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      video_url: video.trim() || null,
      actualizada_en: new Date().toISOString(),
    };
    const supabase = crearClienteNavegador();
    const { error } = guia
      ? await supabase.from("guias").update(datos).eq("id", guia.id)
      : await supabase.from("guias").insert({ ...datos, orden });
    setGuardando(false);
    if (error) {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      return;
    }
    onHecho();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[560px] max-h-[92vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="titulo-seccion !mb-0">{guia ? "Editar guía" : "Nueva guía"}</div>
          <button className="ghost shrink-0" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        <input className="input" placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <textarea
          className="w-full bg-campo border border-borde-2 focus:border-acento outline-none rounded-[10px] text-white p-3 text-[14.5px] leading-relaxed resize-y font-cuerpo mb-3"
          rows={12}
          placeholder={"Escríbelo como se lo contarías.\n\nLos saltos de línea se respetan tal cual."}
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
        />
        <input
          className="input"
          inputMode="url"
          autoCapitalize="none"
          placeholder="Vídeo de YouTube (opcional)"
          value={video}
          onChange={(e) => setVideo(e.target.value)}
        />
        {error && <div className="text-peligro text-[13px] mb-2">— {error}</div>}
        <button className="cta !mb-0" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar guía"}
        </button>
      </div>
    </div>
  );
}
