"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { aNumero } from "@/lib/rutinas";
import EditorDia from "./EditorDia";
import type { DiaUI, Ejercicio, RutinaUI } from "@/lib/tipos";

/**
 * Editor de rutina: lista de días + editor de día estilo Hevy.
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
  const [indiceAbierto, setIndiceAbierto] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  function abrirDia(indice: number | null) {
    setIndiceAbierto(indice);
    alEditarDia?.(indice !== null);
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
        orden: dias.length,
        nombre: `Día ${dias.length + 1}`,
      })
      .select("id, orden, nombre")
      .single();
    setCargando(false);
    if (error || !data) {
      setError("No se pudo crear el día. Inténtalo de nuevo.");
      return;
    }
    const nuevo: DiaUI = { ...data, ejercicios: [] };
    setDias((d) => [...d, nuevo]);
    abrirDia(dias.length);
  }

  async function eliminarDia(indice: number) {
    const dia = dias[indice];
    if (!confirm(`¿Eliminar «${dia.nombre}» y todos sus ejercicios?`)) return;
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("rutina_dias")
      .delete()
      .eq("id", dia.id);
    if (error) {
      setError("No se pudo eliminar el día.");
      return;
    }
    setDias((d) => d.filter((_, i) => i !== indice));
    abrirDia(null);
  }

  /**
   * Guardar un día: actualiza el nombre y reescribe sus ejercicios
   * y series (borrado + inserción, sencillo y consistente).
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
            ej.series.map((s, j) => ({
              rutina_ejercicio_id: fila.id,
              orden: j,
              tipo: s.tipo,
              kg: aNumero(s.kg),
              reps: aNumero(s.reps),
              rir: aNumero(s.rir),
            }))
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
        {error && (
          <div className="text-peligro text-[13.5px] mb-3">— {error}</div>
        )}
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
        onEliminar={() => eliminarDia(indiceAbierto)}
      />
    );
  }

  /* --- Lista de días --- */
  return (
    <>
      {dias.length === 0 && (
        <section className="tarjeta">
          <div className="text-atenuado text-[13.5px]">
            Sin días de entreno todavía. Crea el primer día.
          </div>
        </section>
      )}
      {dias.map((dia, i) => {
        const efectivas = dia.ejercicios.reduce(
          (a, e) => a + e.series.filter((s) => s.tipo !== "calentamiento").length,
          0
        );
        return (
          <button
            key={dia.id}
            className="tarjeta !mb-2.5 w-full text-left flex items-center gap-3.5 cursor-pointer"
            onClick={() => abrirDia(i)}
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
      {error && (
        <div className="text-peligro text-[13.5px] mb-3">— {error}</div>
      )}
      <button className="cta" onClick={anadirDia} disabled={cargando}>
        + Añadir día de entreno
      </button>
    </>
  );
}
