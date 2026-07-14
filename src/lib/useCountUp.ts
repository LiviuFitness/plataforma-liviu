"use client";

import { useEffect, useRef, useState } from "react";

/** Anima un número desde su valor anterior hasta `valor` en ~600ms
 * (requestAnimationFrame, sin dependencias). Úsalo en cifras destacadas
 * (peso, kcal, racha...) para el efecto "cuentakilómetros". */
export function useCountUp(valor: number, decimales = 0): number {
  const [mostrado, setMostrado] = useState(valor);
  const anterior = useRef(valor);

  useEffect(() => {
    const desde = anterior.current;
    const hasta = valor;
    if (desde === hasta) return;
    const duracion = 600;
    const inicio = performance.now();
    let id: number;

    function paso(ahora: number) {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const suavizado = 1 - Math.pow(1 - t, 3); // ease-out cúbico
      const actual = desde + (hasta - desde) * suavizado;
      const factor = 10 ** decimales;
      setMostrado(Math.round(actual * factor) / factor);
      if (t < 1) id = requestAnimationFrame(paso);
      else anterior.current = hasta;
    }
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [valor, decimales]);

  return mostrado;
}
