"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import {
  agruparPorSuperserie,
  parsearCarga,
  parsearRepsRealizadas,
  parsearRir,
} from "@/lib/rutinas";
import { INFO_TIPO_SERIE, type TipoSerie } from "@/lib/tipos";
import CalculadoraDiscos from "@/componentes/CalculadoraDiscos";
import AvatarEjercicio from "@/componentes/AvatarEjercicio";

export interface SerieSesion {
  tipo: TipoSerie;
  // Lo prescrito por el entrenador se muestra en gris como referencia;
  // los campos empiezan vacíos para no confundir al cliente.
  kgPrescrito: string;
  repsPrescrito: string;
  rirPrescrito: string;
  kg: string;
  reps: string;
  rir: string;
  completada: boolean;
}

export interface EjercicioSesion {
  rutinaEjercicioId: string;
  nombre: string;
  grupo: string;
  descansoSeg: number;
  notas: string;
  tecnica: string | null; // criterios de técnica del entrenador
  videoUrl: string | null;
  anterior: string | null; // lo realizado la última vez ("90×8 · 90×7")
  grupoSuperserie: string | null;
  series: SerieSesion[];
}

interface EjercicioConIndice extends EjercicioSesion {
  indiceGlobal: number;
}

const SENSACIONES = [
  { valor: 1, emoji: "😖", etiqueta: "Muy duro" },
  { valor: 2, emoji: "😕", etiqueta: "Duro" },
  { valor: 3, emoji: "😐", etiqueta: "Normal" },
  { valor: 4, emoji: "🙂", etiqueta: "Bien" },
  { valor: 5, emoji: "🔥", etiqueta: "¡Genial!" },
];

const ESTADO_PREVIO = [
  { valor: 1, emoji: "😖", etiqueta: "Agotado" },
  { valor: 2, emoji: "😕", etiqueta: "Cansado" },
  { valor: 3, emoji: "😐", etiqueta: "Normal" },
  { valor: 4, emoji: "🙂", etiqueta: "Con ganas" },
  { valor: 5, emoji: "🔥", etiqueta: "A tope" },
];

/**
 * Sesión en curso (concepto clave: prescrito vs. realizado).
 * Las series vienen precargadas con lo prescrito: el cliente solo
 * confirma con ✓ o ajusta kg/reps. Al completar una serie arranca
 * el temporizador de descanso del ejercicio.
 */
