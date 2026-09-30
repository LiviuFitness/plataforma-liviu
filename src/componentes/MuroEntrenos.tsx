"use client";

import { useState } from "react";
import { Clock, Dumbbell, Trash2, Trophy } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/componentes/ui";
import EstadoVacio from "@/componentes/EstadoVacio";

export interface EntrenoMuro {
  id: string;
  cliente_id: string;
  nombre: string;
  avatar_url: string | null;
  nombre_dia: string;
  duracion_seg: number;
  series: number;
  tonelaje_kg: number | null;
  records: { nombre: string; kg: number | null }[];
  mensaje: string | null;
  creado_en: string;
  fuego: number;
  fuerza: number;
  aplauso: number;
  mias: string[];
  quienes: string[];
}

type Tipo = "fuego" | "fuerza" | "aplauso";
const REACCIONES: [Tipo, string][] = [
  ["fuego", "🔥"],
  ["fuerza", "💪"],
  ["aplauso", "👏"],
];

function haceCuanto(iso: string, ahora: Date): string {
  const min = Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

const duracion = (seg: number) => {
  const m = Math.round(seg / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};
const toneladas = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(1).replace(".", ",")} t` : `${Math.round(kg)} kg`);

/**
 * Los entrenos que comparten los clientes, con reacciones (🔥 💪 👏) y
 * sin comentarios. En los tuyos ves quién ha reaccionado y los puedes
 * quitar; el entrenador puede quitar cualquiera.
 */
export default function MuroEntrenos({
  iniciales,
  yoId,
  puedoReaccionar,
  esEntrenador = false,
}: {
  iniciales: EntrenoMuro[];
  yoId: string;
  /** Solo quien es visible en la comunidad */
  puedoReaccionar: boolean;
  esEntrenador?: boolean;
}) {
  const [entrenos, setEntrenos] = useState(iniciales);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [ahora] = useState(() => new Date());

  async function reaccionar(e: EntrenoMuro, tipo: Tipo) {
    if (!puedoReaccionar || e.cliente_id === yoId) return;
    const quito = e.mias.includes(tipo);
    const cambiar = (quitar: boolean) =>
      setEntrenos((lista) =>
        lista.map((x) =>
          x.id !== e.id
            ? x
            : {
                ...x,
                [tipo]: Math.max(0, x[tipo] + (quitar ? -1 : 1)),
                mias: quitar ? x.mias.filter((m) => m !== tipo) : [...x.mias, tipo],
              }
        )
      );
    cambiar(quito);
    if (!quito && "vibrate" in navigator) navigator.vibrate(10);
    const supabase = crearClienteNavegador();
    const { error } = quito
      ? await supabase.from("reacciones_entreno").delete().eq("entreno_id", e.id).eq("cliente_id", yoId).eq("tipo", tipo)
      : await supabase.from("reacciones_entreno").insert({ entreno_id: e.id, cliente_id: yoId, tipo });
    if (error) {
      cambiar(!quito);
      return;
    }
    if (!quito) {
      void fetch("/api/avisos/reaccion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entrenoId: e.id, tipo }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  async function quitar(e: EntrenoMuro) {
    if (!confirm(esEntrenador && e.cliente_id !== yoId ? `¿Quitar el entreno de ${e.nombre} de la comunidad?` : "¿Quitar tu entreno de la comunidad?")) return;
    setBorrando(e.id);
    const { error } = await crearClienteNavegador().from("entrenos_compartidos").delete().eq("id", e.id);
    setBorrando(null);
    if (!error) setEntrenos((lista) => lista.filter((x) => x.id !== e.id));
  }

  if (entrenos.length === 0) {
    return (
      <section className="tarjeta">
        <EstadoVacio
          Icono={Dumbbell}
          imagen="/vacios/comunidad.webp"
          titulo="Todavía nadie ha compartido un entreno"
          descripcion="Al terminar un entreno, activa «Compartir en la comunidad» y aparecerá aquí para que los demás te den 🔥."
        />
      </section>
    );
  }

  return (
    <>
      {!puedoReaccionar && !esEntrenador && (
        <div className="text-atenuado text-[12.5px] mb-3 leading-snug">
          Para reaccionar a los entrenos de los demás, aparece en la comunidad desde tu perfil.
        </div>
      )}
      {entrenos.map((e) => {
        const mio = e.cliente_id === yoId;
        const total = e.fuego + e.fuerza + e.aplauso;
        return (
          <section key={e.id} className="tarjeta !p-3.5">
            <div className="flex items-center gap-2.5 mb-2.5">
              <Avatar nombre={e.nombre} tamano={36} foto={e.avatar_url} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] leading-tight break-words">
                  <b>{mio ? "Tú" : e.nombre}</b> <span className="text-atenuado">{mio ? "has entrenado" : "ha entrenado"}</span>
                </div>
                <div className="text-atenuado text-[12px]">{haceCuanto(e.creado_en, ahora)}</div>
              </div>
              {(mio || esEntrenador) && (
                <button
                  className="text-atenuado hover:text-peligro p-1.5 -m-1.5 shrink-0 cursor-pointer"
                  onClick={() => quitar(e)}
                  disabled={borrando === e.id}
                  aria-label="Quitar de la comunidad"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <div className="bg-campo border border-borde rounded-[12px] p-3">
              <div className="font-bold text-[15px] mb-0.5 break-words">{e.nombre_dia}</div>
              <div className="text-atenuado text-[12.5px] flex items-center gap-1.5 flex-wrap">
                <Clock size={12} /> {duracion(e.duracion_seg)} · {e.series} series
                {e.tonelaje_kg !== null && ` · ${toneladas(Number(e.tonelaje_kg))}`}
              </div>
              {e.records.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {e.records.slice(0, 3).map((r) => (
                    <div key={r.nombre} className="text-[13px] text-dorado flex items-start gap-1.5">
                      <Trophy size={13} className="shrink-0 mt-[2px]" />
                      <span className="min-w-0 break-words">
                        {r.kg !== null ? `Récord en ${r.nombre.toLowerCase()}: ${String(r.kg).replace(".", ",")} kg` : `Nuevo récord en ${r.nombre.toLowerCase()}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {e.mensaje && <div className="text-[14px] text-texto-2 mt-2.5 leading-snug break-words">{e.mensaje}</div>}
            <div className="flex items-center gap-2 mt-3">
              {REACCIONES.map(([tipo, emoji]) => {
                const marcada = e.mias.includes(tipo);
                const n = e[tipo];
                return (
                  <button
                    key={tipo}
                    className={`h-8 px-3 rounded-full border flex items-center gap-1.5 text-[13.5px] shrink-0 transition-colors ${
                      marcada ? "border-acento bg-acento/15 text-white" : "border-borde-2 text-texto-2"
                    } ${mio || !puedoReaccionar ? "cursor-default" : "cursor-pointer anim-pulsable"}`}
                    onClick={() => reaccionar(e, tipo)}
                    disabled={mio || !puedoReaccionar}
                    aria-pressed={marcada}
                    aria-label={`${emoji} ${n}`}
                  >
                    {emoji} {n > 0 && <b className="tabular-nums">{n}</b>}
                  </button>
                );
              })}
              {mio && total > 0 && (
                <span className="text-atenuado text-[12px] ml-auto min-w-0 text-right leading-tight break-words">
                  {e.quienes.length <= 2 ? e.quienes.join(" y ") : `${e.quienes.slice(0, 2).join(", ")} y ${e.quienes.length - 2} más`}
                </span>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
