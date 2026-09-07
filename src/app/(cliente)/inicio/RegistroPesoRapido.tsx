"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { aNumero } from "@/lib/rutinas";
import { IconoTarjeta } from "@/componentes/ui";
import { useCountUp } from "@/lib/useCountUp";

/**
 * Fila de Inicio: pesarse hoy sin ir a "Progreso". Es una ACCIÓN del
 * día, por eso vive aquí; la evolución (gráfica, variación desde el
 * inicio, medidas) es de Mi Progreso y no se repite en la Home.
 */
export default function RegistroPesoRapido({
  clienteId,
  ultimoPeso,
}: {
  clienteId: string;
  ultimoPeso: number | null;
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
    // Misma RPC que Mi Progreso: una sola fila por día aunque se pese
    // varias veces (ver comentario en la migración 32).
    const { error } = await supabase.rpc("guardar_medidas", {
      p_cliente_id: clienteId,
      p_peso: valor,
    });
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
      className="tarjeta anim-pulsable anim-entrada-3 w-full text-left flex items-center gap-3.5"
      onClick={() => setEditando(true)}
    >
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
    </button>
  );
}