export default function SesionEnCurso({
  clienteId,
  diaId,
  nombreDia,
  ejerciciosIniciales,
}: {
  clienteId: string;
  diaId: string;
  nombreDia: string;
  ejerciciosIniciales: EjercicioSesion[];
}) {
  const router = useRouter();
  const [ejercicios, setEjercicios] = useState(ejerciciosIniciales);
  const [inicio, setInicio] = useState<number | null>(null);
  const [transcurrido, setTranscurrido] = useState(0);
  const [descanso, setDescanso] = useState<{ total: number; fin: number } | null>(null);
  const [restante, setRestante] = useState(0);
  const [fase, setFase] = useState<"previo" | "entrenando" | "final">("previo");
  const [prsPre, setPrsPre] = useState<number | null>(null);
  const [sensacion, setSensacion] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [calculadoraPara, setCalculadoraPara] = useState<number | null>(null);
  const avisado = useRef(false);

  function empezarEntreno() {
    setInicio(Date.now());
    setFase("entrenando");
  }

  /* Reloj: tiempo de sesión y cuenta atrás del descanso */
  useEffect(() => {
    if (inicio === null) return;
    const intervalo = setInterval(() => {
      setTranscurrido(Math.floor((Date.now() - inicio) / 1000));
      setDescanso((d) => {
        if (!d) return d;
        const quedan = Math.max(0, Math.ceil((d.fin - Date.now()) / 1000));
        setRestante(quedan);
        if (quedan === 0) {
          if (!avisado.current && "vibrate" in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
          avisado.current = true;
          return null; // descanso terminado
        }
        return d;
      });
    }, 250);
    return () => clearInterval(intervalo);
  }, [inicio]);

  const fmt = (seg: number) =>
    `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;

  const parchearSerie = (
    ei: number,
    si: number,
    parche: Partial<SerieSesion>
  ) =>
    setEjercicios((prev) =>
      prev.map((e, i) =>
        i === ei
          ? {
              ...e,
              series: e.series.map((s, j) =>
                j === si ? { ...s, ...parche } : s
              ),
            }
          : e
      )
    );

  function alternarCompletada(ei: number, si: number) {
    const serie = ejercicios[ei].series[si];
    const ahoraCompletada = !serie.completada;
    // Al marcar ✓ con campos vacíos, se rellenan con lo prescrito
    // (si las reps son un rango "6-10", se usa el mínimo)
    const relleno: Partial<SerieSesion> = { completada: ahoraCompletada };
    if (ahoraCompletada) {
      if (serie.kg.trim() === "") relleno.kg = serie.kgPrescrito;
      if (serie.rir.trim() === "") relleno.rir = serie.rirPrescrito;
      if (serie.reps.trim() === "") {
        const rango = serie.repsPrescrito.match(/^(\d+)\s*-\s*\d+$/);
        relleno.reps = rango ? rango[1] : serie.repsPrescrito;
      }
    }
    parchearSerie(ei, si, relleno);
    if (ahoraCompletada && esUltimoDeSuperserie(ei)) {
      // Arranca el descanso automáticamente, pero solo tras el último
      // ejercicio de la superserie (o si el ejercicio va solo)
      const seg = ejercicios[ei].descansoSeg;
      avisado.current = false;
      setDescanso({ total: seg, fin: Date.now() + seg * 1000 });
      setRestante(seg);
    }
  }

  /** true si `ei` es el último ejercicio de su superserie (o va solo). */
  function esUltimoDeSuperserie(ei: number) {
    const actual = ejercicios[ei];
    if (!actual.grupoSuperserie) return true;
    const siguiente = ejercicios[ei + 1];
    return !siguiente || siguiente.grupoSuperserie !== actual.grupoSuperserie;
  }

  const totalSeries = ejercicios.reduce((a, e) => a + e.series.length, 0);
  const completadas = ejercicios.reduce(
    (a, e) => a + e.series.filter((s) => s.completada).length,
    0
  );

  async function guardarSesion() {
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();

    const { data: sesion, error: e1 } = await supabase
      .from("sesiones")
      .insert({
        cliente_id: clienteId,
        dia_id: diaId,
        fecha_inicio: new Date(inicio ?? Date.now()).toISOString(),
        fecha_fin: new Date().toISOString(),
        prs_pre: prsPre,
        sensacion,
        notas_cliente: nota.trim() || null,
      })
      .select("id")
      .single();

    if (e1 || !sesion) {
      setGuardando(false);
      setError("No se pudo guardar la sesión. Comprueba la conexión e inténtalo de nuevo.");
      return;
    }

    const filas = ejercicios.flatMap((e) =>
      e.series.map((s, j) => {
        const carga = parsearCarga(s.kg);
        const reps = parsearRepsRealizadas(s.reps);
        const rir = parsearRir(s.rir);
        return {
          sesion_id: sesion.id,
          rutina_ejercicio_id: e.rutinaEjercicioId,
          orden: j,
          tipo: s.tipo,
          kg: carga.kg,
          carga_texto: carga.carga_texto,
          reps: reps.reps,
          reps_extra: reps.reps_extra,
          rir: rir.rir,
          tecnica: rir.tecnica,
          completada: s.completada,
        };
      })
    );
    const { error: e2 } = await supabase.from("series_realizadas").insert(filas);

    setGuardando(false);
    if (e2) {
      setError("La sesión se creó pero fallaron las series. Inténtalo de nuevo.");
      return;
    }
    router.push("/inicio");
    router.refresh();
  }

  function salir() {
    if (
      completadas > 0 &&
      !confirm("La sesión no está guardada. ¿Salir sin guardar?")
    )
      return;
    if (completadas === 0) {
      router.push("/inicio");
      return;
    }
    router.push("/inicio");
  }

  /* --------- Pantalla previa: PRS (cómo llegas hoy) --------- */
  if (fase === "previo") {
    return (
      <>
        <button className="ghost mb-3" onClick={() => router.push("/inicio")}>
          ✕ Salir
        </button>
        <h1 className="h1 mb-1">{nombreDia}</h1>
        <div className="text-atenuado text-[14px] mb-5">
          {ejercicios.length} ejercicios ·{" "}
          {ejercicios.reduce(
            (a, e) => a + e.series.filter((s) => s.tipo !== "calentamiento").length,
            0
          )}{" "}
          series efectivas
        </div>

        <section className="tarjeta">
          <div className="titulo-tarjeta">¿CÓMO LLEGAS HOY?</div>
          <div className="flex justify-between gap-1.5 mb-1">
            {ESTADO_PREVIO.map((s) => (
              <button
                key={s.valor}
                onClick={() => setPrsPre(s.valor)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-[12px] border cursor-pointer ${
                  prsPre === s.valor
                    ? "border-acento bg-acento/10"
                    : "border-borde-2 bg-campo"
                }`}
              >
                <span className="text-[22px]">{s.emoji}</span>
                <span className="text-[10.5px] text-atenuado">{s.etiqueta}</span>
              </button>
            ))}
          </div>
        </section>

        <button className="cta" onClick={empezarEntreno}>
          Empezar sesión
        </button>
      </>
    );
  }

  /* --------- Pantalla final: sensación y nota --------- */
  if (fase === "final") {
    return (
      <>
        <div className="titulo-tarjeta !mb-2">SESIÓN COMPLETADA</div>
        <h1 className="h1 mb-1">{nombreDia}</h1>
        <div className="text-atenuado text-[14px] mb-5">
          {completadas} de {totalSeries} series · {fmt(transcurrido)} de entreno
        </div>

        <section className="tarjeta">
          <div className="titulo-tarjeta">¿CÓMO HA IDO?</div>
          <div className="flex justify-between gap-1.5 mb-1">
            {SENSACIONES.map((s) => (
              <button
                key={s.valor}
                onClick={() => setSensacion(s.valor)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-[12px] border cursor-pointer ${
                  sensacion === s.valor
                    ? "border-acento bg-acento/10"
                    : "border-borde-2 bg-campo"
                }`}
              >
                <span className="text-[22px]">{s.emoji}</span>
                <span className="text-[10.5px] text-atenuado">{s.etiqueta}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="tarjeta">
          <div className="titulo-tarjeta">NOTA PARA TU ENTRENADOR (OPCIONAL)</div>
          <textarea
            className="w-full bg-campo border border-borde-2 rounded-[10px] text-white p-2.5 px-3 text-[14px] resize-y font-cuerpo"
            rows={3}
            placeholder="Molestias, sensaciones, lo que quieras contarle…"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        </section>

        {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}

        <button className="cta" onClick={guardarSesion} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar sesión"}
        </button>
        <button
          className="ghost w-full"
          onClick={() => setFase("entrenando")}
          disabled={guardando}
        >
          ← Volver al entreno
        </button>
      </>
    );
  }

  /* --------- Pantalla de entreno --------- */
  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <button className="ghost" onClick={salir}>
          ✕ Salir
        </button>
        <div className="text-atenuado text-[13px]">
          ⏱ {fmt(transcurrido)} · {completadas}/{totalSeries} series
        </div>
      </div>

      <h1 className="h1 mb-3">{nombreDia}</h1>

      {ejercicios.length === 0 && (
        <div className="tarjeta text-atenuado text-[14px]">
          Este día no tiene ejercicios todavía. Avisa a tu entrenador.
        </div>
      )}

      {agruparPorSuperserie(
        ejercicios.map((ex, ei) => ({ ...ex, indiceGlobal: ei }))
      ).map((grupo: EjercicioConIndice[], gi) => {
        const esSuperserie = grupo.length > 1;
        const grupoCompleto = grupo.every(
          (ex) => ex.series.length > 0 && ex.series.every((s) => s.completada)
        );
        return (
          <section
            key={gi}
            className={`tarjeta ${
              esSuperserie
                ? "!p-0 overflow-hidden !border-acento/50"
                : grupoCompleto
                  ? "!border-acento/40"
                  : ""
            }`}
          >
            {esSuperserie && (
              <div className="px-4 pt-3 pb-1 text-acento text-[12.5px] font-bold uppercase tracking-wide">
                🔗 Superserie · sin descanso entre ejercicios
              </div>
            )}
            {grupo.map((ex, posicion) => {
              const ei = ex.indiceGlobal;
              const esUltimoDelGrupo = posicion === grupo.length - 1;
              const hechas = ex.series.filter((s) => s.completada).length;
              return (
                <div
                  key={ex.rutinaEjercicioId}
                  className={
                    esSuperserie
                      ? `px-4 pb-3 ${posicion > 0 ? "pt-3 border-t border-borde" : "pt-1"}`
                      : ""
                  }
                >
                  <div className="flex justify-between items-start mb-0.5 gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AvatarEjercicio videoUrl={ex.videoUrl} tamano={36} />
                      <div className="font-bold text-[16px] leading-tight">{ex.nombre}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      <button
                        className="text-atenuado text-[15px] cursor-pointer"
                        onClick={() => setCalculadoraPara(ei)}
                        title="Calculadora de discos"
                        aria-label="Calculadora de discos"
                      >
                        ⚖
                      </button>
                      <span className="text-atenuado text-[12px]">
                        {hechas}/{ex.series.length}
                      </span>
                    </div>
                  </div>
                  {esSuperserie && !esUltimoDelGrupo ? (
                    <div className="text-acento/80 text-[12.5px] mb-1">
                      ↓ sin descanso, sigue directo con el siguiente
                    </div>
                  ) : (
                    <div className="text-atenuado text-[12.5px] mb-1">
                      Descanso {fmt(ex.descansoSeg)}
                      {esSuperserie ? " al terminar la ronda" : ""}
                      {ex.notas ? ` · ${ex.notas}` : ""}
                    </div>
                  )}
                  {ex.anterior && (
                    <div className="text-[12.5px] text-acento/90 mb-1">
                      Última vez: {ex.anterior}
                    </div>
                  )}

                  {/* Técnica del entrenador y vídeo, plegados para no estorbar */}
                  {(ex.tecnica || ex.videoUrl) && (
                    <details className="mb-2">
                      <summary className="text-[12.5px] text-atenuado cursor-pointer select-none py-0.5">
                        📋 Técnica{ex.videoUrl ? " y vídeo" : ""}
                      </summary>
                      {ex.tecnica && (
                        <div className="text-[12.5px] text-texto-2 whitespace-pre-line bg-campo border border-borde-2 rounded-[10px] p-2.5 mt-1.5">
                          {ex.tecnica}
                        </div>
                      )}
                      {ex.videoUrl && (
                        <a
                          href={ex.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-acento text-[13px] underline underline-offset-2 mt-1.5"
                        >
                          🎥 Ver vídeo del ejercicio
                        </a>
                      )}
                    </details>
                  )}

                  <div className="grid grid-cols-[64px_1fr_1fr_1fr_44px] gap-2 text-[10.5px] tracking-wider uppercase text-atenuado pb-1">
                    <span>Serie</span>
                    <span>Kg</span>
                    <span>Reps</span>
                    <span>RIR</span>
                    <span></span>
                  </div>
                  {ex.series.map((s, si) => (
                    <div
                      className={`grid grid-cols-[64px_1fr_1fr_1fr_44px] gap-2 items-center py-1.5 px-1.5 -mx-1.5 rounded-lg ${
                        s.completada ? "bg-acento/10" : ""
                      }`}
                      key={si}
                    >
                      <span
                        className="text-[11px] font-bold text-center py-2 rounded-lg bg-campo border"
                        style={{
                          color: INFO_TIPO_SERIE[s.tipo].color,
                          borderColor: INFO_TIPO_SERIE[s.tipo].color + "44",
                        }}
                      >
                        {INFO_TIPO_SERIE[s.tipo].etiqueta}
                      </span>
                      <input
                        className="campo-serie placeholder:text-atenuado/60"
                        placeholder={s.kgPrescrito || "kg"}
                        value={s.kg}
                        onChange={(e) => parchearSerie(ei, si, { kg: e.target.value })}
                        aria-label="Carga"
                      />
                      <input
                        className="campo-serie placeholder:text-atenuado/60"
                        placeholder={s.repsPrescrito || "reps"}
                        value={s.reps}
                        onChange={(e) => parchearSerie(ei, si, { reps: e.target.value })}
                        aria-label="Repeticiones (admite 8+3)"
                      />
                      <input
                        className="campo-serie placeholder:text-atenuado/60"
                        placeholder={s.rirPrescrito || "—"}
                        value={s.rir}
                        onChange={(e) => parchearSerie(ei, si, { rir: e.target.value })}
                        aria-label="RIR o técnica"
                      />
                      <button
                        onClick={() => alternarCompletada(ei, si)}
                        aria-label={s.completada ? "Desmarcar serie" : "Serie hecha"}
                        className={`h-[38px] rounded-[10px] font-bold text-[16px] cursor-pointer border ${
                          s.completada
                            ? "bg-acento text-fondo border-acento"
                            : "bg-campo text-atenuado border-borde-2"
                        }`}
                      >
                        ✓
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </section>
        );
      })}

      {calculadoraPara !== null && (
        <CalculadoraDiscos
          pesoInicial={
            ejercicios[calculadoraPara].series.find((s) => s.kg.trim() !== "")
              ?.kg ??
            ejercicios[calculadoraPara].series.find(
              (s) => s.kgPrescrito.trim() !== ""
            )?.kgPrescrito ??
            ""
          }
          onCerrar={() => setCalculadoraPara(null)}
        />
      )}

      {ejercicios.length > 0 && (
        <button className="cta" onClick={() => setFase("final")}>
          Terminar sesión
        </button>
      )}

      {/* Temporizador de descanso — barra fija sobre la navegación */}
      {descanso && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-3"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
        >
          <div className="tarjeta !mb-2 !py-3 flex items-center gap-3 !border-acento/50 bg-[#0E1215]">
            <span className="text-[13px] text-atenuado">Descanso</span>
            <div className="flex-1 h-1.5 rounded bg-borde-2 overflow-hidden">
              <div
                className="h-full bg-acento transition-all"
                style={{ width: `${(restante / descanso.total) * 100}%` }}
              />
            </div>
            <span className="num-grande !text-[20px] text-acento min-w-[52px] text-right">
              {fmt(restante)}
            </span>
            <button className="ghost" onClick={() => setDescanso(null)}>
              Saltar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
