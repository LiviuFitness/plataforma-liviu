"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import {
  agruparPorSuperserie,
  embedYoutube,
  esGif,
  parsearCarga,
  parsearRepsRealizadas,
  parsearRir,
} from "@/lib/rutinas";
import { desbloquear, pitarDescansoTerminado, pitarRecord } from "@/lib/sonido";
import { INFO_TIPO_SERIE, type TipoSerie } from "@/lib/tipos";
import { evaluarSerieSesion, type UltimaSerieItem } from "@/lib/evaluacionSerie";
import { IconoTarjeta } from "@/componentes/ui";
import { useCountUp } from "@/lib/useCountUp";
import CalculadoraDiscos from "@/componentes/CalculadoraDiscos";
import AvatarEjercicio from "@/componentes/AvatarEjercicio";
import BarraDescanso from "@/componentes/BarraDescanso";
import HojaTarjetaEntreno from "@/componentes/HojaTarjetaEntreno";
import StepperNumero, { esSteppeable } from "@/componentes/StepperNumero";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  CloudOff,
  ChevronUp,
  FileText,
  Link2,
  Plus,
  Repeat,
  Scale,
  Share2,
  Sparkles,
  Timer,
  Trophy,
  Video,
  X,
  Zap, AlertCircle } from "lucide-react";
import type { AlternativaSesion } from "@/lib/alternativasSesion";
import { admiteExpres, duracionEstimada, versionExpres } from "@/lib/expres";
import { encolar, subirSesion, type SesionParaSubir } from "@/lib/subirSesion";

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
  anterior: UltimaSerieItem[] | null; // lo realizado la última vez, serie a serie
  mejorKgAnterior: number | null; // mejor marca histórica, para detectar récords
  grupoSuperserie: string | null;
  series: SerieSesion[];
  /** Ejercicio de la biblioteca, para ofrecer alternativas. */
  ejercicioId?: string;
  /** "¿Máquina ocupada?": por cuáles se puede cambiar hoy. */
  alternativas?: AlternativaSesion[];
  /** Cambiado hoy por otro: se guarda en sus series y no cuenta como
   * marca del ejercicio pautado. */
  sustituto?: { id: string; nombreOriginal: string } | null;
}

interface EjercicioConIndice extends EjercicioSesion {
  indiceGlobal: number;
}

/** Agregado de la última vez que el cliente hizo este MISMO día de
 * rutina (correlacionado por nombre + rutina, no por dia_id exacto —
 * ver comentario en las páginas que renderizan este componente), para
 * la comparación del resumen final. */
export interface SesionAnterior {
  volumen: number;
  series: number;
  reps: number;
  duracionSeg: number | null;
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
  descansoAcumuladoSeg?: number;
  expres?: boolean;
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
  const info = INFO_TIPO_SERIE[serie.tipo];
  const referenciaRir = (serie.rir || serie.rirPrescrito).trim();
  const hayRir = referenciaRir !== "";
  const esTecnica = hayRir && !/^\d+$/.test(referenciaRir);
  const evaluacion = evaluarSerieSesion(serie);
  // "Efectiva" es la inmensa mayoría de las series — su barra de color
  // se atenúa mucho para no competir con nada; calentamiento/dropset/
  // fallo son la excepción y sí necesitan destacar.
  const colorBarra = serie.tipo === "efectiva" ? `${info.color}30` : info.color;
  const kgMostrado = serie.kg || serie.kgPrescrito;
  const repsMostrado = serie.reps || serie.repsPrescrito;

  /* Las tres casillas (kg, reps, RIR) son la misma caja: mismo alto que
   * el check, mismo fondo y borde, y una etiqueta mínima encima del
   * valor. Antes, según el dato, el peso salía como texto suelto, las
   * reps en una caja y el RIR en una cápsula diminuta: tres formas para
   * tres cosas que se leen igual. */
  const caja =
    "relative h-10 w-full min-w-0 rounded-[10px] border border-borde-2 bg-campo flex flex-col items-center justify-center focus-within:outline focus-within:outline-2 focus-within:outline-acento focus-within:outline-offset-1";
  const etiqueta =
    "text-[8.5px] font-bold uppercase tracking-[0.08em] text-atenuado leading-none";
  const valor = `text-[15px] font-bold tabular-nums leading-tight ${
    serie.completada ? "text-texto-2" : ""
  }`;
  /* Campo de texto dentro de la caja: transparente, la caja pone el
   * aspecto. El padding de arriba deja sitio a la etiqueta. */
  const campo =
    "absolute inset-0 w-full h-full bg-transparent border-0 outline-none text-center pt-3 text-[15px] font-bold tabular-nums text-white placeholder:text-atenuado/45 placeholder:font-semibold placeholder:text-[13px]";

