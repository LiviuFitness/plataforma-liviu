"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** Las notas de voz del entrenador se guardan en el bucket "chat" con
 * nombre `voz-…`: así se distinguen de fotos y vídeos sin otra columna. */
export const esNotaVoz = (ruta: string | null | undefined) => !!ruta && /\/voz-[^/]+$/.test(ruta.split("?")[0]);

/* Onda fija (decorativa): la misma para todas, solo marca el avance */
const ONDA = [30, 55, 40, 70, 90, 60, 45, 80, 100, 65, 50, 75, 40, 85, 60, 35, 70, 55, 45, 30, 60, 80, 50, 40, 25, 45];

function mmss(seg: number) {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Nota de voz: botón de play, onda que avanza y duración. */
export default function ReproductorVoz({ url, claro = false }: { url: string | null; claro?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [sonando, setSonando] = useState(false);
  const [avance, setAvance] = useState(0);
  const [duracion, setDuracion] = useState<number | null>(null);

  function alternar() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  }

  const colorOnda = claro ? "bg-fondo" : "bg-acento";
  return (
    <div className={`flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3 min-w-0 ${claro ? "" : "bg-campo border border-borde-2"}`}>
      <button
        type="button"
        onClick={alternar}
        disabled={!url}
        className={`w-8 h-8 rounded-full grid place-items-center shrink-0 cursor-pointer disabled:opacity-50 ${
          claro ? "bg-fondo text-acento" : "bg-acento text-fondo"
        }`}
        aria-label={sonando ? "Pausar la nota de voz" : "Escuchar la nota de voz"}
      >
        {sonando ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-[2px] h-6 min-w-[90px]">
        {ONDA.map((h, i) => (
          <i
            key={i}
            className={`flex-1 rounded-[2px] ${i / ONDA.length < avance ? colorOnda : claro ? "bg-fondo/35" : "bg-atenuado/50"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <span className={`text-[12px] tabular-nums shrink-0 ${claro ? "" : "text-atenuado"}`}>
        {mmss(sonando || avance > 0 ? (duracion ?? 0) * (1 - avance) : (duracion ?? 0))}
      </span>
      {url && (
        <audio
          ref={audio}
          src={url}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d)) setDuracion(d);
          }}
          onPlay={() => setSonando(true)}
          onPause={() => setSonando(false)}
          onEnded={() => {
            setSonando(false);
            setAvance(0);
          }}
          onTimeUpdate={(e) => {
            const a = e.currentTarget;
            if (Number.isFinite(a.duration) && a.duration > 0) {
              setDuracion(a.duration);
              setAvance(a.currentTime / a.duration);
            }
          }}
        />
      )}
    </div>
  );
}
