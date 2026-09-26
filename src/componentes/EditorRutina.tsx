"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, BookmarkPlus, Check, GripVertical, Play, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import {
  aRutinaUI,
  parsearCarga,
  parsearReps,
  parsearRir,
  SELECT_RUTINA_COMPLETA,
  type FilaRutina,
} from "@/lib/rutinas";
import EditorDia from "./EditorDia";
import type { DiaUI, Ejercicio, RutinaUI } from "@/lib/tipos";
import AsignarPlantilla, { type PlantillaResumen } from "@/componentes/AsignarPlantilla";
import HojaDuplicarSemana from "@/componentes/HojaDuplicarSemana";
import HojaDuplicarDia from "@/componentes/HojaDuplicarDia";
import HojaGuardarPlantilla from "@/componentes/HojaGuardarPlantilla";

/**
 * Editor de rutina: semanas (microciclos) duplicables, lista de días,
 * panel de volumen por músculo y editor de día estilo Hevy.
 * Se usa tanto en la ficha del cliente como en las plantillas.
 */
export default function EditorRutina({
  rutina,
  plantillas,
  clienteId,
  nombreCliente,
  biblioteca,
  ejerciciosExcluidos,
  alEditarDia,
}: {
  rutina: RutinaUI | null;
  /** Plantillas de rutina, para aplicar una sin salir de la ficha. */
  plantillas?: PlantillaResumen[];
  clienteId?: string | null; // null => plantilla
  nombreCliente?: string;
  biblioteca: Ejercicio[];
  ejerciciosExcluidos?: string[]; // ejercicios que el cliente evita (lesión…)
  alEditarDia?: (editando: boolean) => void;
}) {
  const router = useRouter();
  const [dias, setDias] = useState<DiaUI[]>(rutina?.dias ?? []);
  const [semanaActual, setSemanaActual] = useState(rutina?.semana_actual ?? 1);
  const [semanaVista, setSemanaVista] = useState(rutina?.semana_actual ?? 1);
  const [indiceAbierto, setIndiceAbierto] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarIgualar, setMostrarIgualar] = useState(false);
  const [mostrarDuplicar, setMostrarDuplicar] = useState(false);
  const [duplicandoDia, setDuplicandoDia] = useState<DiaUI | null>(null);
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);
  const [plantillaGuardada, setPlantillaGuardada] = useState("");
  /* Cambiar el orden de los días: se toca uno y luego aquel con el que
   * se intercambia. */
  const [ordenando, setOrdenando] = useState(false);
  const [elegido, setElegido] = useState<DiaUI | null>(null);
  const [ultimoCambio, setUltimoCambio] = useState<{
    ordenA: number;
    ordenB: number;
    nombreA: string;
    nombreB: string;
  } | null>(null);

  /* Semanas existentes (siempre al menos la 1) */
  const semanas = useMemo(() => {
    const set = new Set<number>([1, semanaActual]);
    for (const d of dias) set.add(d.semana);
    return [...set].sort((a, b) => a - b);
  }, [dias, semanaActual]);

  const diasSemana = useMemo(
    () => dias.filter((d) => d.semana === semanaVista),
    [dias, semanaVista]
  );

  /* Volumen por grupo muscular de la semana en vista (series efectivas) */
  const volumen = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const d of diasSemana) {
      for (const e of d.ejercicios) {
        const efectivas = e.series.filter((s) => s.tipo !== "calentamiento").length;
        if (efectivas > 0) {
          mapa.set(e.grupo_muscular, (mapa.get(e.grupo_muscular) ?? 0) + efectivas);
        }
      }
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [diasSemana]);
  const maxVolumen = volumen.length > 0 ? volumen[0][1] : 1;

  function abrirDia(indice: number | null) {
    setIndiceAbierto(indice);
    alEditarDia?.(indice !== null);
  }

  /* --- Recargar la rutina desde la base de datos (tras duplicar) --- */
  async function recargarDias() {
    if (!rutina) return;
    const supabase = crearClienteNavegador();
    const { data } = await supabase
      .from("rutinas")
      .select(SELECT_RUTINA_COMPLETA)
      .eq("id", rutina.id)
      .maybeSingle();
    if (data) {
      const ui = aRutinaUI(data as unknown as FilaRutina);
      setDias(ui.dias);
      setSemanaActual(ui.semana_actual);
      return ui;
    }
    return null;
  }

  /* --- Crear la rutina del cliente si aún no existe --- */
  async function crearRutina() {
    if (!clienteId) return;
    setCargando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.from("rutinas").insert({
      cliente_id: clienteId,
      nombre: nombreCliente ? `Rutina de ${nombreCliente.split(" ")[0]}` : "Rutina",
      activa: true,
    });
    setCargando(false);
    if (error) {
      setError("No se pudo crear la rutina. Inténtalo de nuevo.");
      return;
    }
    router.refresh();
  }

  /* --- Semanas --- */
  async function activarSemana() {
    if (!rutina || !clienteId) return;
    setCargando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("rutinas")
      .update({ semana_actual: semanaVista })
      .eq("id", rutina.id);
    setCargando(false);
    if (error) {
      setError("No se pudo activar la semana.");
      return;
    }
    setSemanaActual(semanaVista);
  }

  /* --- Días --- */
  async function anadirDia() {
    if (!rutina) return;
    setCargando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { data, error } = await supabase
      .from("rutina_dias")
      .insert({
        rutina_id: rutina.id,
        orden: diasSemana.length,
        nombre: `Día ${diasSemana.length + 1}`,
        semana: semanaVista,
      })
      .select("id, orden, nombre, semana")
      .single();
    setCargando(false);
    if (error || !data) {
      setError("No se pudo crear el día. Inténtalo de nuevo.");
      return;
    }
    const nuevo: DiaUI = { ...data, ejercicios: [] };
    setDias((d) => [...d, nuevo]);
    abrirDia(dias.length); // índice dentro de `dias` (se añade al final)
  }

  /**
   * Intercambia dos posiciones de día en TODAS las semanas.
   *
   * Los días de semanas distintas se emparejan por su posición (así
   * funcionan "Igualar las demás", borrar en todas las semanas y el
   * próximo entreno del cliente): cambiar el orden solo en una semana
   * dejaría "el día 1" de la semana 2 emparejado con otro distinto en la
   * semana 3. Las sesiones ya hechas no se tocan: van con el id del día,
   * no con su posición.
   *
   * No hay restricción de orden único en la tabla, así que bastan dos
   * actualizaciones; si falla la segunda se deshace la primera para no
   * dejar dos días con la misma posición.
   */
  async function intercambiarOrdenes(ordenA: number, ordenB: number) {
    const supabase = crearClienteNavegador();
    const idsA = dias.filter((d) => d.orden === ordenA).map((d) => d.id);
    const idsB = dias.filter((d) => d.orden === ordenB).map((d) => d.id);
    const primero = await supabase.from("rutina_dias").update({ orden: ordenB }).in("id", idsA);
    if (primero.error) return false;
    const segundo = await supabase.from("rutina_dias").update({ orden: ordenA }).in("id", idsB);
    if (segundo.error) {
      await supabase.from("rutina_dias").update({ orden: ordenA }).in("id", idsA);
      return false;
    }
    return true;
  }

  async function tocarParaOrdenar(dia: DiaUI) {
    if (!elegido) {
      setElegido(dia);
      return;
    }
    if (elegido.id === dia.id) {
      setElegido(null);
      return;
    }
    setCargando(true);
    setError("");
    const ok = await intercambiarOrdenes(elegido.orden, dia.orden);
    if (!ok) {
      setCargando(false);
      setError("No se pudo cambiar el orden. Inténtalo de nuevo.");
      return;
    }
    await recargarDias();
    setUltimoCambio({
      ordenA: elegido.orden,
      ordenB: dia.orden,
      nombreA: elegido.nombre,
      nombreB: dia.nombre,
    });
    setElegido(null);
    setOrdenando(false);
    setCargando(false);
  }

  async function deshacerCambio() {
    if (!ultimoCambio) return;
    setCargando(true);
    setError("");
    const ok = await intercambiarOrdenes(ultimoCambio.ordenA, ultimoCambio.ordenB);
    if (ok) await recargarDias();
    else setError("No se pudo deshacer. Inténtalo de nuevo.");
    setUltimoCambio(null);
    setCargando(false);
  }

  function salirDeOrdenar() {
    setOrdenando(false);
    setElegido(null);
  }

  async function eliminarDia(dia: DiaUI) {
    if (!confirm(`¿Eliminar «${dia.nombre}» y todos sus ejercicios?`)) return;

    /* El mismo día en las otras semanas: se empareja por posición, igual
     * que al copiar. No se borra solo —sería la única edición que se
     * propaga sin pedir permiso, y sin deshacer— pero preguntarlo aquí
     * ahorra repetir el borrado semana por semana. */
    const gemelos = dias.filter((d) => d.semana !== dia.semana && d.orden === dia.orden);
    let ids = [dia.id];
    if (gemelos.length > 0) {
      const donde = gemelos
        .map((d) => `semana ${d.semana}`)
        .join(", ");
      if (
        confirm(
          `Ese día también existe en ${donde}.\n\n` +
            "¿Lo borro también ahí? Se irían con sus ejercicios y sus cargas.\n\n" +
            "Aceptar = borrar en todas · Cancelar = solo en esta semana"
        )
      ) {
        ids = [dia.id, ...gemelos.map((d) => d.id)];
      }
    }

    const supabase = crearClienteNavegador();
    const { error } = await supabase.from("rutina_dias").delete().in("id", ids);
    if (error) {
      setError("No se pudo eliminar el día.");
      return;
    }
    setDias((d) => d.filter((x) => !ids.includes(x.id)));
    abrirDia(null);
  }

  /**
   * Guardar un día: actualiza el nombre y reescribe sus ejercicios y
   * series. Los campos flexibles (reps "6-10", carga "90 goma azul",
   * RIR "2" o "P+ISO") se descomponen aquí.
   */
  async function guardarDia(indice: number, dia: DiaUI): Promise<boolean> {
    setCargando(true);
    setError("");
    const supabase = crearClienteNavegador();

    const { error: e1 } = await supabase
      .from("rutina_dias")
      .update({ nombre: dia.nombre })
      .eq("id", dia.id);

    const { error: e2 } = await supabase
      .from("rutina_ejercicios")
      .delete()
      .eq("dia_id", dia.id);

    let fallo = !!(e1 || e2);

    if (!fallo) {
      for (let i = 0; i < dia.ejercicios.length && !fallo; i++) {
        const ej = dia.ejercicios[i];
        const { data: fila, error: e3 } = await supabase
          .from("rutina_ejercicios")
          .insert({
            dia_id: dia.id,
            ejercicio_id: ej.ejercicio_id,
            orden: i,
            descanso_seg: ej.descanso_seg,
            notas: ej.notas || null,
            grupo_superserie: ej.grupoSuperserie,
          })
          .select("id")
          .single();
        if (e3 || !fila) {
          fallo = true;
          break;
        }
        if (ej.series.length > 0) {
          const { error: e4 } = await supabase.from("series_prescritas").insert(
            ej.series.map((s, j) => {
              const reps = parsearReps(s.reps);
              const carga = parsearCarga(s.kg);
              const rir = parsearRir(s.rir);
              return {
                rutina_ejercicio_id: fila.id,
                orden: j,
                tipo: s.tipo,
                kg: carga.kg,
                carga_texto: carga.carga_texto,
                reps: reps.reps,
                reps_max: reps.reps_max,
                rir: rir.rir,
                tecnica: rir.tecnica,
              };
            })
          );
          if (e4) fallo = true;
        }
      }
    }

    setCargando(false);
    if (fallo) {
      setError("No se pudo guardar el día. Revisa la conexión e inténtalo de nuevo.");
      return false;
    }
    setDias((d) => d.map((x, i) => (i === indice ? dia : x)));
    return true;
  }

  /* --- Sin rutina todavía --- */
  if (!rutina) {
    return (
      <section className="tarjeta">
        <div className="text-atenuado text-[13.5px] mb-3">
          Sin rutina asignada todavía.
        </div>
        {clienteId && plantillas && (
          <AsignarPlantilla tipo="rutina" plantillas={plantillas} clienteId={clienteId} />
        )}
        {error && <div className="text-peligro text-[13.5px] mb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}
        <button className="ghost w-full" onClick={crearRutina} disabled={cargando}>
          {cargando ? "Creando…" : "+ Crear rutina desde cero"}
        </button>
      </section>
    );
  }

  /* --- Editor de un día abierto --- */
  if (indiceAbierto !== null && dias[indiceAbierto]) {
    return (
      <>
      <EditorDia
        dia={dias[indiceAbierto]}
        biblioteca={biblioteca}
        ejerciciosExcluidos={ejerciciosExcluidos}
        guardando={cargando}
        error={error}
        semanas={semanas}
        onGuardar={(d) => guardarDia(indiceAbierto, d)}
        onVolver={() => abrirDia(null)}
        onEliminar={() => eliminarDia(dias[indiceAbierto])}
        onCopiado={() => {
          recargarDias();
          abrirDia(null);
        }}
        onDuplicar={rutina ? () => setDuplicandoDia(dias[indiceAbierto]) : undefined}
      />
      {duplicandoDia && rutina && (
        <HojaDuplicarDia
          rutinaId={rutina.id}
          dia={duplicandoDia}
          dias={dias}
          onCerrar={() => setDuplicandoDia(null)}
          onHecho={async (aviso) => {
            const semana = duplicandoDia.semana;
            setDuplicandoDia(null);
            await recargarDias();
            abrirDia(null);
            setSemanaVista(semana);
            setError(aviso ?? "");
          }}
        />
      )}
      </>
    );
  }

  /* --- Vista de semanas + días --- */
  return (
    <>
      {/* Selector de semanas (microciclos) */}
      {/* Semanas arriba, acciones debajo, y nada deslizándose: en una
        * sola fila que se deslizaba, "Duplicar" salía cortado y "Igualar
        * las demás" quedaba fuera de la pantalla del móvil sin que nada
        * indicara que existía. */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {semanas.map((s) => (
          <button
            key={s}
            className={semanaVista === s ? "chip chip-activo" : "chip"}
            onClick={() => {
              setSemanaVista(s);
              setError("");
              // Un día elegido de otra semana ya no está en pantalla
              setElegido(null);
            }}
          >
            Semana {s}
            {clienteId && s === semanaActual ? " ●" : ""}
          </button>
        ))}
      </div>
      {/* Tres acciones cortas en una fila. Mientras se ordena se ocultan:
        * la pantalla solo pide una cosa, tocar días. */}
      {!ordenando && (
        <div className="flex gap-2 mb-3">
          <button
            className="tab !text-[12.5px] !px-1 !text-acento !border-acento/40"
            onClick={() => {
              setError("");
              setMostrarDuplicar(true);
            }}
            disabled={cargando}
            title={`Copia la semana ${semanaVista} como semana nueva`}
          >
            ⧉ Duplicar
          </button>
          {semanas.length > 1 && (
            <button
              className="tab !text-[12.5px] !px-1 !text-acento !border-acento/40"
              onClick={() => setMostrarIgualar(true)}
              disabled={cargando}
              title="Deja las demás semanas igual que esta"
            >
              ⇄ Igualar
            </button>
          )}
          {diasSemana.length > 1 && (
            <button
              className="tab !text-[12.5px] !px-1 !text-acento !border-acento/40 flex items-center justify-center gap-1"
              onClick={() => {
                setOrdenando(true);
                setElegido(null);
                setUltimoCambio(null);
                setError("");
              }}
              disabled={cargando}
              title="Cambia el orden de los días"
            >
              <GripVertical size={13} /> Ordenar
            </button>
          )}
        </div>
      )}

      {ordenando && (
        <div className="superficie px-4 py-3 mb-3 flex items-center gap-3 !border-acento/40">
          <ArrowLeftRight size={18} className="text-acento shrink-0" />
          <div className="flex-1 min-w-0 text-[13px] leading-snug">
            {elegido ? (
              <>
                <b>{elegido.nombre}</b> elegido. Ahora toca el día con el que quieres
                cambiarlo.
              </>
            ) : (
              "Toca el día que quieres mover."
            )}
          </div>
          <button className="ghost shrink-0" onClick={salirDeOrdenar} disabled={cargando}>
            Cancelar
          </button>
        </div>
      )}

      {ultimoCambio && !ordenando && (
        <div className="banner banner-accion mb-3 items-center">
          <Check size={15} className="shrink-0" />
          <span className="flex-1 min-w-0">
            <b>{ultimoCambio.nombreA}</b> y <b>{ultimoCambio.nombreB}</b> intercambiados
            {semanas.length > 1 ? ` en las ${semanas.length} semanas` : ""}.
          </span>
          <button
            className="underline underline-offset-2 shrink-0 font-semibold cursor-pointer"
            onClick={deshacerCambio}
            disabled={cargando}
          >
            Deshacer
          </button>
        </div>
      )}

      {mostrarDuplicar && rutina && (
        <HojaDuplicarSemana
          rutinaId={rutina.id}
          semanaOrigen={semanaVista}
          semanaNueva={Math.max(...semanas) + 1}
          diasOrigen={diasSemana}
          nombreCliente={clienteId ? nombreCliente : undefined}
          onCerrar={() => setMostrarDuplicar(false)}
          onHecho={async (nueva, aviso) => {
            setMostrarDuplicar(false);
            await recargarDias();
            setSemanaVista(nueva);
            setError(aviso ?? "");
          }}
        />
      )}

      {mostrarIgualar && rutina && (
        <HojaIgualarSemanas
          rutinaId={rutina.id}
          semanaOrigen={semanaVista}
          dias={dias}
          semanas={semanas}
          onCerrar={() => setMostrarIgualar(false)}
          onHecho={() => {
            setMostrarIgualar(false);
            recargarDias();
          }}
        />
      )}

      {/* Semana activa para el cliente */}
      {clienteId && semanaVista !== semanaActual && (
        <button
          className="w-full bg-transparent border border-dashed border-acento/40 text-acento rounded-[10px] py-2.5 text-[13px] cursor-pointer mb-3"
          onClick={activarSemana}
          disabled={cargando}
        >
          Hacer de la semana {semanaVista} la semana activa del cliente
        </button>
      )}

      {diasSemana.length === 0 && (
        <section className="tarjeta">
          <div className="text-atenuado text-[13.5px]">
            La semana {semanaVista} no tiene días todavía. Crea el primero o
            duplica otra semana.
          </div>
        </section>
      )}

      {diasSemana.map((dia, posicion) => {
        const indiceGlobal = dias.findIndex((d) => d.id === dia.id);
        const efectivas = dia.ejercicios.reduce(
          (a, e) => a + e.series.filter((s) => s.tipo !== "calentamiento").length,
          0
        );
        const esElegido = ordenando && elegido?.id === dia.id;
        const recienMovido =
          !ordenando &&
          ultimoCambio !== null &&
          (dia.orden === ultimoCambio.ordenA || dia.orden === ultimoCambio.ordenB);
        /* El número de sesión, siempre a la vista: es el orden en que el
         * cliente los va a hacer y lo que cambia "Ordenar". */
        const numero = (
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 border ${
              esElegido || recienMovido
                ? "bg-acento text-fondo border-acento"
                : "bg-campo text-texto-2 border-borde-2"
            }`}
          >
            {posicion + 1}
          </span>
        );

        if (ordenando) {
          return (
            <button
              key={dia.id}
              className={`tarjeta !mb-2.5 w-full text-left flex items-center gap-3 anim-pulsable ${
                esElegido ? "!border-acento !bg-acento/[0.08]" : ""
              }`}
              onClick={() => tocarParaOrdenar(dia)}
              disabled={cargando}
            >
              {numero}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15.5px] leading-tight break-words">{dia.nombre}</div>
                <div className="text-atenuado text-[12.5px]">
                  {dia.ejercicios.length} ejercicios · {efectivas} series efectivas
                </div>
              </div>
              {esElegido ? (
                <span className="text-acento text-[12.5px] font-semibold shrink-0">Elegido</span>
              ) : elegido ? (
                <span className="tab !flex-none !px-3 !py-2 !text-[12.5px] shrink-0 flex items-center gap-1 !text-acento !border-acento/40">
                  <ArrowLeftRight size={13} /> Cambiar
                </span>
              ) : (
                <GripVertical size={16} className="text-atenuado shrink-0" />
              )}
            </button>
          );
        }

        return (
          <div
            key={dia.id}
            className={`tarjeta !mb-2.5 flex items-center gap-3 ${recienMovido ? "!border-acento/50" : ""}`}
          >
            {numero}
            <button
              className="flex-1 min-w-0 text-left cursor-pointer"
              onClick={() => abrirDia(indiceGlobal)}
            >
              <div className="font-bold text-[15.5px] leading-tight break-words">{dia.nombre}</div>
              <div className="text-atenuado text-[12.5px]">
                {dia.ejercicios.length} ejercicios · {efectivas} series efectivas
              </div>
            </button>
            {clienteId && (
              <Link
                href={`/clientes/${clienteId}/sesion/${dia.id}`}
                className="text-acento text-[13px] font-semibold shrink-0 flex items-center gap-1"
                title="Registrar esta sesión en directo (entreno presencial)"
              >
                <Play size={13} /> Entrenar
              </Link>
            )}
            <button
              className="text-acento text-[13.5px] shrink-0 cursor-pointer"
              onClick={() => abrirDia(indiceGlobal)}
            >
              Editar →
            </button>
          </div>
        );
      })}

      {error && <div className="text-peligro text-[13.5px] mb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}
      {!ordenando && (
        <button className="cta" onClick={anadirDia} disabled={cargando}>
          + Añadir día a la semana {semanaVista}
        </button>
      )}

      {/* De cliente a Biblioteca: solo en la ficha de un cliente (en una
        * plantilla ya estás en la Biblioteca). */}
      {clienteId && rutina && dias.length > 0 && !ordenando && (
        <>
          {plantillaGuardada && (
            <div className="banner banner-accion mb-3 items-center">
              <Check size={15} className="shrink-0" />
              <span className="flex-1 min-w-0">
                Guardada en Biblioteca › Plantillas como <b>{plantillaGuardada}</b>.
              </span>
              <Link href="/plantillas" className="underline underline-offset-2 shrink-0 font-semibold">
                Ver
              </Link>
            </div>
          )}
          <button
            className="w-full bg-transparent border border-dashed border-acento/40 text-acento rounded-[10px] py-2.5 text-[13px] cursor-pointer flex items-center justify-center gap-1.5 mb-3"
            onClick={() => {
              setPlantillaGuardada("");
              setGuardandoPlantilla(true);
            }}
          >
            <BookmarkPlus size={15} /> Guardar esta rutina como plantilla
          </button>
        </>
      )}
      {guardandoPlantilla && rutina && (
        <HojaGuardarPlantilla
          rutinaId={rutina.id}
          nombreRutina={rutina.nombre}
          nombreCliente={nombreCliente ?? ""}
          semanas={semanas.length}
          onCerrar={() => setGuardandoPlantilla(false)}
          onHecho={(nombre) => {
            setGuardandoPlantilla(false);
            setPlantillaGuardada(nombre);
          }}
        />
      )}

      {/* Volumen semanal por músculo (calculado automáticamente) */}
      {volumen.length > 0 && (
        <section className="tarjeta">
          <div className="titulo-tarjeta">
            VOLUMEN · SERIES EFECTIVAS · SEMANA {semanaVista}
          </div>
          {volumen.map(([grupo, n]) => (
            <div key={grupo} className="flex items-center gap-2.5 py-1.5">
              <span className="text-[13px] w-[110px] shrink-0">{grupo}</span>
              <div className="flex-1 h-2 rounded bg-borde-2 overflow-hidden">
                <div
                  className="h-full bg-acento/80"
                  style={{ width: `${(n / maxVolumen) * 100}%` }}
                />
              </div>
              <span className="text-[13px] font-bold w-6 text-right">{n}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}


/* ============================================================
   Hoja inferior: dejar las demás semanas igual que la que se ve.
   Es la única acción del editor que BORRA días, así que enseña
   exactamente cuáles antes de tocar nada.
   ============================================================ */
function HojaIgualarSemanas({
  rutinaId,
  semanaOrigen,
  dias,
  semanas,
  onCerrar,
  onHecho,
}: {
  rutinaId: string;
  semanaOrigen: number;
  dias: DiaUI[];
  semanas: number[];
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const otras = semanas.filter((s) => s !== semanaOrigen);
  const [elegidas, setElegidas] = useState<number[]>(otras);
  const [incluirCargas, setIncluirCargas] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");

  const diasOrigen = dias.filter((d) => d.semana === semanaOrigen);
  const maxOrden = Math.max(...diasOrigen.map((d) => d.orden), -1);

  /* Lo que se va a borrar: los días que sobran en cada semana elegida */
  const sobran = elegidas.flatMap((s) =>
    dias
      .filter((d) => d.semana === s && d.orden > maxOrden)
      .map((d) => ({ semana: s, nombre: d.nombre || "(sin nombre)" }))
  );

  const alternar = (s: number) =>
    setElegidas((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s].sort((a, b) => a - b)
    );

  async function igualar() {
    if (elegidas.length === 0) return;
    setTrabajando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { error: e } = await supabase.rpc("sincronizar_semana", {
      p_rutina: rutinaId,
      p_semana_origen: semanaOrigen,
      p_semanas: elegidas,
      p_incluir_cargas: incluirCargas,
    });
    if (e) {
      setTrabajando(false);
      setError("No se pudo igualar. Inténtalo de nuevo.");
      return;
    }
    /* No se suelta el bloqueo: hasta que la rutina se relea, otra
     * pulsación repetiría el borrado y la copia. */
    onHecho();
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
        <div className="flex justify-between items-center mb-3">
          <div className="titulo-tarjeta !m-0">IGUALAR A LA SEMANA {semanaOrigen}</div>
          <button className="ghost" onClick={onCerrar}>
            Cerrar
          </button>
        </div>

        <p className="text-texto-2 text-[13.5px] leading-relaxed mb-3.5">
          Las semanas que elijas quedarán con los mismos{" "}
          <b>
            {diasOrigen.length} {diasOrigen.length === 1 ? "día" : "días"}
          </b>{" "}
          que la semana {semanaOrigen}, en el mismo orden.
        </p>

        <div className="titulo-tarjeta">Semanas</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {otras.map((s) => (
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
            Los kilos y las reps que ya tuvieras ajustados en esas semanas{" "}
            <b>se conservan</b>.
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
            <b className="text-aviso">Pisa las progresiones</b> que hubiera.
          </div>
        </button>

        {sobran.length > 0 && (
          <div className="tarjeta !border-peligro/50 !mb-4">
            <div className="titulo-tarjeta !text-peligro">
              SE BORRARÁN {sobran.length} {sobran.length === 1 ? "DÍA" : "DÍAS"}
            </div>
            {sobran.map((d, i) => (
              <div key={i} className="text-[13.5px] py-0.5">
                <b>{d.nombre}</b> <span className="text-atenuado">· semana {d.semana}</span>
              </div>
            ))}
            <p className="text-atenuado text-[12px] mt-2 leading-relaxed">
              Los entrenos que el cliente ya tenga registrados de esos días no se
              borran: siguen en su historial con sus series.
            </p>
          </div>
        )}

        {error && <div className="text-peligro text-[13.5px] mb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}

        <button
          className="cta !mb-0"
          onClick={igualar}
          disabled={trabajando || elegidas.length === 0}
        >
          {trabajando
            ? "Igualando…"
            : elegidas.length === 0
              ? "Elige al menos una semana"
              : `Igualar ${elegidas.length} ${elegidas.length === 1 ? "semana" : "semanas"}`}
        </button>
      </div>
    </div>
  );
}
