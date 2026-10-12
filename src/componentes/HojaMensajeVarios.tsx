"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Send, Sparkles, Users, X } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/componentes/ui";
import { avisarMensaje } from "@/lib/avisos";

interface Destinatario {
  id: string;
  nombre: string;
  foto?: string | null;
  plan?: string | null;
  /** Días desde su último entreno; undefined = nunca ha entrenado */
  diasSinEntrenar?: number;
  /** No ha entrenado desde el lunes */
  sinEntrenarSemana?: boolean;
}

/** "{nombre}" se cambia por el nombre de pila de cada uno. */
export function personalizar(texto: string, nombre: string): string {
  return texto.replace(/\{nombre\}/gi, nombre.split(" ")[0]);
}

const ultimoEntreno = (d: number | undefined) =>
  d === undefined ? "Aún no ha entrenado" : d === 0 ? "Último entreno hoy" : d === 1 ? "Último entreno ayer" : `Último entreno hace ${d} días`;

/**
 * Mensaje a varios clientes a la vez ("Mañana el gimnasio abre a las
 * 10", "Recordad pesaros el lunes"). A cada uno le llega en SU chat,
 * como un mensaje normal tuyo: no hay grupo, nadie ve a quién más se
 * lo has mandado. Antes de enviar se ve cómo le llega a cada uno.
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
  const [revisando, setRevisando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [conIA, setConIA] = useState(false);
  const [error, setError] = useState("");
  const [enviados, setEnviados] = useState<number | null>(null);

  /* Atajos de a quién: marcan esa lista entera (luego se puede retocar a mano) */
  const grupos = [
    { clave: "todos", etiqueta: "Todos", ids: clientes.map((c) => c.id) },
    { clave: "mensual", etiqueta: "Plan mensual", ids: clientes.filter((c) => c.plan === "mensual").map((c) => c.id) },
    { clave: "trimestral", etiqueta: "Plan trimestral", ids: clientes.filter((c) => c.plan === "trimestral").map((c) => c.id) },
    { clave: "semana", etiqueta: "No han entrado esta semana", ids: clientes.filter((c) => c.sinEntrenarSemana).map((c) => c.id) },
  ].filter((g) => g.ids.length > 0);
  const mismoGrupo = (ids: string[]) => ids.length === elegidos.size && ids.every((id) => elegidos.has(id));
  const lista = clientes.filter((c) => elegidos.has(c.id));

  function alternar(id: string) {
    const copia = new Set(elegidos);
    if (copia.has(id)) copia.delete(id);
    else copia.add(id);
    setElegidos(copia);
  }

  async function escribirConIA() {
    setConIA(true);
    setError("");
    try {
      const r = await fetch("/api/ia/mensaje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo: "varios", motivo: texto }),
      });
      const d = (await r.json()) as { mensaje?: string; error?: string };
      if (!r.ok || !d.mensaje) throw new Error(d.error);
      setTexto(d.mensaje);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "La IA no ha podido escribirlo ahora.");
    } finally {
      setConIA(false);
    }
  }

  async function enviar() {
    const limpio = texto.trim();
    if (!limpio || lista.length === 0) return;
    setEnviando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const filas = lista.map((c) => ({ cliente_id: c.id, remitente: "entrenador", texto: personalizar(limpio, c.nombre) }));
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

  const ocupado = enviando || conIA;
  const nClientes = `${lista.length} ${lista.length === 1 ? "cliente" : "clientes"}`;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center anim-fondo-aparece"
      onClick={ocupado ? undefined : onCerrar}
    >
      <div
        className="w-full max-w-[480px] max-h-[88dvh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] flex flex-col anim-hoja-sube"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[16px]">
              {enviados !== null ? "Enviado" : revisando ? "Revisa antes de enviar" : "Mensaje a varios"}
            </div>
            <div className="text-atenuado text-[12.5px] leading-snug">
              {revisando && enviados === null
                ? `${nClientes} · cada uno lo recibe con su nombre y un aviso en el móvil.`
                : "Le llega a cada uno a su chat, como si se lo escribieras solo a él."}
            </div>
          </div>
          <button className="ghost shrink-0 !px-2" onClick={onCerrar} disabled={ocupado} aria-label="Cerrar">
            <X size={20} />
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
            <div className="text-atenuado text-[13px] mb-5">Le llega a cada uno en su chat, como un mensaje normal.</div>
            <button className="cta !mb-0" onClick={onCerrar}>
              Hecho
            </button>
          </div>
        ) : revisando ? (
          <>
            <div className="overflow-y-auto min-h-0 flex-1 -mx-1 px-1 mb-3">
              {lista.map((c) => (
                <div key={c.id} className="tarjeta !p-3 !mb-2">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Avatar nombre={c.nombre} tamano={28} foto={c.foto} />
                    <span className="font-semibold text-[13.5px] break-words min-w-0">{c.nombre}</span>
                  </div>
                  <div className="bg-acento text-fondo rounded-[16px] rounded-br-[6px] px-3 py-2 text-[13.5px] leading-snug ml-8 whitespace-pre-wrap break-words">
                    {personalizar(texto.trim(), c.nombre)}
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <div className="text-peligro text-[13px] mb-2 flex items-start gap-1.5">
                <AlertCircle size={14} className="shrink-0 mt-[3px]" />
                <span className="min-w-0">{error}</span>
              </div>
            )}
            <button className="cta !mb-2 flex items-center justify-center gap-2" onClick={() => void enviar()} disabled={enviando}>
              <Send size={16} /> {enviando ? "Enviando…" : `Enviar a ${nClientes}`}
            </button>
            <button className="ghost w-full" onClick={() => setRevisando(false)} disabled={enviando}>
              Volver a editar
            </button>
          </>
        ) : (
          <>
            <div className="text-[12.5px] text-atenuado mb-1.5">¿A quién?</div>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {grupos.map((g) => (
                <button
                  key={g.clave}
                  className={`chip !text-[12.5px] ${mismoGrupo(g.ids) ? "chip-activo" : ""}`}
                  onClick={() => setElegidos(new Set(g.ids))}
                  disabled={ocupado}
                >
                  {g.etiqueta} ({g.ids.length})
                </button>
              ))}
              <button className="chip !text-[12.5px]" onClick={() => setElegidos(new Set())} disabled={ocupado}>
                Ninguno
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
                    disabled={ocupado}
                  >
                    <span
                      className={`w-[22px] h-[22px] rounded-[7px] grid place-items-center shrink-0 border ${
                        marcado ? "bg-acento border-acento text-fondo" : "border-borde-2"
                      }`}
                    >
                      {marcado && <Check size={14} strokeWidth={3} />}
                    </span>
                    <Avatar nombre={c.nombre} tamano={30} foto={c.foto} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-semibold break-words">{c.nombre}</span>
                      <span className="block text-atenuado text-[12px]">{ultimoEntreno(c.diasSinEntrenar)}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-[12.5px] text-atenuado mb-1">Mensaje</div>
            <textarea
              className="w-full bg-campo border border-borde-2 rounded-[12px] text-white p-3 text-[14px] leading-snug resize-none font-cuerpo focus:outline-none focus:border-acento"
              rows={3}
              placeholder="Hola {nombre}, …  (o escribe la idea y dale a «Escribir con IA»)"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={ocupado}
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5 mb-3">
              <button
                className="chip !text-[12px] !py-1"
                onClick={() => setTexto((t) => (t.includes("{nombre}") ? t : `Ey {nombre}, ${t}`.trimEnd()))}
                disabled={ocupado}
              >
                + {"{nombre}"}
              </button>
              <button
                className="chip !text-[12px] !py-1 !border-morado/60 !text-morado"
                onClick={() => void escribirConIA()}
                disabled={ocupado || !texto.trim()}
                title={texto.trim() ? "Lo reescribe con tu tono" : "Escribe primero la idea"}
              >
                <Sparkles size={12} className="inline -mt-0.5 mr-0.5" />
                {conIA ? "Escribiendo…" : "Escribir con IA"}
              </button>
            </div>

            {error && (
              <div className="text-peligro text-[13px] mb-2 flex items-start gap-1.5">
                <AlertCircle size={14} className="shrink-0 mt-[3px]" />
                <span className="min-w-0">{error}</span>
              </div>
            )}
            <button
              className="cta !mb-0 flex items-center justify-center gap-2"
              onClick={() => setRevisando(true)}
              disabled={ocupado || !texto.trim() || lista.length === 0}
            >
              <Users size={16} />
              {lista.length === 0 ? "Elige a quién" : !texto.trim() ? "Escribe el mensaje" : "Ver cómo le llega a cada uno"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
