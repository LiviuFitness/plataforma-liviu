"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, MessageCircle, UserRound } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/componentes/ui";
import type { Sugerencia } from "@/lib/revision";

export interface FichaRonda {
  id: string;
  nombre: string;
  avatar: string | null;
  objetivo: string | null;
  /** Media de la última semana cerrada y su variación. */
  pesoMedio: number | null;
  variacionPct: number | null;
  ritmo: number;
  entrenos: number;
  objetivoEntrenos: number;
  sensacion: number | null;
  cuestionario: { pregunta: string; respuesta: string }[];
  foto: { url: string; fecha: string } | null;
  dieta: { id: string; kcal: number } | null;
  sugerencia: Sugerencia | null;
  /** Ajuste ya hecho esta semana (kcal), si lo hay. */
  ajustadoEstaSemana: number | null;
}

const CARAS = ["", "😖", "😕", "😐", "🙂", "🔥"];
const OPCIONES = [-150, -100, 0, 100, 150];
const coma = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

function claveSemana(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `ronda-revisados:${d.toLocaleDateString("sv-SE")}`;
}

/**
 * La revisión de los lunes, cliente a cliente: sus números de la semana,
 * lo que contestó y el ajuste de kcal a un toque. "Aplicar y siguiente"
 * cambia la dieta y deja constancia al cliente (como el ajuste de la
 * ficha); "Sin cambios" solo pasa al siguiente.
 */
