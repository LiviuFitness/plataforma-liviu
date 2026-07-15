"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import {
  agruparPorSuperserie,
  embedYoutube,
  parsearCarga,
  parsearRepsRealizadas,
  parsearRir,
} from "@/lib/rutinas";
import { desbloquear, pitarDescansoTerminado, pitarRecord } from "@/lib/sonido";
import { INFO_TIPO_SERIE, type TipoSerie } from "@/lib/tipos";
import CalculadoraDiscos from "@/componentes/CalculadoraDiscos";
import AvatarEjercicio from "@/componentes/AvatarEjercicio";
import StepperNumero, { esSteppeable } from "@/componentes/StepperNumero";
import {
  Check,
  ChevronUp,
  Dumbbell,
  FileText,
  Link2,
  Plus,
  Scale,
  Timer,
  Trophy,
  Video,
  X,
} from "lucide-react";

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
  mejorKgAnterior: number | null; // mejor marca histórica, para detectar récords
  grupoSuperserie: string | null;
  series: SerieSesion[];
}

interface EjercicioConIndice extends EjercicioSesion {
  indiceGlobal: number;
}

/* --- Autoguardado local: si el cliente cierra la app sin querer a
   mitad de entreno, al volver a abrir esta misma sesión se recupera
   todo lo marcado (no se pierde por un cierre accidental). Se borra
   solo cuando la sesión se guarda de verdad o el cliente confirma
   que quiere salir sin guardar. --- */
interface AutosaveSesion {
  fase: "previo" | "entrenando" | "final";
  inicio: number | null;
  prsPre: number | null;
  sensacion: number | null;
  nota: string;
  ejercicios: EjercicioSesion[];
}

function claveAutosave(clienteId: string, diaId: string) {
  return `sesion-en-curso:${clienteId}:${diaId}`;
}

function leerAutosave(clienteId: string, diaId: string): AutosaveSesion | null {
  try {
    const bruto = localStorage.getItem(claveAutosave(clienteId, diaId));
    return bruto ? (JSON.parse(bruto) as AutosaveSesion) : null;
  } catch {
    return null;
  }
}