  return (
    <div
      className={`fila-serie grid grid-cols-[1fr_1fr_1fr_40px] items-center gap-1.5 rounded-[10px] py-2 pl-2.5 pr-2 border-l-[3px] ${
        activa ? "bg-acento/[0.06]" : ""
      }`}
      style={{ borderLeftColor: colorBarra }}
    >
      {/* Peso */}
      {esSteppeable(serie.kgPrescrito) ? (
        <button
          type="button"
          className={`${caja} anim-pulsable`}
          onClick={() => onAbrirEditor("kg")}
          aria-label={`Editar peso: ${kgMostrado || "sin registrar"} kg`}
        >
          <span className={etiqueta}>kg</span>
          <span className={valor}>{kgMostrado}</span>
        </button>
      ) : (
        <label className={caja}>
          <span className={`${etiqueta} absolute top-[7px]`}>kg</span>
          <input
            className={campo}
            placeholder={serie.kgPrescrito}
            inputMode="decimal"
            value={serie.kg}
            onChange={(e) => onCambiarKg(e.target.value)}
            aria-label="Carga"
          />
        </label>
      )}

      {/* Repeticiones. La flechita de evaluación (serie ya hecha:
       * prescrito vs. realizado) va en la esquina de esta caja: azul si
       * se superó el objetivo, ámbar si se quedó corto, nada si salió
       * tal cual. */}
      <div className="relative min-w-0">
        {esSteppeable(serie.repsPrescrito) ? (
          <button
            type="button"
            className={`${caja} anim-pulsable`}
            onClick={() => onAbrirEditor("reps")}
            aria-label={`Editar repeticiones: ${repsMostrado || "sin registrar"}`}
          >
            <span className={etiqueta}>reps</span>
            <span className={valor}>{repsMostrado}</span>
          </button>
        ) : (
          <label className={caja}>
            <span className={`${etiqueta} absolute top-[7px]`}>reps</span>
            <input
              className={campo}
              placeholder={serie.repsPrescrito}
              value={serie.reps}
              onChange={(e) => onCambiarReps(e.target.value)}
              aria-label="Repeticiones (admite 8+3)"
            />
          </label>
        )}
        {evaluacion === "superado" && (
          <ArrowUp
            size={11}
            strokeWidth={3}
            role="img"
            aria-label="Has superado el objetivo de esta serie"
            className="text-acento absolute top-1 right-1 pointer-events-none"
          />
        )}
        {evaluacion === "no_alcanzado" && (
          <ArrowDown
            size={11}
            strokeWidth={3}
            role="img"
            aria-label="Por debajo del objetivo de esta serie"
            className="text-aviso absolute top-1 right-1 pointer-events-none"
          />
        )}
      </div>

      {/* RIR (o la técnica: "P", "Myo"…). Siempre hay caja, aunque la
       * serie no lleve nada pautado: si no, esa fila quedaba descuadrada
       * respecto a las de arriba. */}
      <label className={caja}>
        <span className={`${etiqueta} absolute top-[7px]`}>{esTecnica ? "técnica" : "rir"}</span>
        <input
          className={campo}
          placeholder={serie.rirPrescrito}
          value={serie.rir}
          onChange={(e) => onCambiarRir(e.target.value)}
          aria-label={esTecnica ? "Técnica" : "RIR"}
        />
      </label>

      <button
        type="button"
        onClick={onCompletar}
        aria-label={serie.completada ? "Desmarcar serie" : "Serie hecha"}
        className={`w-10 h-10 shrink-0 rounded-[11px] cursor-pointer border flex items-center justify-center transition-colors anim-pulsable ${
          serie.completada
            ? "bg-acento text-fondo border-acento anim-pop"
            : "bg-campo text-acento border-acento/40"
        }`}
      >
        <Check size={17} strokeWidth={3} />
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
  sesionAnterior = null,
  analisisHref = "/mi-progreso",
  avisarSiDuplicada = false,
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
  /** Agregado de la última vez que se hizo este día de rutina, para la
   * comparación del resumen final. null si es la primera vez. */
  sesionAnterior?: SesionAnterior | null;
  /** A dónde lleva "Ver análisis completo" — Mi Progreso del cliente por
   * defecto; el entrenador en modo presencial lo lleva a la ficha. */
  analisisHref?: string;
  /** Presencial: comprueba antes de guardar si el cliente ya ha
   * registrado este mismo día por su cuenta, y avisa. Sin esto se
   * guardarían dos sesiones del mismo entreno (el índice único no las
   * pilla: la hora de inicio es distinta), y eso infla su adherencia y
   * duplica el volumen y los récords. */
  avisarSiDuplicada?: boolean;
}) {
  const router = useRouter();
  const [ejercicios, setEjercicios] = useState(ejerciciosIniciales);
  const [inicio, setInicio] = useState<number | null>(null);
  const [transcurrido, setTranscurrido] = useState(0);
  const [descanso, setDescanso] = useState<{ total: number; fin: number } | null>(null);
  const [restante, setRestante] = useState(0);
  const [descansoAcumuladoSeg, setDescansoAcumuladoSeg] = useState(0);
  const [fase, setFase] = useState<"previo" | "entrenando" | "final">("previo");
  const [prsPre, setPrsPre] = useState<number | null>(null);
  const [sensacion, setSensacion] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [accionGuardando, setAccionGuardando] = useState<"inicio" | "analisis" | null>(null);
  const [error, setError] = useState("");
  const [calculadoraPara, setCalculadoraPara] = useState<number | null>(null);
  const [videoAbierto, setVideoAbierto] = useState<number | null>(null);
  const [tecnicaAbierta, setTecnicaAbierta] = useState<Record<string, boolean>>({});
  const [expandidoManual, setExpandidoManual] = useState<Record<string, boolean>>({});
  const [activaManual, setActivaManual] = useState<Record<string, number>>({});
  const [prToast, setPrToast] = useState<{ nombre: string; kg: number } | null>(null);
  const [tarjetaAbierta, setTarjetaAbierta] = useState(false);
  /* Entreno exprés: se elige antes de empezar */
  const [expres, setExpres] = useState(false);
  const [cambioPara, setCambioPara] = useState<number | null>(null);
  /* Guardada en el móvil por falta de cobertura */
  const [sinRed, setSinRed] = useState(false);
  const [editor, setEditor] = useState<{ ei: number; si: number; campo: "kg" | "reps" } | null>(
    null
  );
  const avisado = useRef(false);
  const hidratado = useRef(false);
  /* Guarda contra el doble guardado: los dos botones del resumen final
   * vuelven a estar pulsables en cuanto termina el insert, pero la
   * navegación de Next tarda un segundo más — una segunda pulsación ahí
   * insertaba OTRA sesión entera con las mismas series (así se colaron 9
   * sesiones duplicadas en el histórico). El ref no depende del render. */
  const guardado = useRef<Promise<boolean> | null>(null);
  const gruposRefs = useRef<Record<number, HTMLElement | null>>({});

  function empezarEntreno() {
    if (expres) setEjercicios(versionExpres(ejerciciosIniciales).ejercicios);
    setInicio(Date.now());
    setFase("entrenando");
  }

  /** Cambia un ejercicio por otro solo para hoy. Las series se quedan
   * (mismas reps y RIR), pero sin el peso pautado: el de una prensa no
   * sirve para una sentadilla búlgara. Elegir el original lo deshace. */
  function cambiarEjercicio(ei: number, alt: AlternativaSesion | "original") {
    const original = ejerciciosIniciales.find(
      (x) => x.rutinaEjercicioId === ejercicios[ei].rutinaEjercicioId
    );
    setEjercicios((prev) =>
      prev.map((e, i) => {
        if (i !== ei) return e;
        if (alt === "original") {
          if (!original) return e;
          return {
            ...e,
            nombre: original.nombre,
            grupo: original.grupo,
            videoUrl: original.videoUrl,
            tecnica: original.tecnica,
            anterior: original.anterior,
            mejorKgAnterior: original.mejorKgAnterior,
            sustituto: null,
            series: e.series.map((s, si) => ({
              ...s,
              kgPrescrito: original.series[si]?.kgPrescrito ?? s.kgPrescrito,
            })),
          };
        }
        return {
          ...e,
          nombre: alt.nombre,
          grupo: alt.grupo,
          videoUrl: alt.videoUrl,
          tecnica: alt.tecnica,
          anterior: null,
          mejorKgAnterior: null,
          sustituto: { id: alt.id, nombreOriginal: e.sustituto?.nombreOriginal ?? e.nombre },
          series: e.series.map((s) => (s.completada ? s : { ...s, kgPrescrito: "", kg: "" })),
        };
      })
    );
    setVideoAbierto(null);
    setCambioPara(null);
  }

  /* Al abrir esta sesión, recupera del navegador un entreno que se
   * hubiera quedado a mitad (mismo número de ejercicios: si la rutina
   * cambió mientras tanto, se descarta el autoguardado y se empieza
   * de cero para no mezclar series de un día distinto). */
  useEffect(() => {
    const guardado = leerAutosave(clienteId, diaId);
    /* Vale si todos sus ejercicios siguen en el día; y, salvo en exprés
     * (que lleva menos a propósito), si están todos. */
    const idsDia = new Set(ejerciciosIniciales.map((e) => e.rutinaEjercicioId));
    if (
      guardado &&
      guardado.ejercicios.every((e) => idsDia.has(e.rutinaEjercicioId)) &&
      (guardado.expres || guardado.ejercicios.length === ejerciciosIniciales.length)
    ) {
      // El servidor no puede leer localStorage: esta hidratación solo
      // puede pasar aquí, tras el primer render en el navegador.
      /* eslint-disable react-hooks/set-state-in-effect */
      setEjercicios(guardado.ejercicios);
      setFase(guardado.fase);
      setInicio(guardado.inicio);
      setPrsPre(guardado.prsPre);
      setSensacion(guardado.sensacion);
      setNota(guardado.nota);
      setDescansoAcumuladoSeg(guardado.descansoAcumuladoSeg ?? 0);
      setExpres(!!guardado.expres);
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
      JSON.stringify({ fase, inicio, prsPre, sensacion, nota, ejercicios, descansoAcumuladoSeg, expres })
    );
  }, [clienteId, diaId, fase, inicio, prsPre, sensacion, nota, ejercicios, descansoAcumuladoSeg, expres]);

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
            setDescansoAcumuladoSeg((prev) => prev + d.total);
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

  /** Saltar cuenta como descanso "hecho" hasta ese punto (no el tiempo
   * completo prescrito) — para el total acumulado del resumen final. */
  function saltarDescanso() {
    if (descanso) {
      setDescansoAcumuladoSeg((prev) => prev + Math.max(0, descanso.total - restante));
    }
    setDescanso(null);
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
  const repsTotales = ejercicios.reduce(
    (total, e) =>
      total +
      e.series.reduce((a, s) => {
        if (!s.completada) return a;
        const rr = parsearRepsRealizadas(s.reps);
        return a + (rr.reps ?? 0) + (rr.reps_extra ?? 0);
      }, 0),
    0
  );
  // Se llaman siempre (no solo en fase "final"): las reglas de hooks no
  // permiten hooks dentro de un `if` — el coste de tenerlos activos en
  // las otras fases es nulo, solo se muestran en el resumen.
  const tonelajeAnimado = useCountUp(Math.round(tonelaje));
  const repsAnimadas = useCountUp(repsTotales);

  /* Comparación con la última vez que se hizo este día de rutina — solo
   * las diferencias que realmente dicen algo (nunca "+0%" ni "+0 reps"). */
  interface Delta {
    texto: string;
    tono: "positivo" | "neutro";
  }
  const deltas: Delta[] = [];
  if (sesionAnterior) {
    if (sesionAnterior.volumen > 0) {
      const pct = Math.round(((tonelaje - sesionAnterior.volumen) / sesionAnterior.volumen) * 100);
      if (Math.abs(pct) >= 2) {
        deltas.push({
          texto: `${pct > 0 ? "+" : ""}${pct}% volumen`,
          tono: pct > 0 ? "positivo" : "neutro",
        });
      }
    }
    const deltaSeries = completadas - sesionAnterior.series;
    if (deltaSeries !== 0) {
      deltas.push({
        texto: `${deltaSeries > 0 ? "+" : ""}${deltaSeries} serie${Math.abs(deltaSeries) === 1 ? "" : "s"}`,
        tono: deltaSeries > 0 ? "positivo" : "neutro",
      });
    }
    const deltaReps = repsTotales - sesionAnterior.reps;
    if (deltaReps !== 0) {
      deltas.push({
        texto: `${deltaReps > 0 ? "+" : ""}${deltaReps} rep${Math.abs(deltaReps) === 1 ? "" : "s"}`,
        tono: deltaReps > 0 ? "positivo" : "neutro",
      });
    }
    if (sesionAnterior.duracionSeg !== null) {
      const deltaMin = Math.round((transcurrido - sesionAnterior.duracionSeg) / 60);
      if (deltaMin !== 0) {
        deltas.push({
          texto: `${deltaMin > 0 ? "+" : ""}${deltaMin} min`,
          tono: "neutro",
        });
      }
    }
  }

  /* Un único insight, basado en datos reales — nunca un genérico "buen
   * trabajo". Si hay récords, ya son el propio insight (no se repite). */
  let insight: string | null = null;
  if (records.length === 0) {
    if (sesionAnterior && sesionAnterior.volumen > 0) {
      const pct = Math.round(((tonelaje - sesionAnterior.volumen) / sesionAnterior.volumen) * 100);
      if (Math.abs(pct) >= 5) {
        insight = `Has movido un ${Math.abs(pct)}% ${pct > 0 ? "más" : "menos"} de volumen que tu entreno anterior de este día.`;
      }
    }
    if (!insight && todoCompleto && totalSeries > 0) {
      insight = "Has completado todas las series de hoy.";
    }
    if (!insight && !sesionAnterior) {
      insight = "Primera vez que registras este entreno. La próxima vez podrás comparar tu progreso.";
    }
  }

  /** Una sola vez por sesión: si ya se está guardando (o se guardó bien),
   * se reutiliza la misma promesa en vez de insertar otra fila. Solo un
   * fallo la suelta, para que se pueda reintentar. */
  async function guardarSesion(): Promise<boolean> {
    guardado.current ??= insertarSesion().then((ok) => {
      if (!ok) guardado.current = null;
      return ok;
    });
    return guardado.current;
  }

  async function insertarSesion(): Promise<boolean> {
    setError("");
    const supabase = crearClienteNavegador();

    /* Se pregunta AQUÍ y no al abrir la pantalla a propósito: el caso
     * que de verdad pasa es que el cliente lo apunte en su móvil
     * mientras tú lo apuntas en el tuyo, y eso ocurre después de
     * abrirla. */
    if (avisarSiDuplicada) {
      const desde = new Date();
      desde.setHours(0, 0, 0, 0);
      const { data: yaHay } = await supabase
        .from("sesiones")
        .select("fecha_inicio")
        .eq("cliente_id", clienteId)
        .eq("dia_id", diaId)
        .gte("fecha_inicio", desde.toISOString())
        .limit(1);
      if (yaHay && yaHay.length > 0) {
        const hora = new Date(yaHay[0].fecha_inicio).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const seguir = confirm(
          `Este entreno ya está registrado hoy a las ${hora}: probablemente lo ha apuntado el cliente desde su móvil.\n\n` +
            "Si guardas, quedarán dos sesiones del mismo entreno y le contarán doble el volumen y la adherencia.\n\n" +
            "¿Guardar de todas formas?"
        );
        if (!seguir) {
          setError(
            "No se ha guardado. El entreno ya estaba registrado; puedes salir sin guardar."
          );
          return false;
        }
      }
    }

    const fechaInicio = new Date(inicio ?? Date.now()).toISOString();
    const haySustitutos = ejercicios.some((e) => e.sustituto);
    const paquete: SesionParaSubir = {
      id: `${clienteId}:${fechaInicio}`,
      nombreDia,
      sesion: {
        cliente_id: clienteId,
        dia_id: diaId,
        fecha_inicio: fechaInicio,
        fecha_fin: new Date().toISOString(),
        prs_pre: prsPre,
        sensacion,
        notas_cliente: nota.trim() || null,
        /* Solo si lo es: así una sesión normal se guarda igual que antes */
        ...(expres ? { expres: true } : {}),
      },
      series: ejercicios.flatMap((e) =>
        e.series.map((s, j) => {
          const carga = parsearCarga(s.kg);
          const reps = parsearRepsRealizadas(s.reps);
          const rir = parsearRir(s.rir);
          return {
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
            ...(haySustitutos ? { ejercicio_sustituto_id: e.sustituto?.id ?? null } : {}),
          };
        })
      ),
    };

    const resultado = await subirSesion(supabase, paquete);
    if (resultado === "sin-red") {
      /* Sin cobertura: el entreno se queda en el móvil y se sube solo
       * al volver la conexión. Nada se pierde. */
      encolar(paquete);
      borrarAutosave(clienteId, diaId);
      setSinRed(true);
      return false;
    }
    if (resultado === "error") {
      setError("No se pudo guardar la sesión. Inténtalo de nuevo.");
      return false;
    }
    borrarAutosave(clienteId, diaId);
    return true;
  }

  /** Los dos únicos botones del resumen final guardan y navegan a la
   * vez — no hay un "Guardar" aparte. Cada uno recuerda cuál de los dos
   * se pulsó para mostrar "Guardando…" solo en ese botón. */
  async function guardarYNavegar(destino: string, accion: "inicio" | "analisis") {
    setAccionGuardando(accion);
    const ok = await guardarSesion();
    if (!ok) {
      setAccionGuardando(null);
      return;
    }
    /* No se limpia el estado a propósito: los botones siguen bloqueados
     * mientras Next prepara la pantalla de destino. */
    router.push(destino);
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

        {admiteExpres(ejerciciosIniciales) && (
          <SelectorExpres
            ejercicios={ejerciciosIniciales}
            expres={expres}
            onCambiar={setExpres}
          />
        )}

        <button
          className="cta anim-pulsable flex items-center justify-center gap-2"
          onClick={empezarEntreno}
        >
          {expres ? (
            <>
              <Zap size={16} /> Empezar exprés
            </>
          ) : (
            "Empezar sesión"
          )}
        </button>
      </>
    );
  }

  /* --------- Sin cobertura al guardar --------- */
  if (sinRed) {
    return (
      <div className="anim-aparecer flex flex-col items-center text-center pt-8">
        <IconoTarjeta Icono={CloudOff} color="var(--color-aviso)" tamano={52} />
        <h1 className="h1 mt-3 mb-1">Entreno guardado en tu móvil</h1>
        <p className="text-texto-2 text-[14px] leading-relaxed px-2 mb-6">
          Ahora mismo no hay conexión. No pasa nada: se subirá solo en cuanto vuelvas a tener
          internet. No hace falta que hagas nada.
        </p>
        <button className="cta w-full" onClick={() => router.push(volverA)}>
          Entendido
        </button>
      </div>
    );
  }

  /* --------- Pantalla final: resumen, sensación y nota --------- */
  if (fase === "final") {
    return (
      <div className="anim-aparecer">
        <button
          className="mini mb-4"
          onClick={() => setFase("entrenando")}
          aria-label="Volver a la sesión para corregir algo"
        >
          <ArrowLeft size={16} />
        </button>

        {/* Cabecera: un logro, no un simple aviso de "completado" */}
        <div className="flex flex-col items-center text-center mb-6">
          <IconoTarjeta Icono={Check} color="var(--color-acento)" tamano={52} />
          <h1 className="h1 mt-3 mb-1">¡Entreno completado!</h1>
          <div className="sub">{nombreDia}</div>
        </div>

        {/* Hero: los dos números que más dicen de un vistazo */}
        <div className="grid grid-cols-2 gap-3 mb-2 text-center">
          <div>
            <div className="num-grande !text-[32px] tabular-nums">
              {tonelaje >= 1000 ? `${(tonelaje / 1000).toFixed(1).replace(".", ",")} t` : tonelajeAnimado}
            </div>
            <div className="texto-secundario mt-1">
              {tonelaje >= 1000 ? "levantadas" : "kg movidos"}
            </div>
          </div>
          <div>
            <div className="num-grande !text-[32px] tabular-nums">{fmt(transcurrido)}</div>
            <div className="texto-secundario mt-1">duración</div>
          </div>
        </div>

        {/* Secundarios: una línea fina, sin tarjetas de más */}
        <div className="text-center text-atenuado text-[13px] mb-5">
          {ejercicios.length} {ejercicios.length === 1 ? "ejercicio" : "ejercicios"} ·{" "}
          {completadas} {completadas === 1 ? "serie" : "series"} · {repsAnimadas}{" "}
          {repsAnimadas === 1 ? "repetición" : "repeticiones"}
          {descansoAcumuladoSeg > 0 && ` · ${fmt(descansoAcumuladoSeg)} de descanso`}
        </div>

        {/* Comparación con la última vez — solo lo que dice algo */}
        {deltas.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-5">
            {deltas.map((d) => (
              <span
                key={d.texto}
                className={`chip !cursor-default ${
                  d.tono === "positivo" ? "!text-acento !border-acento/40" : ""
                }`}
              >
                {d.texto}
              </span>
            ))}
          </div>
        )}

        {/* Récords — el momento más especial, con su propio espacio */}
        {records.length > 0 && (
          <section className="tarjeta tarjeta-dorado anim-entrada-2">
            <div className="titulo-tarjeta !text-dorado flex items-center gap-1.5">
              <Trophy size={13} className="anim-pop" /> ¡RÉCORDS BATIDOS!
            </div>
            {records.map((r) => (
              <div
                key={r.nombre}
                className="flex justify-between items-center gap-2 py-1.5 border-b border-borde last:border-0 text-[13.5px]"
              >
                <span className="min-w-0 leading-tight break-words">{r.nombre}</span>
                <span className="shrink-0">
                  <span className="text-atenuado">{r.antes} kg → </span>
                  <b className="text-dorado cifra-record text-[18px]">{String(r.kg).replace(".", ",")} kg</b>
                </span>
              </div>
            ))}
          </section>
        )}

        {/* Insight único, basado en datos reales — nunca un "buen trabajo" genérico */}
        {insight && (
          <div className="flex items-start gap-2 text-texto-2 text-[13.5px] italic mb-5 px-1">
            <Sparkles size={15} className="text-acento shrink-0 mt-0.5" />
            <span>{insight}</span>
          </div>
        )}

        {/* Solo el cliente: compartir su entreno en historias. En la
         * sesión presencial no pinta nada (el móvil es el del entrenador). */}
        {!nombreCliente && completadas > 0 && (
          <button
            className="w-full mb-5 flex items-center justify-center gap-2 py-3 rounded-[14px] border border-acento/40 bg-acento/10 text-acento font-semibold text-[14px] cursor-pointer anim-pulsable"
            onClick={() => setTarjetaAbierta(true)}
          >
            <Share2 size={16} /> Compartir en tu historia
          </button>
        )}
        {tarjetaAbierta && (
          <HojaTarjetaEntreno
            datos={{
              nombreDia,
              fecha: inicio !== null ? new Date(inicio) : new Date(),
              duracionSeg: transcurrido,
              tonelajeKg: tonelaje,
              series: completadas,
              repeticiones: repsTotales,
              records: records.map((r) => ({ nombre: r.nombre, kg: r.kg })),
            }}
            onCerrar={() => setTarjetaAbierta(false)}
          />
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

        {error && <div className="text-peligro text-[13.5px] mb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}

        {/* Únicas dos acciones — cada una guarda y navega a su destino,
         * no hay un "Guardar" aparte. */}
        <button
          className="cta anim-pulsable"
          onClick={() => guardarYNavegar(volverA, "inicio")}
          disabled={accionGuardando !== null}
        >
          {accionGuardando === "inicio" ? "Guardando…" : "Volver al inicio"}
        </button>
        <button
          className="ghost w-full"
          onClick={() => guardarYNavegar(analisisHref, "analisis")}
          disabled={accionGuardando !== null}
        >
          {accionGuardando === "analisis" ? "Guardando…" : "Ver análisis completo"}
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
      {/* Cabecera en una sola fila: salir, qué se entrena y cómo va. El
       * nombre del día iba antes en un `h1` aparte, pero una vez estás
       * dentro ya sabes lo que haces — no necesita 28 px ni una línea
       * para él solo. */}
      <div className="flex items-center gap-2.5 mb-2">
        <button className="mini shrink-0" onClick={salir} aria-label="Salir del entreno">
          <X size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[17px] leading-tight break-words">{nombreDia}</div>
          {nombreCliente && (
            <div className="text-atenuado text-[12px] break-words">
              Sesión presencial de {nombreCliente}
            </div>
          )}
        </div>
        <div className="text-atenuado text-[13px] flex items-center gap-1 tabular-nums shrink-0">
          <Timer size={13} /> {fmt(transcurrido)} ·{" "}
          <span className={todoCompleto ? "text-acento font-semibold" : ""}>
            {completadas}/{totalSeries}
          </span>
        </div>
      </div>
      <div className="barra-capsula !h-1 mb-3.5">
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
                    className={`w-full flex items-center gap-2.5 py-2.5 text-left anim-pulsable anim-aparecer opacity-[0.82] ${contenedorClases}`}
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
                    <span className="flex-1 min-w-0 text-[14px] font-semibold text-texto-2 leading-tight break-words">
                      {ex.nombre}
                    </span>
                    <span className="texto-secundario shrink-0">
                      {hechas}/{ex.series.length}
                    </span>
                  </button>
                );
              }

              return (
                <div
                  key={ex.rutinaEjercicioId}
                  className={`transition-opacity duration-300 ${exCompleta ? "opacity-[0.85]" : ""} ${contenedorClases}`}
                >
                  <div className="flex justify-between items-start mb-0.5 gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AvatarEjercicio videoUrl={ex.videoUrl} tamano={36} />
                      <div className="min-w-0">
                        <div className="font-bold text-[16px] leading-tight break-words">{ex.nombre}</div>
                        {ex.sustituto && (
                          <div className="text-aviso text-[12px] font-semibold leading-tight mt-0.5 break-words">
                            Hoy en lugar de {ex.sustituto.nombreOriginal}
                          </div>
                        )}
                      </div>
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
                      <span className="text-atenuado text-[12.5px] tabular-nums font-semibold">
                        {hechas}/{ex.series.length}
                      </span>
                    </div>
                  </div>

                  {/* Todo lo secundario en UNA fila: antes eran cuatro
                   * líneas apiladas (descanso, «última vez», técnica y
                   * vídeo) con el mismo peso visual, y había que pasar por
                   * encima de todas ellas para llegar a lo único que se
                   * toca de verdad, que son las series. Las herramientas
                   * pasan a ser iconos sin texto, alineados a la derecha. */}
                  <div className="flex items-center gap-x-2 gap-y-1 flex-wrap mb-2 text-[12.5px] text-atenuado">
                    {esSuperserie && !esUltimoDelGrupo ? (
                      <span className="text-acento/80">↓ sigue sin descanso</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 tabular-nums shrink-0">
                        <Timer size={12} /> {fmt(ex.descansoSeg)}
                      </span>
                    )}

                    {ex.anterior && ex.anterior.length > 0 && (
                      <>
                        <span className="text-borde-2">|</span>
                        <span className="inline-flex flex-wrap items-center gap-x-1 min-w-0">
                          <span className="shrink-0">Última</span>
                          {ex.anterior.map((it, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-0.5 font-bold tabular-nums text-texto-2"
                            >
                              {it.texto}
                              {it.estado === "superado" && (
                                <ArrowUp
                                  size={10}
                                  strokeWidth={3}
                                  aria-hidden="true"
                                  className="text-acento"
                                />
                              )}
                              {it.estado === "no_alcanzado" && (
                                <ArrowDown
                                  size={10}
                                  strokeWidth={3}
                                  aria-hidden="true"
                                  className="text-aviso"
                                />
                              )}
                              {i < ex.anterior!.length - 1 && (
                                <span className="text-atenuado font-normal">·</span>
                              )}
                            </span>
                          ))}
                        </span>
                      </>
                    )}

                    {notaInline && (
                      <>
                        <span className="text-borde-2">|</span>
                        <span className="min-w-0 break-words">{notaInline}</span>
                      </>
                    )}

                    <div className="flex items-center gap-3 ml-auto shrink-0">
                      {((ex.alternativas?.length ?? 0) > 0 || ex.sustituto) && (
                        <button
                          type="button"
                          className="hover:text-acento transition-colors anim-pulsable"
                          onClick={() => setCambioPara(ei)}
                          title="Cambiar ejercicio"
                          aria-label="Máquina ocupada: cambiar por otro ejercicio"
                        >
                          <Repeat size={15} />
                        </button>
                      )}
                      {(ex.tecnica || notasPlegadas) && (
                        <button
                          type="button"
                          className="hover:text-texto-2 transition-colors anim-pulsable"
                          onClick={() =>
                            setTecnicaAbierta((prev) => ({
                              ...prev,
                              [ex.rutinaEjercicioId]: !prev[ex.rutinaEjercicioId],
                            }))
                          }
                          aria-expanded={!!tecnicaAbierta[ex.rutinaEjercicioId]}
                          title="Técnica"
                          aria-label="Ver la técnica del ejercicio"
                        >
                          <FileText size={15} />
                        </button>
                      )}
                      {ex.videoUrl && (
                        <button
                          type="button"
                          className="hover:text-acento transition-colors anim-pulsable"
                          onClick={() => setVideoAbierto(videoAbierto === ei ? null : ei)}
                          title={esGif(ex.videoUrl) ? "Ver gif" : "Ver vídeo"}
                          aria-label={
                            esGif(ex.videoUrl)
                              ? "Ver el gif del ejercicio"
                              : "Ver el vídeo del ejercicio"
                          }
                        >
                          <Video size={15} />
                        </button>
                      )}
                      <button
                        className="hover:text-acento transition-colors anim-pulsable"
                        onClick={() => setCalculadoraPara(ei)}
                        title="Calculadora de discos"
                        aria-label="Calculadora de discos"
                      >
                        <Scale size={15} />
                      </button>
                    </div>
                  </div>

                  {(ex.tecnica || notasPlegadas) && tecnicaAbierta[ex.rutinaEjercicioId] && (
                    <div className="text-[12.5px] text-texto-2 whitespace-pre-line bg-campo border border-borde-2 rounded-[10px] p-2.5 mb-1.5 anim-aparecer">
                      {notasPlegadas && <p className="mb-1.5 last:mb-0">{notasPlegadas}</p>}
                      {ex.tecnica && <p className="last:mb-0">{ex.tecnica}</p>}
                    </div>
                  )}

                  {ex.videoUrl && videoAbierto === ei && (
                    <div className="mb-1.5">
                      {esGif(ex.videoUrl) ? (
                        <div className="relative rounded-[10px] overflow-hidden aspect-video border border-borde-2 anim-aparecer bg-campo">
                          <Image
                            src={ex.videoUrl}
                            alt={`Gif: ${ex.nombre}`}
                            fill
                            unoptimized
                            className="object-contain"
                          />
                        </div>
                      ) : embedYoutube(ex.videoUrl) ? (
                        <div className="rounded-[10px] overflow-hidden aspect-video border border-borde-2 anim-aparecer">
                          <iframe
                            src={`${embedYoutube(ex.videoUrl)}?rel=0`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={`Vídeo: ${ex.nombre}`}
                          />
                        </div>
                      ) : (
                        <a
                          href={ex.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-acento text-[13px] underline underline-offset-2"
                        >
                          <Video size={14} /> Abrir vídeo del ejercicio
                        </a>
                      )}
                    </div>
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
                  {/* Fila "+" — discretísima, extensión natural de la lista de
                   * series en vez de un botón de texto que reclama espacio
                   * propio. Al tocarla, la nueva serie ya sale editable
                   * (se convierte en la fila activa automáticamente). */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-center py-1.5 mt-0.5 text-atenuado/70 hover:text-acento hover:bg-campo/60 rounded-[8px] transition-colors anim-pulsable"
                    onClick={() => agregarSerie(ei)}
                    aria-label="Añadir serie"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </section>
        );
      })}

      {cambioPara !== null && ejercicios[cambioPara] && (
        <HojaCambiarEjercicio
          ejercicio={ejercicios[cambioPara]}
          nombreOriginal={ejercicios[cambioPara].sustituto?.nombreOriginal ?? null}
          onElegir={(alt) => cambiarEjercicio(cambioPara, alt)}
          onCerrar={() => setCambioPara(null)}
        />
      )}

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
              <b>¡Nuevo récord!</b> {prToast.nombre} ·{" "}
              <span className="cifra-record text-dorado text-[16px]">{String(prToast.kg).replace(".", ",")} kg</span>
            </div>
          </div>
        </div>
      )}

      {/* Temporizador de descanso — barra fija sobre la navegación */}
      {descanso && (
        <BarraDescanso
          restante={restante}
          total={descanso.total}
          onAjustar={ajustarDescanso}
          onSaltar={saltarDescanso}
        />
      )}
    </>
  );
}

/** Antes de empezar: el día completo o su versión exprés, con lo que
 * se queda y lo que sale para que no haya sorpresas. */
function SelectorExpres({
  ejercicios,
  expres,
  onCambiar,
}: {
  ejercicios: EjercicioSesion[];
  expres: boolean;
  onCambiar: (v: boolean) => void;
}) {
  const { cambios } = versionExpres(ejercicios);
  const totalCompleto = cambios.reduce((a, c) => a + c.antes, 0);
  const totalExpres = cambios.reduce((a, c) => a + c.despues, 0);
  const opcion = (activa: boolean) =>
    `rounded-[12px] border px-3 py-2.5 text-left cursor-pointer anim-pulsable ${
      activa ? "border-acento bg-acento/10" : "border-borde-2 bg-campo"
    }`;
  return (
    <section className="tarjeta">
      <div className="titulo-tarjeta">¿CUÁNTO TIEMPO TIENES?</div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={opcion(!expres)} onClick={() => onCambiar(false)}>
          <div className="font-bold text-[14px]">Completo</div>
          <div className="text-atenuado text-[12px]">{duracionEstimada(totalCompleto)}</div>
        </button>
        <button type="button" className={opcion(expres)} onClick={() => onCambiar(true)}>
          <div className={`font-bold text-[14px] flex items-center gap-1.5 ${expres ? "text-acento" : ""}`}>
            <Zap size={14} /> Exprés
          </div>
          <div className="text-atenuado text-[12px]">{duracionEstimada(totalExpres)}</div>
        </button>
      </div>
      {expres && (
        <div className="mt-3 anim-aparecer">
          {cambios.map((c, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 py-2 border-b border-borde last:border-0 ${
                c.fuera ? "opacity-45" : ""
              }`}
            >
              {c.fuera ? (
                <span className="w-[15px] shrink-0 text-atenuado text-center">–</span>
              ) : (
                <Check size={15} className="text-acento shrink-0" strokeWidth={3} />
              )}
              <span className={`flex-1 min-w-0 text-[14px] break-words ${c.fuera ? "line-through" : ""}`}>
                {c.nombre}
              </span>
              <span className="text-atenuado text-[12.5px] shrink-0">
                {c.fuera
                  ? "fuera hoy"
                  : c.despues < c.antes
                    ? `${c.despues} de ${c.antes} series`
                    : `${c.despues} ${c.despues === 1 ? "serie" : "series"}`}
              </span>
            </div>
          ))}
          <div className="text-atenuado text-[12px] mt-2.5 leading-snug">
            Se quedan los primeros ejercicios, los calentamientos solo en el primero y una serie
            menos en los accesorios. Tu entrenador verá que lo hiciste en exprés.
          </div>
        </div>
      )}
    </section>
  );
}

/** "¿Máquina ocupada?": cambiar el ejercicio por otro solo por hoy. */
function HojaCambiarEjercicio({
  ejercicio,
  nombreOriginal,
  onElegir,
  onCerrar,
}: {
  ejercicio: EjercicioSesion;
  nombreOriginal: string | null;
  onElegir: (alt: AlternativaSesion | "original") => void;
  onCerrar: () => void;
}) {
  const lista = (ejercicio.alternativas ?? []).filter((a) => a.id !== ejercicio.sustituto?.id);
  const aprobadas = lista.filter((a) => a.aprobada);
  const otras = lista.filter((a) => !a.aprobada);
  const fila = (a: AlternativaSesion) => (
    <button
      key={a.id}
      type="button"
      className="w-full flex items-center gap-3 py-2.5 border-b border-borde last:border-0 text-left cursor-pointer anim-pulsable"
      onClick={() => onElegir(a)}
    >
      <AvatarEjercicio videoUrl={a.videoUrl} tamano={36} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14px] leading-tight break-words">{a.nombre}</div>
        <div className="text-atenuado text-[12px]">
          {a.material ? `${a.material} · ` : ""}mismas series y reps
        </div>
      </div>
      <ChevronRight size={16} className="text-atenuado shrink-0" />
    </button>
  );
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[480px] max-h-[86vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] overflow-y-auto anim-hoja-sube"
        role="dialog"
        aria-modal="true"
        aria-label="Cambiar ejercicio"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-1">
          <div className="titulo-seccion !mb-0">¿Máquina ocupada?</div>
          <button className="ghost shrink-0" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        <div className="text-atenuado text-[12.5px] mb-3">
          Cambia <b className="text-texto-2">{ejercicio.nombre}</b> por otro del mismo músculo, solo
          por hoy. Tu rutina no cambia.
        </div>
        {nombreOriginal && (
          <button
            type="button"
            className="ghost w-full mb-3 flex items-center justify-center gap-2"
            onClick={() => onElegir("original")}
          >
            <Repeat size={14} /> Volver a {nombreOriginal}
          </button>
        )}
        {aprobadas.length > 0 && (
          <>
            <div className="titulo-tarjeta">LAS QUE HA ELEGIDO TU ENTRENADOR</div>
            <div className="superficie px-3 mb-3">{aprobadas.map(fila)}</div>
          </>
        )}
        {otras.length > 0 && (
          <>
            <div className="titulo-tarjeta">OTRAS DE {ejercicio.grupo.toUpperCase()}</div>
            <div className="superficie px-3">{otras.map(fila)}</div>
          </>
        )}
        {lista.length === 0 && (
          <div className="text-atenuado text-[13px] text-center py-4">
            No hay otros ejercicios de este músculo en la biblioteca.
          </div>
        )}
      </div>
    </div>
  );
}
