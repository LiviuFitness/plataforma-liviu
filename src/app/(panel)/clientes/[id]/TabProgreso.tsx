"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { fechaCorta } from "@/componentes/ui";
import { aNumero } from "@/lib/rutinas";
import type { Medida } from "@/lib/tipos";

/** Pestaña Progreso: tabla de medidas + añadir medida nueva. */
export default function TabProgreso({
  clienteId,
  medidas,
}: {
  clienteId: string;
  medidas: Medida[];
}) {
  const router = useRouter();
  const [f, setF] = useState({ peso: "", cintura: "", pecho: "", brazo: "", pierna: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const listaOrdenada = medidas.slice().reverse(); // más reciente primero

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

  const fmt = (v: number | null) => (v === null ? "—" : v);

  return (
    <>
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
