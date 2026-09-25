"use client";

import { useState } from "react";
import { ArrowLeftRight, Download } from "lucide-react";
import type { EntradaFotosProgreso, Medida } from "@/lib/tipos";
import { cargarImagen, FUENTE } from "@/lib/tarjetaEntreno";

type Vista = "frontal" | "lateral" | "espalda";
const VISTAS: [Vista, string][] = [
  ["frontal", "Frontal"],
  ["lateral", "Lateral"],
  ["espalda", "Espalda"],
];

function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");
}

/**
 * Antes y después con una barra que se desliza: las dos fotos una
 * encima de otra, a la misma escala, que es como de verdad se ve el
 * cambio (dos miniaturas lado a lado engañan). "Guardar" las exporta
 * lado a lado en una imagen.
 */
export default function ComparadorFotos({
  entradas,
  medidas,
}: {
  /** Más reciente primero, con URLs ya firmadas. */
  entradas: EntradaFotosProgreso[];
  medidas: Medida[];
}) {
  const disponibles = VISTAS.filter(([v]) => entradas.filter((e) => e[v]).length >= 2);
  const [vista, setVista] = useState<Vista>(disponibles[0]?.[0] ?? "frontal");
  const conFoto = entradas.filter((e) => e[vista]);
  /* Por defecto, la primera de todas contra la última */
  const [idAntes, setIdAntes] = useState<string | null>(null);
  const [idDespues, setIdDespues] = useState<string | null>(null);
  const [corte, setCorte] = useState(50);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  if (disponibles.length === 0) return null;

  const antes = conFoto.find((e) => e.id === idAntes) ?? conFoto[conFoto.length - 1];
  const despues = conFoto.find((e) => e.id === idDespues) ?? conFoto[0];
  const pesoDe = (id: string) => {
    const p = medidas.find((m) => m.id === id)?.peso;
    return p === null || p === undefined ? "" : ` · ${String(Number(p)).replace(".", ",")} kg`;
  };

  async function guardar() {
    setGuardando(true);
    setError("");
    const [a, b] = await Promise.all([
      cargarImagen(antes[vista]!.url, true),
      cargarImagen(despues[vista]!.url, true),
    ]);
    if (!a || !b) {
      setGuardando(false);
      setError("No se pudieron preparar las fotos.");
      return;
    }
    const W = 1080;
    const H = 720;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0a0c0e";
    ctx.fillRect(0, 0, W, H);
    [a, b].forEach((img, i) => {
      const w = W / 2 - 3;
      const x = i * (W / 2 + 3);
      const escala = Math.max(w / img.width, H / img.height);
      const sw = w / escala;
      const sh = H / escala;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.3, sw, sh, x, 0, w, H);
      const texto = fechaCorta((i === 0 ? antes : despues).fecha).toUpperCase();
      ctx.font = `800 30px ${FUENTE}`;
      const ancho = ctx.measureText(texto).width + 28;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(x + 18, H - 66, ancho, 46);
      ctx.fillStyle = "#fff";
      ctx.fillText(texto, x + 32, H - 32);
    });
    canvas.toBlob(async (blob) => {
      setGuardando(false);
      if (!blob) {
        setError("No se pudo crear la imagen.");
        return;
      }
      const archivo = new File([blob], "antes-despues.png", { type: "image/png" });
      try {
        if (navigator.canShare?.({ files: [archivo] })) {
          await navigator.share({ files: [archivo] });
          return;
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = archivo.name;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  return (
    <section className="tarjeta tarjeta-turquesa">
      <div className="flex items-center justify-between mb-3">
        <div className="titulo-tarjeta !mb-0">ANTES Y DESPUÉS</div>
        <span className="text-atenuado text-[12px]">desliza ↔</span>
      </div>
      {disponibles.length > 1 && (
        <div className="flex gap-1.5 mb-3">
          {disponibles.map(([v, etiqueta]) => (
            <button
              key={v}
              className={`chip ${vista === v ? "chip-activo" : ""}`}
              onClick={() => {
                setVista(v);
                setIdAntes(null);
                setIdDespues(null);
              }}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      )}

      <div className="relative rounded-[12px] overflow-hidden aspect-[3/4] mb-3 border border-borde bg-campo select-none touch-none">
        {/* eslint-disable @next/next/no-img-element -- URLs firmadas que caducan: sin optimizador */}
        <img src={despues[vista]!.url} alt="Después" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <img
          src={antes[vista]!.url}
          alt="Antes"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ clipPath: `inset(0 ${100 - corte}% 0 0)` }}
          draggable={false}
        />
        {/* eslint-enable @next/next/no-img-element */}
        <div className="absolute inset-y-0 w-[2px] bg-white -translate-x-1/2 pointer-events-none" style={{ left: `${corte}%` }} />
        <div
          className="absolute top-1/2 w-9 h-9 rounded-full bg-white text-fondo grid place-items-center shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${corte}%` }}
        >
          <ArrowLeftRight size={16} />
        </div>
        <span className="absolute top-2.5 left-2.5 text-[11px] font-bold bg-black/60 rounded-md px-2 py-0.5 pointer-events-none">
          {fechaCorta(antes.fecha)}
          {pesoDe(antes.id)}
        </span>
        <span className="absolute top-2.5 right-2.5 text-[11px] font-bold bg-black/60 rounded-md px-2 py-0.5 pointer-events-none">
          {fechaCorta(despues.fecha)}
          {pesoDe(despues.id)}
        </span>
        {/* El control es un deslizador de verdad (accesible y con el dedo) */}
        <input
          type="range"
          min={0}
          max={100}
          value={corte}
          onChange={(e) => setCorte(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
          aria-label="Deslizar entre antes y después"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <select
          className="input !mb-0 !text-[13px]"
          value={antes.id}
          onChange={(e) => setIdAntes(e.target.value)}
          aria-label="Foto de antes"
        >
          {conFoto.map((e) => (
            <option key={e.id} value={e.id}>
              Antes: {fechaCorta(e.fecha)}
            </option>
          ))}
        </select>
        <select
          className="input !mb-0 !text-[13px]"
          value={despues.id}
          onChange={(e) => setIdDespues(e.target.value)}
          aria-label="Foto de después"
        >
          {conFoto.map((e) => (
            <option key={e.id} value={e.id}>
              Después: {fechaCorta(e.fecha)}
            </option>
          ))}
        </select>
      </div>
      <button className="ghost w-full flex items-center justify-center gap-2" onClick={guardar} disabled={guardando}>
        <Download size={15} /> {guardando ? "Preparando…" : "Guardar imagen lado a lado"}
      </button>
      {error && <div className="text-peligro text-[12.5px] mt-1.5">— {error}</div>}
    </section>
  );
}
