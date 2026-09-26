"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Share2, X } from "lucide-react";
import type { ResumenMes } from "@/lib/resumenMes";
import { generarTarjetaMes } from "@/lib/tarjetaMes";

interface Pantalla {
  clave: string;
  color: string;
  eyebrow: string;
  cifra?: string;
  bajoCifra?: string;
  detalle?: string;
  lista?: string[];
}

const DURACION_MS = 5500;
const coma = (n: number) => String(n).replace(".", ",");

/** Coches de ~1,2 t: una forma de imaginarse las toneladas */
function comoCoches(t: number): string | undefined {
  const n = Math.round(t / 1.2);
  return n >= 2 ? `Como levantar ${n} coches 🚗` : undefined;
}

/**
 * Tu mes en LivFit, en pantallas tipo historia: pasan solas, un toque a
 * la derecha adelanta y a la izquierda vuelve. La última prepara la
 * imagen para compartir (se genera al abrir, para que el botón abra la
 * hoja de compartir del iPhone al momento).
 */
export default function HistoriasMes({ r, pila }: { r: ResumenMes; pila: string }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const pantallas = useMemo<Pantalla[]>(() => {
    const p: Pantalla[] = [
      {
        clave: "portada",
        color: "rgba(226,180,41,.32)",
        eyebrow: "TU MES EN LIVFIT",
        cifra: r.mes.charAt(0).toUpperCase() + r.mes.slice(1),
        detalle: pila ? `Vamos a ver qué tal, ${pila} 👀` : "Vamos a ver qué tal 👀",
      },
      {
        clave: "entrenos",
        color: "rgba(41,171,226,.35)",
        eyebrow: `EN ${r.mes.toUpperCase()} ENTRENASTE`,
        cifra: String(r.entrenos),
        bajoCifra: `${r.entrenos === 1 ? "vez" : "veces"} · ${coma(r.horas)} h en total`,
        detalle:
          r.entrenosAntes === null
            ? undefined
            : r.entrenos > r.entrenosAntes
              ? `${r.entrenos - r.entrenosAntes} más que el mes anterior 🔥`
              : r.entrenos === r.entrenosAntes
                ? "Igual que el mes anterior: constancia pura"
                : "Este mes, a por más 💪",
      },
    ];
    if (r.toneladas > 0) {
      p.push({
        clave: "kilos",
        color: "rgba(226,180,41,.35)",
        eyebrow: "LEVANTASTE",
        cifra: `${coma(r.toneladas)} t`,
        bajoCifra: "sumando cada serie",
        detalle: comoCoches(r.toneladas),
      });
    }
    if (r.totalRecords > 0) {
      p.push({
        clave: "records",
        color: "rgba(226,180,41,.4)",
        eyebrow: r.totalRecords === 1 ? "BATISTE UN RÉCORD" : "BATISTE",
        cifra: r.totalRecords === 1 ? "🏆" : String(r.totalRecords),
        bajoCifra: r.totalRecords === 1 ? undefined : "récords",
        lista: r.records.map((x) => `${x.nombre}: ${coma(x.antes)} → ${coma(x.ahora)} kg`),
      });
    }
    if (r.estrella) {
      p.push({
        clave: "estrella",
        color: "rgba(78,203,141,.35)",
        eyebrow: "TU EJERCICIO ESTRELLA",
        cifra: `+${coma(Math.round((r.estrella.hasta - r.estrella.desde) * 10) / 10)} kg`,
        bajoCifra: r.estrella.nombre,
        detalle: `De ${coma(r.estrella.desde)} a ${coma(r.estrella.hasta)} kg`,
      });
    }
    if (r.peso) {
      const delta = Math.round((r.peso.hasta - r.peso.desde) * 10) / 10;
      p.push({
        clave: "peso",
        color: "rgba(45,212,191,.33)",
        eyebrow: "TU PESO",
        cifra: delta === 0 ? "=" : `${delta > 0 ? "+" : "−"}${coma(Math.abs(delta))} kg`,
        bajoCifra: `de ${coma(r.peso.desde)} a ${coma(r.peso.hasta)} kg`,
      });
    }
    if (r.semanasTotales > 0) {
      p.push({
        clave: "semanas",
        color: "rgba(155,140,242,.35)",
        eyebrow: "SEMANAS CUMPLIENDO TU PLAN",
        cifra: `${r.semanasCumplidas}/${r.semanasTotales}`,
        detalle:
          r.semanasCumplidas === r.semanasTotales
            ? "Todas. Mes perfecto 👏"
            : r.semanasCumplidas > 0
              ? "Buen ritmo: a por el mes perfecto"
              : "Este mes, una semana cada vez",
      });
    }
    p.push({ clave: "compartir", color: "rgba(41,171,226,.3)", eyebrow: "COMPÁRTELO" });
    return p;
  }, [r, pila]);

  const ultima = i === pantallas.length - 1;

  /* La imagen para compartir, preparada desde el principio */
  useEffect(() => {
    let vivo = true;
    let creada: string | null = null;
    generarTarjetaMes(r).then((b) => {
      if (!vivo || !b) return;
      creada = URL.createObjectURL(b);
      setArchivo(new File([b], `mi-${r.mes}-livfit.png`, { type: "image/png" }));
      setUrl(creada);
    });
    return () => {
      vivo = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [r]);

  /* Avance solo, salvo en la última */
  useEffect(() => {
    if (ultima) return;
    const t = setTimeout(() => setI((x) => Math.min(x + 1, pantallas.length - 1)), DURACION_MS);
    return () => clearTimeout(t);
  }, [i, ultima, pantallas.length]);

  const puedeCompartir =
    archivo !== null && typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [archivo] });

  async function compartir() {
    if (!archivo) return;
    try {
      await navigator.share({ files: [archivo] });
    } catch {
      /* cancelado: no pasa nada */
    }
  }

  const p = pantallas[i];
  if (r.entrenos === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-fondo grid place-items-center p-8 text-center">
        <div>
          <div className="text-[40px] mb-3">🗓️</div>
          <div className="font-bold text-[18px] mb-1">Sin entrenos en {r.mes}</div>
          <div className="text-atenuado text-[14px] mb-6">Este mes empezamos de cero, {pila || "vamos"} 💪</div>
          <button className="cta" onClick={() => router.push("/inicio")}>
            Volver a Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={{ background: `radial-gradient(100% 60% at 50% 18%, ${p.color}, #0a0c0e 72%)` }}
    >
      {/* Barras de progreso */}
      <div className="flex gap-1 px-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        {pantallas.map((x, k) => (
          <span key={x.clave} className="h-[3px] flex-1 rounded bg-white/25 overflow-hidden">
            <span
              className={`block h-full bg-white ${k === i && !ultima ? "historia-barra" : ""}`}
              style={{ width: k < i || (k === i && ultima) ? "100%" : k === i ? undefined : "0%" }}
            />
          </span>
        ))}
      </div>
      <button
        className="absolute right-3 z-10 w-10 h-10 grid place-items-center text-white/80"
        style={{ top: "calc(env(safe-area-inset-top) + 22px)" }}
        onClick={() => router.push("/inicio")}
        aria-label="Cerrar"
      >
        <X size={22} />
      </button>

      {/* Zonas de toque: izquierda vuelve, derecha avanza */}
      {!ultima && (
        <>
          <button className="absolute left-0 top-16 bottom-0 w-1/3 z-[1]" onClick={() => setI(Math.max(0, i - 1))} aria-label="Anterior" />
          <button className="absolute right-0 top-16 bottom-0 w-2/3 z-[1]" onClick={() => setI(i + 1)} aria-label="Siguiente" />
        </>
      )}

      <div key={p.clave} className="flex-1 flex flex-col items-center justify-center text-center px-8 anim-aparecer">
        <div className="text-[12px] font-bold tracking-[0.2em] text-texto-2 mb-3">{p.eyebrow}</div>
        {p.clave === "compartir" ? (
          <>
            <div className="w-[52%] max-w-[210px] aspect-[9/16] rounded-[14px] overflow-hidden border border-borde bg-fondo mb-5">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob local
                <img src={url} alt="Tu resumen del mes" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-atenuado text-[12px]">Preparando…</div>
              )}
            </div>
            {puedeCompartir ? (
              <button className="cta !w-auto !px-8 flex items-center gap-2 relative z-[2]" onClick={compartir}>
                <Share2 size={16} /> A tu historia
              </button>
            ) : (
              url && (
                <a className="cta !w-auto !px-8 flex items-center gap-2 relative z-[2]" href={url} download={archivo?.name}>
                  <Download size={16} /> Guardar imagen
                </a>
              )
            )}
            <button className="ghost mt-3 relative z-[2]" onClick={() => router.push("/inicio")}>
              Volver a Inicio
            </button>
          </>
        ) : (
          <>
            <div className="cifra-record text-[72px] leading-none break-words max-w-full">{p.cifra}</div>
            {p.bajoCifra && <div className="text-[17px] text-texto-2 mt-2 break-words max-w-full">{p.bajoCifra}</div>}
            {p.lista && (
              <div className="mt-5 flex flex-col gap-2 text-[14.5px] text-texto-2">
                {p.lista.map((l) => (
                  <div key={l} className="break-words">
                    {l}
                  </div>
                ))}
              </div>
            )}
            {p.detalle && <div className="text-[14px] text-atenuado mt-5 break-words max-w-full">{p.detalle}</div>}
          </>
        )}
      </div>
      {!ultima && <div className="text-center text-white/40 text-[11.5px] pb-8">Toca para avanzar</div>}
    </div>
  );
}
