"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import type { MensajeAsistente } from "@/lib/asistenteDieta";

function cuando(iso: string, ahora: Date): string {
  const f = new Date(iso);
  const dia = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (dia(f) === dia(ahora)) return "hoy";
  if (dia(f) === dia(ayer)) return "ayer";
  const hace = new Date(ahora);
  hace.setDate(hace.getDate() - 6);
  if (f > hace) return f.toLocaleDateString("es-ES", { weekday: "short", timeZone: "Europe/Madrid" }).replace(".", "");
  return f.toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" }).replace(".", "");
}

/**
 * Lo que el cliente le pregunta al Asistente LivFit, en su ficha: las
 * últimas preguntas (las que le mandó hablar contigo, marcadas) y la
 * conversación entera. Si nunca lo ha usado, no sale.
 */
export default function PreguntasAsistente({ clienteId }: { clienteId: string }) {
  const [mensajes, setMensajes] = useState<MensajeAsistente[] | null>(null);
  const [abierta, setAbierta] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    crearClienteNavegador()
      .from("asistente_mensajes")
      .select("id, rol, texto, alternativas, derivado, creado_en")
      .eq("cliente_id", clienteId)
      .order("creado_en", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (vivo) setMensajes(((data ?? []) as MensajeAsistente[]).reverse());
      });
    return () => {
      vivo = false;
    };
  }, [clienteId]);

  useEffect(() => {
    if (abierta) finRef.current?.scrollIntoView({ block: "end" });
  }, [abierta]);

  if (!mensajes || mensajes.length === 0) return null;

  const ahora = new Date();
  const haceSemana = new Date(ahora);
  haceSemana.setDate(haceSemana.getDate() - 7);
  /* Cada pregunta con si la respuesta le mandó a hablar contigo */
  const preguntas = mensajes
    .map((m, k) => ({ m, derivada: mensajes[k + 1]?.rol === "asistente" && mensajes[k + 1].derivado }))
    .filter((x) => x.m.rol === "cliente");
  const estaSemana = preguntas.filter((x) => new Date(x.m.creado_en) > haceSemana).length;
  const ultimas = preguntas.slice(-4).reverse();

  return (
    <>
      <section className="tarjeta tarjeta-acento">
        <div className="flex items-center gap-2 mb-2">
          <Image src="/asistente.webp" alt="" width={22} height={22} className="rounded-full shrink-0" />
          <div className="titulo-tarjeta !mb-0 flex-1 min-w-0">Preguntas al asistente</div>
          <span className="text-atenuado text-[12px] shrink-0">
            {estaSemana} esta semana
          </span>
        </div>
        {ultimas.map(({ m, derivada }) => (
          <div key={m.id} className="fila !py-2.5 !items-start">
            <span className="text-atenuado text-[12px] w-10 shrink-0 pt-[2px]">{cuando(m.creado_en, ahora)}</span>
            <span className="flex-1 min-w-0 text-[13.5px] text-texto-2 break-words line-clamp-2">
              {m.texto}
              {derivada && <span className="block text-aviso text-[12px] mt-0.5">Le mandó a hablar contigo</span>}
            </span>
          </div>
        ))}
        <button className="ghost w-full mt-2" onClick={() => setAbierta(true)}>
          Ver la conversación
        </button>
      </section>

      {abierta && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center anim-fondo-aparece"
          onClick={() => setAbierta(false)}
        >
          <div
            className="w-full max-w-[560px] h-[88dvh] bg-[#0E1215] border border-borde rounded-t-[20px] flex flex-col anim-hoja-sube"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-[18px] pb-3 border-b border-borde">
              <Image src="/asistente.webp" alt="" width={36} height={36} className="rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15.5px]">Asistente LivFit</div>
                <div className="text-atenuado text-[12px]">Lo que ha preguntado y lo que le ha respondido</div>
              </div>
              <button className="ghost shrink-0 !px-2" onClick={() => setAbierta(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-[18px] py-4 flex flex-col gap-2.5">
              {mensajes.map((m, k) => {
                const nuevoDia = k === 0 || cuando(mensajes[k - 1].creado_en, ahora) !== cuando(m.creado_en, ahora);
                return (
                  <div key={m.id} className="contents">
                    {nuevoDia && (
                      <div className="self-center text-atenuado text-[11.5px] uppercase tracking-wide mt-1">
                        {cuando(m.creado_en, ahora)}
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[14px] leading-snug break-words whitespace-pre-line ${
                        m.rol === "cliente"
                          ? "self-end bg-acento text-fondo"
                          : "self-start bg-panel border border-borde text-texto-2"
                      }`}
                    >
                      {m.texto}
                      {m.alternativas?.map((a) => (
                        <div
                          key={a.nombre}
                          className="mt-1.5 flex justify-between gap-3 bg-campo border border-borde rounded-[10px] px-3 py-1.5 text-[13px]"
                        >
                          <span className="min-w-0 text-white break-words">{a.nombre}</span>
                          <span className="text-acento font-semibold shrink-0">{a.cantidad}</span>
                        </div>
                      ))}
                      {m.derivado && <div className="text-aviso text-[12px] mt-1.5">→ Le mandó a hablar contigo</div>}
                    </div>
                  </div>
                );
              })}
              <div ref={finRef} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
