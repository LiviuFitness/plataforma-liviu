"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import Switch from "@/componentes/Switch";
import type { PreguntaRevision } from "@/lib/tipos";

/** Gestión de las preguntas del cuestionario semanal: añadir, editar
 * texto, reordenar, activar/desactivar y borrar. Sin preguntas fijas de
 * fábrica más allá de 4 de arranque — Liviu las sustituye por las suyas. */
export default function GestionCuestionario({
  preguntas: preguntasIniciales,
}: {
  preguntas: PreguntaRevision[];
}) {
  const router = useRouter();
  const [preguntas, setPreguntas] = useState(preguntasIniciales);
  const [nueva, setNueva] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function añadir() {
    const texto = nueva.trim();
    if (!texto) return;
    setGuardando("nueva");
    setError("");
    const supabase = crearClienteNavegador();
    const orden = preguntas.length > 0 ? Math.max(...preguntas.map((p) => p.orden)) + 1 : 0;
    const { data, error: e } = await supabase
      .from("preguntas_revision")
      .insert({ texto, orden })
      .select("id, texto, orden, activa")
      .single();
    setGuardando(null);
    if (e || !data) {
      setError("No se pudo añadir la pregunta. Inténtalo de nuevo.");
      return;
    }
    setPreguntas([...preguntas, data as PreguntaRevision]);
    setNueva("");
    router.refresh();
  }

  async function guardarTexto(id: string, texto: string) {
    setGuardando(id);
    const supabase = crearClienteNavegador();
    const { error: e } = await supabase
      .from("preguntas_revision")
      .update({ texto })
      .eq("id", id);
    setGuardando(null);
    if (e) {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      return;
    }
    router.refresh();
  }

  async function alternarActiva(id: string, activa: boolean) {
    setPreguntas(preguntas.map((p) => (p.id === id ? { ...p, activa } : p)));
    const supabase = crearClienteNavegador();
    await supabase.from("preguntas_revision").update({ activa }).eq("id", id);
    router.refresh();
  }

  async function borrar(id: string, texto: string) {
    if (!confirm(`¿Borrar «${texto}»? Las respuestas ya dadas por los clientes también se borrarán.`))
      return;
    setPreguntas(preguntas.filter((p) => p.id !== id));
    const supabase = crearClienteNavegador();
    await supabase.from("preguntas_revision").delete().eq("id", id);
    router.refresh();
  }

  async function mover(id: string, direccion: -1 | 1) {
    const i = preguntas.findIndex((p) => p.id === id);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= preguntas.length) return;
    const copia = preguntas.slice();
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setPreguntas(copia);
    const supabase = crearClienteNavegador();
    await Promise.all([
      supabase.from("preguntas_revision").update({ orden: i }).eq("id", copia[i].id),
      supabase.from("preguntas_revision").update({ orden: j }).eq("id", copia[j].id),
    ]);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <Link href="/ajustes" className="mini shrink-0" aria-label="Volver a Ajustes">
          <ArrowLeft size={14} />
        </Link>
        <h1 className="h1 !mb-0">Cuestionario semanal</h1>
      </div>
      <div className="sub mb-4">lo que le preguntas al cliente cada semana —</div>

      {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}

      {preguntas.map((p, i) => (
        <div key={p.id} className="fila !items-start">
          <div className="flex flex-col gap-1 pt-2 shrink-0">
            <button
              className="mini !w-7 !h-7"
              onClick={() => mover(p.id, -1)}
              disabled={i === 0}
              aria-label="Subir"
            >
              <ArrowUp size={12} />
            </button>
            <button
              className="mini !w-7 !h-7"
              onClick={() => mover(p.id, 1)}
              disabled={i === preguntas.length - 1}
              aria-label="Bajar"
            >
              <ArrowDown size={12} />
            </button>
          </div>
          <textarea
            className="input !mb-0 flex-1"
            rows={2}
            defaultValue={p.texto}
            onBlur={(e) => {
              const texto = e.target.value.trim();
              if (texto && texto !== p.texto) {
                setPreguntas(preguntas.map((x) => (x.id === p.id ? { ...x, texto } : x)));
                guardarTexto(p.id, texto);
              }
            }}
          />
          <div className="flex flex-col items-center gap-2 shrink-0 pt-1">
            <Switch
              checked={p.activa}
              onChange={(v) => alternarActiva(p.id, v)}
              label={p.activa ? "Activa" : "Inactiva"}
            />
            <button
              className="mini mini-peligro"
              onClick={() => borrar(p.id, p.texto)}
              aria-label={`Borrar pregunta`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
      {preguntas.length === 0 && (
        <div className="text-atenuado text-[13.5px] mb-3">Sin preguntas todavía.</div>
      )}

      <div className="tarjeta mt-3">
        <div className="titulo-tarjeta">AÑADIR PREGUNTA</div>
        <textarea
          className="input"
          rows={2}
          placeholder="Escribe la pregunta…"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
        />
        <button className="cta !mb-0" onClick={añadir} disabled={!nueva.trim() || guardando === "nueva"}>
          {guardando === "nueva" ? "Añadiendo…" : "+ Añadir pregunta"}
        </button>
      </div>
      <p className="text-atenuado text-[12px] mt-3">
        Solo las preguntas activas se muestran al cliente. Los clientes ven el
        cuestionario en Mi Progreso y lo responden una vez por semana.
      </p>
    </>
  );
}
