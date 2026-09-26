"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, Camera, ChevronRight, MessageCircle, SendHorizontal, ShieldCheck, X } from "lucide-react";
import { reducirFoto } from "@/lib/fotoChat";
import { PREGUNTAS_EJEMPLO, type MensajeAsistente } from "@/lib/asistenteDieta";

const CLAVE_ACEPTADO = "asistente-aceptado";

function Foto({ tam }: { tam: number }) {
  return (
    <Image
      src="/asistente.webp"
      alt=""
      width={tam}
      height={tam}
      className="rounded-full shrink-0 ring-1 ring-acento/40"
      style={{ width: tam, height: tam }}
    />
  );
}

/**
 * Asistente LivFit en Mi dieta: el cliente pregunta qué poner si no
 * tiene un alimento o cualquier duda de su dieta, y le contesta la IA
 * con su plan delante. No cambia la dieta; lo delicado se lo pasa a Liviu.
 */
export default function AsistenteDieta() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeAsistente[] | null>(null);
  const [restantes, setRestantes] = useState<number | null>(null);
  const [aceptado, setAceptado] = useState(true);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState("");
  const finRef = useRef<HTMLDivElement>(null);
  const cuadroRef = useRef<HTMLTextAreaElement>(null);
  const selectorFoto = useRef<HTMLInputElement>(null);
  /* Foto adjunta (la carta, un plato, una etiqueta): se manda con la pregunta */
  const [foto, setFoto] = useState<{ base64: string; url: string } | null>(null);

  async function elegirFoto(archivo: File | undefined) {
    if (!archivo) return;
    try {
      const blob = await reducirFoto(archivo);
      const base64 = await new Promise<string>((ok, mal) => {
        const lector = new FileReader();
        lector.onload = () => ok(String(lector.result).split(",")[1] ?? "");
        lector.onerror = mal;
        lector.readAsDataURL(blob);
      });
      if (foto) URL.revokeObjectURL(foto.url);
      setFoto({ base64, url: URL.createObjectURL(blob) });
    } catch {
      setError("No se ha podido leer la foto.");
    }
  }

  async function abrir() {
    setAbierto(true);
    setError("");
    if (mensajes) return;
    setCargando(true);
    try {
      const r = await fetch("/api/asistente");
      const d = (await r.json()) as { mensajes?: MensajeAsistente[]; restantes?: number };
      const lista = d.mensajes ?? [];
      setMensajes(lista);
      setRestantes(d.restantes ?? null);
      let yaAceptado = lista.length > 0;
      try {
        yaAceptado ||= localStorage.getItem(CLAVE_ACEPTADO) === "1";
      } catch {
        /* sin almacenamiento: se vuelve a enseñar el aviso */
      }
      setAceptado(yaAceptado);
    } catch {
      setMensajes([]);
      setError("No se ha podido cargar. Revisa tu conexión.");
    } finally {
      setCargando(false);
    }
  }

  function aceptar() {
    try {
      localStorage.setItem(CLAVE_ACEPTADO, "1");
    } catch {
      /* no pasa nada */
    }
    setAceptado(true);
  }

  async function enviar(pregunta: string) {
    const t = pregunta.trim();
    const adjunta = foto;
    if ((!t && !adjunta) || pensando) return;
    setError("");
    setTexto("");
    /* El cuadro vuelve a su altura de una línea (crece al escribir) */
    if (cuadroRef.current) cuadroRef.current.style.height = "";
    setFoto(null);
    const ahora = new Date();
    const provisional: MensajeAsistente = {
      id: `yo-${ahora.toISOString()}`,
      rol: "cliente",
      texto: adjunta ? `📷 ${t || "¿Qué me recomiendas con esto?"}` : t,
      alternativas: null,
      derivado: false,
      creado_en: new Date().toISOString(),
    };
    setMensajes((m) => [...(m ?? []), provisional]);
    setPensando(true);
    try {
      const r = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: t, imagen: adjunta?.base64 }),
      });
      const d = (await r.json()) as {
        error?: string;
        pregunta?: MensajeAsistente | null;
        respuesta?: MensajeAsistente;
        restantes?: number;
      };
      if (typeof d.restantes === "number") setRestantes(d.restantes);
      if (!r.ok || !d.respuesta) {
        setMensajes((m) => (m ?? []).filter((x) => x.id !== provisional.id));
        setTexto(t);
        setFoto(adjunta);
        setError(d.error ?? "No se ha podido responder. Prueba otra vez.");
        return;
      }
      setMensajes((m) => [...(m ?? []).filter((x) => x.id !== provisional.id), d.pregunta ?? provisional, d.respuesta!]);
    } catch {
      setMensajes((m) => (m ?? []).filter((x) => x.id !== provisional.id));
      setTexto(t);
      setFoto(adjunta);
      setError("Sin conexión. Prueba otra vez en un momento.");
    } finally {
      setPensando(false);
    }
  }

  function preguntarALiviu(indice: number) {
    const lista = mensajes ?? [];
    let pregunta = "";
    for (let k = indice - 1; k >= 0; k--) {
      if (lista[k].rol === "cliente") {
        pregunta = lista[k].texto;
        break;
      }
    }
    try {
      if (pregunta) sessionStorage.setItem("borrador-chat", pregunta);
    } catch {
      /* se abre el chat vacío */
    }
    router.push("/chat");
  }

  /* Siempre al final de la conversación */
  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ block: "end" });
  }, [abierto, mensajes, pensando]);

  const sinPreguntas = restantes === 0;

  return (
    <>
      <button
        className="tarjeta tarjeta-acento w-full text-left flex items-center gap-3 !py-3 anim-pulsable cursor-pointer"
        onClick={abrir}
      >
        <Foto tam={44} />
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[15px]">Asistente LivFit</span>
          <span className="block text-atenuado text-[12.5px] leading-snug">
            ¿No tienes algo? ¿Dudas con una comida? Pregúntame
          </span>
        </span>
        <ChevronRight size={17} className="text-atenuado shrink-0" />
      </button>

      {abierto && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center anim-fondo-aparece"
          onClick={() => setAbierto(false)}
        >
          <div
            className="w-full max-w-[480px] h-[88dvh] bg-[#0E1215] border border-borde rounded-t-[20px] flex flex-col anim-hoja-sube"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-[18px] pb-3 border-b border-borde">
              <Foto tam={40} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15.5px]">Asistente LivFit</div>
                <div className="text-atenuado text-[12px]">Conoce tu dieta · responde al momento</div>
              </div>
              <button className="ghost shrink-0 !px-2" onClick={() => setAbierto(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            {cargando || !mensajes ? (
              <div className="flex-1 grid place-items-center text-atenuado text-[13px]">Cargando…</div>
            ) : !aceptado ? (
              <div className="flex-1 overflow-y-auto text-center pt-8 px-6">
                <span className="icono-tarjeta w-14 h-14 bg-acento/15 text-acento mx-auto mb-4">
                  <ShieldCheck size={26} />
                </span>
                <div className="font-bold text-[17px] mb-2">Antes de empezar</div>
                <div className="text-texto-2 text-[14px] leading-relaxed mb-2">
                  Para responderte, el asistente lee tu plan de dieta y de entreno, y los alimentos que no te gustan.
                </div>
                <div className="text-atenuado text-[13px] leading-relaxed mb-6">
                  Es una inteligencia artificial: te orienta, pero no sustituye a Liviu. Tus preguntas las puede ver tu
                  entrenador.
                </div>
                <button className="cta" onClick={aceptar}>
                  Entendido, empezar
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto px-[18px] py-4 flex flex-col gap-2.5">
                  {mensajes.length === 0 && !pensando && (
                    <>
                      <div className="text-center pt-2 pb-2">
                        <div className="mx-auto mb-3 w-fit">
                          <Foto tam={72} />
                        </div>
                        <div className="text-[15px] font-bold mb-1">¿En qué te ayudo?</div>
                        <div className="text-atenuado text-[13px] leading-snug mb-3">
                          Me sé tu dieta, tu rutina y lo que llevas comido hoy. También puedes mandarme una foto de
                          la carta o de una etiqueta 📷
                        </div>
                      </div>
                      {PREGUNTAS_EJEMPLO.map((t) => (
                        <button
                          key={t}
                          className="chip !justify-start text-left !py-2.5 !px-3.5 !text-[13.5px] w-full"
                          onClick={() => enviar(t)}
                          disabled={sinPreguntas}
                        >
                          {t}
                        </button>
                      ))}
                    </>
                  )}

                  {mensajes.map((m, k) =>
                    m.rol === "cliente" ? (
                      <div
                        key={m.id}
                        className="self-end max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[14px] leading-snug break-words whitespace-pre-line bg-acento text-fondo"
                      >
                        {m.texto}
                      </div>
                    ) : (
                      <div key={m.id} className="self-start max-w-[92%] flex items-end gap-2">
                        <Foto tam={26} />
                        <div className="min-w-0 rounded-[16px] px-3.5 py-2.5 text-[14px] leading-snug break-words whitespace-pre-line bg-panel border border-borde text-texto-2">
                          {m.texto}
                          {m.alternativas && m.alternativas.length > 0 && (
                            <div className="mt-2 flex flex-col gap-1.5">
                              {m.alternativas.map((a) => (
                                <div
                                  key={a.nombre}
                                  className="flex justify-between gap-3 bg-campo border border-borde rounded-[10px] px-3 py-2 text-[13.5px]"
                                >
                                  <span className="min-w-0 text-white break-words">{a.nombre}</span>
                                  <span className="text-acento font-semibold shrink-0 text-right">{a.cantidad}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {m.derivado && (
                            <button
                              className="mt-2.5 w-full flex items-center justify-center gap-2 bg-acento text-fondo font-semibold rounded-[10px] py-2.5 text-[14px] cursor-pointer"
                              onClick={() => preguntarALiviu(k)}
                            >
                              <MessageCircle size={16} /> Preguntar a Liviu
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  )}

                  {pensando && (
                    <div className="self-start flex items-end gap-2">
                      <Foto tam={26} />
                      <div className="rounded-[16px] px-4 py-3 bg-panel border border-borde flex gap-1.5" aria-label="Escribiendo">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-atenuado animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={finRef} />
                </div>

                <div
                  className="p-3 border-t border-borde"
                  style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
                >
                  {error && (
                    <div className="text-peligro text-[13px] mb-2 flex items-start gap-1.5">
                      <AlertCircle size={14} className="shrink-0 mt-[3px]" />
                      <span className="min-w-0">{error}</span>
                    </div>
                  )}
                  {foto && (
                    <div className="relative w-fit mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- blob local */}
                      <img src={foto.url} alt="Foto adjunta" className="h-20 rounded-[10px] border border-borde" />
                      <button
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-fondo border border-borde grid place-items-center cursor-pointer"
                        onClick={() => setFoto(null)}
                        aria-label="Quitar foto"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={selectorFoto}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        elegirFoto(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <button
                      className="w-11 h-11 rounded-full border border-borde-2 text-texto-2 grid place-items-center shrink-0 disabled:opacity-40 cursor-pointer"
                      onClick={() => selectorFoto.current?.click()}
                      disabled={pensando || sinPreguntas}
                      aria-label="Adjuntar foto"
                    >
                      <Camera size={18} />
                    </button>
                    <textarea
                      ref={cuadroRef}
                      className="flex-1 min-w-0 bg-campo border border-borde-2 rounded-[12px] text-white px-3 py-2.5 text-[16px] leading-snug resize-none font-cuerpo focus:outline-none focus:border-acento max-h-28"
                      rows={1}
                      maxLength={600}
                      placeholder={sinPreguntas ? "Mañana más preguntas 🙌" : foto ? "¿Qué quieres saber?" : "Escribe tu duda…"}
                      value={texto}
                      disabled={sinPreguntas}
                      onChange={(e) => {
                        setTexto(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          enviar(texto);
                        }
                      }}
                    />
                    <button
                      className="w-11 h-11 rounded-full bg-acento text-fondo grid place-items-center shrink-0 disabled:opacity-40 cursor-pointer"
                      onClick={() => enviar(texto)}
                      disabled={(!texto.trim() && !foto) || pensando || sinPreguntas}
                      aria-label="Enviar"
                    >
                      <SendHorizontal size={18} />
                    </button>
                  </div>
                  <div className="text-atenuado text-[11.5px] text-center mt-2 leading-snug">
                    {sinPreguntas
                      ? "Por hoy ya está. Si es urgente, escríbele a Liviu por el chat."
                      : restantes !== null
                        ? `No cambia tu plan: solo te orienta. Te quedan ${restantes} ${restantes === 1 ? "pregunta" : "preguntas"} hoy.`
                        : "No cambia tu plan: solo te orienta."}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
