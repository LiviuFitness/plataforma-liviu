"use client";

import { useMemo, useState } from "react";
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

/**
 * Editor de rutina: semanas (microciclos) duplicables, lista de días,
 * panel de volumen por músculo y editor de día estilo Hevy.
 * Se usa tanto en la ficha del cliente como en las plantillas.
 */
export default function EditorRutina({
  rutina,
  clienteId,
  nombreCliente,
  biblioteca,
  alEditarDia,
}: {
  rutina: RutinaUI | null;
  clienteId?: string | null; // null => plantilla
  nombreCliente?: string;
  biblioteca: Ejercicio[];
  alEditarDia?: (editando: boolean) => void;
}) {
  const router = useRouter();
  const [dias, setDias] = useState<DiaUI[]>(rutina?.dias ?? []);
  const [semanaActual, setSemanaActual] = useState(rutina?.semana_actual ?? 1);
  const [semanaVista, setSemanaVista] = useState(rutina?.semana_actual ?? 1);
  const [indiceAbierto, setIndiceAbierto] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

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
  async function duplicarSemana() {
    if (!rutina) return;
    if (
      !confirm(
        `¿Duplicar la semana ${semanaVista} como semana nueva? Se copia tal cual para que ajustes las progresiones.`
      )
    )
      return;
    setCargando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { data, error } = await supabase.rpc("duplicar_semana", {
      p_rutina: rutina.id,
      p_semana: semanaVista,
    });
    if (error) {
      setCargando(false);
      setError("No se pudo duplicar la semana. Inténtalo de nuevo.");
      return;
    }
    const ui = await recargarDias();
    setCargando(false);
    if (ui && typeof data === "number") setSemanaVista(data);
  }

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

  async function eliminarDia(dia: DiaUI) {
    if (!confirm(`¿Eliminar «${dia.nombre}» y todos sus ejercicios?`)) return;
    const supabase = crearClienteNavegador();
    const { error } = await supabase.from("rutina_dias").delete().eq("id", dia.id);
    if (error) {
      setError("No se pudo eliminar el día.");
      return;
    }
    setDias((d) => d.filter((x) => x.id !== dia.id));
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
          Sin rutina asignada todavía. Crea la primera desde cero o asigna una
          plantilla desde la pantalla «Plantillas».
        </div>
        {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}
        <button className="cta !mb-0" onClick={crearRutina} disabled={cargando}>
          {cargando ? "Creando…" : "+ Crear rutina desde cero"}
        </button>
      </section>
    );
  }

  /* --- Editor de un día abierto --- */
  if (indiceAbierto !== null && dias[indiceAbierto]) {
    return (
      <EditorDia
        dia={dias[indiceAbierto]}
        biblioteca={biblioteca}
        guardando={cargando}
        error={error}
        onGuardar={(d) => guardarDia(indiceAbierto, d)}
        onVolver={() => abrirDia(null)}
        onEliminar={() => eliminarDia(dias[indiceAbierto])}
      />
    );
  }

  /* --- Vista de semanas + días --- */
  return (
    <>
      {/* Selector de semanas (microciclos) */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1">
        {semanas.map((s) => (
          <button
            key={s}
            className={semanaVista === s ? "chip chip-activo" : "chip"}
            onClick={() => {
              setSemanaVista(s);
              setError("");
            }}
          >
            Semana {s}
            {clienteId && s === semanaActual ? " ●" : ""}
          </button>
        ))}
        <button
          className="chip !border-acento/40 !text-acento"
          onClick={duplicarSemana}
          disabled={cargando}
          title="Copia la semana en vista como semana nueva"
        >
          ⧉ Duplicar semana
        </button>
      </div>

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

      {diasSemana.map((dia) => {
        const indiceGlobal = dias.findIndex((d) => d.id === dia.id);
        const efectivas = dia.ejercicios.reduce(
          (a, e) => a + e.series.filter((s) => s.tipo !== "calentamiento").length,
          0
        );
        return (
          <button
            key={dia.id}
            className="tarjeta !mb-2.5 w-full text-left flex items-center gap-3.5 cursor-pointer"
            onClick={() => abrirDia(indiceGlobal)}
          >
            <div className="flex-1">
              <div className="font-bold text-[15.5px]">{dia.nombre}</div>
              <div className="text-atenuado text-[12.5px]">
                {dia.ejercicios.length} ejercicios · {efectivas} series efectivas
              </div>
            </div>
            <span className="text-acento text-[13.5px]">Editar →</span>
          </button>
        );
      })}

      {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}
      <button className="cta" onClick={anadirDia} disabled={cargando}>
        + Añadir día a la semana {semanaVista}
      </button>

      {/* Volumen semanal por músculo (calculado automáticamente) */}
      {volumen.length > 0 && (
        <section className="tarjeta">
          <div className="titulo-tarjeta">
            VOLUMEN — SERIES EFECTIVAS · SEMANA {semanaVista}
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