function borrarAutosave(clienteId: string, diaId: string) {
  try {
    localStorage.removeItem(claveAutosave(clienteId, diaId));
  } catch {
    /* almacenamiento no disponible: no hay nada que limpiar */
  }
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
 * Una serie, siempre en una sola línea de una rejilla: mismo alto, mismas
 * columnas, en todas las filas por igual (nada de un modo "compacto" y
 * otro "con controles" — eso fue justo lo que sobrecargaba la fila la
 * vez anterior). El peso y las repeticiones son texto plano: tocarlos
 * abre el editor grande en un sheet, la fila en sí nunca lleva botones
 * pegados al número. La serie activa solo se distingue por un fondo
 * apenas más claro — sin bordes ni elementos de más.
 */
function FilaSerie({
  serie,
  activa,
  onAbrirEditor,
  onCompletar,
  onCambiarKg,
  onCambiarReps,
  onCambiarRir,
}: {
  serie: SerieSesion;
  activa: boolean;
  onAbrirEditor: (campo: "kg" | "reps") => void;
  onCompletar: () => void;
  onCambiarKg: (v: string) => void;
  onCambiarReps: (v: string) => void;
  onCambiarRir: (v: string) => void;
}) {
  const [editandoRir, setEditandoRir] = useState(false);
  const info = INFO_TIPO_SERIE[serie.tipo];
  const referenciaRir = (serie.rir || serie.rirPrescrito).trim();
  const hayRir = referenciaRir !== "";
  const esTecnica = hayRir && !/^\d+$/.test(referenciaRir);
  // "Efectiva" es la inmensa mayoría de las series — su barra de color
  // se atenúa mucho para no competir con nada; calentamiento/dropset/
  // fallo son la excepción y sí necesitan destacar.
  const colorBarra = serie.tipo === "efectiva" ? `${info.color}30` : info.color;
  const kgMostrado = serie.kg || serie.kgPrescrito;
  const repsMostrado = serie.reps || serie.repsPrescrito;

  return (
    <div
      className={`fila-serie grid grid-cols-[70px_54px_1fr_44px] items-center gap-1.5 rounded-[10px] py-2.5 pl-2.5 pr-2 border-l-[3px] ${
        activa ? "bg-acento/[0.06]" : ""
      }`}
      style={{ borderLeftColor: colorBarra }}
    >
      {/* Peso — el protagonista de la fila, texto plano tocable */}
      {esSteppeable(serie.kgPrescrito) ? (
        <button
          type="button"
          className="text-left anim-pulsable min-w-0"
          onClick={() => onAbrirEditor("kg")}
          aria-label={`Editar peso: ${kgMostrado || "sin registrar"} kg`}
        >
          <span
            className={`text-[18px] font-bold tabular-nums ${
              serie.completada ? "text-texto-2" : ""
            }`}
          >
            {kgMostrado || "—"}
          </span>
          <span className="text-atenuado text-[11px] ml-1">kg</span>
        </button>
      ) : (
        <input
          className="campo-serie !w-[64px] placeholder:text-atenuado/45"
          placeholder={serie.kgPrescrito || "kg"}
          inputMode="decimal"
          value={serie.kg}
          onChange={(e) => onCambiarKg(e.target.value)}
          aria-label="Carga"
        />
      )}

      {/* Repeticiones */}
      {esSteppeable(serie.repsPrescrito) ? (
        <button
          type="button"
          className="text-left anim-pulsable min-w-0"
          onClick={() => onAbrirEditor("reps")}
          aria-label={`Editar repeticiones: ${repsMostrado || "sin registrar"}`}
        >
          <span className="text-atenuado text-[13px]">×</span>{" "}
          <span className="text-[15px] font-semibold tabular-nums">
            {repsMostrado || "—"}
          </span>
        </button>
      ) : (
        <input
          className="campo-serie !w-[54px] placeholder:text-atenuado/45"
          placeholder={serie.repsPrescrito || "reps"}
          value={serie.reps}
          onChange={(e) => onCambiarReps(e.target.value)}
          aria-label="Repeticiones (admite 8+3)"
        />
      )}

      {/* RIR — pequeño, alineado a la derecha del hueco flexible; el
       * check queda siempre anclado al borde derecho de la rejilla. */}
      <div className="flex justify-end">
        {hayRir &&
          (editandoRir ? (
            <input
              className="campo-serie !w-[62px] !py-1.5 !text-[12px] placeholder:text-atenuado/45"
              autoFocus
              value={serie.rir}
              placeholder={serie.rirPrescrito}
              onChange={(e) => onCambiarRir(e.target.value)}
              onBlur={() => setEditandoRir(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              aria-label={esTecnica ? "Técnica" : "RIR"}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditandoRir(true)}
              className={`shrink-0 rounded-md px-2 py-1.5 text-[11px] font-bold anim-pulsable max-w-[92px] truncate ${
                esTecnica
                  ? "text-acento bg-acento/15"
                  : "text-atenuado bg-campo border border-borde-2"
              }`}
            >
              {esTecnica ? referenciaRir : `RIR ${referenciaRir}`}
            </button>
          ))}
      </div>

      <button
        type="button"
        onClick={onCompletar}
        aria-label={serie.completada ? "Desmarcar serie" : "Serie hecha"}
        className={`w-11 h-11 shrink-0 rounded-[12px] cursor-pointer border flex items-center justify-center transition-colors anim-pulsable ${
          serie.completada
            ? "bg-acento text-fondo border-acento anim-pop"
            : "bg-campo text-acento border-acento/40"
        }`}
      >
        <Check size={19} strokeWidth={3} />
      </button>
    </div>
  );
}

/**
 * Sesión en curso (concepto clave: prescrito vs. realizado).
 * Las series vienen precargadas con lo prescrito: solo hay que
 * confirmar con ✓ o ajustar kg/reps con los steppers (sin teclado en el
 * caso normal). Al completar una serie arranca el temporizador de
 * descanso del ejercicio.
 *
 * Se usa tanto para que el cliente registre su propio entreno como
 * para que el entrenador registre uno presencial en el momento
 * (mismo componente, cambia clienteId/volverA/nombreCliente).
 */
export default function SesionEnCurso({
  clienteId,
  diaId,
  nombreDia,
  ejerciciosIniciales,
  volverA = "/inicio",
  nombreCliente,
}: {
  clienteId: string;
  diaId: string;
  nombreDia: string;
  ejerciciosIniciales: EjercicioSesion[];
  /** A dónde volver al salir/guardar. Por defecto el inicio del cliente;
   * el entrenador registrando una sesión presencial vuelve a la ficha. */
  volverA?: string;
  /** Si se pasa, se muestra "Sesión de <nombre>" (uso del entrenador). */
  nombreCliente?: string;
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
  const [videoAbierto, setVideoAbierto] = useState<number | null>(null);
  const [expandidoManual, setExpandidoManual] = useState<Record<string, boolean>>({});
  const [activaManual, setActivaManual] = useState<Record<string, number>>({});
  const [prToast, setPrToast] = useState<{ nombre: string; kg: number } | null>(null);
  const [editor, setEditor] = useState<{ ei: number; si: number; campo: "kg" | "reps" } | null>(
    null
  );
  const avisado = useRef(false);
  const hidratado = useRef(false);
  const gruposRefs = useRef<Record<number, HTMLElement | null>>({});

  function empezarEntreno() {
    setInicio(Date.now());
    setFase("entrenando");
  }

  /* Al abrir esta sesión, recupera del navegador un entreno que se
   * hubiera quedado a mitad (mismo número de ejercicios: si la rutina
   * cambió mientras tanto, se descarta el autoguardado y se empieza
   * de cero para no mezclar series de un día distinto). */
  useEffect(() => {
    const guardado = leerAutosave(clienteId, diaId);
    if (guardado && guardado.ejercicios.length === ejerciciosIniciales.length) {
      // El servidor no puede leer localStorage: esta hidratación solo
      // puede pasar aquí, tras el primer render en el navegador.
      /* eslint-disable react-hooks/set-state-in-effect */
      setEjercicios(guardado.ejercicios);
      setFase(guardado.fase);
      setInicio(guardado.inicio);
      setPrsPre(guardado.prsPre);
      setSensacion(guardado.sensacion);
      setNota(guardado.nota);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    hidratado.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Autoguardado continuo: cualquier cambio (serie marcada, kg/reps
   * editados, sensación…) se persiste al momento. Así, si la app se
   * cierra sin querer a mitad de entreno, nada se pierde. */
  useEffect(() => {
    if (!hidratado.current || fase === "previo") return;
    localStorage.setItem(
      claveAutosave(clienteId, diaId),
      JSON.stringify({ fase, inicio, prsPre, sensacion, nota, ejercicios })
    );
  }, [clienteId, diaId, fase, inicio, prsPre, sensacion, nota, ejercicios]);

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
          if (!avisado.current) {
            if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
            pitarDescansoTerminado();
          }
          avisado.current = true;
          return null; // descanso terminado
        }
        return d;
      });
    }, 250);
    return () => clearInterval(intervalo);
  }, [inicio]);

  /* El aviso de récord se retira solo tras unos segundos. */
  useEffect(() => {
    if (!prToast) return;
    const t = setTimeout(() => setPrToast(null), 2600);
    return () => clearTimeout(t);
  }, [prToast]);

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

  function agregarSerie(ei: number) {
    setEjercicios((prev) =>
      prev.map((e, i) => {
        if (i !== ei) return e;
        const ultima = e.series[e.series.length - 1];
        const nueva: SerieSesion = ultima
          ? { ...ultima, kg: "", reps: "", rir: "", completada: false }
          : {
              tipo: "efectiva",
              kgPrescrito: "",
              repsPrescrito: "",
              rirPrescrito: "",
              kg: "",
              reps: "",
              rir: "",
              completada: false,
            };
        return { ...e, series: [...e.series, nueva] };
      })
    );
  }

  /** La fila "activa" (fondo resaltado) es la primera serie pendiente,
   * salvo que el cliente haya tocado otra a propósito para corregirla. */
  function indiceActivo(ex: EjercicioSesion): number | null {
    const manual = activaManual[ex.rutinaEjercicioId];
    if (manual !== undefined && manual < ex.series.length) return manual;
    const primeraIncompleta = ex.series.findIndex((s) => !s.completada);
    return primeraIncompleta === -1 ? null : primeraIncompleta;
  }

  /** Abre el sheet grande de kg/reps para esta serie y, de paso, la deja
   * marcada como la fila en foco (mismo resaltado que la "activa"). */
  function abrirEditor(ei: number, si: number, exId: string, campo: "kg" | "reps") {
    setActivaManual((prev) => ({ ...prev, [exId]: si }));
    setEditor({ ei, si, campo });
  }

  function ajustarDescanso(deltaSeg: number) {
    setDescanso((d) => {
      if (!d) return d;
      const nuevoFin = Math.max(Date.now() + 1000, d.fin + deltaSeg * 1000);
      const segRestantes = Math.ceil((nuevoFin - Date.now()) / 1000);
      return { total: Math.max(d.total, segRestantes), fin: nuevoFin };
    });
  }

  function alternarCompletada(ei: number, si: number) {
    desbloquear(); // gesto real del usuario: aprovecha para desbloquear el audio en iOS
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

    if (ahoraCompletada) {
      if ("vibrate" in navigator) navigator.vibrate(12);
      const ejercicio = ejercicios[ei];
      if (ejercicio.mejorKgAnterior !== null && serie.tipo !== "calentamiento") {
        const kgFinal = parsearCarga(relleno.kg ?? serie.kg).kg;
        if (kgFinal !== null && kgFinal > ejercicio.mejorKgAnterior) {
          setPrToast({ nombre: ejercicio.nombre, kg: kgFinal });
          pitarRecord();
        }
      }
      // Al completarla, si era la serie promocionada a mano, se limpia
      // la promoción — el foco vuelve a caer solo en la siguiente
      // pendiente (o en ninguna, si ya no queda ninguna).
      setActivaManual((prev) => {
        const exId = ejercicio.rutinaEjercicioId;
        if (prev[exId] !== si) return prev;
        const copia = { ...prev };
        delete copia[exId];
        return copia;
      });
    }

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
  const todoCompleto = totalSeries > 0 && completadas === totalSeries;

  /* Resumen final: tonelaje total y récords batidos en esta sesión */
  const tonelaje = ejercicios.reduce(
    (total, e) =>
      total +
      e.series.reduce((a, s) => {
        if (!s.completada) return a;
        const kg = parsearCarga(s.kg).kg;
        const rr = parsearRepsRealizadas(s.reps);
        const reps = (rr.reps ?? 0) + (rr.reps_extra ?? 0);
        return kg !== null ? a + kg * reps : a;
      }, 0),
    0
  );
  const records = ejercicios.flatMap((e) => {
    if (e.mejorKgAnterior === null) return [];
    const maxAhora = Math.max(
      0,
      ...e.series
        .filter((s) => s.completada && s.tipo !== "calentamiento")
        .map((s) => parsearCarga(s.kg).kg ?? 0)
    );
    return maxAhora > e.mejorKgAnterior
      ? [{ nombre: e.nombre, kg: maxAhora, antes: e.mejorKgAnterior }]
      : [];
  });

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
    borrarAutosave(clienteId, diaId);
    router.push(volverA);
    router.refresh();
  }

  function salir() {
    if (
      completadas > 0 &&
      !confirm("La sesión no está guardada. ¿Salir sin guardar?")
    )
      return;
    borrarAutosave(clienteId, diaId);
    router.push(volverA);
  }

  /* --------- Pantalla previa: PRS (cómo llegas hoy) --------- */
  if (fase === "previo") {
    return (
      <>
        <button
          className="ghost mb-3 flex items-center gap-1"
          onClick={() => router.push(volverA)}
        >
          <X size={14} /> Salir
        </button>
        {nombreCliente && (
          <div className="text-atenuado text-[12.5px] mb-1">
            Sesión presencial de <b className="text-texto-2">{nombreCliente}</b>
          </div>
        )}
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
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-[12px] border cursor-pointer anim-pulsable ${
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

        <button className="cta anim-pulsable" onClick={empezarEntreno}>
          Empezar sesión
        </button>
      </>
    );
  }

  /* --------- Pantalla final: resumen, sensación y nota --------- */
  if (fase === "final") {
    return (
      <div className="anim-aparecer">
        <div className="titulo-tarjeta !mb-2">SESIÓN COMPLETADA</div>
        <h1 className="h1 mb-4">{nombreDia}</h1>

        {/* Resumen de la sesión (estilo Hevy) */}
        <div className="grid grid-cols-3 gap-2.5 mb-3.5">
          <div className="tarjeta !mb-0 text-center !p-3.5">
            <Timer size={18} className="mx-auto mb-1.5 text-acento" />
            <div className="num-grande !text-[20px] tabular-nums">{fmt(transcurrido)}</div>
            <div className="text-[10.5px] text-atenuado mt-0.5">duración</div>
          </div>
          <div className="tarjeta !mb-0 text-center !p-3.5">
            <Check size={18} className="mx-auto mb-1.5 text-acento" />
            <div className="num-grande !text-[20px] tabular-nums">
              {completadas}
              <span className="text-atenuado text-[13px]">/{totalSeries}</span>
            </div>
            <div className="text-[10.5px] text-atenuado mt-0.5">series</div>
          </div>
          <div className="tarjeta !mb-0 text-center !p-3.5">
            <Dumbbell size={18} className="mx-auto mb-1.5 text-acento" />
            <div className="num-grande !text-[20px] tabular-nums">
              {tonelaje >= 1000
                ? `${(tonelaje / 1000).toFixed(1)}t`
                : `${Math.round(tonelaje)}`}
            </div>
            <div className="text-[10.5px] text-atenuado mt-0.5">
              {tonelaje >= 1000 ? "levantadas" : "kg levantados"}
            </div>
          </div>
        </div>

        {records.length > 0 && (
          <section className="tarjeta tarjeta-dorado">
            <div className="titulo-tarjeta !text-dorado flex items-center gap-1.5">
              <Trophy size={13} /> ¡RÉCORDS BATIDOS!
            </div>
            {records.map((r) => (
              <div
                key={r.nombre}
                className="flex justify-between items-center gap-2 py-1.5 border-b border-borde last:border-0 text-[13.5px]"
              >
                <span className="min-w-0 truncate">{r.nombre}</span>
                <span className="shrink-0">
                  <span className="text-atenuado">{r.antes} kg → </span>
                  <b className="text-dorado">{r.kg} kg</b>
                </span>
              </div>
            ))}
          </section>
        )}

        <section className="tarjeta">
          <div className="titulo-tarjeta">¿CÓMO HA IDO?</div>
          <div className="flex justify-between gap-1.5 mb-1">
            {SENSACIONES.map((s) => (
              <button
                key={s.valor}
                onClick={() => setSensacion(s.valor)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-[12px] border cursor-pointer anim-pulsable ${
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
          <div className="titulo-tarjeta">NOTA {nombreCliente ? "" : "PARA TU ENTRENADOR "}(OPCIONAL)</div>
          <textarea
            className="w-full bg-campo border border-borde-2 rounded-[10px] text-white p-2.5 px-3 text-[14px] resize-y font-cuerpo"
            rows={3}
            placeholder="Molestias, sensaciones, lo que quieras contarle…"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        </section>

        {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}

        <button className="cta anim-pulsable" onClick={guardarSesion} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar sesión"}
        </button>
        <button
          className="ghost w-full"
          onClick={() => setFase("entrenando")}
          disabled={guardando}
        >
          ← Volver al entreno
        </button>
      </div>
    );
  }

  /* --------- Pantalla de entreno --------- */
  const gruposCalculados = agruparPorSuperserie(
    ejercicios.map((ex, ei) => ({ ...ex, indiceGlobal: ei }))
  ) as EjercicioConIndice[][];
  const estadosGrupo = gruposCalculados.map((grupo) =>
    grupo.every((ex) => ex.series.length > 0 && ex.series.every((s) => s.completada))
  );
  const indiceGrupoActual = estadosGrupo.findIndex((completo) => !completo);

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <button
          className="mini shrink-0"
          onClick={salir}
          aria-label="Salir del entreno"
        >
          <X size={16} />
        </button>
        <div className="text-atenuado text-[13px] flex items-center gap-1 tabular-nums">
          <Timer size={13} /> {fmt(transcurrido)} ·{" "}
          <span className={todoCompleto ? "text-acento font-semibold" : ""}>
            {completadas}/{totalSeries} series
          </span>
        </div>
      </div>
      <div className="barra-capsula mb-3">
        <div
          className="barra-capsula-relleno"
          style={
            {
              "--tc": "var(--color-acento)",
              width: `${totalSeries ? (completadas / totalSeries) * 100 : 0}%`,
            } as React.CSSProperties
          }
        />
      </div>

      {nombreCliente && (
        <div className="text-atenuado text-[12.5px] mb-1">
          Sesión presencial de <b className="text-texto-2">{nombreCliente}</b>
        </div>
      )}
      <h1 className="h1 mb-3">{nombreDia}</h1>

      {gruposCalculados.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scroll-sin-barra pb-1 mb-3.5">
          {gruposCalculados.map((grupo, gi) => {
            const completo = estadosGrupo[gi];
            const actual = gi === indiceGrupoActual;
            return (
              <button
                key={gi}
                type="button"
                className={`pildora-indice anim-pulsable ${
                  completo ? "pildora-indice-hecha" : actual ? "pildora-indice-actual" : ""
                }`}
                onClick={() =>
                  gruposRefs.current[gi]?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                aria-label={`Ir a ${grupo.map((e) => e.nombre).join(" + ")}`}
              >
                {completo ? <Check size={14} strokeWidth={3} /> : gi + 1}
              </button>
            );
          })}
        </div>
      )}

      {ejercicios.length === 0 && (
        <div className="tarjeta text-atenuado text-[14px]">
          Este día no tiene ejercicios todavía. Avisa a tu entrenador.
        </div>
      )}

      {gruposCalculados.map((grupo, gi) => {
        const esSuperserie = grupo.length > 1;
        const grupoCompleto = estadosGrupo[gi];
        return (
          <section
            key={gi}
            ref={(el) => {
              gruposRefs.current[gi] = el;
            }}
            className={`tarjeta ${
              esSuperserie
                ? "!p-0 overflow-hidden !border-acento/50 !border-l-[3px]"
                : grupoCompleto
                  ? "!border-acento/40"
                  : ""
            }`}
          >
            {esSuperserie && (
              <div className="px-4 pt-3 pb-1 text-acento text-[12.5px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                <Link2 size={13} /> Superserie · sin descanso entre ejercicios
              </div>
            )}
            {grupo.map((ex, posicion) => {
              const ei = ex.indiceGlobal;
              const esUltimoDelGrupo = posicion === grupo.length - 1;
              const hechas = ex.series.filter((s) => s.completada).length;
              const exCompleta = ex.series.length > 0 && hechas === ex.series.length;
              const expandida = expandidoManual[ex.rutinaEjercicioId] ?? !exCompleta;
              // Una nota corta ("con goma azul") se queda en línea; las notas
              // largas (técnica importada del Excel) se pliegan en el
              // desplegable para no llenar la pantalla de texto.
              const notas = ex.notas.trim() === "-" ? "" : ex.notas.trim();
              const notaInline = notas.length > 0 && notas.length <= 60 ? notas : "";
              const notasPlegadas =
                notas.length > 60 && notas !== (ex.tecnica ?? "").trim() ? notas : "";

              const contenedorClases = esSuperserie
                ? `px-4 pb-3 ${posicion > 0 ? "pt-3 border-t border-acento/20" : "pt-1"}`
                : "";

              /* Ejercicio ya completado y sin reabrir manualmente: fila
               * resumen compacta, fuera del camino del ejercicio activo. */
              if (!expandida) {
                return (
                  <button
                    key={ex.rutinaEjercicioId}
                    type="button"
                    className={`w-full flex items-center gap-2.5 py-2.5 text-left anim-pulsable ${contenedorClases}`}
                    onClick={() =>
                      setExpandidoManual((prev) => ({
                        ...prev,
                        [ex.rutinaEjercicioId]: true,
                      }))
                    }
                  >
                    <span className="w-7 h-7 rounded-full bg-acento/15 border border-acento/40 flex items-center justify-center shrink-0">
                      <Check size={14} strokeWidth={3} className="text-acento" />
                    </span>
                    <span className="flex-1 min-w-0 text-[14px] font-semibold text-texto-2 truncate">
                      {ex.nombre}
                    </span>
                    <span className="texto-secundario shrink-0">
                      {hechas}/{ex.series.length}
                    </span>
                  </button>
                );
              }

              return (
                <div key={ex.rutinaEjercicioId} className={contenedorClases}>
                  <div className="flex justify-between items-start mb-0.5 gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AvatarEjercicio videoUrl={ex.videoUrl} tamano={36} />
                      <div className="font-bold text-[16px] leading-tight">{ex.nombre}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      {exCompleta && (
                        <button
                          className="text-atenuado cursor-pointer hover:text-acento transition-colors anim-pulsable"
                          onClick={() =>
                            setExpandidoManual((prev) => ({
                              ...prev,
                              [ex.rutinaEjercicioId]: false,
                            }))
                          }
                          title="Colapsar"
                          aria-label="Colapsar ejercicio"
                        >
                          <ChevronUp size={16} />
                        </button>
                      )}
                      <button
                        className="text-atenuado cursor-pointer hover:text-acento transition-colors anim-pulsable"
                        onClick={() => setCalculadoraPara(ei)}
                        title="Calculadora de discos"
                        aria-label="Calculadora de discos"
                      >
                        <Scale size={17} />
                      </button>
                      <span className="text-atenuado text-[12px] tabular-nums">
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
                      {notaInline ? ` · ${notaInline}` : ""}
                    </div>
                  )}
                  {ex.anterior && (
                    <div className="text-[12.5px] text-acento/90 mb-1">
                      Última vez: {ex.anterior}
                    </div>
                  )}

                  {/* Técnica del entrenador y vídeo, plegados para no estorbar */}
                  {(ex.tecnica || ex.videoUrl || notasPlegadas) && (
                    <details className="mb-2">
                      <summary className="text-[12.5px] text-atenuado cursor-pointer select-none py-0.5 flex items-center gap-1.5">
                        <FileText size={13} /> Técnica{ex.videoUrl ? " y vídeo" : ""}
                      </summary>
                      {notasPlegadas && (
                        <div className="text-[12.5px] text-texto-2 whitespace-pre-line bg-campo border border-borde-2 rounded-[10px] p-2.5 mt-1.5">
                          {notasPlegadas}
                        </div>
                      )}
                      {ex.tecnica && (
                        <div className="text-[12.5px] text-texto-2 whitespace-pre-line bg-campo border border-borde-2 rounded-[10px] p-2.5 mt-1.5">
                          {ex.tecnica}
                        </div>
                      )}
                      {ex.videoUrl &&
                        (embedYoutube(ex.videoUrl) ? (
                          videoAbierto === ei ? (
                            <div className="mt-2 rounded-[10px] overflow-hidden aspect-video border border-borde-2">
                              <iframe
                                src={`${embedYoutube(ex.videoUrl)}?rel=0`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={`Vídeo: ${ex.nombre}`}
                              />
                            </div>
                          ) : (
                            <button
                              className="inline-flex items-center gap-1.5 text-acento text-[13px] underline underline-offset-2 mt-1.5 cursor-pointer"
                              onClick={() => setVideoAbierto(ei)}
                            >
                              <Video size={14} /> Ver vídeo del ejercicio
                            </button>
                          )
                        ) : (
                          <a
                            href={ex.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-acento text-[13px] underline underline-offset-2 mt-1.5"
                          >
                            <Video size={14} /> Ver vídeo del ejercicio
                          </a>
                        ))}
                    </details>
                  )}

                  {/* Solo la serie activa (la próxima pendiente, o la que se
                   * haya tocado a mano) lleva controles completos; el resto
                   * son una línea compacta de solo lectura — la rejilla
                   * entera se lee de un vistazo sin mover apenas los ojos. */}
                  <div className="flex flex-col gap-1">
                    {ex.series.map((s, si) => (
                      <FilaSerie
                        key={si}
                        serie={s}
                        activa={indiceActivo(ex) === si}
                        onAbrirEditor={(campo) =>
                          abrirEditor(ei, si, ex.rutinaEjercicioId, campo)
                        }
                        onCompletar={() => alternarCompletada(ei, si)}
                        onCambiarKg={(v) => parchearSerie(ei, si, { kg: v })}
                        onCambiarReps={(v) => parchearSerie(ei, si, { reps: v })}
                        onCambiarRir={(v) => parchearSerie(ei, si, { rir: v })}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="w-full text-left text-atenuado hover:text-acento transition-colors text-[12.5px] py-1.5 mt-1 flex items-center gap-1.5 anim-pulsable"
                    onClick={() => agregarSerie(ei)}
                  >
                    <Plus size={13} /> Añadir serie
                  </button>
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

      {/* Sheet grande de edición de peso/reps — mismo patrón que la
       * calculadora de discos. La fila de la serie nunca lleva botones
       * pegados al número; los steppers viven aquí, a demanda. */}
      {editor && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
          onClick={() => setEditor(null)}
        >
          <div
            className="w-full max-w-[480px] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] anim-hoja-sube"
            role="dialog"
            aria-modal="true"
            aria-label={editor.campo === "kg" ? "Editar peso" : "Editar repeticiones"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <div className="titulo-tarjeta !m-0">
                {editor.campo === "kg" ? "PESO" : "REPETICIONES"}
              </div>
              <button className="ghost" onClick={() => setEditor(null)}>
                Listo
              </button>
            </div>
            <div className="py-2 flex justify-center">
              {editor.campo === "kg" ? (
                <StepperNumero
                  valor={ejercicios[editor.ei].series[editor.si].kg}
                  placeholder={ejercicios[editor.ei].series[editor.si].kgPrescrito}
                  onChange={(v) => parchearSerie(editor.ei, editor.si, { kg: v })}
                  paso={2.5}
                  etiqueta="Peso en kilos"
                />
              ) : (
                <StepperNumero
                  valor={ejercicios[editor.ei].series[editor.si].reps}
                  placeholder={ejercicios[editor.ei].series[editor.si].repsPrescrito}
                  onChange={(v) => parchearSerie(editor.ei, editor.si, { reps: v })}
                  paso={1}
                  etiqueta="Repeticiones"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {ejercicios.length > 0 &&
        (todoCompleto ? (
          <button className="cta anim-pop anim-pulsable" onClick={() => setFase("final")}>
            Terminar sesión ✓
          </button>
        ) : (
          <button className="ghost w-full" onClick={() => setFase("final")}>
            Terminar antes de tiempo
          </button>
        ))}

      {/* Aviso de récord — se retira solo */}
      {prToast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 top-[76px] md:top-4 z-40 anim-caer px-3"
          style={{ width: "100%", maxWidth: 480 }}
        >
          <div className="tarjeta tarjeta-dorado anim-destello !mb-0 !py-2.5 flex items-center gap-2.5">
            <Trophy size={18} className="text-dorado shrink-0" />
            <div className="flex-1 min-w-0 text-[13px]">
              <b>¡Nuevo récord!</b> {prToast.nombre} · {prToast.kg} kg
            </div>
          </div>
        </div>
      )}

      {/* Temporizador de descanso — barra fija sobre la navegación */}
      {descanso && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-3 anim-subir-barra"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
        >
          <div className="tarjeta !mb-2 !py-3 flex items-center gap-2.5 !border-acento/50 bg-[#0E1215]">
            <button
              className="stepper-boton"
              onClick={() => ajustarDescanso(-15)}
              aria-label="Restar 15 segundos al descanso"
            >
              <span className="text-[11px] font-bold">−15</span>
            </button>
            <div className="flex-1 h-1.5 rounded bg-borde-2 overflow-hidden">
              <div
                className="h-full bg-acento transition-[width] duration-300 ease-linear"
                style={{ width: `${(restante / descanso.total) * 100}%` }}
              />
            </div>
            <span className="num-grande !text-[20px] text-acento min-w-[52px] text-right tabular-nums">
              {fmt(restante)}
            </span>
            <button
              className="stepper-boton"
              onClick={() => ajustarDescanso(15)}
              aria-label="Sumar 15 segundos al descanso"
            >
              <span className="text-[11px] font-bold">+15</span>
            </button>
            <button className="ghost shrink-0" onClick={() => setDescanso(null)}>
              Saltar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