export default function RondaRevision({ fichas }: { fichas: FichaRonda[] }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [revisados, setRevisados] = useState<Set<string>>(new Set());
  const [elegido, setElegido] = useState<Record<string, number>>({});
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState("");

  /* Lo marcado como "sin cambios" se recuerda en este móvil toda la semana */
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(claveSemana()) ?? "[]") as string[];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevisados(new Set(guardado));
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  function marcar(id: string) {
    const nuevo = new Set(revisados).add(id);
    setRevisados(nuevo);
    try {
      localStorage.setItem(claveSemana(), JSON.stringify([...nuevo]));
    } catch {
      /* sin almacenamiento */
    }
  }

  if (fichas.length === 0) {
    return (
      <>
        <Link href="/hoy" className="text-atenuado text-[13.5px] inline-flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> Hoy
        </Link>
        <div className="tarjeta text-atenuado text-[13.5px]">No hay clientes activos que revisar.</div>
      </>
    );
  }

  const fin = i >= fichas.length;
  const f = fichas[Math.min(i, fichas.length - 1)];
  const hechos = fichas.filter((x) => x.ajustadoEstaSemana !== null || revisados.has(x.id)).length;
  const delta = elegido[f.id] ?? f.sugerencia?.deltaKcal ?? 0;

  async function aplicarYSeguir() {
    if (!f.dieta) return;
    if (delta === 0) {
      marcar(f.id);
      setI(i + 1);
      return;
    }
    setAplicando(true);
    setError("");
    const kcalNuevo = Math.max(800, f.dieta.kcal + delta);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.from("dietas").update({ kcal_obj: kcalNuevo }).eq("id", f.dieta.id);
    if (!error) {
      await supabase.from("revisiones_kcal").insert({
        cliente_id: f.id,
        dieta_id: f.dieta.id,
        kcal_anterior: f.dieta.kcal,
        kcal_nuevo: kcalNuevo,
        delta,
        motivo: f.sugerencia?.texto ?? "Revisión semanal",
      });
    }
    setAplicando(false);
    if (error) {
      setError("No se pudo aplicar. Inténtalo de nuevo.");
      return;
    }
    marcar(f.id);
    setI(i + 1);
    router.refresh();
  }

  function sinCambios() {
    marcar(f.id);
    setI(i + 1);
  }

  if (fin) {
    return (
      <div className="text-center pt-10">
        <div className="w-14 h-14 rounded-full bg-acento/15 text-acento grid place-items-center mx-auto mb-3">
          <Check size={28} strokeWidth={3} />
        </div>
        <h1 className="h1 mb-1">Ronda terminada</h1>
        <div className="text-texto-2 text-[14px] mb-6">
          {hechos} de {fichas.length} clientes revisados esta semana.
        </div>
        <Link href="/hoy" className="cta block">
          Volver a Hoy
        </Link>
        <button className="ghost w-full mt-2" onClick={() => setI(0)}>
          Empezar otra vez
        </button>
      </div>
    );
  }

  const variacionTexto =
    f.variacionPct === null ? "sin semana anterior" : `${f.variacionPct > 0 ? "+" : "−"}${coma(Math.abs(f.variacionPct), 2)} %`;
  const faltanEntrenos = f.objetivoEntrenos > 0 ? f.objetivoEntrenos - f.entrenos : 0;
  const yaAjustado = f.ajustadoEstaSemana !== null;
  const revisado = yaAjustado || revisados.has(f.id);

  return (
    <>
      <div className="flex items-center justify-between mb-1.5">
        <Link href="/hoy" className="text-atenuado text-[13.5px] inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Salir
        </Link>
        <span className="text-atenuado text-[13px] tabular-nums">
          {i + 1} de {fichas.length}
        </span>
      </div>
      <div className="barra-capsula !h-1 mb-4">
        <div className="barra-capsula-relleno" style={{ width: `${((i + 1) / fichas.length) * 100}%` }} />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Avatar nombre={f.nombre} tamano={44} foto={f.avatar} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[20px] leading-tight break-words">{f.nombre}</div>
          <div className="text-atenuado text-[12.5px] break-words">
            {f.objetivo ?? "Sin objetivo"}
            {f.dieta ? ` · ${f.dieta.kcal.toLocaleString("es-ES")} kcal` : " · sin dieta"}
          </div>
        </div>
        {revisado && (
          <span className="text-acento text-[12px] font-semibold flex items-center gap-1 shrink-0">
            <Check size={13} strokeWidth={3} /> Revisado
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="tarjeta !mb-0 !p-3 min-w-0">
          <div className="font-bold text-[17px] leading-tight">{f.pesoMedio !== null ? `${coma(f.pesoMedio)} kg` : "—"}</div>
          <div className="text-atenuado text-[11px]">media semana</div>
          <div className="text-turquesa text-[11.5px] font-semibold">{f.pesoMedio !== null ? variacionTexto : "sin pesarse"}</div>
        </div>
        <div className="tarjeta !mb-0 !p-3 min-w-0">
          <div className="font-bold text-[17px] leading-tight">
            {f.objetivoEntrenos > 0 ? `${f.entrenos}/${f.objetivoEntrenos}` : f.entrenos}
          </div>
          <div className="text-atenuado text-[11px]">entrenos</div>
          <div className={`text-[11.5px] font-semibold ${faltanEntrenos > 0 ? "text-aviso" : "text-acento"}`}>
            {f.objetivoEntrenos === 0 ? "sin rutina" : faltanEntrenos > 0 ? `${faltanEntrenos} menos` : "cumplida"}
          </div>
        </div>
        <div className="tarjeta !mb-0 !p-3 min-w-0">
          <div className="font-bold text-[17px] leading-tight">
            {f.sensacion !== null ? `${CARAS[Math.round(f.sensacion)]} ${coma(f.sensacion)}` : "—"}
          </div>
          <div className="text-atenuado text-[11px]">sensación</div>
        </div>
      </div>

      {(f.cuestionario.length > 0 || f.foto) && (
        <section className="tarjeta !p-3.5">
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <div className="titulo-tarjeta">SU CUESTIONARIO</div>
              {f.cuestionario.length === 0 ? (
                <div className="text-atenuado text-[13px]">No lo ha contestado.</div>
              ) : (
                f.cuestionario.map((q) => (
                  <div key={q.pregunta} className="mb-2 last:mb-0">
                    <div className="text-[12px] text-atenuado break-words">{q.pregunta}</div>
                    <div className="text-[13.5px] break-words">{q.respuesta}</div>
                  </div>
                ))
              )}
            </div>
            {f.foto && (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada que caduca
              <img
                src={f.foto.url}
                alt={`Última foto de ${f.nombre}`}
                className="w-[76px] h-[100px] object-cover rounded-[10px] border border-borde shrink-0"
              />
            )}
          </div>
        </section>
      )}

      {f.dieta ? (
        <section className="tarjeta tarjeta-acento !p-3.5">
          <div className="titulo-tarjeta">AJUSTE DE KCAL</div>
          {yaAjustado ? (
            <div className="text-[13px] text-texto-2">
              Ya ajustada esta semana ({f.ajustadoEstaSemana! > 0 ? "+" : ""}
              {f.ajustadoEstaSemana} kcal).
            </div>
          ) : (
            <>
              <div className="text-[13px] text-texto-2 mb-2.5 leading-snug">
                {f.sugerencia ? (
                  <>
                    Sugerido: <b className="text-white">{f.sugerencia.deltaKcal > 0 ? "+" : "−"}{Math.abs(f.sugerencia.deltaKcal)} kcal</b>{" "}
                    (va a {variacionTexto}/sem, objetivo {f.ritmo > 0 ? "+" : ""}{coma(f.ritmo, 2)} %)
                  </>
                ) : f.variacionPct === null ? (
                  "Sin dos semanas de peso no hay con qué comparar."
                ) : (
                  "Va al ritmo previsto: nada que cambiar."
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {OPCIONES.map((o) => (
                  <button
                    key={o}
                    className={`chip ${delta === o ? "chip-activo" : ""}`}
                    onClick={() => setElegido({ ...elegido, [f.id]: o })}
                  >
                    {o === 0 ? "Sin cambio" : `${o > 0 ? "+" : "−"}${Math.abs(o)}`}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      ) : null}

      {error && <div className="text-peligro text-[13px] mb-2">— {error}</div>}

      {f.dieta && !yaAjustado && delta !== 0 ? (
        <button className="cta flex items-center justify-center gap-2" onClick={aplicarYSeguir} disabled={aplicando}>
          {aplicando ? (
            "Aplicando…"
          ) : (
            <>
              Aplicar {delta > 0 ? "+" : "−"}
              {Math.abs(delta)} y siguiente <ArrowRight size={16} />
            </>
          )}
        </button>
      ) : (
        <button className="cta flex items-center justify-center gap-2" onClick={sinCambios}>
          {yaAjustado ? "Siguiente" : "Sin cambios · siguiente"} <ArrowRight size={16} />
        </button>
      )}

      <div className="flex gap-2">
        <button className="tab !text-[13px] flex items-center justify-center gap-1" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
          <ChevronLeft size={14} /> Anterior
        </button>
        <Link href={`/clientes/${f.id}?vista=chat`} className="tab !text-[13px] flex items-center justify-center gap-1.5">
          <MessageCircle size={14} /> Escribirle
        </Link>
        <Link href={`/clientes/${f.id}`} className="tab !text-[13px] flex items-center justify-center gap-1.5">
          <UserRound size={14} /> Ficha
        </Link>
      </div>
    </>
  );
}
