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
import { evaluarSerieSesion, type UltimaSerieItem } from "@/lib/evaluacionSerie";
import { IconoTarjeta } from "@/componentes/ui";
import { useCountUp } from "@/lib/useCountUp";
import CalculadoraDiscos from "@/componentes/CalculadoraDiscos";
import AvatarEjercicio from "@/componentes/AvatarEjercicio";
import StepperNumero, { esSteppeable } from "@/componentes/StepperNumero";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Link2,
  Plus,
  Scale,
  Sparkles,
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
  anterior: UltimaSerieItem[] | null; // lo realizado la última vez, serie a serie
  mejorKgAnterior: number | null; // mejor marca histórica, para detectar récords
  grupoSuperserie: string | null;
  series: SerieSesion[];
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
  const evaluacion = evaluarSerieSesion(serie);
  // "Efectiva" es la inmensa mayoría de las series — su barra de color
  // se atenúa mucho para no competir con nada; calentamiento/dropset/
  // fallo son la excepción y sí necesitan destacar.
  const colorBarra = serie.tipo === "efectiva" ? `${info.color}30` : info.color;
  const kgMostrado = serie.kg || serie.kgPrescrito;
  const repsMostrado = serie.reps || serie.repsPrescrito;

  return (
    <div
      className={`fila-serie grid grid-cols-[80px_56px_1fr_40px] items-center gap-1.5 rounded-[10px] py-2 pl-2.5 pr-2 border-l-[3px] ${
        activa ? "bg-acento/[0.06]" : ""
      }`}
      style={{ borderLeftColor: colorBarra }}
    >
      {/* Peso — el protagonista de la fila: la cifra más grande, la que
       * más se toca durante el entreno. Columna algo más ancha que el
       * resto para que ningún valor (137.5 kg…) llegue a solaparse. */}
      {esSteppeable(serie.kgPrescrito) ? (
        <button
          type="button"
          className="text-left anim-pulsable min-w-0"
          onClick={() => onAbrirEditor("kg")}
          aria-label={`Editar peso: ${kgMostrado || "sin registrar"} kg`}
        >
          <span
            className={`text-[19px] font-bold tabular-nums ${
              serie.completada ? "text-texto-2" : ""
            }`}
          >
            {kgMostrado || "—"}
          </span>
          <span className="text-atenuado text-[11px] ml-1">kg</span>
        </button>
      ) : (
        <input
          className="campo-serie !w-[74px] !text-[15px] !font-bold placeholder:text-atenuado/45"
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
          className="campo-serie !w-[56px] placeholder:text-atenuado/45"
          placeholder={serie.repsPrescrito || "reps"}
          value={serie.reps}
          onChange={(e) => onCambiarReps(e.target.value)}
          aria-label="Repeticiones (admite 8+3)"
        />
      )}

      {/* RIR — dato secundario a propósito: cápsula mínima y siempre en
       * gris neutro (ni la variante de técnica lleva ya acento — ese
       * azul se reserva para el peso, el check y los iconos de
       * evaluación, así no compite por atención). Antes del RIR, un
       * triangulito minúsculo evalúa la serie ya completada (prescrito
       * vs. realizado): azul si se superó el objetivo (peso probablemente
       * ligero), ámbar si se quedó corto. Sin icono cuando salió tal cual
       * estaba previsto — no hace falta destacar lo normal. */}
      <div className="flex items-center justify-end gap-1.5">
        {evaluacion === "superado" && (
          <ArrowUp
            size={13}
            strokeWidth={3}
            role="img"
            aria-label="Has superado el objetivo de esta serie"
            className="text-acento shrink-0"
          />
        )}
        {evaluacion === "no_alcanzado" && (
          <ArrowDown
            size={13}
            strokeWidth={3}
            role="img"
            aria-label="Por debajo del objetivo de esta serie"
            className="text-aviso shrink-0"
          />
        )}
        {hayRir &&
          (editandoRir ? (
            <input
              className="campo-serie !w-[56px] !py-1 !text-[11px] placeholder:text-atenuado/45"
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
              className={`shrink-0 rounded-md px-1.5 py-1 text-[10px] font-bold anim-pulsable max-w-[78px] truncate ${
                esTecnica
                  ? "text-texto-2 bg-borde-2/60"
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
      setDescansoAcumuladoSeg(guardado.descansoAcumuladoSeg ?? 0);
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
      JSON.stringify({ fase, inicio, prsPre, sensacion, nota, ejercicios, descansoAcumuladoSeg })
    );
  }, [clienteId, diaId, fase, inicio, prsPre, sensacion, nota, ejercicios, descansoAcumuladoSeg]);

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
      insight = "Primera vez que registras este entreno — la próxima vez podrás comparar tu progreso.";
    }
  }

  async function guardarSesion(): Promise<boolean> {
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
      setError("No se pudo guardar la sesión. Comprueba la conexión e inténtalo de nuevo.");
      return false;
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

    if (e2) {
      setError("La sesión se creó pero fallaron las series. Inténtalo de nuevo.");
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
    setAccionGuardando(null);
    if (ok) {
      router.push(destino);
      router.refresh();
    }
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
              {tonelaje >= 1000 ? `${(tonelaje / 1000).toFixed(1)}t` : tonelajeAnimado}
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
                <span className="min-w-0 truncate">{r.nombre}</span>
                <span className="shrink-0">
                  <span className="text-atenuado">{r.antes} kg → </span>
                  <b className="text-dorado">{r.kg} kg</b>
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
      <div className="barra-capsula !h-1 mb-3">
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
                <div
                  key={ex.rutinaEjercicioId}
                  className={`transition-opacity duration-300 ${exCompleta ? "opacity-[0.85]" : ""} ${contenedorClases}`}
                >
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
                  {ex.anterior && ex.anterior.length > 0 && (
                    <div className="inline-flex items-center gap-1.5 max-w-full bg-campo/80 border border-borde-2 rounded-full pl-2.5 pr-3 py-1 mb-1.5">
                      <span className="text-[9.5px] font-bold uppercase tracking-wide text-atenuado shrink-0">
                        Última
                      </span>
                      <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[13px] font-bold tabular-nums text-texto-2 min-w-0">
                        {ex.anterior.map((it, i) => (
                          <span key={i} className="inline-flex items-center gap-0.5">
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
                      </div>
                    </div>
                  )}

                  {/* Técnica y vídeo: dos disparadores independientes y
                   * minúsculos, nunca el texto entero de primeras — aquí
                   * se viene a entrenar, no a leer. Cada uno se abre por
                   * su cuenta, sin anidar uno dentro del otro. */}
                  {(ex.tecnica || ex.videoUrl || notasPlegadas) && (
                    <div className="flex items-center gap-3 mb-1.5">
                      {(ex.tecnica || notasPlegadas) && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-atenuado hover:text-texto-2 transition-colors text-[12px] font-medium anim-pulsable"
                          onClick={() =>
                            setTecnicaAbierta((prev) => ({
                              ...prev,
                              [ex.rutinaEjercicioId]: !prev[ex.rutinaEjercicioId],
                            }))
                          }
                          aria-expanded={!!tecnicaAbierta[ex.rutinaEjercicioId]}
                        >
                          <FileText size={12} /> Técnica
                          <ChevronDown
                            size={11}
                            className={`icono-rotable ${
                              tecnicaAbierta[ex.rutinaEjercicioId] ? "icono-rotable-abierto" : ""
                            }`}
                          />
                        </button>
                      )}
                      {ex.videoUrl && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-atenuado hover:text-acento transition-colors text-[12px] font-medium anim-pulsable"
                          onClick={() => setVideoAbierto(videoAbierto === ei ? null : ei)}
                        >
                          <Video size={12} /> Ver vídeo
                        </button>
                      )}
                    </div>
                  )}

                  {(ex.tecnica || notasPlegadas) && tecnicaAbierta[ex.rutinaEjercicioId] && (
                    <div className="text-[12.5px] text-texto-2 whitespace-pre-line bg-campo border border-borde-2 rounded-[10px] p-2.5 mb-1.5 anim-aparecer">
                      {notasPlegadas && <p className="mb-1.5 last:mb-0">{notasPlegadas}</p>}
                      {ex.tecnica && <p className="last:mb-0">{ex.tecnica}</p>}
                    </div>
                  )}

                  {ex.videoUrl && videoAbierto === ei && (
                    <div className="mb-1.5">
                      {embedYoutube(ex.videoUrl) ? (
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
            <button className="ghost shrink-0" onClick={saltarDescanso}>
              Saltar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
