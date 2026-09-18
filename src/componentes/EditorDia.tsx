"use client";

import { AlertTriangle, Copy, Link2, Unlink } from "lucide-react";

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

/* Lo que Liviu pauta por defecto: 8-10 repeticiones a RIR 0. La carga
 * se deja vacía a propósito porque depende del cliente. */
const SERIE_NUEVA: SerieUI = { tipo: "efectiva", kg: "", reps: "8-10", rir: "0" };
/* La primera efectiva va más pesada y a menos reps: es donde se busca
 * la fuerza, antes de que la fatiga se coma la calidad. */
const PRIMERA_SERIE: SerieUI = { ...SERIE_NUEVA, reps: "5-8" };

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
  ejerciciosExcluidos,
  guardando,
  error,
  semanas = [],
  onGuardar,
  onVolver,
  onEliminar,
  onCopiado,
}: {
  dia: DiaUI;
  biblioteca: Ejercicio[];
  ejerciciosExcluidos?: string[]; // ejercicios que el cliente evita (lesión…)
  guardando: boolean;
  error: string;
  /** Semanas que existen en la rutina, para poder copiar este día a ellas. */
  semanas?: number[];
  onGuardar: (dia: DiaUI) => Promise<boolean>;
  onVolver: () => void;
  onEliminar: () => void;
  /** Tras copiar a otras semanas hay que releer la rutina de la base. */
  onCopiado?: () => void;
}) {
  const [borrador, setBorrador] = useState<DiaUI>(() =>
    JSON.parse(JSON.stringify(dia))
  );
  const [sucio, setSucio] = useState(false);
  const [mostrarBiblioteca, setMostrarBiblioteca] = useState(false);
  const [mostrarCopiar, setMostrarCopiar] = useState(false);

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
          series: [{ ...PRIMERA_SERIE }, { ...SERIE_NUEVA }, { ...SERIE_NUEVA }],
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

  const otrasSemanas = semanas.filter((s) => s !== dia.semana);

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
      <div className="text-atenuado text-[12.5px] mb-2">
        {borrador.ejercicios.length} ejercicios · {totalEfectivas} series
        efectivas
      </div>

      {/* Corregir un día y tener que repetirlo semana por semana era el
       * precio de que las semanas sean copias independientes. Esto lo
       * quita sin renunciar a que cada semana lleve sus propias cargas. */}
      {otrasSemanas.length > 0 && (
        <button
          className="ghost mb-3.5 flex items-center gap-1.5"
          onClick={() => {
            if (sucio) {
              alert("Guarda primero los cambios del día y luego cópialo.");
              return;
            }
            setMostrarCopiar(true);
          }}
          title="Llevar este día a las demás semanas de la rutina"
        >
          <Copy size={13} /> Copiar a otras semanas
        </button>
      )}

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
                  <span className="titulo-tarjeta !mb-0 !text-acento flex items-center gap-1.5">
                    <Link2 size={13} /> Superserie · sin descanso entre ejercicios
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
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <AvatarEjercicio videoUrl={null} tamano={30} />
                        <div className="font-bold text-[15.5px] leading-tight">
                          {ex.nombre}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 pt-1">
                        {esSuperserie && (
                          <button
                            className="mini"
                            onClick={() => separarDelGrupo(ei)}
                            aria-label="Separar de la superserie"
                            title="Separar de la superserie"
                          >
                            <Unlink size={13} />
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

                    {/* Las tres columnas no reparten igual: «90 o goma» es la
                     * pista más larga y en un móvil se cortaba, mientras que el
                     * RIR casi siempre es un carácter. */}
                    <div className="grid grid-cols-[64px_1.35fr_1fr_0.9fr_30px] gap-1.5 text-[10.5px] tracking-wider uppercase text-atenuado pt-1.5 pb-1">
                      <span>Serie</span>
                      <span>Carga</span>
                      <span>Reps</span>
                      <span>RIR/Téc</span>
                      <span></span>
                    </div>
                    {ex.series.map((s, si) => (
                      <div
                        className="grid grid-cols-[64px_1.35fr_1fr_0.9fr_30px] gap-1.5 items-center py-1"
                        key={si}
                      >
                        <button
                          className="bg-campo border rounded-lg py-2 px-0.5 font-bold text-[11px] leading-none cursor-pointer"
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
                          placeholder="90 o goma"
                          value={s.kg}
                          onChange={(e) => parchearSerie(ei, si, { kg: e.target.value })}
                          aria-label="Carga (kg o texto)"
                        />
                        <input
                          className="campo-serie"
                          placeholder="8-10"
                          value={s.reps}
                          onChange={(e) => parchearSerie(ei, si, { reps: e.target.value })}
                          aria-label="Repeticiones (valor o rango)"
                        />
                        <input
                          className="campo-serie"
                          placeholder="0 o P"
                          value={s.rir}
                          onChange={(e) => parchearSerie(ei, si, { rir: e.target.value })}
                          aria-label="RIR o técnica"
                        />
                        <button
                          className="mini mini-peligro mini-estrecho"
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
                <Link2 size={13} /> Unir con el siguiente en superserie
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

      {mostrarCopiar && (
        <HojaCopiarSemanas
          diaId={dia.id}
          nombreDia={dia.nombre}
          semanaOrigen={dia.semana}
          semanas={otrasSemanas}
          onCerrar={() => setMostrarCopiar(false)}
          onHecho={() => {
            setMostrarCopiar(false);
            onCopiado?.();
          }}
        />
      )}

      {mostrarBiblioteca && (
        <HojaBiblioteca
          biblioteca={biblioteca}
          ejerciciosExcluidos={ejerciciosExcluidos}
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
  ejerciciosExcluidos,
  onElegir,
  onCerrar,
}: {
  biblioteca: Ejercicio[];
  ejerciciosExcluidos?: string[];
  onElegir: (e: Ejercicio) => void;
  onCerrar: () => void;
}) {
  const noPuedeHacer = new Set(ejerciciosExcluidos ?? []);
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

        <div className="overflow-y-auto flex-1">
          {filtrados.map((e) => (
            <button
              key={e.id}
              className="flex justify-between items-center gap-2.5 w-full text-left border-b border-borde py-3 px-1 cursor-pointer"
              onClick={() => onElegir(e)}
            >
              <AvatarEjercicio videoUrl={e.video_url} tamano={38} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px] leading-tight break-words">{e.nombre}</div>
                <div className="text-atenuado text-[12.5px] break-words">
                  {e.grupo_muscular}
                  {e.nombre_en ? ` · ${e.nombre_en}` : e.material ? ` · ${e.material}` : ""}
                </div>
                {noPuedeHacer.has(e.id) && (
                  <div className="text-aviso text-[12px] flex items-center gap-1 mt-0.5">
                    <AlertTriangle size={12} /> El cliente marcó que lo evita
                  </div>
                )}
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

/* ============================================================
   Hoja inferior: copiar este día a las demás semanas.
   ============================================================ */
function HojaCopiarSemanas({
  diaId,
  nombreDia,
  semanaOrigen,
  semanas,
  onCerrar,
  onHecho,
}: {
  diaId: string;
  nombreDia: string;
  semanaOrigen: number;
  semanas: number[];
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const [elegidas, setElegidas] = useState<number[]>(semanas);
  const [incluirCargas, setIncluirCargas] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [error, setError] = useState("");

  const alternar = (s: number) =>
    setElegidas((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s].sort((a, b) => a - b)
    );

  async function copiar() {
    if (elegidas.length === 0) return;
    setCopiando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { error: e } = await supabase.rpc("copiar_dia_a_semanas", {
      p_dia: diaId,
      p_semanas: elegidas,
      p_incluir_cargas: incluirCargas,
    });
    if (e) {
      setCopiando(false);
      setError("No se pudo copiar. Inténtalo de nuevo.");
      return;
    }
    /* No se suelta el bloqueo a propósito: hasta que la rutina se relea,
     * otra pulsación repetiría la copia entera. */
    onHecho();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center anim-fondo-aparece"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[480px] max-h-[82vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="titulo-tarjeta !m-0">COPIAR A OTRAS SEMANAS</div>
          <button className="ghost" onClick={onCerrar}>
            Cerrar
          </button>
        </div>

        <p className="text-texto-2 text-[13.5px] leading-relaxed mb-3.5">
          «{nombreDia}» de la semana {semanaOrigen} sustituirá al día que ocupa
          esa misma posición en las semanas que elijas.
        </p>

        <div className="titulo-tarjeta">Semanas</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {semanas.map((s) => (
            <button
              key={s}
              className={elegidas.includes(s) ? "chip chip-activo" : "chip"}
              onClick={() => alternar(s)}
            >
              Semana {s}
            </button>
          ))}
        </div>

        <div className="titulo-tarjeta">Qué se copia</div>
        <button
          className={`w-full text-left rounded-[12px] border p-3 mb-2 cursor-pointer ${
            !incluirCargas ? "border-acento bg-acento/10" : "border-borde-2 bg-campo"
          }`}
          onClick={() => setIncluirCargas(false)}
        >
          <div className="font-bold text-[14.5px]">Solo los ejercicios</div>
          <div className="text-atenuado text-[12.5px] leading-relaxed mt-0.5">
            Ejercicios, orden, descansos y superseries. Los kilos y las reps que
            ya tuvieras ajustados en esas semanas <b>se conservan</b>.
          </div>
        </button>
        <button
          className={`w-full text-left rounded-[12px] border p-3 mb-4 cursor-pointer ${
            incluirCargas ? "border-aviso bg-aviso/10" : "border-borde-2 bg-campo"
          }`}
          onClick={() => setIncluirCargas(true)}
        >
          <div className="font-bold text-[14.5px]">Todo, cargas incluidas</div>
          <div className="text-atenuado text-[12.5px] leading-relaxed mt-0.5">
            El día se copia entero. <b className="text-aviso">Pisa las progresiones</b>{" "}
            que hubiera en esas semanas.
          </div>
        </button>

        {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}

        <button
          className="cta !mb-0"
          onClick={copiar}
          disabled={copiando || elegidas.length === 0}
        >
          {copiando
            ? "Copiando…"
            : elegidas.length === 0
              ? "Elige al menos una semana"
              : `Copiar a ${elegidas.length} ${elegidas.length === 1 ? "semana" : "semanas"}`}
        </button>
      </div>
    </div>
  );
}
