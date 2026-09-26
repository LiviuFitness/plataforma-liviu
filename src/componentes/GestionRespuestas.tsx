"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2, Zap, AlertCircle } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

export interface RespuestaRapida {
  id: string;
  texto: string;
  orden: number;
}

/**
 * Respuestas rápidas del chat, en Ajustes: las frases que salen encima
 * del cuadro de escribir en el chat de cada cliente. Cada cambio se
 * guarda al momento (el texto, al salir del campo).
 */
export default function GestionRespuestas({
  respuestas: iniciales,
  disponible,
}: {
  respuestas: RespuestaRapida[];
  /** false si la tabla aún no existe: falta aplicar la migración. */
  disponible: boolean;
}) {
  const router = useRouter();
  const [respuestas, setRespuestas] = useState(iniciales);
  const [nueva, setNueva] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  /* Lo que se está escribiendo en cada fila; se guarda al salir del campo */
  const [textos, setTextos] = useState<Record<string, string>>({});

  if (!disponible) {
    return (
      <div className="superficie px-4 py-3.5 text-[13px] text-texto-2 leading-relaxed">
        Falta un paso para activarlas: pegar en Supabase el SQL{" "}
        <b>20260925100000_respuestas_rapidas.sql</b>. Mientras tanto el chat
        funciona igual, sin ellas.
      </div>
    );
  }

  async function anadir() {
    const texto = nueva.trim();
    if (!texto) return;
    setTrabajando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const orden = respuestas.length > 0 ? Math.max(...respuestas.map((r) => r.orden)) + 1 : 0;
    const { data, error } = await supabase
      .from("respuestas_rapidas")
      .insert({ texto, orden })
      .select("id, texto, orden")
      .single();
    setTrabajando(false);
    if (error || !data) {
      setError("No se pudo añadir. Inténtalo de nuevo.");
      return;
    }
    setRespuestas([...respuestas, data as RespuestaRapida]);
    setNueva("");
    router.refresh();
  }

  async function guardarTexto(r: RespuestaRapida, texto: string) {
    const limpio = texto.trim();
    if (!limpio || limpio === r.texto) {
      /* Vacío no se guarda: se vuelve a lo que había */
      setRespuestas(respuestas.map((x) => (x.id === r.id ? { ...x, texto: r.texto } : x)));
      return;
    }
    setRespuestas(respuestas.map((x) => (x.id === r.id ? { ...x, texto: limpio } : x)));
    const supabase = crearClienteNavegador();
    const { error } = await supabase.from("respuestas_rapidas").update({ texto: limpio }).eq("id", r.id);
    if (error) {
      setError("No se pudo guardar el cambio.");
      setRespuestas(respuestas);
    } else router.refresh();
  }

  async function mover(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= respuestas.length) return;
    const copia = respuestas.slice();
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setRespuestas(copia);
    const supabase = crearClienteNavegador();
    await Promise.all([
      supabase.from("respuestas_rapidas").update({ orden: j }).eq("id", copia[j].id),
      supabase.from("respuestas_rapidas").update({ orden: i }).eq("id", copia[i].id),
    ]);
    router.refresh();
  }

  async function borrar(r: RespuestaRapida) {
    setRespuestas(respuestas.filter((x) => x.id !== r.id));
    const supabase = crearClienteNavegador();
    const { error } = await supabase.from("respuestas_rapidas").delete().eq("id", r.id);
    if (error) {
      setError("No se pudo borrar.");
      setRespuestas(respuestas);
    } else router.refresh();
  }

  return (
    <div className="superficie px-4">
      {respuestas.length === 0 && (
        <div className="py-3.5 text-atenuado text-[13px]">
          Todavía no tienes ninguna. Añade la primera abajo.
        </div>
      )}
      {respuestas.map((r, i) => (
        <div key={r.id} className="flex items-center gap-2 py-2.5 border-b border-borde">
          <Zap size={14} className="text-acento shrink-0" />
          <input
            className="flex-1 min-w-0 bg-transparent border-0 border-b border-transparent focus:border-borde-2 outline-none text-[14px] text-white py-1"
            value={textos[r.id] ?? r.texto}
            onChange={(e) => setTextos({ ...textos, [r.id]: e.target.value })}
            onBlur={(e) => {
              guardarTexto(r, e.target.value);
              const resto = { ...textos };
              delete resto[r.id];
              setTextos(resto);
            }}
            aria-label="Texto de la respuesta"
          />
          <button className="mini shrink-0" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">
            <ArrowUp size={14} />
          </button>
          <button
            className="mini shrink-0"
            onClick={() => mover(i, 1)}
            disabled={i === respuestas.length - 1}
            aria-label="Bajar"
          >
            <ArrowDown size={14} />
          </button>
          <button className="mini mini-peligro shrink-0" onClick={() => borrar(r)} aria-label="Borrar respuesta">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <div className="flex gap-2 py-3">
        <input
          className="input !mb-0 flex-1 min-w-0"
          placeholder="Nueva respuesta rápida…"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") anadir();
          }}
        />
        <button className="cta cta-mini !mb-0 shrink-0" onClick={anadir} disabled={trabajando || !nueva.trim()}>
          Añadir
        </button>
      </div>
      {error && <div className="text-peligro text-[13px] pb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}
    </div>
  );
}
