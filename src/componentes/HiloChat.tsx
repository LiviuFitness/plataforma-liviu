"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Camera, Check, ChevronRight, MessageCircle, RefreshCw, Send, Sparkles, X, Zap } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import EstadoVacio from "@/componentes/EstadoVacio";
import VisorGuia from "@/componentes/VisorGuia";
import { leerGuia, mensajeDeGuia } from "@/lib/guias";
import { avisarMensaje } from "@/lib/avisos";
import { reducirFoto } from "@/lib/fotoChat";
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
  respuestasRapidas = [],
  textoInicial = "",
  guias = [],
}: {
  clienteId: string;
  mensajesIniciales: Mensaje[];
  remitentePropio: "cliente" | "entrenador";
  nombreOtro: string;
  /** Clase de ancho máximo del contenedor, para encajar con la barra
   * fija de escritura: la app del cliente es más estrecha que el panel. */
  anchoMaximo?: string;
  /** Frases del entrenador a un toque (se editan en Ajustes). */
  respuestasRapidas?: string[];
  /** Borrador con el que se abre el cuadro (sin enviar). */
  textoInicial?: string;
  /** Guías que el entrenador puede mandar con un toque. */
  guias?: { id: string; titulo: string }[];
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(textoInicial);
  const [enviando, setEnviando] = useState(false);
  // Mensajes propios optimistas: aparecen al instante al enviar, antes de
  // que vuelva la confirmación del servidor (sondeo de 8s o refresh manual).
  const [pendientes, setPendientes] = useState<Mensaje[]>([]);
  const finRef = useRef<HTMLDivElement>(null);
  const cuadroRef = useRef<HTMLTextAreaElement>(null);
  const [guiaAbierta, setGuiaAbierta] = useState<string | null>(null);
  const [eligiendoGuia, setEligiendoGuia] = useState(false);
  /* Fotos: ruta del bucket → URL firmada (caduca en 1 h; se piden al
   * ver el mensaje) y la que está abierta a pantalla completa */
  const [urlsFotos, setUrlsFotos] = useState<Record<string, string>>({});
  const [fotoAbierta, setFotoAbierta] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState("");
  const selectorFoto = useRef<HTMLInputElement>(null);
  /* Las respuestas rápidas se ven con el cuadro vacío y se van en cuanto
   * se escribe: así no roban sitio a lo que estás redactando. */
  const verRapidas = respuestasRapidas.length > 0 && texto.trim() === "";

  // En cuanto llegan mensajes frescos del servidor, los optimistas ya
  // están confirmados (se insertan antes de llamar a refresh) — se limpian
  // para no duplicar. Sincroniza estado local con un prop que cambia por
  // fuera (igual que el autoguardado de SesionEnCurso.tsx).
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPendientes([]);
  }, [mensajesIniciales]);

  /* Pregunta que el Asistente LivFit le pasa al entrenador ("Preguntar a
   * Liviu"): llega como borrador, sin enviar, para que la repase. */
  useEffect(() => {
    if (remitentePropio !== "cliente") return;
    let borrador: string | null = null;
    try {
      borrador = sessionStorage.getItem("borrador-chat");
      sessionStorage.removeItem("borrador-chat");
    } catch {
      /* sin almacenamiento: se abre vacío */
    }
    if (!borrador) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setTexto(borrador);
    cuadroRef.current?.focus();
  }, [remitentePropio]);

  const mensajes = [...mensajesIniciales, ...pendientes];

  /* Respuesta sugerida por la IA (solo el entrenador): para el último
   * mensaje del cliente. "Usar" la pone en el cuadro, no la envía. */
  const [sugerencia, setSugerencia] = useState<{ para: string; cargando: boolean; texto?: string; error?: string } | null>(null);
  const ultimo = mensajes[mensajes.length - 1];
  const puedeSugerir =
    remitentePropio === "entrenador" && !!ultimo && ultimo.remitente === "cliente" && !ultimo.id.startsWith("tmp-");
  const sugerenciaVigente = sugerencia && ultimo && sugerencia.para === ultimo.id ? sugerencia : null;
  const verSugerir = puedeSugerir && texto.trim() === "";

  async function pedirSugerencia() {
    if (!ultimo) return;
    const para = ultimo.id;
    const anterior = sugerenciaVigente?.texto;
    setSugerencia({ para, cargando: true, texto: anterior });
    try {
      const r = await fetch("/api/ia/mensaje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId, modo: "responder", anterior }),
      });
      const d = (await r.json()) as { mensaje?: string; error?: string };
      if (!r.ok || !d.mensaje) throw new Error(d.error);
      setSugerencia({ para, cargando: false, texto: d.mensaje });
    } catch (e) {
      setSugerencia({ para, cargando: false, error: e instanceof Error && e.message ? e.message : "No se ha podido sugerir." });
    }
  }

  /* Firma las fotos que aún no tienen URL */
  const rutasSinUrl = mensajes
    .map((m) => m.imagen)
    .filter((r): r is string => !!r && !r.startsWith("blob:") && !urlsFotos[r]);
  const claveRutas = rutasSinUrl.join("|");
  useEffect(() => {
    if (!claveRutas) return;
    const rutas = claveRutas.split("|");
    crearClienteNavegador()
      .storage.from("chat")
      .createSignedUrls(rutas, 3600)
      .then(({ data }) => {
        const nuevas: Record<string, string> = {};
        (data ?? []).forEach((u, i) => u.signedUrl && (nuevas[rutas[i]] = u.signedUrl));
        setUrlsFotos((prev) => ({ ...prev, ...nuevas }));
      });
  }, [claveRutas]);

  async function enviarFoto(archivo: File) {
    setErrorFoto("");
    setSubiendoFoto(true);
    const pie = texto.trim();
    const local = URL.createObjectURL(archivo);
    const temporal: Mensaje = {
      id: `tmp-${Date.now()}`,
      cliente_id: clienteId,
      remitente: remitentePropio,
      texto: pie,
      imagen: local,
      creado_en: new Date().toISOString(),
    };
    setPendientes((prev) => [...prev, temporal]);
    setTexto("");
    const supabase = crearClienteNavegador();
    const ruta = `${clienteId}/${crypto.randomUUID()}.jpg`;
    const reducida = await reducirFoto(archivo);
    const { error: e1 } = await supabase.storage
      .from("chat")
      .upload(ruta, reducida, { contentType: reducida.type || "image/jpeg" });
    const { error: e2 } = e1
      ? { error: e1 }
      : await supabase
          .from("mensajes")
          .insert({ cliente_id: clienteId, remitente: remitentePropio, texto: pie, imagen: ruta });
    setSubiendoFoto(false);
    if (e1 || e2) {
      setPendientes((prev) => prev.filter((m) => m.id !== temporal.id));
      setTexto(pie);
      setErrorFoto("No se pudo enviar la foto. Inténtalo de nuevo.");
      return;
    }
    /* La del móvil sirve mientras llega la firmada */
    setUrlsFotos((prev) => ({ ...prev, [ruta]: local }));
    avisarMensaje(remitentePropio === "entrenador" ? [clienteId] : []);
    router.refresh();
  }

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

  async function enviar(directo?: string) {
    const valor = (directo ?? texto).trim();
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
    if (directo === undefined) setTexto("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("mensajes")
      .insert({ cliente_id: clienteId, remitente: remitentePropio, texto: valor });
    setEnviando(false);
    if (error) {
      setPendientes((prev) => prev.filter((m) => m.id !== temporal.id));
      if (directo === undefined) setTexto(valor);
      return;
    }
    avisarMensaje(remitentePropio === "entrenador" ? [clienteId] : []);
    router.refresh();
  }

  const urlDe = (ruta: string) => (ruta.startsWith("blob:") ? ruta : (urlsFotos[ruta] ?? null));

  return (
    <>
      {/* Espacio para que el último mensaje no quede tapado por la
       * barra de escritura fija */}
      <div className={`flex flex-col ${sugerenciaVigente && verSugerir ? "pb-80" : verRapidas || verSugerir ? "pb-48" : "pb-28"}`}>
        {mensajes.length === 0 && (
          <EstadoVacio
            Icono={MessageCircle}
            color="var(--color-acento)"
            titulo={`Escríbele a ${nombreOtro}`}
            descripcion={`Aquí puedes escribir a ${nombreOtro} cuando quieras: dudas sobre tu rutina, tu dieta o cómo te sientes.`}
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
              {m.imagen && (
                <button
                  type="button"
                  className="block -mx-2 -mt-0.5 mb-1 cursor-zoom-in"
                  onClick={() => setFotoAbierta(urlDe(m.imagen!))}
                  aria-label="Ver la foto en grande"
                >
                  {urlDe(m.imagen) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL firmada que caduca
                    <img
                      src={urlDe(m.imagen)!}
                      alt="Foto del chat"
                      className="w-[220px] max-w-full aspect-square object-cover rounded-[12px]"
                    />
                  ) : (
                    <span className="block w-[220px] max-w-full aspect-square rounded-[12px] bg-black/20" />
                  )}
                </button>
              )}
              {(() => {
                const guia = leerGuia(m.texto);
                if (!guia) return m.texto;
                return (
                  <button
                    type="button"
                    className="flex items-center gap-2 text-left cursor-pointer"
                    onClick={() => setGuiaAbierta(guia.id)}
                  >
                    <BookOpen size={18} className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-bold leading-tight break-words">{guia.titulo}</span>
                      <span className={`block text-[12px] ${esPropio ? "text-fondo/75" : "text-atenuado"}`}>
                        Guía · toca para abrir
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0" />
                  </button>
                );
              })()}
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
        style={{
          bottom: "calc(var(--alto-barra-inferior) + env(safe-area-inset-bottom))",
        }}
      >
        {verSugerir &&
          (sugerenciaVigente ? (
            <div className="tarjeta tarjeta-morado !p-3 !mb-0 mt-2 bg-panel/95 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={14} className="text-morado shrink-0" />
                <span className="text-[12px] text-atenuado flex-1">Respuesta sugerida</span>
                <button className="text-atenuado cursor-pointer" onClick={() => setSugerencia(null)} aria-label="Quitar sugerencia">
                  <X size={15} />
                </button>
              </div>
              {sugerenciaVigente.cargando ? (
                <div className="text-atenuado text-[13px] py-1 animate-pulse">Leyendo la conversación…</div>
              ) : sugerenciaVigente.error ? (
                <div className="text-peligro text-[13px]">{sugerenciaVigente.error}</div>
              ) : (
                <div className="text-[14px] text-texto-2 leading-snug mb-2.5 max-h-32 overflow-y-auto whitespace-pre-line break-words">
                  {sugerenciaVigente.texto}
                </div>
              )}
              {!sugerenciaVigente.cargando && (
                <div className="flex gap-2">
                  {sugerenciaVigente.texto && (
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 bg-acento text-fondo font-semibold rounded-[10px] py-2 text-[13.5px] cursor-pointer"
                      onClick={() => {
                        setTexto(sugerenciaVigente.texto!);
                        setSugerencia(null);
                        cuadroRef.current?.focus();
                      }}
                    >
                      <Check size={14} /> Usar
                    </button>
                  )}
                  <button className="ghost flex-1 flex items-center justify-center gap-1.5" onClick={pedirSugerencia}>
                    <RefreshCw size={13} /> {sugerenciaVigente.error ? "Reintentar" : "Otra"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-fondo/95 backdrop-blur-md pt-2">
              <button className="chip !text-[12.5px] flex items-center gap-1.5" onClick={pedirSugerencia}>
                <Sparkles size={12} className="text-morado shrink-0" /> Sugerir respuesta
              </button>
            </div>
          ))}
        {verRapidas && (
          <div className="flex gap-1.5 flex-wrap bg-fondo/95 backdrop-blur-md pt-2">
            {respuestasRapidas.map((r) => (
              <button
                key={r}
                className="chip !text-[12.5px] !text-texto-2 flex items-center gap-1 max-w-full"
                onClick={() => {
                  /* Al cuadro, no enviada: se puede retocar antes */
                  setTexto(r);
                  cuadroRef.current?.focus();
                }}
              >
                <Zap size={12} className="text-acento shrink-0" />
                <span className="min-w-0 break-words text-left">{r}</span>
              </button>
            ))}
          </div>
        )}
        {errorFoto && (
          <div className="text-peligro text-[12.5px] bg-fondo/95 pt-1.5">{errorFoto}</div>
        )}
        <div className="flex gap-2 items-end bg-fondo/95 backdrop-blur-md pt-2">
          <input
            ref={selectorFoto}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              e.target.value = "";
              if (archivo) void enviarFoto(archivo);
            }}
          />
          <button
            className="mini !w-11 !h-11 shrink-0"
            onClick={() => selectorFoto.current?.click()}
            disabled={subiendoFoto}
            aria-label="Mandar una foto"
            title="Mandar una foto"
          >
            <Camera size={17} className={subiendoFoto ? "animate-pulse" : ""} />
          </button>
          {guias.length > 0 && (
            <button
              className="mini !w-11 !h-11 shrink-0"
              onClick={() => setEligiendoGuia(true)}
              aria-label="Mandar una guía"
              title="Mandar una guía"
            >
              <BookOpen size={17} />
            </button>
          )}
          <textarea
            ref={cuadroRef}
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
            onClick={() => void enviar()}
            disabled={enviando || texto.trim() === ""}
            aria-label="Enviar mensaje"
          >
            <Send size={17} />
          </button>
        </div>
      </div>

      {guiaAbierta && <VisorGuia id={guiaAbierta} onCerrar={() => setGuiaAbierta(null)} />}

      {fotoAbierta && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-3 anim-fondo-aparece"
          onClick={() => setFotoAbierta(null)}
        >
          <button className="absolute top-4 right-4 mini" aria-label="Cerrar la foto">
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada que caduca */}
          <img src={fotoAbierta} alt="Foto del chat" className="max-w-full max-h-full object-contain rounded-[10px]" />
        </div>
      )}

      {eligiendoGuia && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
          onClick={() => setEligiendoGuia(false)}
        >
          <div
            className="w-full max-w-[480px] max-h-[80vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] pb-7 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="titulo-seccion !mb-0">Mandar una guía</div>
              <button className="ghost shrink-0" onClick={() => setEligiendoGuia(false)}>
                Cerrar
              </button>
            </div>
            {guias.map((g) => (
              <button
                key={g.id}
                className="w-full flex items-center gap-3 py-3 border-b border-borde last:border-0 text-left cursor-pointer"
                onClick={() => {
                  setEligiendoGuia(false);
                  void enviar(mensajeDeGuia(g));
                }}
              >
                <BookOpen size={17} className="text-acento shrink-0" />
                <span className="flex-1 min-w-0 font-semibold text-[14px] break-words">{g.titulo}</span>
                <Send size={15} className="text-acento shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
