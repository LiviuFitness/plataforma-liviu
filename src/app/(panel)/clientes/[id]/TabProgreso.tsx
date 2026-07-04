"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { fechaCorta } from "@/componentes/ui";
import { aNumero } from "@/lib/rutinas";
import {
  calcularRevisionSemanal,
  ritmoPorDefecto,
  sugerenciaAjusteKcal,
} from "@/lib/revision";
import type { Medida, Perfil } from "@/lib/tipos";

/** Pestaña Progreso: revisión semanal, medidas y añadir medida nueva. */
export default function TabProgreso({
  clienteId,
  medidas,
  perfil,
  dietaId,
  dietaKcal,
}: {
  clienteId: string;
  medidas: Medida[];
  perfil: Perfil;
  dietaId: string | null;
  dietaKcal: number | null;
}) {
  const router = useRouter();
  const [f, setF] = useState({ peso: "", cintura: "", pecho: "", brazo: "", pierna: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ritmo, setRitmo] = useState(
    perfil.objetivo_ritmo_semanal_pct ?? ritmoPorDefecto(perfil.objetivo)
  );
  const [aplicando, setAplicando] = useState(false);
  const [ajusteAplicado, setAjusteAplicado] = useState(false);

  const listaOrdenada = medidas.slice().reverse(); // más reciente primero

  const semanas = useMemo(
    () => calcularRevisionSemanal(medidas.map((m) => ({ fecha: m.fecha, peso: m.peso }))),
    [medidas]
  );
  const ultimasSemanas = semanas.slice(-6).reverse();
  const ultima = semanas[semanas.length - 1];
  const sugerencia = ultima
    ? sugerenciaAjusteKcal(ultima.variacionPct, ritmo)
    : null;

  const set =
    (clave: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setF({ ...f, [clave]: e.target.value });

  async function guardar() {
    setError("");
    setGuardando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.from("medidas").insert({
      cliente_id: clienteId,
      peso: aNumero(f.peso),
      cintura: aNumero(f.cintura),
      pecho: aNumero(f.pecho),
      brazo: aNumero(f.brazo),
      pierna: aNumero(f.pierna),
    });
    setGuardando(false);
    if (error) {
      setError("No se pudo guardar la medida. Inténtalo de nuevo.");
      return;
    }
    setF({ peso: "", cintura: "", pecho: "", brazo: "", pierna: "" });
    router.refresh();
  }

  async function borrar(id: string) {
    const supabase = crearClienteNavegador();
    await supabase.from("medidas").delete().eq("id", id);
    router.refresh();
  }

  async function guardarRitmo(valor: number) {
    setRitmo(valor);
    const supabase = crearClienteNavegador();
    await supabase
      .from("profiles")
      .update({ objetivo_ritmo_semanal_pct: valor })
      .eq("id", clienteId);
  }

  async function aplicarAjuste() {
    if (!dietaId || !sugerencia || dietaKcal === null) return;
    setAplicando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("dietas")
      .update({ kcal_obj: Math.max(800, dietaKcal + sugerencia.deltaKcal) })
      .eq("id", dietaId);
    setAplicando(false);
    if (!error) {
      setAjusteAplicado(true);
      router.refresh();
    }
  }

  const fmt = (v: number | null) => (v === null ? "—" : v);
  const fmtVariacion = (v: number | null) =>
    v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;

  return (
    <>
      <section className="tarjeta">
        <div className="titulo-tarjeta flex justify-between">
          <span>REVISIÓN SEMANAL</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13.5px] text-texto-2">Ritmo objetivo</span>
          <select
            className="input !mb-0 !w-auto"
            value={ritmo}
            onChange={(e) => guardarRitmo(Number(e.target.value))}
          >
            <option value={-0.5}>−0,50 %/semana (pérdida rápida)</option>
            <option value={-0.25}>−0,25 %/semana (pérdida estándar)</option>
            <option value={0}>0 % (mantenimiento)</option>
            <option value={0.25}>+0,25 %/semana (ganancia estándar)</option>
            <option value={0.5}>+0,50 %/semana (ganancia rápida)</option>
          </select>
        </div>

        {ultimasSemanas.length === 0 && (
          <div className="text-atenuado text-[13.5px]">
            Sin suficientes registros de peso todavía. Cuando el cliente
            registre su peso varias semanas, aquí verás la media semanal y su
            evolución.
          </div>
        )}

        {ultimasSemanas.length > 0 && (
          <div className="grid grid-cols-[1fr_1fr_1fr] text-[11px] text-atenuado uppercase tracking-wider border-b border-borde-2 py-[7px]">
            <span>Semana</span>
            <span>Media peso</span>
            <span>Variación</span>
          </div>
        )}
        {ultimasSemanas.map((s) => (
          <div
            key={s.inicioSemana}
            className="grid grid-cols-[1fr_1fr_1fr] items-center text-[13px] border-b border-borde last:border-0 py-[7px]"
          >
            <span>{fechaCorta(s.inicioSemana)}</span>
            <span className="font-bold text-acento">
              {s.mediaPeso.toFixed(1)} kg
              <span className="text-atenuado text-[11px]"> ({s.numRegistros})</span>
            </span>
            <span
              className={
                s.variacionPct === null
                  ? "text-atenuado"
                  : s.variacionPct < 0
                    ? "text-acento"
                    : s.variacionPct > 0
                      ? "text-aviso"
                      : "text-atenuado"
              }
            >
              {fmtVariacion(s.variacionPct)}
            </span>
          </div>
        ))}

        {sugerencia && (
          <div className="mt-3 bg-campo border border-aviso/40 rounded-[10px] p-3">
            <div className="text-[13px] text-texto-2 mb-2">
              ⚠️ {sugerencia.texto}
            </div>
            {dietaId && dietaKcal !== null ? (
              <button
                className="cta cta-mini !mb-0"
                onClick={aplicarAjuste}
                disabled={aplicando}
              >
                {ajusteAplicado
                  ? "Ajuste aplicado ✓"
                  : aplicando
                    ? "Aplicando…"
                    : `Aplicar (${sugerencia.deltaKcal > 0 ? "+" : ""}${sugerencia.deltaKcal} kcal)`}
              </button>
            ) : (
              <div className="text-atenuado text-[12px]">
                Crea antes una dieta en la pestaña «Dieta» para poder aplicar el ajuste.
              </div>
            )}
          </div>
        )}
      </section>

      <section className="tarjeta">
        <div className="titulo-tarjeta">MEDIDAS</div>
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_28px] text-[11px] text-atenuado uppercase tracking-wider border-b border-borde-2 py-[7px]">
          <span>Fecha</span>
          <span>Peso</span>
          <span>Cintura</span>
          <span>Pecho</span>
          <span>Brazo</span>
          <span></span>
        </div>
        {listaOrdenada.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_28px] items-center text-[13px] border-b border-borde last:border-0 py-[7px]"
          >
            <span>{fechaCorta(m.fecha)}</span>
            <span className="font-bold text-acento">{fmt(m.peso)}</span>
            <span>{fmt(m.cintura)}</span>
            <span>{fmt(m.pecho)}</span>
            <span>{fmt(m.brazo)}</span>
            <button
              className="mini mini-peligro"
              onClick={() => borrar(m.id)}
              aria-label="Borrar medida"
            >
              ✕
            </button>
          </div>
        ))}
        {medidas.length === 0 && (
          <div className="text-atenuado text-[13.5px] pt-2">
            Sin registros todavía. Añade la primera medida abajo.
          </div>
        )}
      </section>

      <section className="tarjeta">
        <div className="titulo-tarjeta">AÑADIR MEDIDA</div>
        <div className="grid grid-cols-2 gap-2 mb-2.5">
          <input className="input !mb-0" placeholder="Peso (kg)" inputMode="decimal" value={f.peso} onChange={set("peso")} />
          <input className="input !mb-0" placeholder="Cintura (cm)" inputMode="decimal" value={f.cintura} onChange={set("cintura")} />
          <input className="input !mb-0" placeholder="Pecho (cm)" inputMode="decimal" value={f.pecho} onChange={set("pecho")} />
          <input className="input !mb-0" placeholder="Brazo (cm)" inputMode="decimal" value={f.brazo} onChange={set("brazo")} />
          <input className="input !mb-0" placeholder="Pierna (cm)" inputMode="decimal" value={f.pierna} onChange={set("pierna")} />
        </div>
        {error && (
          <div className="text-peligro text-[13.5px] mb-3">— {error}</div>
        )}
        <button
          className="cta"
          disabled={f.peso.trim() === "" || guardando}
          onClick={guardar}
        >
          {guardando ? "Guardando…" : "Guardar medida"}
        </button>
      </section>
    </>
  );
}
