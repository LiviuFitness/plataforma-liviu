"use client";

import { useState } from "react";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import EditorDieta from "@/componentes/EditorDieta";
import type { Alimento } from "@/lib/dietas";
import type { Dieta } from "@/lib/tipos";

/** Cabecera editable (nombre) + editor de objetivos y comidas. */
export default function EditorPlantillaDieta({
  dieta,
  alimentos,
}: {
  dieta: Dieta;
  alimentos: Alimento[];
}) {
  const [nombre, setNombre] = useState(dieta.nombre ?? "");
  const [estado, setEstado] = useState<"" | "guardando" | "ok">("");

  async function guardarNombre() {
    setEstado("guardando");
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("dietas")
      .update({ nombre: nombre.trim() || "Plantilla de dieta" })
      .eq("id", dieta.id);
    setEstado(error ? "" : "ok");
  }

  return (
    <>
      <Link
        href="/plantillas"
        className="text-atenuado text-[13.5px] inline-block mb-2"
      >
        ← Plantillas
      </Link>
      <div className="titulo-tarjeta !mb-2 flex justify-between">
        <span>PLANTILLA DE DIETA</span>
        <span className="text-[11px] normal-case tracking-normal">
          {estado === "guardando" && "Guardando…"}
          {estado === "ok" && "Guardado ✓"}
        </span>
      </div>
      <input
        className="input !font-bold !text-[19px] tracking-tight"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onBlur={guardarNombre}
        placeholder="Nombre de la plantilla"
        aria-label="Nombre de la plantilla"
      />
      <EditorDieta dieta={dieta} clienteId={null} alimentos={alimentos} />
    </>
  );
}
