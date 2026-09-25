"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { copiarRutina } from "@/lib/copiarPlan";

/**
 * Guardar la rutina de un cliente como plantilla: hasta ahora solo se
 * podía ir de plantilla a cliente. Cuando afinas una rutina a alguien y
 * te gusta, esto la lleva a Biblioteca para reutilizarla. Es una copia:
 * la rutina del cliente no cambia, y la plantilla tampoco le afectará.
 */
export default function HojaGuardarPlantilla({
  rutinaId,
  nombreRutina,
  nombreCliente,
  semanas,
  onCerrar,
  onHecho,
}: {
  rutinaId: string;
  nombreRutina: string;
  nombreCliente: string;
  semanas: number;
  onCerrar: () => void;
  onHecho: (nombre: string) => void;
}) {
  const pila = nombreCliente.split(" ")[0];
  const [nombre, setNombre] = useState(
    /* "Rutina de Lucía" no sirve de nombre de plantilla: sería el mismo
     * para todas. Se propone el suyo solo si es algo distinto. */
    nombreRutina && !nombreRutina.startsWith("Rutina de") ? nombreRutina : ""
  );
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    if (!nombre.trim()) {
      setError("Ponle un nombre a la plantilla.");
      return;
    }
    setTrabajando(true);
    setError("");
    const id = await copiarRutina(crearClienteNavegador(), rutinaId, {
      nombre: nombre.trim(),
      cliente_id: null,
      es_plantilla: true,
      activa: false,
    });
    setTrabajando(false);
    if (!id) {
      setError("No se pudo guardar la plantilla. Inténtalo de nuevo.");
      return;
    }
    onHecho(nombre.trim());
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center anim-fondo-aparece"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[480px] max-h-[86vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="titulo-seccion !mb-0">Guardar como plantilla</div>
          <button className="ghost" onClick={onCerrar} disabled={trabajando}>
            Cerrar
          </button>
        </div>
        <p className="text-atenuado text-[12.5px] mb-3">
          Se guarda una copia en Biblioteca › Plantillas
          {semanas > 1 ? `, con sus ${semanas} semanas` : ""}. La rutina de {pila} no
          cambia.
        </p>
        <label className="text-[13px] text-texto-2 block mb-1" htmlFor="nombre-plantilla">
          Nombre de la plantilla
        </label>
        <input
          id="nombre-plantilla"
          className="input"
          placeholder="Hipertrofia torso/pierna · 4 días"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus
        />
        {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}
        <button className="cta !mb-0" onClick={guardar} disabled={trabajando}>
          {trabajando ? "Guardando…" : "Guardar plantilla"}
        </button>
      </div>
    </div>
  );
}
