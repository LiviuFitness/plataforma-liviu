"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

/** true si el texto es un número simple (o está vacío) — apto para el
 * stepper. Formatos avanzados ("8+3" en reps, "90 goma azul" en kg) no
 * son steppeables: el llamador debe mostrar el input de texto normal en
 * su lugar, nunca se pierden ni se bloquean esos formatos. */
export function esSteppeable(texto: string): boolean {
  const t = texto.trim();
  return t === "" || /^\d+([.,]\d+)?$/.test(t);
}

/** Extrae la parte numérica inicial de un texto ("90 goma azul" → 90).
 * Si no hay ninguna, devuelve 0. */
function numeroDe(texto: string): number {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return 0;
  const directo = Number(limpio);
  if (Number.isFinite(directo)) return directo;
  const m = limpio.match(/^(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

function formatear(n: number): string {
  return Number(n.toFixed(2)).toString();
}

/**
 * Control de +/- para un número simple (kg, reps). Vive dentro de un
 * bottom sheet dedicado (no en la fila de la serie: ahí solo hay texto
 * plano tocable) — así puede ser grande y satisfactorio sin pelear por
 * espacio horizontal. Tocar el número en sí abre edición de texto para
 * cuando hace falta precisión decimal exacta.
 */
export default function StepperNumero({
  valor,
  placeholder,
  onChange,
  paso,
  disabled,
  etiqueta,
}: {
  valor: string;
  placeholder: string;
  onChange: (nuevo: string) => void;
  paso: number;
  disabled?: boolean;
  /** aria-label del campo (ej. "Peso en kg") */
  etiqueta: string;
}) {
  const [editando, setEditando] = useState(false);

  function incrementar(delta: number) {
    const base = valor.trim() !== "" ? numeroDe(valor) : numeroDe(placeholder);
    onChange(formatear(Math.max(0, base + delta)));
  }

  if (editando) {
    return (
      <input
        className="campo-serie !text-[28px] !py-4 placeholder:text-atenuado/45"
        placeholder={placeholder || "—"}
        inputMode="decimal"
        autoFocus
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => setEditando(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        aria-label={etiqueta}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="stepper-boton-grande"
        onClick={() => incrementar(-paso)}
        disabled={disabled}
        aria-label={`Restar ${paso} a ${etiqueta.toLowerCase()}`}
      >
        <Minus size={20} strokeWidth={2.75} />
      </button>
      <button
        type="button"
        className="stepper-numero-grande"
        onClick={() => setEditando(true)}
        disabled={disabled}
        aria-label={`${etiqueta}: ${valor || placeholder || "sin valor"}. Toca para escribir un número exacto.`}
      >
        {valor.trim() !== "" ? valor : (
          <span className="text-atenuado/50">{placeholder || "—"}</span>
        )}
      </button>
      <button
        type="button"
        className="stepper-boton-grande"
        onClick={() => incrementar(paso)}
        disabled={disabled}
        aria-label={`Sumar ${paso} a ${etiqueta.toLowerCase()}`}
      >
        <Plus size={20} strokeWidth={2.75} />
      </button>
    </div>
  );
}
