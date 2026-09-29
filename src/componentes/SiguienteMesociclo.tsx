"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CalendarClock, CopyPlus, X } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { copiarRutina } from "@/lib/copiarPlan";
import { avisarCambio } from "@/lib/avisos";
import type { RutinaUI } from "@/lib/tipos";

interface Subida {
  ejercicioId: string;
  nombre: string;
  antes: number;
  despues: number;
  mejor: number;
}

const kg = (n: number) => String(n).replace(".", ",");

/** "Mesociclo 2" → "Mesociclo 3"; si no acaba en número, "… · 2" */
function nombreSiguiente(nombre: string): string {
  const m = nombre.match(/^(.*?)(\d+)(\D*)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}${m[3]}` : `${nombre} · 2`;
}

/**
 * Siguiente mesociclo en un toque: copia la rutina entera (mismos días,
 * ejercicios y series), empieza en la semana 1 y sube los kilos de
 * partida de los ejercicios en los que ha progresado: su mejor marca de
 * las últimas 4 semanas, menos un 10 % de margen, como mucho +20 %.
 * Nunca baja kilos. La rutina anterior queda guardada, sin activar.
 */
export default function SiguienteMesociclo({ rutina, clienteId }: { rutina: RutinaUI; clienteId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [subidas, setSubidas] = useState<Subida[] | null>(null);
  /* ¿Lleva kilos pautados? (si pautas solo reps y RIR, no hay nada que subir) */
  const [conKilos, setConKilos] = useState(true);
  const [nombre, setNombre] = useState(() => nombreSiguiente(rutina.nombre));
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  const total = Math.max(1, ...rutina.dias.map((d) => d.semana));
  if (total < 2) return null;
  const alFinal = rutina.semana_actual >= total - 1;

  async function abrir() {
    setAbierto(true);
    setError("");
    setCargando(true);
    const hace28 = new Date();
    hace28.setDate(hace28.getDate() - 28);
    const { data } = await crearClienteNavegador()
      .from("sesiones")
      .select("series_realizadas ( kg, completada, tipo, ejercicio_sustituto_id, rutina_ejercicios ( ejercicio_id ) )")
      .eq("cliente_id", clienteId)
      .gte("fecha_inicio", hace28.toISOString());
    const mejor = new Map<string, number>();
    for (const s of data ?? []) {
      for (const x of (s.series_realizadas ?? []) as unknown as {
        kg: number | null;
        completada: boolean;
        tipo: string;
        ejercicio_sustituto_id: string | null;
        rutina_ejercicios: { ejercicio_id: string } | null;
      }[]) {
        const id = x.rutina_ejercicios?.ejercicio_id;
        if (!id || !x.completada || x.kg === null || x.tipo === "calentamiento" || x.ejercicio_sustituto_id) continue;
        mejor.set(id, Math.max(mejor.get(id) ?? 0, Number(x.kg)));
      }
    }
    /* Kilos pautados en la semana 1 del mesociclo que termina */
    const semana1 = Math.min(...rutina.dias.map((d) => d.semana));
    const pautado = new Map<string, { nombre: string; kg: number }>();
    for (const d of rutina.dias.filter((x) => x.semana === semana1)) {
      for (const e of d.ejercicios) {
        const kgs = e.series.filter((s) => s.tipo !== "calentamiento").map((s) => Number(String(s.kg).replace(",", ".")));
        const max = Math.max(0, ...kgs.filter((n) => Number.isFinite(n)));
        if (max > 0) pautado.set(e.ejercicio_id, { nombre: e.nombre, kg: Math.max(max, pautado.get(e.ejercicio_id)?.kg ?? 0) });
      }
    }
    setConKilos(pautado.size > 0);
    const lista: Subida[] = [];
    for (const [id, p] of pautado) {
      const m = mejor.get(id);
      if (!m || m * 0.9 <= p.kg) continue;
      const f = Math.min(1.2, (m * 0.9) / p.kg);
      const despues = Math.round(p.kg * f * 2) / 2;
      if (despues > p.kg) lista.push({ ejercicioId: id, nombre: p.nombre, antes: p.kg, despues, mejor: m });
    }
    setSubidas(lista.sort((a, b) => b.despues / b.antes - a.despues / a.antes));
    setCargando(false);
  }

  async function crear() {
    if (!subidas || !nombre.trim()) return;
    setCreando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const factorKg = new Map(subidas.map((s) => [s.ejercicioId, s.despues / s.antes]));
    const nuevaId = await copiarRutina(
      supabase,
      rutina.id,
      { nombre: nombre.trim(), cliente_id: clienteId, es_plantilla: false, activa: false },
      { semanaInicial: Math.min(...rutina.dias.map((d) => d.semana)), factorKg }
    );
    if (!nuevaId) {
      setCreando(false);
      setError("No se ha podido crear. Inténtalo de nuevo.");
      return;
    }
    /* La nueva pasa a ser la activa; la anterior queda guardada */
    const { error: e1 } = await supabase.from("rutinas").update({ activa: false }).eq("id", rutina.id);
    const { error: e2 } = e1 ? { error: e1 } : await supabase.from("rutinas").update({ activa: true }).eq("id", nuevaId);
    if (e2) {
      await supabase.from("rutinas").update({ activa: true }).eq("id", rutina.id);
      await supabase.from("rutinas").delete().eq("id", nuevaId);
      setCreando(false);
      setError("No se ha podido activar. Inténtalo de nuevo.");
      return;
    }
    avisarCambio(clienteId, "rutina");
    setCreando(false);
    setAbierto(false);
    router.refresh();
  }

  return (
    <>
      <button
        className={`w-full flex items-center gap-3 rounded-[12px] px-3.5 py-3 mb-3 text-left cursor-pointer anim-pulsable border ${
          alFinal ? "bg-morado/10 border-morado/50" : "bg-panel border-borde"
        }`}
        onClick={abrir}
      >
        <CalendarClock size={18} className={alFinal ? "text-morado shrink-0" : "text-atenuado shrink-0"} />
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-semibold">Crear el siguiente mesociclo</span>
          <span className="block text-atenuado text-[12px]">
            Va por la semana {rutina.semana_actual} de {total}
            {alFinal ? " · toca preparar el siguiente" : ""}
          </span>
        </span>
        <CopyPlus size={16} className="text-acento shrink-0" />
      </button>

      {abierto && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
          onClick={() => !creando && setAbierto(false)}
        >
          <div
            className="w-full max-w-[560px] max-h-[88dvh] overflow-y-auto bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] anim-hoja-sube"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[16px]">Siguiente mesociclo</div>
                <div className="text-atenuado text-[12.5px] leading-snug">
                  Misma rutina ({total} semanas), empezando en la semana 1, con los kilos de partida según lo que levanta ahora.
                </div>
              </div>
              <button className="ghost shrink-0 !px-2" onClick={() => setAbierto(false)} disabled={creando} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <div className="text-[12.5px] text-atenuado mb-1">Nombre</div>
            <input
              className="input !mb-3"
              value={nombre}
              maxLength={80}
              onChange={(e) => setNombre(e.target.value)}
              disabled={creando}
            />

            <div className="titulo-tarjeta !mb-1.5">KILOS QUE SUBEN</div>
            {cargando || !subidas ? (
              <div className="text-atenuado text-[13px] py-3 animate-pulse">Mirando sus últimas 4 semanas…</div>
            ) : !conKilos ? (
              <div className="text-atenuado text-[13px] py-2 leading-snug">
                Esta rutina no lleva kilos pautados: en cada ejercicio le saldrá lo que levantó la última vez, así que empieza
                desde sus marcas.
              </div>
            ) : subidas.length === 0 ? (
              <div className="text-atenuado text-[13px] py-2 leading-snug">
                Ningún ejercicio ha superado lo pautado con margen: se copia con los mismos kilos.
              </div>
            ) : (
              <div className="superficie px-3 mb-1">
                {subidas.map((s) => (
                  <div key={s.ejercicioId} className="flex items-center gap-2 py-2 border-b border-borde last:border-0 text-[13.5px]">
                    <span className="flex-1 min-w-0 break-words leading-tight">
                      {s.nombre}
                      <span className="block text-atenuado text-[11.5px]">su mejor: {kg(s.mejor)} kg</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <span className="text-atenuado">{kg(s.antes)}</span>
                      <ArrowRight size={12} className="inline mx-1 text-atenuado" />
                      <b className="text-acento">{kg(s.despues)} kg</b>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-atenuado text-[11.5px] mt-2 mb-4 leading-snug">
              Semana 1 del nuevo mesociclo; las demás semanas suben en la misma proporción. Luego lo retocas en el editor. La rutina
              actual queda guardada.
            </div>

            {error && (
              <div className="text-peligro text-[13px] mb-2 flex items-start gap-1.5">
                <AlertCircle size={14} className="shrink-0 mt-[3px]" />
                <span className="min-w-0">{error}</span>
              </div>
            )}
            <button className="cta !mb-0" onClick={crear} disabled={creando || cargando || !nombre.trim()}>
              {creando ? "Creando…" : "Crear y activar"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
