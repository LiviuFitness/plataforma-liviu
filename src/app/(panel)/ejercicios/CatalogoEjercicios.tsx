"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Pencil } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import AvatarEjercicio from "@/componentes/AvatarEjercicio";
import { esGif, miniaturaYoutube } from "@/lib/rutinas";
import type { Ejercicio } from "@/lib/tipos";

type Filtro = "sin" | "todos";

/**
 * Catálogo de ejercicios: el mismo patrón que Alimentos. Se abre en
 * "Sin vídeo", que es la lista de trabajo: cada uno que se completa
 * desaparece de ahí y el contador baja.
 */
export default function CatalogoEjercicios({ ejercicios: iniciales }: { ejercicios: Ejercicio[] }) {
  const [ejercicios, setEjercicios] = useState(iniciales);
  const [filtro, setFiltro] = useState<Filtro>(() =>
    iniciales.some((e) => !e.video_url) ? "sin" : "todos"
  );
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<Ejercicio | null>(null);

  const sinVideo = ejercicios.filter((e) => !e.video_url).length;

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return ejercicios.filter(
      (e) =>
        (filtro === "todos" || !e.video_url) &&
        (!q || e.nombre.toLowerCase().includes(q) || e.grupo_muscular.toLowerCase().includes(q))
    );
  }, [ejercicios, filtro, busqueda]);

  return (
    <>
      <h1 className="h1 !mb-0">Ejercicios</h1>
      <div className="sub mb-4">
        {sinVideo === 0
          ? `los ${ejercicios.length} tienen vídeo —`
          : `${sinVideo} de ${ejercicios.length} sin vídeo —`}
      </div>

      <div className="flex gap-2 mb-3">
        <button className={`tab ${filtro === "sin" ? "tab-activa" : ""}`} onClick={() => setFiltro("sin")}>
          Sin vídeo · {sinVideo}
        </button>
        <button className={`tab ${filtro === "todos" ? "tab-activa" : ""}`} onClick={() => setFiltro("todos")}>
          Todos · {ejercicios.length}
        </button>
      </div>

      <input
        className="input"
        placeholder="Buscar por nombre o músculo…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {filtrados.map((e) => (
        <button
          key={e.id}
          className="fila w-full text-left cursor-pointer"
          onClick={() => setEditando(e)}
          aria-label={`Editar ${e.nombre}`}
        >
          <AvatarEjercicio videoUrl={e.video_url} tamano={38} />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14.5px] leading-tight break-words">{e.nombre}</div>
            <div className="text-atenuado text-[12px] break-words">
              {e.grupo_muscular}
              {e.material ? ` · ${e.material}` : ""}
              {!e.instrucciones && " · sin técnica"}
            </div>
          </div>
          <Pencil size={14} className="text-atenuado shrink-0" />
        </button>
      ))}
      {filtrados.length === 0 && (
        <div className="text-atenuado text-[13.5px] p-3 text-center">
          {filtro === "sin" && !busqueda ? "Todos tienen vídeo. 🎉" : "Sin resultados."}
        </div>
      )}

      {editando && (
        <HojaEjercicio
          ejercicio={editando}
          onGuardado={(cambios) => {
            setEjercicios((lista) => lista.map((x) => (x.id === editando.id ? { ...x, ...cambios } : x)));
            setEditando(null);
          }}
          onCerrar={() => setEditando(null)}
        />
      )}
    </>
  );
}

/* ============================================================
   Hoja inferior: vídeo y técnica de un ejercicio
   ============================================================ */
function HojaEjercicio({
  ejercicio,
  onGuardado,
  onCerrar,
}: {
  ejercicio: Ejercicio;
  onGuardado: (cambios: Pick<Ejercicio, "video_url" | "instrucciones">) => void;
  onCerrar: () => void;
}) {
  const [video, setVideo] = useState(ejercicio.video_url ?? "");
  const [tecnica, setTecnica] = useState(ejercicio.instrucciones ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const limpio = video.trim();
  const valido = limpio === "" || /^https?:\/\/\S+$/i.test(limpio);
  /* Lo que verá el cliente: solo se reconocen GIF y YouTube */
  const reconocido = limpio !== "" && (esGif(limpio) || miniaturaYoutube(limpio) !== null);
  const busquedaYoutube = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${ejercicio.nombre} técnica`
  )}`;

  async function guardar() {
    if (!valido) {
      setError("El enlace tiene que empezar por https://");
      return;
    }
    setGuardando(true);
    setError("");
    const cambios = { video_url: limpio || null, instrucciones: tecnica.trim() || null };
    const supabase = crearClienteNavegador();
    const { error } = await supabase.from("ejercicios").update(cambios).eq("id", ejercicio.id);
    setGuardando(false);
    if (error) {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      return;
    }
    onGuardado(cambios);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center anim-fondo-aparece"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[480px] max-h-[86vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="min-w-0">
            <div className="titulo-seccion !mb-0 break-words">{ejercicio.nombre}</div>
            <div className="text-atenuado text-[12px]">{ejercicio.grupo_muscular}</div>
          </div>
          <button className="ghost shrink-0" onClick={onCerrar}>
            Cerrar
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <AvatarEjercicio videoUrl={valido && reconocido ? limpio : null} tamano={56} />
          <div className="text-[12.5px] leading-snug min-w-0">
            {limpio === "" ? (
              <span className="text-atenuado">Sin vídeo: el cliente ve el icono genérico.</span>
            ) : !valido ? (
              <span className="text-peligro">Eso no parece un enlace.</span>
            ) : reconocido ? (
              <span className="text-acento">Así lo verá el cliente en su rutina.</span>
            ) : (
              <span className="text-aviso">
                Enlace guardable, pero sin miniatura: solo se reconocen YouTube y GIF.
              </span>
            )}
          </div>
        </div>

        <label className="titulo-tarjeta" htmlFor="video-ej">
          VÍDEO DE YOUTUBE O GIF
        </label>
        <input
          id="video-ej"
          className="input"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Pega aquí el enlace"
          value={video}
          onChange={(e) => setVideo(e.target.value)}
        />
        <a
          href={busquedaYoutube}
          target="_blank"
          rel="noopener noreferrer"
          className="text-acento text-[13px] inline-flex items-center gap-1 mb-4 -mt-1"
        >
          <ExternalLink size={13} /> Buscarlo en YouTube
        </a>

        <label className="titulo-tarjeta" htmlFor="tecnica-ej">
          TÉCNICA (OPCIONAL)
        </label>
        <textarea
          id="tecnica-ej"
          className="w-full bg-campo border border-borde-2 rounded-[10px] text-white p-2.5 px-3 text-[14px] resize-y font-cuerpo mb-4"
          rows={3}
          placeholder="Claves que verá el cliente al abrir el ejercicio…"
          value={tecnica}
          onChange={(e) => setTecnica(e.target.value)}
        />

        {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}
        <button className="cta !mb-0" onClick={guardar} disabled={guardando || !valido}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
