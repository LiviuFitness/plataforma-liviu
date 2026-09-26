"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Scale, AlertCircle } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { aNumero } from "@/lib/rutinas";
import { IconoTarjeta } from "@/componentes/ui";
import { useCountUp } from "@/lib/useCountUp";

/**
 * Fila de "Tu día": pesarse hoy sin ir a "Progreso". Es una ACCIÓN del
 * día, por eso vive aquí; la evolución (gráfica, variación desde el
 * inicio, medidas) es de Mi Progreso y no se repite en la Home.
 *
 * Enseña cuándo fue la última vez y no solo el número: "64,3 kg" a secas
 * no dice si toca volver a pesarse.
 */
export default function RegistroPesoRapido({
  clienteId,
  ultimoPeso,
  diasDesdeUltimo,
}: {
  clienteId: string;
  ultimoPeso: number | null;
  /** Días desde el último registro; null si nunca se ha pesado. */
  diasDesdeUltimo: number | null;
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
      <div className="py-3 border-b border-borde">
        <div className="flex items-center gap-2">
          <IconoTarjeta Icono={Scale} color="var(--color-turquesa)" tamano={34} />
          <input
            className="input !mb-0 flex-1 min-w-0"
            inputMode="decimal"
            placeholder="Tu peso de hoy (kg)"
            autoFocus
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
          />
          <button
            className="cta cta-mini !mb-0 shrink-0"
            onClick={guardar}
            disabled={guardando || peso.trim() === ""}
          >
            {guardando ? "…" : "Guardar"}
          </button>
          <button
            className="ghost shrink-0"
            onClick={() => setEditando(false)}
            aria-label="Cancelar"
          >
            ✕
          </button>
        </div>
        {error && <div className="text-peligro text-[13px] mt-2 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}
      </div>
    );
  }

  const cuando =
    diasDesdeUltimo === null
      ? "Apunta tu peso de hoy"
      : diasDesdeUltimo === 0
        ? "Registrado hoy"
        : diasDesdeUltimo === 1
          ? "Última vez ayer"
          : `Última vez hace ${diasDesdeUltimo} días`;

  return (
    <button
      className="fila w-full text-left anim-pulsable"
      onClick={() => setEditando(true)}
    >
      <IconoTarjeta Icono={Scale} color="var(--color-turquesa)" tamano={34} />
      <div className="flex-1 min-w-0">
        {ultimoPeso !== null ? (
          <div className="text-[14px] leading-tight">
            <b className="tabular-nums" style={{ color: "var(--color-turquesa)" }}>
              {pesoAnimado.toFixed(1).replace(".", ",")}
            </b>
            <span className="text-atenuado"> kg</span>
          </div>
        ) : (
          <div className="text-[14px] leading-tight font-semibold">Tu peso</div>
        )}
        <div className="text-atenuado text-[12.5px]">{cuando}</div>
      </div>
      <span
        className="w-9 h-9 rounded-full border border-borde-2 bg-campo flex items-center justify-center shrink-0"
        aria-label={ultimoPeso !== null ? "Actualizar peso" : "Registrar peso"}
      >
        <Plus size={16} className="text-texto-2" />
      </span>
    </button>
  );
}
