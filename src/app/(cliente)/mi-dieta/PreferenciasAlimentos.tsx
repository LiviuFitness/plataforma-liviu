"use client";

import { useMemo, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { CATEGORIAS_ALIMENTO, type Alimento } from "@/lib/dietas";

/** Alimentos que el cliente no quiere ver en su dieta (alergias, gustos).
 * Sirve de base para que el entrenador (o, más adelante, un generador
 * automático) evite proponerlos. */
export default function PreferenciasAlimentos({
  clienteId,
  catalogo,
  excluidosIniciales,
}: {
  clienteId: string;
  catalogo: Alimento[];
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
        (a) =>
          (filtro === "Todos" || a.categoria === filtro) &&
          a.nombre.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [catalogo, filtro, busqueda]
  );

  async function alternar(alimentoId: string) {
    setError("");
    const supabase = crearClienteNavegador();
    const yaExcluido = excluidos.has(alimentoId);

    // Optimista: refleja el cambio al instante
    setExcluidos((prev) => {
      const copia = new Set(prev);
      yaExcluido ? copia.delete(alimentoId) : copia.add(alimentoId);
      return copia;
    });

    const { error: e } = yaExcluido
      ? await supabase
          .from("alimentos_excluidos")
          .delete()
          .eq("cliente_id", clienteId)
          .eq("alimento_id", alimentoId)
      : await supabase
          .from("alimentos_excluidos")
          .insert({ cliente_id: clienteId, alimento_id: alimentoId });

    if (e) {
      // Revierte si falló
      setExcluidos((prev) => {
        const copia = new Set(prev);
        yaExcluido ? copia.add(alimentoId) : copia.delete(alimentoId);
        return copia;
      });
      setError("No se pudo guardar. Inténtalo de nuevo.");
    }
  }

  return (
    <>
      <section className="tarjeta">
        <div className="titulo-tarjeta">ALIMENTOS QUE NO TE GUSTAN</div>
        <p className="text-texto-2 text-[13.5px] mb-3">
          Marca lo que no quieres que aparezca en tu dieta (alergias, cosas
          que no te gustan). Tu entrenador lo tendrá en cuenta.
        </p>
        <button className="ghost w-full" onClick={() => setAbierto(true)}>
          {excluidos.size === 0
            ? "Gestionar alimentos"
            : `${excluidos.size} alimento${excluidos.size === 1 ? "" : "s"} excluido${excluidos.size === 1 ? "" : "s"} — gestionar`}
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
              <div className="titulo-tarjeta !m-0">ALIMENTOS QUE NO TE GUSTAN</div>
              <button className="ghost" onClick={() => setAbierto(false)}>
                Cerrar
              </button>
            </div>

            <input
              className="input"
              placeholder="Buscar alimento…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoFocus
            />

            <div className="flex gap-1.5 overflow-x-auto scroll-sin-barra pb-2.5">
              {["Todos", ...CATEGORIAS_ALIMENTO.map((c) => c.valor)].map((c) => {
                const etiqueta =
                  c === "Todos" ? "Todos" : CATEGORIAS_ALIMENTO.find((x) => x.valor === c)!.etiqueta;
                return (
                  <button
                    key={c}
                    className={filtro === c ? "chip chip-activo" : "chip"}
                    onClick={() => setFiltro(c)}
                  >
                    {etiqueta}
                  </button>
                );
              })}
            </div>

            {error && <div className="text-peligro text-[13.5px] mb-2">— {error}</div>}

            <div className="overflow-y-auto flex-1">
              {filtrados.map((a) => {
                const marcado = excluidos.has(a.id);
                return (
                  <button
                    key={a.id}
                    className="flex justify-between items-center gap-2.5 w-full text-left border-b border-borde py-3 px-1 cursor-pointer"
                    onClick={() => alternar(a.id)}
                  >
                    <span className={`text-[14.5px] ${marcado ? "text-atenuado line-through" : ""}`}>
                      {a.nombre}
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
