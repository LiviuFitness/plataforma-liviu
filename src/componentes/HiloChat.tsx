"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import type { Mensaje } from "@/lib/tipos";

const INTERVALO_SONDEO_MS = 8000;

/** Hilo de chat entrenador-cliente. Un mismo componente para las dos
 * vistas: cambia qué mensajes se pintan a la derecha (`remitentePropio`).
 * Sin websockets: sondea cada 8s mientras la pestaña está abierta, que
 * para un chat 1 a 1 de este volumen es de sobra. */
export default function HiloChat({
  clienteId,
  mensajesIniciales,
  remitentePropio,
  nombreOtro,
  anchoMaximo = "max-w-[480px]",
}: {
  clienteId: string;
  mensajesIniciales: Mensaje[];
  remitentePropio: "cliente" | "entrenador";
  nombreOtro: string;
  /** Clase de ancho máximo del contenedor, para encajar con la barra
   * fija de escritura: la app del cliente es más estrecha que el panel. */
  anchoMaximo?: string;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajesIniciales.length]);

  useEffect(() => {
    const intervalo = setInterval(() => router.refresh(), INTERVALO_SONDEO_MS);
    return () => clearInterval(intervalo);
  }, [router]);

  useEffect(() => {
    if (remitentePropio !== "cliente") return;
    (async () => {
      const supabase = crearClienteNavegador();
      await supabase.rpc("marcar_chat_visto");
    })();
  }, [remitentePropio]);

  async function enviar() {
    const valor = texto.trim();
    if (!valor) return;
    setEnviando(true);
    setTexto("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("mensajes")
      .insert({ cliente_id: clienteId, remitente: remitentePropio, texto: valor });
    setEnviando(false);
    if (error) {
      setTexto(valor);
      return;
    }
    router.refresh();
  }

  return (
    <>
      {/* Espacio para que el último mensaje no quede tapado por la
       * barra de escritura fija */}
      <div className="flex flex-col gap-2 pb-20">
        {mensajesIniciales.length === 0 && (
          <div className="text-atenuado text-[13.5px] text-center py-8">
            Todavía no hay mensajes con {nombreOtro}. Escribe el primero.
          </div>
        )}
        {mensajesIniciales.map((m) => {
          const esPropio = m.remitente === remitentePropio;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-[14px] px-3.5 py-2 text-[14px] whitespace-pre-line ${
                esPropio
                  ? "self-end bg-acento text-fondo"
                  : "self-start bg-campo border border-borde-2 text-texto-2"
              }`}
            >
              {m.texto}
              <div
                className={`text-[10.5px] mt-1 ${
                  esPropio ? "text-fondo/70" : "text-atenuado"
                }`}
              >
                {new Date(m.creado_en).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>

      <div
        className={`fixed left-1/2 -translate-x-1/2 w-full ${anchoMaximo} z-20 px-[18px]`}
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex gap-2 items-end bg-fondo/95 backdrop-blur-md pt-2">
          <textarea
            className="w-full bg-campo border border-borde-2 rounded-[10px] text-white p-2.5 px-3 text-[14px] resize-none font-cuerpo"
            rows={1}
            placeholder="Escribe un mensaje…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
          />
          <button
            className="cta cta-mini !mb-0 !w-11 !px-0 flex items-center justify-center shrink-0"
            onClick={enviar}
            disabled={enviando || texto.trim() === ""}
            aria-label="Enviar mensaje"
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </>
  );
}
