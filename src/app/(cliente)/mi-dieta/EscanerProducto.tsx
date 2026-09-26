"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, Barcode, Camera, ChevronRight, X } from "lucide-react";
import { reducirFoto } from "@/lib/fotoChat";
import type { MensajeAsistente } from "@/lib/asistenteDieta";

interface Producto {
  nombre: string;
  marca: string | null;
  cantidad: string | null;
  kcal: number | null;
  prot: number | null;
  carb: number | null;
  azucar: number | null;
  gras: number | null;
  grasSat: number | null;
  fibra: number | null;
  sal: number | null;
}

type Fase =
  | { paso: "camara" }
  | { paso: "buscando"; codigo: string }
  | { paso: "producto"; producto: Producto; respuesta?: MensajeAsistente; error?: string }
  | { paso: "sin-producto"; codigo: string; respuesta?: MensajeAsistente; error?: string; preguntando?: boolean };

const coma = (n: number | null) => (n === null ? "–" : String(n).replace(".", ","));

function Respuesta({ m }: { m: MensajeAsistente }) {
  return (
    <div className="flex items-start gap-2">
      <Image src="/asistente.webp" alt="" width={28} height={28} className="rounded-full shrink-0 ring-1 ring-acento/40" />
      <div className="min-w-0 flex-1 rounded-[14px] px-3.5 py-2.5 text-[14px] leading-snug break-words whitespace-pre-line bg-panel border border-borde text-texto-2">
        {m.texto}
        {m.alternativas?.map((a) => (
          <div
            key={a.nombre}
            className="mt-2 flex justify-between gap-3 bg-campo border border-borde rounded-[10px] px-3 py-2 text-[13.5px]"
          >
            <span className="min-w-0 text-white break-words">{a.nombre}</span>
            <span className="text-acento font-semibold shrink-0 text-right">{a.cantidad}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pensando() {
  return (
    <div className="flex items-center gap-2 text-atenuado text-[13px]">
      <Image src="/asistente.webp" alt="" width={28} height={28} className="rounded-full shrink-0 ring-1 ring-acento/40" />
      <span className="animate-pulse">Mirando si te encaja en tu dieta…</span>
    </div>
  );
}

/**
 * Escanear un producto del súper: su código de barras → sus macros (de
 * Open Food Facts, base de datos pública) → el asistente dice si le
 * encaja en su dieta y en qué cantidad. Si no está, foto a la etiqueta.
 * Las preguntas cuentan en las del día y se ven en su conversación.
 */
export default function EscanerProducto() {
  const [abierto, setAbierto] = useState(false);
  const [fase, setFase] = useState<Fase>({ paso: "camara" });
  const [errorCamara, setErrorCamara] = useState("");
  const [manual, setManual] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlesRef = useRef<{ stop: () => void } | null>(null);
  const selectorFoto = useRef<HTMLInputElement>(null);

  function parar() {
    controlesRef.current?.stop();
    controlesRef.current = null;
  }

  function cerrar() {
    parar();
    setAbierto(false);
  }

  /* La cámara solo mientras se está escaneando */
  useEffect(() => {
    if (!abierto || fase.paso !== "camara") return;
    let cancelado = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelado || !videoRef.current) return;
        const lector = new BrowserMultiFormatReader();
        const controles = await lector.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current,
          (res, _err, ctrl) => {
            if (!res) return;
            ctrl.stop();
            if ("vibrate" in navigator) navigator.vibrate(30);
            buscar(res.getText());
          }
        );
        if (cancelado) controles.stop();
        else controlesRef.current = controles;
      } catch {
        if (!cancelado) setErrorCamara("No se puede usar la cámara: escribe aquí abajo los números del código de barras.");
      }
    })();
    return () => {
      cancelado = true;
      parar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, fase.paso]);

  async function preguntar(texto: string, imagen?: string): Promise<{ respuesta?: MensajeAsistente; error?: string }> {
    try {
      const r = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, imagen }),
      });
      const d = (await r.json()) as { respuesta?: MensajeAsistente; error?: string };
      if (!r.ok || !d.respuesta) return { error: d.error ?? "El asistente no ha podido responder." };
      return { respuesta: d.respuesta };
    } catch {
      return { error: "Sin conexión. Prueba otra vez." };
    }
  }

  async function buscar(codigo: string) {
    const limpio = codigo.replace(/\D/g, "");
    if (limpio.length < 6) return;
    setFase({ paso: "buscando", codigo: limpio });
    try {
      const r = await fetch(`/api/producto?codigo=${limpio}`);
      const d = (await r.json()) as { encontrado?: boolean; producto?: Producto };
      if (!d.encontrado || !d.producto) {
        setFase({ paso: "sin-producto", codigo: limpio });
        return;
      }
      const p = d.producto;
      setFase({ paso: "producto", producto: p });
      const texto = `He escaneado este producto: ${p.nombre}${p.marca ? ` (${p.marca})` : ""}. Por 100 g: ${coma(p.kcal)} kcal, proteína ${coma(p.prot)} g, hidratos ${coma(p.carb)} g (azúcares ${coma(p.azucar)} g), grasa ${coma(p.gras)} g. ¿Me encaja en mi dieta? Si sí, ¿por cuál de mis alimentos lo cambiaría y cuánto?`;
      const res = await preguntar(texto);
      setFase({ paso: "producto", producto: p, ...res });
    } catch {
      setFase({ paso: "sin-producto", codigo: limpio, error: "No se ha podido buscar ahora." });
    }
  }

  async function fotoEtiqueta(archivo: File | undefined) {
    if (!archivo || fase.paso !== "sin-producto") return;
    const codigo = fase.codigo;
    setFase({ paso: "sin-producto", codigo, preguntando: true });
    try {
      const blob = await reducirFoto(archivo);
      const base64 = await new Promise<string>((ok, mal) => {
        const lector = new FileReader();
        lector.onload = () => ok(String(lector.result).split(",")[1] ?? "");
        lector.onerror = mal;
        lector.readAsDataURL(blob);
      });
      const res = await preguntar(
        "Esta es la etiqueta de un producto del súper. ¿Me encaja en mi dieta? Si sí, ¿por cuál de mis alimentos lo cambiaría y cuánto?",
        base64
      );
      setFase({ paso: "sin-producto", codigo, ...res });
    } catch {
      setFase({ paso: "sin-producto", codigo, error: "No se ha podido leer la foto." });
    }
  }

  function abrir() {
    setErrorCamara("");
    setManual("");
    setFase({ paso: "camara" });
    setAbierto(true);
  }

  return (
    <>
      <button className="fila anim-pulsable !py-3 mb-3 w-full text-left cursor-pointer" onClick={abrir}>
        <Barcode size={17} className="text-acento shrink-0" />
        <div className="flex-1 min-w-0 text-[13.5px] text-texto-2">Escanear un producto del súper</div>
        <ChevronRight size={16} className="text-atenuado shrink-0" />
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {fase.paso === "camara" && (
            <>
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
              <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[76%] max-w-[340px] h-[130px] rounded-[16px] border-2 border-acento shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                <div className="absolute left-3 right-3 top-1/2 h-[2px] bg-acento/80 animate-pulse" />
              </div>
              <div className="absolute top-[calc(38%+85px)] w-full text-center text-white/85 text-[13.5px] px-6">
                {errorCamara || "Apunta al código de barras"}
              </div>
              <div
                className="absolute bottom-0 inset-x-0 p-4 flex gap-2"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
              >
                <input
                  className="flex-1 min-w-0 bg-black/60 border border-white/25 rounded-[12px] text-white px-3 py-2.5 text-[16px] backdrop-blur"
                  inputMode="numeric"
                  placeholder="O escribe el código"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && buscar(manual)}
                />
                <button
                  className="bg-acento text-fondo font-semibold rounded-[12px] px-4 disabled:opacity-40"
                  onClick={() => buscar(manual)}
                  disabled={manual.replace(/\D/g, "").length < 6}
                >
                  Buscar
                </button>
              </div>
            </>
          )}

          <button
            className="absolute right-4 z-10 w-10 h-10 rounded-full bg-black/60 text-white grid place-items-center"
            style={{ top: "calc(env(safe-area-inset-top) + 14px)" }}
            onClick={cerrar}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>

          {fase.paso !== "camara" && (
            <div
              className="mt-auto w-full max-w-[480px] mx-auto max-h-[88dvh] overflow-y-auto bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px]"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" }}
            >
              {fase.paso === "buscando" && <div className="text-atenuado text-[14px] py-6 text-center">Buscando el producto…</div>}

              {fase.paso === "producto" && (
                <>
                  <div className="font-bold text-[16px] break-words pr-8">{fase.producto.nombre}</div>
                  <div className="text-atenuado text-[12.5px] mb-3 break-words">
                    {[fase.producto.marca, fase.producto.cantidad].filter(Boolean).join(" · ")}
                    {fase.producto.marca || fase.producto.cantidad ? " · " : ""}por 100 g
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {(
                      [
                        [fase.producto.kcal, "kcal"],
                        [fase.producto.prot, "prot"],
                        [fase.producto.carb, "hidr"],
                        [fase.producto.gras, "grasa"],
                      ] as const
                    ).map(([n, e]) => (
                      <div key={e} className="tarjeta !mb-0 !p-2.5 text-center min-w-0">
                        <div className="num-grande text-[20px] leading-none">{coma(n)}</div>
                        <div className="text-atenuado text-[11px] mt-1">{e}</div>
                      </div>
                    ))}
                  </div>
                  {fase.respuesta ? (
                    <Respuesta m={fase.respuesta} />
                  ) : fase.error ? (
                    <div className="text-peligro text-[13px] flex items-start gap-1.5">
                      <AlertCircle size={14} className="shrink-0 mt-[3px]" />
                      <span className="min-w-0">{fase.error}</span>
                    </div>
                  ) : (
                    <Pensando />
                  )}
                </>
              )}

              {fase.paso === "sin-producto" && (
                <>
                  <div className="font-bold text-[16px] mb-1 pr-8">No lo encuentro</div>
                  <div className="text-atenuado text-[13px] mb-4 leading-snug">
                    Este producto no está en la base de datos pública. Hazle una foto a la tabla nutricional y te digo si te encaja.
                  </div>
                  <input
                    ref={selectorFoto}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      fotoEtiqueta(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  {fase.respuesta ? (
                    <Respuesta m={fase.respuesta} />
                  ) : fase.preguntando ? (
                    <Pensando />
                  ) : (
                    <>
                      {fase.error && (
                        <div className="text-peligro text-[13px] mb-2 flex items-start gap-1.5">
                          <AlertCircle size={14} className="shrink-0 mt-[3px]" />
                          <span className="min-w-0">{fase.error}</span>
                        </div>
                      )}
                      <button className="cta flex items-center justify-center gap-2" onClick={() => selectorFoto.current?.click()}>
                        <Camera size={16} /> Foto a la etiqueta
                      </button>
                    </>
                  )}
                </>
              )}

              {fase.paso !== "buscando" && (
                <button className="ghost w-full mt-3 flex items-center justify-center gap-1.5" onClick={() => setFase({ paso: "camara" })}>
                  <Barcode size={15} /> Escanear otro
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
