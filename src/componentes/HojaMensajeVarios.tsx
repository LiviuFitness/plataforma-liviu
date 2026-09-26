"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/componentes/ui";
import { avisarMensaje } from "@/lib/avisos";

interface Destinatario {
  id: string;
  nombre: string;
  foto?: string | null;
}

/** "{nombre}" se cambia por el nombre de pila de cada uno. */
export function personalizar(texto: string, nombre: string): string {
  return texto.replace(/\{nombre\}/gi, nombre.split(" ")[0]);
}

/**
 * Mensaje a varios clientes a la vez ("Mañana el gimnasio abre a las
 * 10", "Recordad pesaros el lunes"). A cada uno le llega en SU chat,
 * como un mensaje normal tuyo: no hay grupo, nadie ve a quién más se
 * lo has mandado.
 */
export default function HojaMensajeVarios({
  clientes,
  preseleccion,
  onCerrar,
}: {
  clientes: Destinatario[];
  /** Los que vienen marcados al abrir (los del filtro que estabas viendo). */
  preseleccion: string[];
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set(preseleccion));
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviados, setEnviados] = useState<number | null>(null);

  const todos = elegidos.size === clientes.length;
  const ejemplo = clientes.find((c) => elegidos.has(c.id)) ?? clientes[0];

  function alternar(id: string) {
    const copia = new Set(elegidos);
    if (copia.has(id)) copia.delete(id);
    else copia.add(id);
    setElegidos(copia);
  }

  async function enviar() {
    const limpio = texto.trim();
    if (!limpio || elegidos.size === 0) return;
    setEnviando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const filas = clientes
      .filter((c) => elegidos.has(c.id))
      .map((c) => ({ cliente_id: c.id, remitente: "entrenador", texto: personalizar(limpio, c.nombre) }));
    /* Un solo insert: o les llega a todos o a ninguno, sin quedarse a medias */
    const { error } = await supabase.from("mensajes").insert(filas);
    setEnviando(false);
    if (error) {
      setError("No se ha enviado a nadie. Comprueba la conexión e inténtalo de nuevo.");
      return;
    }
    setEnviados(filas.length);
    avisarMensaje(filas.map((f) => f.cliente_id));
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center anim-fondo-aparece"
      onClick={enviando ? undefined : onCerrar}
    >
      <div
        className="w-full max-w-[480px] max-h-[88vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="titulo-seccion !mb-0">Mensaje a varios</div>
          <button className="ghost shrink-0" onClick={onCerrar} disabled={enviando}>
            Cerrar
          </button>
        </div>

        {enviados !== null ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-acento/15 text-acento grid place-items-center mx-auto mb-3">
              <Check size={24} strokeWidth={3} />
            </div>
            <div className="font-bold text-[16px] mb-1">
              Enviado a {enviados} {enviados === 1 ? "cliente" : "clientes"}
            </div>
            <div className="text-atenuado text-[13px] mb-5">
              Le llega a cada uno en su chat, como un mensaje normal.
            </div>
            <button className="cta !mb-0" onClick={onCerrar}>
              Hecho
            </button>
          </div>
        ) : (
          <>
            <textarea
              className="w-full bg-campo border border-borde-2 rounded-[10px] text-white p-2.5 px-3 text-[14px] resize-none font-cuerpo"
              rows={3}
              placeholder="Hola {nombre}, …"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoFocus
            />
            <div className="text-atenuado text-[12px] mt-1 mb-3 leading-snug break-words">
              {texto.includes("{") && ejemplo ? (
                <>
                  A {ejemplo.nombre.split(" ")[0]} le llegará: «{personalizar(texto.trim(), ejemplo.nombre)}»
                </>
              ) : (
                <>
                  Escribe <b className="text-texto-2">{"{nombre}"}</b> y cada uno verá el suyo.
                </>
              )}
            </div>

            <div className="flex items-center justify-between mb-1.5">
              <div className="titulo-tarjeta !mb-0">
                PARA {elegidos.size} DE {clientes.length}
              </div>
              <button
                className="text-acento text-[13px] font-semibold cursor-pointer"
                onClick={() => setElegidos(todos ? new Set() : new Set(clientes.map((c) => c.id)))}
              >
                {todos ? "Ninguno" : "Todos"}
              </button>
            </div>
            <div className="overflow-y-auto min-h-0 flex-1 -mx-1 px-1 mb-3 border-y border-borde">
              {clientes.map((c) => {
                const marcado = elegidos.has(c.id);
                return (
                  <button
                    key={c.id}
                    className="w-full flex items-center gap-3 py-2 border-b border-borde last:border-0 text-left cursor-pointer"
                    onClick={() => alternar(c.id)}
                    aria-pressed={marcado}
                  >
                    <Avatar nombre={c.nombre} tamano={30} foto={c.foto} />
                    <span className="flex-1 min-w-0 text-[14px] break-words">{c.nombre}</span>
                    <span
                      className={`w-[22px] h-[22px] rounded-[7px] grid place-items-center shrink-0 border ${
                        marcado ? "bg-acento border-acento text-fondo" : "border-borde-2"
                      }`}
                    >
                      {marcado && <Check size={14} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>

            {error && <div className="text-peligro text-[13px] mb-2">— {error}</div>}
            <button
              className="cta !mb-0"
              onClick={enviar}
              disabled={enviando || !texto.trim() || elegidos.size === 0}
            >
              {enviando
                ? "Enviando…"
                : elegidos.size === 0
                  ? "Elige a quién"
                  : `Enviar a ${elegidos.size} ${elegidos.size === 1 ? "cliente" : "clientes"}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
