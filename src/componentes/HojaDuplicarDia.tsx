"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import type { DiaUI } from "@/lib/tipos";

/** "Torso A" → "Torso B" · "Pierna" → "Pierna (copia)". */
function nombreSugerido(nombre: string): string {
  const m = nombre.trim().match(/^(.*\s)([A-Y])$/);
  if (m) return m[1] + String.fromCharCode(m[2].charCodeAt(0) + 1);
  return `${nombre.trim()} (copia)`;
}

interface FilaEjercicio {
  ejercicio_id: string;
  orden: number;
  descanso_seg: number;
  notas: string | null;
  grupo_superserie: string | null;
  series_prescritas: {
    orden: number;
    tipo: string;
    kg: number | null;
    reps: number | null;
    rir: number | null;
    reps_max: number | null;
    tecnica: string | null;
    carga_texto: string | null;
  }[];
}

/**
 * Duplicar un día: crea uno nuevo con los mismos ejercicios y series
 * para usarlo de punto de partida ("Torso A" → "Torso B"). El original
 * no se toca.
 *
 * Con "en todas las semanas", cada semana copia SU versión del día (con
 * sus cargas y RIR de esa semana), y el día nuevo ocupa la misma
 * posición en todas: los días se emparejan entre semanas por posición,
 * y así el nuevo queda emparejado como los demás.
 */
export default function HojaDuplicarDia({
  rutinaId,
  dia,
  dias,
  onCerrar,
  onHecho,
}: {
  rutinaId: string;
  dia: DiaUI;
  /** Todos los días de la rutina, de todas las semanas. */
  dias: DiaUI[];
  onCerrar: () => void;
  /** `aviso` solo si el día se creó pero no entero. */
  onHecho: (aviso?: string) => void;
}) {
  const gemelos = dias.filter((d) => d.orden === dia.orden);
  const [nombre, setNombre] = useState(nombreSugerido(dia.nombre));
  const [enTodas, setEnTodas] = useState(gemelos.length > 1);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");

  async function duplicar() {
    if (!nombre.trim()) {
      setError("Ponle nombre al día nuevo.");
      return;
    }
    setTrabajando(true);
    setError("");
    const supabase = crearClienteNavegador();
    /* Una posición libre por encima de todas, la misma en cada semana */
    const nuevoOrden = Math.max(...dias.map((d) => d.orden), -1) + 1;
    const origenes = enTodas ? gemelos : [dia];

    for (const origen of origenes) {
      const { data: ejercicios, error: e1 } = await supabase
        .from("rutina_ejercicios")
        .select(
          "ejercicio_id, orden, descanso_seg, notas, grupo_superserie, series_prescritas ( orden, tipo, kg, reps, rir, reps_max, tecnica, carga_texto )"
        )
        .eq("dia_id", origen.id)
        .order("orden");
      const { data: nuevoDia, error: e2 } = await supabase
        .from("rutina_dias")
        .insert({ rutina_id: rutinaId, orden: nuevoOrden, nombre: nombre.trim(), semana: origen.semana })
        .select("id")
        .single();
      if (e1 || e2 || !nuevoDia) {
        setTrabajando(false);
        setError("No se pudo duplicar el día. Revisa la rutina e inténtalo de nuevo.");
        return;
      }

      const lista = (ejercicios ?? []) as unknown as FilaEjercicio[];
      if (lista.length === 0) continue;
      const { data: nuevos, error: e3 } = await supabase
        .from("rutina_ejercicios")
        .insert(
          /* Posiciones 0, 1, 2… en el orden en que venían: si dos
           * ejercicios compartían número (datos antiguos), emparejar las
           * series por la posición original las mezclaría. */
          lista.map((e, i) => ({
            dia_id: nuevoDia.id,
            ejercicio_id: e.ejercicio_id,
            orden: i,
            descanso_seg: e.descanso_seg,
            notas: e.notas,
            grupo_superserie: e.grupo_superserie,
          }))
        )
        .select("id, orden");
      if (e3 || !nuevos) {
        setTrabajando(false);
        onHecho("El día se creó, pero sin todos sus ejercicios. Revísalo.");
        return;
      }
      /* Cada serie va al ejercicio nuevo que ocupa su misma posición */
      const idPorOrden = new Map(nuevos.map((n) => [n.orden as number, n.id as string]));
      const series = lista.flatMap((e, i) =>
        (e.series_prescritas ?? []).map((s) => ({ ...s, rutina_ejercicio_id: idPorOrden.get(i) }))
      );
      if (series.length > 0) {
        const { error: e4 } = await supabase.from("series_prescritas").insert(series);
        if (e4) {
          setTrabajando(false);
          onHecho("El día se creó, pero sin todas sus series. Revísalo.");
          return;
        }
      }
    }

    setTrabajando(false);
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
          <div className="titulo-seccion !mb-0 break-words min-w-0">Duplicar «{dia.nombre}»</div>
          <button className="ghost shrink-0" onClick={onCerrar} disabled={trabajando}>
            Cerrar
          </button>
        </div>
        <p className="text-atenuado text-[12.5px] mb-3">
          Se crea un día nuevo con los mismos ejercicios y series, para que lo
          ajustes. El original no se toca.
        </p>

        <label className="text-[13px] text-texto-2 block mb-1" htmlFor="nombre-dia-nuevo">
          Nombre del día nuevo
        </label>
        <input
          id="nombre-dia-nuevo"
          className="input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        {gemelos.length > 1 && (
          <button
            className="superficie px-4 mb-4 w-full text-left cursor-pointer"
            onClick={() => setEnTodas((v) => !v)}
            aria-pressed={enTodas}
          >
            <span className="fila">
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                  enTodas ? "bg-acento border-acento text-fondo" : "border-borde-2"
                }`}
              >
                {enTodas && <Check size={13} strokeWidth={3} />}
              </span>
              <span className="flex-1 text-[13.5px] leading-snug">
                {enTodas
                  ? `En las ${gemelos.length} semanas, al final de cada una`
                  : `Solo en la semana ${dia.semana}`}
              </span>
            </span>
          </button>
        )}

        {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}
        <button className="cta !mb-0" onClick={duplicar} disabled={trabajando}>
          {trabajando ? "Duplicando…" : "Duplicar día"}
        </button>
      </div>
    </div>
  );
}
