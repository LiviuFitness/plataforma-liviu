"use client";

import { useState } from "react";

const PESTANAS = [
  ["entrenos", "Entrenos"],
  ["reto", "Reto y ranking"],
  ["logros", "Logros"],
] as const;
type Pestana = (typeof PESTANAS)[number][0];

/** Las tres partes de la comunidad, en pestañas (lo que ya viene pintado del servidor) */
export default function PestanasComunidad({
  entrenos,
  reto,
  logros,
}: {
  entrenos: React.ReactNode;
  reto: React.ReactNode;
  logros: React.ReactNode;
}) {
  const [activa, setActiva] = useState<Pestana>("entrenos");
  return (
    <>
      <div className="flex gap-5 border-b border-borde mb-4 text-[14px]" role="tablist">
        {PESTANAS.map(([clave, texto]) => (
          <button
            key={clave}
            role="tab"
            aria-selected={activa === clave}
            className={`pb-2 -mb-px border-b-2 cursor-pointer whitespace-nowrap ${
              activa === clave ? "border-acento text-white font-semibold" : "border-transparent text-atenuado"
            }`}
            onClick={() => setActiva(clave)}
          >
            {texto}
          </button>
        ))}
      </div>
      <div hidden={activa !== "entrenos"}>{entrenos}</div>
      <div hidden={activa !== "reto"}>{reto}</div>
      <div hidden={activa !== "logros"}>{logros}</div>
    </>
  );
}
