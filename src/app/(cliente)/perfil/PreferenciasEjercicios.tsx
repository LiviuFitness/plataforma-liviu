"use client";

import { useMemo, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import AvatarEjercicio from "@/componentes/AvatarEjercicio";
import { GRUPOS_MUSCULARES, type Ejercicio } from "@/lib/tipos";

/** Ejercicios que el cliente no puede o no quiere hacer (lesiones,
 * material que no tiene, gustos). El entrenador ve el aviso al
 * montar su rutina. Espejo de PreferenciasAlimentos. */
export default function PreferenciasEjercicios({
  clienteId,
  catalogo,
  excluidosIniciales,
}: {
  clienteId: string;
  catalogo: Ejercicio[];
  excluidosIniciales: string[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [excluidos, setExcluidos] = useState(new Set(excluidosIniciales));
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [error, setError] = useState("");

  const filtrados = useMemo(
    () =>
      catalogo.filter(
        (e) =>
          (filtro === "Todos" || e.grupo_muscular === filtro) &&
          e.nombre.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [catalogo, filtro, busqueda]
  );

  async function alternar(ejercicioId: string) {
    setError("");
    const supabase = crearClienteNavegador();
    const yaExcluido = excluidos.has(ejercicioId);

    // Optimista: refleja el cambio al instante
    setExcluidos((prev) => {
      const copia = new Set(prev);
      yaExcluido ? copia.delete(ejercicioId) : copia.add(ejercicioId);
      return copia;
    });

    const { error: e } = yaExcluido
      ? await supabase
          .from("ejercicios_excluidos")
          .delete()
          .eq("cliente_id", clienteId)
          .eq("ejercicio_id", ejercicioId)
      : await supabase
          .from("ejercicios_excluidos")
          .insert({ cliente_id: clienteId, ejercicio_id: ejercicioId });

    if (e) {
      // Revierte si falló
      setExcluidos((prev) => {
        const copia = new Set(prev);
        yaExcluido ? copia.add(ejercicioId) : copia.delete(ejercicioId);
        return copia;
      });
      setError("No se pudo guardar. Inténtalo de nuevo.");
    }
  }

  return (
    <>
      <section className="tarjeta">
        <div className="titulo-tarjeta">EJERCICIOS A EVITAR</div>
        <p className="text-texto-2 text-[13.5px] mb-3">
          Marca los ejercicios que no puedes o no quieres hacer (lesiones,
          material que no tienes…). Tu entrenador lo verá al montar tu rutina.
        </p>
        <button className="ghost w-full" onClick={() => setAbierto(true)}>
          {excluidos.size === 0
            ? "Gestionar ejercicios"
            : `${excluidos.size} ejercicio${excluidos.size === 1 ? "" : "s"} a evitar — gestionar`}
        </button>
      </section>

      {abierto && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center"
          onClick={() => setAbierto(false)}
        >
          <div
            className="w-full max-w-[480px] max-h-[82vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="titulo-tarjeta !m-0">EJERCICIOS A EVITAR</div>
              <button className="ghost" onClick={() => setAbierto(false)}>
                Cerrar
              </button>
            </div>

            <input
              className="input"
              placeholder="Buscar ejercicio…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoFocus
            />

            <div className="flex gap-1.5 overflow-x-auto scroll-sin-barra pb-2.5">
              {["Todos", ...GRUPOS_MUSCULARES].map((m) => (
                <button
                  key={m}
                  className={filtro === m ? "chip chip-activo" : "chip"}
                  onClick={() => setFiltro(m)}
                >
                  {m}
                </button>
              ))}
            </div>

            {error && <div className="text-peligro text-[13.5px] mb-2">— {error}</div>}

            <div className="overflow-y-auto flex-1">
              {filtrados.map((e) => {
                const marcado = excluidos.has(e.id);
                return (
                  <button
                    key={e.id}
                    className="flex items-center gap-2.5 w-full text-left border-b border-borde py-2.5 px-1 cursor-pointer"
                    onClick={() => alternar(e.id)}
                  >
                    <AvatarEjercicio videoUrl={e.video_url} tamano={34} />
                    <span className="flex-1 min-w-0">
                      <span
                        className={`block text-[14px] leading-tight ${
                          marcado ? "text-atenuado line-through" : ""
                        }`}
                      >
                        {e.nombre}
                      </span>
                      <span className="text-atenuado text-[12px]">{e.grupo_muscular}</span>
                    </span>
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-[13px] ${
                        marcado
                          ? "bg-peligro border-peligro text-white"
                          : "border-borde-2 text-transparent"
                      }`}
                    >
                      ✕
                    </span>
                  </button>
                );
              })}
              {filtrados.length === 0 && (
                <div className="text-atenuado text-[13.5px] p-3">Sin resultados.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
