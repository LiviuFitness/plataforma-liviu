"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Send } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import EstadoVacio from "@/componentes/EstadoVacio";
import type { Mensaje } from "@/lib/tipos";

const INTERVALO_SONDEO_MS = 8000;
/** Mensajes consecutivos del mismo remitente en menos de esto se agrupan
 * visualmente (menos separación), como en iMessage/WhatsApp. */
const VENTANA_AGRUPADO_MS = 2 * 60 * 1000;

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
  // Mensajes propios optimistas: aparecen al instante al enviar, antes de
  // que vuelva la confirmación del servidor (sondeo de 8s o refresh manual).
  const [pendientes, setPendientes] = useState<Mensaje[]>([]);
  const finRef = useRef<HTMLDivElement>(null);

  // En cuanto llegan mensajes frescos del servidor, los optimistas ya
  // están confirmados (se insertan antes de llamar a refresh) — se limpian
  // para no duplicar.
  useEffect(() => {
    setPendientes([]);
  }, [mensajesIniciales]);

  const mensajes = [...mensajesIniciales, ...pendientes];

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length]);

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
    const temporal: Mensaje = {
      id: `tmp-${Date.now()}`,
      cliente_id: clienteId,
      remitente: remitentePropio,
      texto: valor,
      creado_en: new Date().toISOString(),
    };
    setPendientes((prev) => [...prev, temporal]);
    setEnviando(true);
    setTexto("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("mensajes")
      .insert({ cliente_id: clienteId, remitente: remitentePropio, texto: valor });
    setEnviando(false);
    if (error) {
      setPendientes((prev) => prev.filter((m) => m.id !== temporal.id));
      setTexto(valor);
      return;
    }
    router.refresh();
  }

  return (
    <>
      {/* Espacio para que el último mensaje no quede tapado por la
       * barra de escritura fija */}
      <div className="flex flex-col pb-20">
        {mensajes.length === 0 && (
          <EstadoVacio
            Icono={MessageCircle}
            color="var(--color-acento)"
            titulo={`Escríbele a ${nombreOtro}`}
            descripcion={`Aquí puedes escribir a ${nombreOtro} cuando quieras — dudas sobre tu rutina, tu dieta o cómo te sientes.`}
          />
        )}
        {mensajes.map((m, i) => {
          const esPropio = m.remitente === remitentePropio;
          const anterior = mensajes[i - 1];
          const agrupado =
            !!anterior &&
            anterior.remitente === m.remitente &&
            new Date(m.creado_en).getTime() - new Date(anterior.creado_en).getTime() <
              VENTANA_AGRUPADO_MS;
          const esOptimista = m.id.startsWith("tmp-");
          const esUltimo = i === mensajes.length - 1;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-[16px] px-3.5 py-2 text-[14px] whitespace-pre-line ${
                agrupado ? "mt-1" : "mt-3"
              } ${esUltimo ? "anim-aparecer" : ""} ${esOptimista ? "opacity-60" : ""} ${
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
            className="w-full bg-campo border border-borde-2 rounded-2xl text-white p-2.5 px-3.5 text-[14px] resize-none font-cuerpo transition-colors focus:outline-none focus:border-acento"
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
            className="cta cta-mini anim-pulsable !mb-0 !w-11 !px-0 flex items-center justify-center shrink-0"
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
