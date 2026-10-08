"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, Check, Images, Send, X } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { avisarMensaje } from "@/lib/avisos";
import { MARCA_TECNICA, extensionDe, prepararVideo } from "@/lib/videoChat";
import type { EjercicioSesion } from "@/componentes/SesionEnCurso";

/**
 * Desde la sesión: el cliente se graba una serie y le llega al
 * entrenador por el chat, marcada con el ejercicio, la serie y lo que
 * levantó, para que le corrija la técnica.
 */
export default function HojaTecnicaVideo({
  clienteId,
  ejercicio,
  onCerrar,
}: {
  clienteId: string;
  ejercicio: EjercicioSesion;
  onCerrar: () => void;
}) {
  const hechas = ejercicio.series.map((s, i) => (s.completada ? i : -1)).filter((i) => i >= 0);
  const [serie, setSerie] = useState(hechas.length ? hechas[hechas.length - 1] : 0);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [fase, setFase] = useState<"elegir" | "revisar" | "preparando" | "subiendo" | "enviado">("elegir");
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState("");
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const ocupado = fase === "preparando" || fase === "subiendo";

  useEffect(() => () => void (vista && URL.revokeObjectURL(vista)), [vista]);

  function elegido(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("Eso no es un vídeo. Prueba otra vez.");
      return;
    }
    setError("");
    setArchivo(f);
    setVista(URL.createObjectURL(f));
    setFase("revisar");
  }

  const s = ejercicio.series[serie];
  const titulo = `${ejercicio.nombre} · Serie ${serie + 1}${s?.kg && s?.reps ? ` · ${s.kg} kg × ${s.reps}` : ""}`;

  async function enviar() {
    if (!archivo) return;
    setError("");
    try {
      setFase("preparando");
      setProgreso(0);
      const listo = await prepararVideo(archivo, setProgreso);
      setFase("subiendo");
      const tipo = listo.type || archivo.type || "video/mp4";
      const ruta = `${clienteId}/${crypto.randomUUID()}.${extensionDe(tipo, archivo.name)}`;
      const supabase = crearClienteNavegador();
      const { error: e1 } = await supabase.storage.from("chat").upload(ruta, listo, { contentType: tipo });
      if (e1) throw new Error("No se ha podido subir. Si no tienes cobertura, prueba al salir del gimnasio.");
      const texto = `${MARCA_TECNICA}${titulo}${nota.trim() ? `\n${nota.trim()}` : ""}`;
      const { error: e2 } = await supabase
        .from("mensajes")
        .insert({ cliente_id: clienteId, remitente: "cliente", texto, imagen: ruta });
      if (e2) throw new Error("No se ha podido enviar. Inténtalo de nuevo.");
      avisarMensaje([]);
      setFase("enviado");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No se ha podido enviar. Inténtalo de nuevo.");
      setFase("revisar");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
      onClick={() => !ocupado && onCerrar()}
    >
      <div
        className="w-full max-w-[480px] max-h-[92dvh] overflow-y-auto bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] anim-hoja-sube"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[16px]">Mándame tu técnica</div>
            <div className="text-atenuado text-[12.5px] leading-snug break-words">
              {ejercicio.nombre}. Te la miro y te contesto por el chat.
            </div>
          </div>
          <button type="button" className="ghost shrink-0 !px-2" onClick={onCerrar} disabled={ocupado} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {fase === "enviado" ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-verde/15 text-verde flex items-center justify-center mx-auto mb-3">
              <Check size={24} />
            </div>
            <div className="font-bold text-[15px] mb-1">¡Enviado!</div>
            <div className="text-atenuado text-[13px] mb-4">Te contesto por el chat en cuanto lo vea.</div>
            <button type="button" className="cta !mb-0" onClick={onCerrar}>
              Seguir entrenando
            </button>
          </div>
        ) : (
          <>
            <div className="text-[12.5px] text-atenuado mb-1.5">¿Qué serie?</div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {ejercicio.series.map((x, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={ocupado}
                  onClick={() => setSerie(i)}
                  className={`chip !text-[12.5px] ${i === serie ? "!bg-acento/15 !border-acento !text-acento" : ""}`}
                >
                  Serie {i + 1}
                  {x.kg && x.reps ? ` · ${x.kg}×${x.reps}` : ""}
                </button>
              ))}
            </div>

            {fase === "elegir" ? (
              <>
                <ul className="text-[12.5px] text-texto-2 leading-relaxed mb-3.5 list-disc pl-4">
                  <li>Móvil apoyado, de lado y a la altura de la barra</li>
                  <li>Que se vea todo el recorrido</li>
                  <li>Con 20-30 segundos basta</li>
                </ul>
                <button
                  type="button"
                  className="cta !mb-2 flex items-center justify-center gap-2"
                  onClick={() => camara.current?.click()}
                >
                  <Camera size={16} /> Grabar ahora
                </button>
                <button
                  type="button"
                  className="ghost w-full flex items-center justify-center gap-2"
                  onClick={() => galeria.current?.click()}
                >
                  <Images size={15} /> Elegir de la galería
                </button>
              </>
            ) : (
              <>
                {vista && (
                  <video
                    src={`${vista}#t=0.1`}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full max-h-[300px] rounded-[14px] bg-black mb-3"
                  />
                )}
                <input
                  className="input"
                  placeholder="¿Algo que quieras que mire? (opcional)"
                  value={nota}
                  maxLength={300}
                  onChange={(e) => setNota(e.target.value)}
                  disabled={ocupado}
                />
                <button
                  type="button"
                  className="cta !mb-2 flex items-center justify-center gap-2"
                  onClick={() => void enviar()}
                  disabled={ocupado}
                >
                  <Send size={15} />
                  {fase === "preparando"
                    ? `Preparando el vídeo… ${Math.round(progreso * 100)} %`
                    : fase === "subiendo"
                      ? "Enviando…"
                      : "Enviar"}
                </button>
                {!ocupado && (
                  <button type="button" className="ghost w-full" onClick={() => setFase("elegir")}>
                    Grabar otro
                  </button>
                )}
                {fase === "preparando" && (
                  <div className="text-atenuado text-[12px] text-center mt-1">
                    Lo estoy aligerando para que suba rápido. No cierres la app.
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="text-peligro text-[13px] mt-2.5 flex items-start gap-1.5">
                <AlertCircle size={14} className="shrink-0 mt-[3px]" />
                <span className="min-w-0">{error}</span>
              </div>
            )}
          </>
        )}

        <input
          ref={camara}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            elegido(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={galeria}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            elegido(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
