"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { aNumero } from "@/lib/rutinas";

/** Tarjeta de Inicio: último peso + registro rápido sin ir a "Progreso". */
export default function RegistroPesoRapido({
  clienteId,
  ultimoPeso,
  deltaKg,
}: {
  clienteId: string;
  ultimoPeso: number | null;
  deltaKg: number | null;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [peso, setPeso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    const valor = aNumero(peso);
    if (!valor || valor < 25 || valor > 350) {
      setError("Peso no válido.");
      return;
    }
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("medidas")
      .insert({ cliente_id: clienteId, peso: valor });
    setGuardando(false);
    if (error) {
      setError("No se pudo guardar.");
      return;
    }
    setPeso("");
    setEditando(false);
    router.refresh();
  }

  if (editando) {
    return (
      <section className="tarjeta">
        <div className="titulo-tarjeta">TU PESO DE HOY</div>
        <div className="flex gap-2">
          <input
            className="input !mb-0 flex-1"
            inputMode="decimal"
            placeholder="kg"
            autoFocus
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
          />
          <button
            className="cta cta-mini !mb-0"
            onClick={guardar}
            disabled={guardando || peso.trim() === ""}
          >
            {guardando ? "…" : "Guardar"}
          </button>
          <button className="ghost" onClick={() => setEditando(false)}>
            ✕
          </button>
        </div>
        {error && <div className="text-peligro text-[13px] mt-2">— {error}</div>}
      </section>
    );
  }

  return (
    <button
      className="tarjeta !mb-2.5 flex items-center gap-3.5 w-full text-left"
      onClick={() => setEditando(true)}
    >
      <div className="flex-1">
        <div className="titulo-tarjeta !mb-1">TU PESO</div>
        {ultimoPeso !== null ? (
          <div className="text-[14px]">
            <b className="text-acento">{ultimoPeso} kg</b>
            {deltaKg !== null && Math.abs(deltaKg) >= 0.1 && (
              <span className="text-atenuado">
                {" "}
                ({deltaKg > 0 ? "+" : ""}
                {deltaKg.toFixed(1)} kg)
              </span>
            )}
          </div>
        ) : (
          <div className="text-atenuado text-[13.5px]">Sin registrar todavía</div>
        )}
      </div>
      <span className="text-acento text-[13.5px]">
        {ultimoPeso !== null ? "Actualizar →" : "Registrar →"}
      </span>
    </button>
  );
}
