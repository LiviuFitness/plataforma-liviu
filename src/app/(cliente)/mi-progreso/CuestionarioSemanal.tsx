"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, MessageSquareText } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { IconoTarjeta } from "@/componentes/ui";
import type { PreguntaRevision, RespuestaRevision } from "@/lib/tipos";

/** Cuestionario de revisión semanal: el entrenador define las preguntas
 * (Ajustes → Cuestionario semanal), el cliente las responde una vez por
 * semana. Si ya respondió esta semana, se ve en modo lectura.
 *
 * Solo se puede responder SÁBADO o DOMINGO: la revisión mira la semana
 * entera, y contestarla un martes es contar media semana. El resto de
 * días queda una línea apagada avisando de cuándo se abre.
 *
 * La comprobación es del lado del cliente a propósito, con la hora del
 * propio móvil: el servidor va en UTC y un sábado a las 00:30 en España
 * allí todavía es viernes, así que una regla en la base de datos le
 * cerraría la puerta al cliente dentro de su propio fin de semana. */
export default function CuestionarioSemanal({
  clienteId,
  preguntas,
  respuestasSemana,
  semanaActualISO,
}: {
  clienteId: string;
  preguntas: PreguntaRevision[];
  respuestasSemana: RespuestaRevision[];
  semanaActualISO: string;
}) {
  const router = useRouter();
  /* 6 = sábado, 0 = domingo, en la zona horaria del dispositivo. */
  const diaSemana = new Date().getDay();
  const esFinDeSemana = diaSemana === 6 || diaSemana === 0;
  const respuestasPorPregunta = new Map(respuestasSemana.map((r) => [r.pregunta_id, r.respuesta]));
  const yaRespondioTodo =
    preguntas.length > 0 && preguntas.every((p) => respuestasPorPregunta.has(p.id));

  // Plegado de partida, incluso sin responder: esta tarjeta va la primera
  // de Mi Progreso y, abierta, sus campos se comían la pantalla entera —
  // lo primero que veía el cliente al entrar a "su progreso" era un
  // formulario, no su progreso.
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(!yaRespondioTodo && esFinDeSemana);
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const p of preguntas) inicial[p.id] = respuestasPorPregunta.get(p.id) ?? "";
    return inicial;
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  if (preguntas.length === 0) return null;

  async function enviar() {
    setError("");
    const respuestas = preguntas
      .map((p) => ({ pregunta_id: p.id, respuesta: valores[p.id]?.trim() ?? "" }))
      .filter((r) => r.respuesta !== "");
    if (respuestas.length === 0) {
      setError("Responde al menos una pregunta.");
      return;
    }
    setGuardando(true);
    const supabase = crearClienteNavegador();
    const { error: e } = await supabase.from("respuestas_revision").upsert(
      respuestas.map((r) => ({
        cliente_id: clienteId,
        pregunta_id: r.pregunta_id,
        semana: semanaActualISO,
        respuesta: r.respuesta,
        actualizado_en: new Date().toISOString(),
      })),
      { onConflict: "cliente_id,pregunta_id,semana" }
    );
    setGuardando(false);
    if (e) {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      return;
    }
    setEditando(false);
    // Se repliega solo al enviar: ya no hay nada que hacer aquí y debajo
    // está el progreso, que es a lo que se venía.
    setAbierto(false);
    router.refresh();
  }

  /* Entre semana y sin responder: ni tarjeta ni botón, solo el aviso de
   * cuándo toca. Así no ocupa sitio cinco días de siete. */
  if (!esFinDeSemana && !yaRespondioTodo) {
    return (
      <div className="fila !cursor-default opacity-70">
        <CalendarClock size={17} className="text-atenuado shrink-0" />
        <div className="flex-1 min-w-0 text-[13.5px] text-atenuado">
          El cuestionario de la semana se abre el sábado
        </div>
      </div>
    );
  }

  if (!abierto) {
    return (
      <button
        className={`tarjeta anim-pulsable w-full text-left flex items-center gap-3 ${
          yaRespondioTodo ? "" : "tarjeta-acento"
        }`}
        onClick={() => setAbierto(true)}
      >
        <IconoTarjeta
          Icono={yaRespondioTodo ? Check : MessageSquareText}
          color={yaRespondioTodo ? "var(--color-verde)" : "var(--color-acento)"}
        />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[14.5px]">
            {yaRespondioTodo ? "Cuestionario enviado" : "¿Cómo ha ido tu semana?"}
          </span>
          <span className="block text-atenuado text-[12.5px]">
            {yaRespondioTodo
              ? "Toca para ver o cambiar tus respuestas"
              : `${preguntas.length} preguntas para tu entrenador`}
          </span>
        </span>
        <span className="texto-secundario shrink-0">
          {yaRespondioTodo ? "Ver →" : "Responder →"}
        </span>
      </button>
    );
  }

  return (
    <section className="tarjeta">
      <div className="flex justify-between items-center mb-3">
        <div className="titulo-tarjeta !mb-0">CUESTIONARIO SEMANAL</div>
        <button className="ghost" onClick={() => setAbierto(false)}>
          Cerrar
        </button>
      </div>

      {!editando ? (
        <>
          <div className="text-acento text-[13.5px] mb-2">Ya respondiste esta semana ✓</div>
          {preguntas.map((p) => (
            <div key={p.id} className="border-b border-borde last:border-0 py-2">
              <div className="text-atenuado text-[12.5px]">{p.texto}</div>
              <div className="text-[13.5px] mt-0.5">
                {respuestasPorPregunta.get(p.id) || "—"}
              </div>
            </div>
          ))}
          {esFinDeSemana ? (
            <button className="ghost w-full mt-2" onClick={() => setEditando(true)}>
              Editar respuestas
            </button>
          ) : (
            <p className="text-atenuado text-[12.5px] mt-2">
              Podrás cambiarlas el próximo fin de semana.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-atenuado text-[12.5px] mb-2">
            Cuéntale a tu entrenador cómo ha ido la semana.{" "}
            {diaSemana === 0
              ? "Hoy es el último día para enviarlo."
              : "Tienes hasta el domingo."}
          </p>
          {preguntas.map((p) => (
            <div key={p.id} className="mb-2.5">
              <label className="text-[13.5px] text-texto-2 block mb-1">{p.texto}</label>
              <textarea
                className="input !mb-0"
                rows={2}
                value={valores[p.id] ?? ""}
                onChange={(e) => setValores({ ...valores, [p.id]: e.target.value })}
              />
            </div>
          ))}
          {error && <div className="text-peligro text-[13.5px] mb-2">— {error}</div>}
          <button className="cta !mb-0" onClick={enviar} disabled={guardando}>
            {guardando ? "Guardando…" : "Enviar respuestas"}
          </button>
        </>
      )}
    </section>
  );
}
