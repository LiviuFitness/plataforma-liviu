"use client";

import { AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import {
  MODOS_PROGRESION,
  describirSerie,
  progresar,
  progresarSerieUI,
  type ModoProgresion,
  type SerieBD,
} from "@/lib/progresion";
import type { DiaUI } from "@/lib/tipos";

interface FilaSerie extends SerieBD {
  id: string;
}

/**
 * Duplicar una semana con progresión: se copia con la función de siempre
 * (duplicar_semana) y, si se ha elegido una regla, se aplica justo
 * después a las series efectivas de la semana NUEVA. La original no se
 * toca nunca.
 *
 * La vista previa usa la misma regla que lo que se guarda
 * (lib/progresion.ts), así que lo que se ve es lo que queda.
 */
export default function HojaDuplicarSemana({
  rutinaId,
  semanaOrigen,
  semanaNueva,
  diasOrigen,
  nombreCliente,
  onCerrar,
  onHecho,
}: {
  rutinaId: string;
  semanaOrigen: number;
  semanaNueva: number;
  diasOrigen: DiaUI[];
  /** Solo en la ficha de un cliente: la semana nueva pasa a ser la suya. */
  nombreCliente?: string;
  onCerrar: () => void;
  /** `aviso` solo si la semana se creó pero la progresión no entró entera. */
  onHecho: (semana: number, aviso?: string) => void;
}) {
  const [modo, setModo] = useState<ModoProgresion>("igual");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");

  /* Cuántas series cambian y un par de ejemplos reales de la semana */
  const { cambian, ejemplos } = useMemo(() => {
    let n = 0;
    const ej: { nombre: string; antes: string; despues: string }[] = [];
    for (const dia of diasOrigen) {
      for (const e of dia.ejercicios) {
        let primero = true;
        for (const s of e.series) {
          const nueva = progresarSerieUI(s, modo);
          if (!nueva) continue;
          n++;
          if (primero && ej.length < 3 && !ej.some((x) => x.nombre === e.nombre)) {
            ej.push({ nombre: e.nombre, antes: describirSerie(s), despues: describirSerie(nueva) });
            primero = false;
          }
        }
      }
    }
    return { cambian: n, ejemplos: ej };
  }, [diasOrigen, modo]);

  async function crear() {
    setTrabajando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { data: nueva, error: e1 } = await supabase.rpc("duplicar_semana", {
      p_rutina: rutinaId,
      p_semana: semanaOrigen,
    });
    if (e1 || typeof nueva !== "number") {
      setTrabajando(false);
      setError("No se pudo duplicar la semana. Inténtalo de nuevo.");
      return;
    }

    if (modo !== "igual") {
      const { data: filas, error: e2 } = await supabase
        .from("rutina_dias")
        .select(
          "rutina_ejercicios ( series_prescritas ( id, tipo, kg, reps, reps_max, rir, tecnica, carga_texto ) )"
        )
        .eq("rutina_id", rutinaId)
        .eq("semana", nueva);

      /* Se agrupan las series que reciben el mismo cambio: así son unas
       * pocas actualizaciones (una por valor distinto) y no una por serie. */
      const grupos = new Map<string, { cambio: Partial<SerieBD>; ids: string[] }>();
      for (const d of (filas ?? []) as unknown as {
        rutina_ejercicios: { series_prescritas: FilaSerie[] }[];
      }[]) {
        for (const e of d.rutina_ejercicios ?? []) {
          for (const s of e.series_prescritas ?? []) {
            const cambio = progresar({ ...s, kg: s.kg === null ? null : Number(s.kg) }, modo);
            if (!cambio) continue;
            const clave = JSON.stringify(cambio);
            const g = grupos.get(clave) ?? { cambio, ids: [] as string[] };
            g.ids.push(s.id);
            grupos.set(clave, g);
          }
        }
      }
      const resultados = await Promise.all(
        [...grupos.values()].map((g) =>
          supabase.from("series_prescritas").update(g.cambio).in("id", g.ids)
        )
      );
      if (e2 || resultados.some((r) => r.error)) {
        /* La semana ya existe: se avisa en vez de borrarla, para no perder
         * lo copiado. Lo que no se ajustó se corrige a mano. */
        setTrabajando(false);
        onHecho(
          nueva,
          `La semana ${nueva} se creó, pero la progresión no se aplicó a todas las series. Revísala antes de que la vea el cliente.`
        );
        return;
      }
    }

    setTrabajando(false);
    onHecho(nueva);
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
          <div className="titulo-seccion !mb-0">
            Duplicar semana {semanaOrigen} → semana {semanaNueva}
          </div>
          <button className="ghost" onClick={onCerrar} disabled={trabajando}>
            Cerrar
          </button>
        </div>

        {MODOS_PROGRESION.map((m) => {
          const activa = modo === m.clave;
          return (
            <button
              key={m.clave}
              className={`superficie px-4 py-3 mb-2 flex items-start gap-3 text-left w-full cursor-pointer ${
                activa ? "!border-acento !bg-acento/[0.07]" : ""
              }`}
              onClick={() => setModo(m.clave)}
              aria-pressed={activa}
            >
              <span
                className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                  activa ? "border-acento" : "border-borde-2"
                }`}
              >
                {activa && <span className="w-2.5 h-2.5 rounded-full bg-acento" />}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-[14px] leading-tight">{m.titulo}</span>
                <span className="block text-atenuado text-[12.5px] leading-snug mt-0.5">
                  {m.detalle}
                </span>
              </span>
            </button>
          );
        })}

        {modo !== "igual" && (
          <>
            <div className="flex items-baseline justify-between mt-3 mb-1.5">
              <span className="text-atenuado text-[11.5px] font-bold uppercase tracking-[0.06em]">
                Así queda
              </span>
              <span className="text-atenuado text-[12px]">
                {cambian} {cambian === 1 ? "serie cambia" : "series cambian"}
              </span>
            </div>
            {ejemplos.length === 0 ? (
              <div className="superficie px-4 py-3 mb-4 text-atenuado text-[13px]">
                Con esta regla no cambia ninguna serie de la semana {semanaOrigen}
                {modo === "rir" ? " (ya están todas en RIR 0 o llevan técnica)." : "."}
              </div>
            ) : (
              <div className="superficie px-4 mb-4">
                {ejemplos.map((e) => (
                  <div key={e.nombre} className="py-2.5 border-b border-borde last:border-b-0">
                    <div className="text-[13px] font-semibold break-words">{e.nombre}</div>
                    <div className="text-[12.5px] text-atenuado break-words">
                      {e.antes} <span className="text-acento">→</span>{" "}
                      <b className="text-texto-2">{e.despues}</b>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {nombreCliente && (
          <p className="text-atenuado text-[12.5px] mb-3 mt-1">
            La semana {semanaNueva} pasa a ser la activa de {nombreCliente}.
          </p>
        )}

        {error && <div className="text-peligro text-[13.5px] mb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}
        <button className="cta !mb-0" onClick={crear} disabled={trabajando}>
          {trabajando ? "Creando…" : `Crear semana ${semanaNueva}`}
        </button>
      </div>
    </div>
  );
}
