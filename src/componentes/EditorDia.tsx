"use client";

import { useMemo, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import AvatarEjercicio from "@/componentes/AvatarEjercicio";
import { agruparPorSuperserie, limpiarGruposSolitarios } from "@/lib/rutinas";
import {
  GRUPOS_MUSCULARES,
  INFO_TIPO_SERIE,
  ORDEN_TIPOS,
  type DiaUI,
  type Ejercicio,
  type EjercicioUI,
  type SerieUI,
} from "@/lib/tipos";

const SERIE_NUEVA: SerieUI = { tipo: "efectiva", kg: "", reps: "10", rir: "2" };

interface EjercicioConIndice extends EjercicioUI {
  indiceGlobal: number;
}

/**
 * Editor de día estilo Hevy (prototipo v2):
 * series individuales con tipo/kg/reps/RIR, descanso por ejercicio,
 * superseries/circuitos (ejercicios sin descanso entre ellos),
 * biblioteca con buscador y filtro por músculo, reordenar ejercicios.
 */
export default function EditorDia({
  dia,
  biblioteca,
  guardando,
  error,
  onGuardar,
  onVolver,
  onEliminar,
}: {
  dia: DiaUI;
  biblioteca: Ejercicio[];
  guardando: boolean;
  error: string;
  onGuardar: (dia: DiaUI) => Promise<boolean>;
  onVolver: () => void;
  onEliminar: () => void;
}) {
  const [borrador, setBorrador] = useState<DiaUI>(() =>
    JSON.parse(JSON.stringify(dia))
  );
  const [sucio, setSucio] = useState(false);
  const [mostrarBiblioteca, setMostrarBiblioteca] = useState(false);

  function cambiar(nuevo: DiaUI) {
    setBorrador(nuevo);
    setSucio(true);
  }

  /* --- Ediciones locales --- */
  const parchearEjercicio = (ei: number, parche: Partial<EjercicioUI>) =>
    cambiar({
      ...borrador,
      ejercicios: borrador.ejercicios.map((e, i) =>
        i === ei ? { ...e, ...parche } : e
      ),
    });

  const parchearSerie = (ei: number, si: number, parche: Partial<SerieUI>) =>
    parchearEjercicio(ei, {
      series: borrador.ejercicios[ei].series.map((s, i) =>
        i === si ? { ...s, ...parche } : s
      ),
    });

  const ciclarTipo = (ei: number, si: number) => {
    const actual = borrador.ejercicios[ei].series[si].tipo;
    const siguiente =
      ORDEN_TIPOS[(ORDEN_TIPOS.indexOf(actual) + 1) % ORDEN_TIPOS.length];
    parchearSerie(ei, si, { tipo: siguiente });
  };

  const anadirSerie = (ei: number) => {
    const series = borrador.ejercicios[ei].series;
    const ultima = series[series.length - 1] ?? SERIE_NUEVA;
    parchearEjercicio(ei, { series: [...series, { ...ultima }] });
  };

  const borrarSerie = (ei: number, si: number) =>
    parchearEjercicio(ei, {
      series: borrador.ejercicios[ei].series.filter((_, i) => i !== si),
    });

  const borrarEjercicio = (ei: number) =>
    cambiar({
      ...borrador,
      ejercicios: limpiarGruposSolitarios(
        borrador.ejercicios.filter((_, i) => i !== ei)
      ),
    });

  const moverEjercicio = (ei: number, dir: -1 | 1) => {
    const j = ei + dir;
    if (j < 0 || j >= borrador.ejercicios.length) return;
    const arr = [...borrador.ejercicios];
    [arr[ei], arr[j]] = [arr[j], arr[ei]];
    // Al reordenar, los grupos de superserie dejarían de ser consecutivos
    // y perderían sentido visual — más seguro deshacerlos.
    cambiar({ ...borrador, ejercicios: arr.map((e) => ({ ...e, grupoSuperserie: null })) });
  };

  const anadirDeBiblioteca = (ex: Ejercicio) => {
    cambiar({
      ...borrador,
      ejercicios: [
        ...borrador.ejercicios,
        {
          ejercicio_id: ex.id,
          nombre: ex.nombre,
          grupo_muscular: ex.grupo_muscular,
          descanso_seg: 120,
          notas: "",
          grupoSuperserie: null,
          series: [{ ...SERIE_NUEVA }, { ...SERIE_NUEVA }, { ...SERIE_NUEVA }],
        },
      ],
    });
    setMostrarBiblioteca(false);
  };

  /* --- Superseries / circuitos --- */
  const unirConSiguiente = (ei: number) => {
    const actual = borrador.ejercicios[ei];
    const siguiente = borrador.ejercicios[ei + 1];
    if (!siguiente || siguiente.grupoSuperserie) return;
    const idGrupo = actual.grupoSuperserie ?? `sg-${Date.now()}`;
    cambiar({
      ...borrador,
      ejercicios: borrador.ejercicios.map((e, i) =>
        i === ei || i === ei + 1 ? { ...e, grupoSuperserie: idGrupo } : e
      ),
    });
  };

  const separarDelGrupo = (ei: number) =>
    cambiar({
      ...borrador,
      ejercicios: limpiarGruposSolitarios(
        borrador.ejercicios.map((e, i) =>
          i === ei ? { ...e, grupoSuperserie: null } : e
        )
      ),
    });

  async function guardar() {
    const ok = await onGuardar(borrador);
    if (ok) setSucio(false);
  }

  function volver() {
    if (sucio && !confirm("Hay cambios sin guardar. ¿Salir sin guardar?")) return;
    onVolver();
  }

  const totalEfectivas = borrador.ejercicios.reduce(
    (a, e) => a + e.series.filter((s) => s.tipo !== "calentamiento").length,
    0
  );

  const fmtDescanso = (seg: number) =>
    `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;

  const conIndice: EjercicioConIndice[] = borrador.ejercicios.map((ex, ei) => ({
    ...ex,
    indiceGlobal: ei,
  }));
  const grupos = agruparPorSuperserie(conIndice);

  return (
    <>
      <div className="flex justify-between items-center mb-1">
        <button className="ghost" onClick={volver}>
          ← Rutina
        </button>
        <button className="ghost ghost-peligro" onClick={onEliminar}>
          Eliminar día
        </button>
      </div>

      <input
        className="input !font-bold !text-[19px] tracking-tight mt-3"
        value={borrador.nombre}
        onChange={(e) => cambiar({ ...borrador, nombre: e.target.value })}
        aria-label="Nombre del día"
      />
      <div className="text-atenuado text-[12.5px] mb-3.5">
        {borrador.ejercicios.length} ejercicios · {totalEfectivas} series
        efectivas
      </div>

      {grupos.map((grupo, gi) => {
        const esSuperserie = grupo.length > 1;
        const ultimoEi = grupo[grupo.length - 1].indiceGlobal;
        const siguiente = borrador.ejercicios[ultimoEi + 1];
        const puedeUnirSiguiente = !!siguiente && !siguiente.grupoSuperserie;

        return (
          <div key={gi}>
            <section
              className={`tarjeta ${esSuperserie ? "!p-0 overflow-hidden !border-acento/50" : ""}`}
            >
              {esSuperserie && (
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <span className="titulo-tarjeta !mb-0 !text-acento">
                    🔗 Superserie · sin descanso entre ejercicios
                  </span>
                </div>
              )}

              {grupo.map((ex, posicion) => {
                const ei = ex.indiceGlobal;
                const esUltimoDelGrupo = posicion === grupo.length - 1;
                return (
                  <div
                    key={ei}
                    className={
                      esSuperserie
                        ? `px-4 pb-3 ${posicion > 0 ? "pt-3 border-t border-borde" : "pt-1"}`
                        : ""
                    }
                  >
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AvatarEjercicio videoUrl={null} tamano={30} />
                        <div className="font-bold text-[15.5px] truncate">
                          {ex.nombre}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {esSuperserie && (
                          <button
                            className="mini"
                            onClick={() => separarDelGrupo(ei)}
                            aria-label="Separar de la superserie"
                            title="Separar de la superserie"
                          >
                            🔗✕
                          </button>
                        )}
                        <button className="mini" onClick={() => moverEjercicio(ei, -1)} aria-label="Subir">
                          ↑
                        </button>
                        <button className="mini" onClick={() => moverEjercicio(ei, 1)} aria-label="Bajar">
                          ↓
                        </button>
                        <button
                          className="mini mini-peligro"
                          onClick={() => borrarEjercicio(ei)}
                          aria-label="Quitar ejercicio"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {esSuperserie && !esUltimoDelGrupo ? (
                      <div className="text-acento/80 text-[12px] mb-1.5">
                        ↓ sin descanso, sigue directo con el siguiente
                      </div>
                    ) : (
                      <div className="flex justify-between items-center py-2 pb-2.5 border-b border-borde mb-1.5">
                        <span className="text-atenuado text-[12.5px]">
                          {esSuperserie ? "Descanso al terminar la ronda" : "Descanso"}
                        </span>
                        <div className="stepper">
                          <button
                            onClick={() =>
                              parchearEjercicio(ei, {
                                descanso_seg: Math.max(15, ex.descanso_seg - 15),
                              })
                            }
                          >
                            −
                          </button>
                          <span className="text-acento">{fmtDescanso(ex.descanso_seg)}</span>
                          <button
                            onClick={() =>
                              parchearEjercicio(ei, { descanso_seg: ex.descanso_seg + 15 })
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-[78px_1fr_1fr_1fr_32px] gap-2 text-[10.5px] tracking-wider uppercase text-atenuado pt-1.5 pb-1">
                      <span>Serie</span>
                      <span>Carga</span>
                      <span>Reps</span>
                      <span>RIR/Téc</span>
                      <span></span>
                    </div>
                    {ex.series.map((s, si) => (
                      <div
                        className="grid grid-cols-[78px_1fr_1fr_1fr_32px] gap-2 items-center py-1"
                        key={si}
                      >
                        <button
                          className="bg-campo border rounded-lg py-2 px-0.5 font-bold text-[11.5px] cursor-pointer"
                          style={{
                            color: INFO_TIPO_SERIE[s.tipo].color,
                            borderColor: INFO_TIPO_SERIE[s.tipo].color + "55",
                          }}
                          onClick={() => ciclarTipo(ei, si)}
                          title="Toca para cambiar el tipo de serie"
                        >
                          {INFO_TIPO_SERIE[s.tipo].etiqueta}
                        </button>
                        <input
                          className="campo-serie"
                          placeholder="90 ó goma"
                          value={s.kg}
                          onChange={(e) => parchearSerie(ei, si, { kg: e.target.value })}
                          aria-label="Carga (kg o texto)"
                        />
                        <input
                          className="campo-serie"
                          placeholder="6-10"
                          value={s.reps}
                          onChange={(e) => parchearSerie(ei, si, { reps: e.target.value })}
                          aria-label="Repeticiones (valor o rango)"
                        />
                        <input
                          className="campo-serie"
                          placeholder="2 ó P"
                          value={s.rir}
                          onChange={(e) => parchearSerie(ei, si, { rir: e.target.value })}
                          aria-label="RIR o técnica"
                        />
                        <button
                          className="mini mini-peligro"
                          onClick={() => borrarSerie(ei, si)}
                          aria-label="Quitar serie"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      className="w-full bg-transparent border border-dashed border-[#2A333B] text-atenuado rounded-[10px] py-2.5 text-[13.5px] cursor-pointer mt-2"
                      onClick={() => anadirSerie(ei)}
                    >
                      + Añadir serie
                    </button>
                  </div>
                );
              })}
            </section>

            {puedeUnirSiguiente && (
              <button
                className="w-full flex items-center justify-center gap-1.5 text-atenuado text-[12.5px] cursor-pointer -mt-2 mb-2.5"
                onClick={() => unirConSiguiente(ultimoEi)}
              >
                🔗 Unir con el siguiente en superserie
              </button>
            )}
          </div>
        );
      })}

      <button className="cta" onClick={() => setMostrarBiblioteca(true)}>
        + Añadir ejercicio
      </button>

      {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}

      {/* Barra fija de guardado cuando hay cambios */}
      {sucio && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[760px] z-30 p-3 bg-[rgba(12,15,18,0.96)] backdrop-blur-lg border-t border-borde">
          <button className="cta !mb-0" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar día"}
          </button>
        </div>
      )}

      {mostrarBiblioteca && (
        <HojaBiblioteca
          biblioteca={biblioteca}
          onElegir={anadirDeBiblioteca}
          onCerrar={() => setMostrarBiblioteca(false)}
        />
      )}
    </>
  );
}

/* ============================================================
   Hoja inferior: biblioteca de ejercicios con buscador, filtro
   por músculo y creación rápida de ejercicios propios.
   ============================================================ */
function HojaBiblioteca({
  biblioteca,
  onElegir,
  onCerrar,
}: {
  biblioteca: Ejercicio[];
  onElegir: (e: Ejercicio) => void;
  onCerrar: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoGrupo, setNuevoGrupo] = useState(GRUPOS_MUSCULARES[0]);
  const [nuevoMaterial, setNuevoMaterial] = useState("");
  const [nuevaTecnica, setNuevaTecnica] = useState("");
  const [nuevoVideo, setNuevoVideo] = useState("");
  const [errorCrear, setErrorCrear] = useState("");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  const filtrados = useMemo(
    () =>
      biblioteca.filter(
        (e) =>
          (filtro === "Todos" || e.grupo_muscular === filtro) &&
          e.nombre.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [biblioteca, filtro, busqueda]
  );

  async function crearEjercicio() {
    if (!nuevoNombre.trim()) {
      setErrorCrear("Escribe el nombre del ejercicio.");
      return;
    }
    setGuardandoNuevo(true);
    setErrorCrear("");
    const supabase = crearClienteNavegador();
    const { data: usuario } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("ejercicios")
      .insert({
        nombre: nuevoNombre.trim(),
        grupo_muscular: nuevoGrupo,
        material: nuevoMaterial.trim() || null,
        instrucciones: nuevaTecnica.trim() || null,
        video_url: nuevoVideo.trim() || null,
        creado_por: usuario.user?.id ?? null,
      })
      .select("*")
      .single();
    setGuardandoNuevo(false);
    if (error || !data) {
      setErrorCrear("No se pudo crear el ejercicio. Inténtalo de nuevo.");
      return;
    }
    onElegir(data as Ejercicio);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[480px] max-h-[82vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="titulo-tarjeta !m-0">BIBLIOTECA DE EJERCICIOS</div>
          <button className="ghost" onClick={onCerrar}>
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

        <div className="flex gap-1.5 overflow-x-auto pb-2.5">
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

        <div className="overflow-y-auto flex-1">
          {filtrados.map((e) => (
            <button
              key={e.id}
              className="flex justify-between items-center gap-2.5 w-full text-left border-b border-borde py-3 px-1 cursor-pointer"
              onClick={() => onElegir(e)}
            >
              <AvatarEjercicio videoUrl={e.video_url} tamano={38} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px] truncate">{e.nombre}</div>
                <div className="text-atenuado text-[12.5px] truncate">
                  {e.grupo_muscular}
                  {e.nombre_en ? ` · ${e.nombre_en}` : e.material ? ` · ${e.material}` : ""}
                </div>
              </div>
              <span className="text-acento text-[20px] shrink-0">+</span>
            </button>
          ))}
          {filtrados.length === 0 && (
            <div className="text-atenuado text-[13.5px] p-3">
              Sin resultados. Prueba con otro nombre o crea el ejercicio nuevo.
            </div>
          )}

          {/* Creación rápida de un ejercicio propio */}
          {creando ? (
            <div className="tarjeta mt-2">
              <div className="titulo-tarjeta">EJERCICIO NUEVO</div>
              <input
                className="input"
                placeholder="Nombre del ejercicio"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="input"
                  value={nuevoGrupo}
                  onChange={(e) => setNuevoGrupo(e.target.value)}
                >
                  {GRUPOS_MUSCULARES.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="Material (opcional)"
                  value={nuevoMaterial}
                  onChange={(e) => setNuevoMaterial(e.target.value)}
                />
              </div>
              <textarea
                className="w-full bg-campo border border-borde-2 rounded-[10px] text-white p-2.5 px-3 text-[13.5px] resize-y font-cuerpo mb-2.5"
                rows={2}
                placeholder="Técnica / criterios de ejecución (opcional)"
                value={nuevaTecnica}
                onChange={(e) => setNuevaTecnica(e.target.value)}
              />
              <input
                className="input"
                placeholder="Enlace al vídeo (opcional)"
                value={nuevoVideo}
                onChange={(e) => setNuevoVideo(e.target.value)}
              />
              {errorCrear && (
                <div className="text-peligro text-[13.5px] mb-3">
                  — {errorCrear}
                </div>
              )}
              <button
                className="cta !mb-0"
                onClick={crearEjercicio}
                disabled={guardandoNuevo}
              >
                {guardandoNuevo ? "Creando…" : "Crear y añadir al día"}
              </button>
            </div>
          ) : (
            <button
              className="w-full bg-transparent border border-dashed border-[#2A333B] text-atenuado rounded-[10px] py-2.5 text-[13.5px] cursor-pointer my-3"
              onClick={() => setCreando(true)}
            >
              + Crear ejercicio nuevo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
