"use client";

import { useState } from "react";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import EditorRutina from "@/componentes/EditorRutina";
import type { Ejercicio, RutinaUI } from "@/lib/tipos";

/** Cabecera editable (nombre/notas) + editor de días de la plantilla. */
export default function EditorPlantillaEntreno({
  rutina,
  biblioteca,
}: {
  rutina: RutinaUI;
  biblioteca: Ejercicio[];
}) {
  const [nombre, setNombre] = useState(rutina.nombre);
  const [notas, setNotas] = useState(rutina.notas ?? "");
  const [estado, setEstado] = useState<"" | "guardando" | "ok">("");
  const [editandoDia, setEditandoDia] = useState(false);

  async function guardarCabecera() {
    setEstado("guardando");
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("rutinas")
      .update({ nombre: nombre.trim() || "Plantilla", notas: notas.trim() || null })
      .eq("id", rutina.id);
    setEstado(error ? "" : "ok");
  }

  return (
    <>
      {!editandoDia && (
        <>
          <Link
            href="/plantillas"
            className="text-atenuado text-[13.5px] inline-block mb-2"
          >
            ← Plantillas
          </Link>
          <div className="titulo-tarjeta !mb-2 flex justify-between">
            <span>PLANTILLA DE ENTRENO</span>
            <span className="text-[11px] normal-case tracking-normal">
              {estado === "guardando" && "Guardando…"}
              {estado === "ok" && "Guardado ✓"}
            </span>
          </div>
          <input
            className="input !font-bold !text-[19px] tracking-tight"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={guardarCabecera}
            aria-label="Nombre de la plantilla"
          />
          <input
            className="input"
            placeholder="Para quién es (ej.: Intermedios · 3-4 días)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onBlur={guardarCabecera}
          />
        </>
      )}

      <EditorRutina
        rutina={rutina}
        clienteId={null}
        biblioteca={biblioteca}
        alEditarDia={setEditandoDia}
      />
    </>
  );
}
