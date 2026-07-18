"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { aNumero } from "@/lib/rutinas";
import { IconoTarjeta, Sparkline } from "@/componentes/ui";
import { useCountUp } from "@/lib/useCountUp";

/** Tarjeta de Inicio: último peso + registro rápido sin ir a "Progreso". */
export default function RegistroPesoRapido({
  clienteId,
  ultimoPeso,
  deltaKg,
  historial,
}: {
  clienteId: string;
  ultimoPeso: number | null;
  deltaKg: number | null;
  historial: number[];
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

  const pesoAnimado = useCountUp(ultimoPeso ?? 0, 1);

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
      className="tarjeta anim-pulsable anim-entrada-3 w-full text-left"
      onClick={() => setEditando(true)}
    >
      <div className="flex items-center gap-3.5">
        <IconoTarjeta Icono={Scale} color="var(--color-turquesa)" />
        <div className="flex-1 min-w-0">
          {ultimoPeso !== null ? (
            <div className="flex items-baseline gap-1.5">
              <span className="num-grande" style={{ color: "var(--color-turquesa)" }}>
                {pesoAnimado.toFixed(1)}
              </span>
              <span className="text-atenuado text-[13px]">kg</span>
            </div>
          ) : (
            <div className="text-atenuado text-[13.5px]">Sin registrar todavía</div>
          )}
        </div>
        <span className="texto-secundario shrink-0">
          {ultimoPeso !== null ? "Actualizar →" : "Registrar →"}
        </span>
      </div>
      {historial.length >= 2 && (
        <div className="mt-3">
          <Sparkline datos={historial} color="var(--color-turquesa)" />
          {deltaKg !== null && Math.abs(deltaKg) >= 0.1 && (
            <div className="text-[12.5px] text-atenuado -mt-1.5">
              {deltaKg < 0 ? "↓" : "↑"} {Math.abs(deltaKg).toFixed(1)} kg desde el inicio
            </div>
          )}
        </div>
      )}
    </button>
  );
}
