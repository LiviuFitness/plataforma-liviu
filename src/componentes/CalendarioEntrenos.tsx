"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquareQuote, Trophy, X } from "lucide-react";
import type { SesionHistorial } from "@/lib/progresoEntreno";

const SENSACION: Record<number, { emoji: string; texto: string }> = {
  1: { emoji: "😖", texto: "muy duro" },
  2: { emoji: "😕", texto: "duro" },
  3: { emoji: "😐", texto: "normal" },
  4: { emoji: "🙂", texto: "bien" },
  5: { emoji: "🔥", texto: "¡genial!" },
};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/* Fechas siempre en hora de Madrid: lo mismo en el servidor y en el móvil */
const diaDe = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const horaDe = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });

/** Minutos que duró, si es creíble (sin fin o más de 4 h: no se cuenta) */
function minutos(s: SesionHistorial): number | null {
  if (!s.fin) return null;
  const m = Math.round((new Date(s.fin).getTime() - new Date(s.fecha).getTime()) / 60000);
  return m > 0 && m <= 240 ? m : null;
}
const duracion = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`);

/** "TORSO A" → "TA", "PIERNA B" → "PB", "MMA" → "MMA", "Empujes" → "EMP" */
function abreviatura(nombre: string): string {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  if (p.length > 1) return p.map((x) => x[0]).join("").slice(0, 3).toUpperCase();
  return (p[0] ?? "").slice(0, 3).toUpperCase();
}

/**
 * Calendario de entrenos del cliente (ficha › Progreso): el mes día a día
 * con cómo le fue y sus récords, un resumen arriba y, al tocar un día,
 * todo lo de esa sesión, incluido su comentario final.
 */
export default function CalendarioEntrenos({
  historial,
  diasPorSemana,
}: {
  historial: SesionHistorial[];
  /** Días obligatorios de su rutina, para el % de lo pautado */
  diasPorSemana: number;
}) {
  /* Arranca en el mes de su último entreno */
  const [mes, setMes] = useState(() => (historial[0] ? diaDe(historial[0].fecha).slice(0, 7) : null));
  const [hoy, setHoy] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<SesionHistorial | null>(null);
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setHoy(diaDe(new Date().toISOString()));
  }, []);

  if (!mes || historial.length === 0) return null;

  const [anio, m] = mes.split("-").map(Number);
  const diasMes = new Date(Date.UTC(anio, m, 0)).getUTCDate();
  const huecos = (new Date(Date.UTC(anio, m - 1, 1)).getUTCDay() + 6) % 7;
  const delMes = historial.filter((s) => diaDe(s.fecha).startsWith(mes));
  const porDia = new Map<number, SesionHistorial[]>();
  for (const s of delMes) {
    const d = Number(diaDe(s.fecha).slice(8, 10));
    porDia.set(d, [...(porDia.get(d) ?? []), s]);
  }

  /* Resumen del mes */
  const sens = delMes.map((s) => s.sensacion).filter((v): v is number => v !== null);
  const media = sens.length ? Math.round(sens.reduce((a, b) => a + b, 0) / sens.length) : null;
  const mins = delMes.map(minutos).filter((v): v is number => v !== null);
  const durMedia = mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : null;
  const obligatorias = delMes.filter((s) => !s.opcional).length;
  const diasTranscurridos = hoy && hoy.startsWith(mes) ? Number(hoy.slice(8, 10)) : diasMes;
  const esperadas = diasPorSemana > 0 ? (diasPorSemana * diasTranscurridos) / 7 : 0;
  const pct = esperadas >= 1 ? Math.min(100, Math.round((obligatorias / esperadas) * 100)) : null;

  const moverMes = (n: number) => {
    const f = new Date(Date.UTC(anio, m - 1 + n, 1));
    setMes(`${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const primerMes = diaDe(historial[historial.length - 1].fecha).slice(0, 7);
  const ultimoMes = diaDe(historial[0].fecha).slice(0, 7);
  const comentarios = historial.filter((s) => s.nota).slice(0, 4);

  return (
    <>
      <div className="titulo-tarjeta mt-1">ENTRENOS</div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          [media ? SENSACION[media].emoji : "·", media ? SENSACION[media].texto[0].toUpperCase() + SENSACION[media].texto.slice(1) : "—", "cómo se siente de media"],
          ["⏱", durMedia ? duracion(durMedia) : "—", "duración media"],
          ["🏋", String(delMes.length), `entrenos en ${MESES[m - 1]}`],
          ["📈", pct === null ? "—" : `${pct} %`, "de lo pautado"],
        ].map(([icono, valor, texto]) => (
          <div key={texto} className="tarjeta !p-3 !mb-0">
            <div className="text-[20px] leading-none mb-1">{icono}</div>
            <div className="font-bold text-[17px] leading-tight">{valor}</div>
            <div className="text-atenuado text-[11.5px] leading-tight">{texto}</div>
          </div>
        ))}
      </div>

      <section className="tarjeta !p-3">
        <div className="flex items-center justify-between mb-2">
          <button className="mini !w-8 !h-8" onClick={() => moverMes(-1)} disabled={mes <= primerMes} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <div className="font-bold text-[15px] capitalize">
            {MESES[m - 1]} {anio}
          </div>
          <button className="mini !w-8 !h-8" onClick={() => moverMes(1)} disabled={mes >= ultimoMes} aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-atenuado text-[10.5px] mb-1">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: huecos }, (_, i) => (
            <div key={`h${i}`} />
          ))}
          {Array.from({ length: diasMes }, (_, i) => {
            const d = i + 1;
            const ses = porDia.get(d);
            const s = ses?.[0];
            const esHoy = hoy === `${mes}-${String(d).padStart(2, "0")}`;
            const conRecord = ses?.some((x) => (x.records?.length ?? 0) > 0);
            const clase = !s
              ? "border border-borde/60"
              : s.opcional
                ? "bg-naranja/15 border border-naranja/40 cursor-pointer"
                : "bg-acento/12 border border-acento/40 cursor-pointer";
            return (
              <button
                key={d}
                type="button"
                disabled={!s}
                onClick={() => s && setAbierta(s)}
                className={`aspect-[4/5] rounded-[10px] flex flex-col items-center justify-start pt-1 text-[11px] relative ${clase} ${
                  esHoy ? "!border-white/70" : ""
                }`}
                aria-label={s ? `${d}: ${s.nombreDia}` : String(d)}
              >
                <span className={s ? "text-white font-semibold" : "text-atenuado"}>{d}</span>
                {s && <span className="text-[13px] leading-none mt-0.5">{s.sensacion ? SENSACION[s.sensacion].emoji : "·"}</span>}
                {s && (
                  <span className={`text-[9px] font-bold mt-0.5 ${s.opcional ? "text-naranja" : "text-acento"}`}>
                    {abreviatura(s.nombreDia)}
                    {(ses?.length ?? 0) > 1 ? "+" : ""}
                  </span>
                )}
                {conRecord && <Trophy size={10} className="absolute top-1 right-1 text-dorado" />}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-atenuado text-[11px] mt-2.5">
          <span>🙂 cómo le fue</span>
          <span className="flex items-center gap-1">
            <Trophy size={10} className="text-dorado" /> récord
          </span>
          <span>Toca un día para ver el entreno</span>
        </div>
      </section>

      {comentarios.length > 0 && (
        <section className="tarjeta !p-3">
          <div className="titulo-tarjeta flex items-center gap-1.5">
            <MessageSquareQuote size={13} /> SUS COMENTARIOS
          </div>
          {comentarios.map((s) => (
            <button
              key={s.id}
              type="button"
              className="block w-full text-left text-[13px] leading-snug border-b border-borde pb-2 mb-2 last:border-0 last:pb-0 last:mb-0 cursor-pointer"
              onClick={() => setAbierta(s)}
            >
              <span className="text-atenuado text-[11.5px] block">
                {s.nombreDia} · {fechaLarga(s.fecha)} {s.sensacion ? SENSACION[s.sensacion].emoji : ""}
              </span>
              <span className="break-words">«{s.nota}»</span>
            </button>
          ))}
        </section>
      )}

      {abierta && <HojaSesion s={abierta} onCerrar={() => setAbierta(null)} />}
    </>
  );
}

function HojaSesion({ s, onCerrar }: { s: SesionHistorial; onCerrar: () => void }) {
  const mins = minutos(s);
  const series = (s.ejercicios ?? []).reduce((a, e) => a + e.series.split(" · ").length, 0);
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[560px] max-h-[90dvh] overflow-y-auto bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] anim-hoja-sube"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[16px] break-words">{s.nombreDia}</div>
            <div className="text-atenuado text-[12.5px] first-letter:uppercase">
              {fechaLarga(s.fecha)} · {horaDe(s.fecha)}
              {s.expres ? " · exprés" : ""}
            </div>
          </div>
          <button className="ghost shrink-0 !px-2" onClick={onCerrar} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            [s.prsPre ? SENSACION[s.prsPre].emoji : "·", "Llegó", s.prsPre ? SENSACION[s.prsPre].texto : "sin marcar"],
            [s.sensacion ? SENSACION[s.sensacion].emoji : "·", "Acabó", s.sensacion ? SENSACION[s.sensacion].texto : "sin marcar"],
            ["⏱", mins ? duracion(mins) : "—", "duración"],
          ].map(([icono, a, b]) => (
            <div key={a} className="tarjeta !p-2.5 !mb-0 text-center">
              <div className="text-[20px] leading-none mb-1">{icono}</div>
              <div className="font-bold text-[13.5px]">{a}</div>
              <div className="text-atenuado text-[11px]">{b}</div>
            </div>
          ))}
        </div>

        {s.nota ? (
          <div className="rounded-[14px] border border-acento/40 bg-acento/[0.07] p-3 mb-3">
            <div className="text-[11px] font-bold tracking-[0.1em] text-acento mb-1">COMENTARIO FINAL</div>
            <div className="text-[14px] leading-snug break-words">«{s.nota}»</div>
          </div>
        ) : (
          <div className="text-atenuado text-[12.5px] mb-3">No dejó comentario al terminar.</div>
        )}

        {(s.records ?? []).map((r) => (
          <div key={r.ejercicio} className="tarjeta tarjeta-dorado !p-3 !mb-2 flex items-center gap-2.5">
            <Trophy size={17} className="text-dorado shrink-0" />
            <div className="text-[13px] min-w-0 break-words">
              <b>Récord:</b> {r.ejercicio} ·{" "}
              <span className="text-dorado font-bold">{String(r.kg).replace(".", ",")} kg</span>
            </div>
          </div>
        ))}

        <div className="tarjeta !p-3 !mb-0 mt-3">
          <div className="titulo-tarjeta">LO QUE HIZO · {series} SERIES</div>
          {(s.ejercicios ?? []).length === 0 && <div className="text-atenuado text-[13px]">Sin series marcadas.</div>}
          {(s.ejercicios ?? []).map((e) => (
            <div key={e.nombre} className="py-1.5 text-[13px] border-b border-borde/50 last:border-0">
              <div className="font-semibold leading-tight break-words">{e.nombre}</div>
              <div className="text-atenuado text-[12.5px] break-words">{e.series}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
