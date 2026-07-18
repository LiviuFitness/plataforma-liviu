"use client";

import { useEffect, useState } from "react";

const COLORES = [
  "var(--color-acento)",
  "var(--color-dorado)",
  "var(--color-verde)",
  "var(--color-turquesa)",
  "var(--color-morado)",
];

/** Confeti mínimo y breve — solo para el instante de desbloquear un
 * logro nuevo. Se desmonta solo a los 1.4s, nunca queda flotando ni
 * se repite en cada visita (el padre solo lo monta si hay algo nuevo). */
export default function Confetti() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const piezas = Array.from({ length: 14 }, (_, i) => i);
  return (
    <div className="confetti-contenedor" aria-hidden="true">
      {piezas.map((i) => (
        <span
          key={i}
          className="confetti-pieza"
          style={{
            left: `${(i / piezas.length) * 100}%`,
            background: COLORES[i % COLORES.length],
            animationDelay: `${(i % 5) * 40}ms`,
          }}
        />
      ))}
    </div>
  );
}
