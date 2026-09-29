"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import Switch from "@/componentes/Switch";

export interface OpcionesCompartir {
  activo: boolean;
  mensaje: string;
  kilos: boolean;
}

const CLAVE = "compartir-comunidad";

/** Lo último que eligió en este móvil: encendido y sin kilos de inicio */
export function leerOpcionesCompartir(): OpcionesCompartir {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as Partial<OpcionesCompartir>;
    return { activo: g.activo !== false, kilos: g.kilos === true, mensaje: "" };
  } catch {
    return { activo: true, kilos: false, mensaje: "" };
  }
}

function recordar(o: OpcionesCompartir) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ activo: o.activo, kilos: o.kilos }));
  } catch {
    /* sin almacenamiento: vuelve al valor de inicio */
  }
}

/**
 * En el resumen del entreno: publicarlo en la comunidad al guardar.
 * Quien no es visible en la comunidad puede activarlo desde aquí.
 */
export default function CompartirComunidad({
  visible,
  onVisible,
  opciones,
  onCambio,
}: {
  visible: boolean;
  onVisible: () => void;
  opciones: OpcionesCompartir;
  onCambio: (o: OpcionesCompartir) => void;
}) {
  const [activando, setActivando] = useState(false);
  const [error, setError] = useState("");

  function cambiar(parcial: Partial<OpcionesCompartir>) {
    const nuevas = { ...opciones, ...parcial };
    onCambio(nuevas);
    recordar(nuevas);
  }

  async function aparecer() {
    setActivando(true);
    setError("");
    const { error } = await crearClienteNavegador().rpc("cambiar_visible_comunidad", { p_visible: true });
    setActivando(false);
    if (error) {
      setError("No se ha podido activar. Inténtalo de nuevo.");
      return;
    }
    onVisible();
    cambiar({ activo: true });
  }

  return (
    <section className="tarjeta tarjeta-acento !p-3.5">
      <div className="flex items-center gap-3">
        <span className="icono-tarjeta w-9 h-9 bg-acento/15 text-acento">
          <Users size={17} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[14.5px]">Compartir en la comunidad</div>
          <div className="text-atenuado text-[12px] leading-snug">
            {visible ? "Se publica al guardar el entreno" : "Para compartir, tienes que aparecer en la comunidad"}
          </div>
        </div>
        {visible && <Switch checked={opciones.activo} onChange={(v) => cambiar({ activo: v })} label="Compartir en la comunidad" />}
      </div>

      {!visible ? (
        <>
          <button className="ghost w-full mt-3" onClick={aparecer} disabled={activando}>
            {activando ? "Activando…" : "Aparecer en la comunidad"}
          </button>
          {error && <div className="text-peligro text-[12.5px] mt-1.5">{error}</div>}
        </>
      ) : (
        opciones.activo && (
          <>
            <input
              className="w-full bg-campo border border-borde-2 rounded-[10px] text-white px-3 py-2.5 text-[16px] mt-3 focus:outline-none focus:border-acento"
              placeholder="Un mensaje (opcional)"
              maxLength={140}
              value={opciones.mensaje}
              onChange={(e) => onCambio({ ...opciones, mensaje: e.target.value })}
            />
            <div className="flex items-center justify-between gap-3 mt-3">
              <span className="text-[13px] text-texto-2">Mostrar los kilos</span>
              <Switch checked={opciones.kilos} onChange={(v) => cambiar({ kilos: v })} label="Mostrar los kilos" />
            </div>
            <div className="text-atenuado text-[11.5px] mt-2 leading-snug">
              Verán tu nombre, lo que has entrenado, la duración, las series y tus récords
              {opciones.kilos ? ", con los kilos." : " (sin los kilos)."}
            </div>
          </>
        )
      )}
    </section>
  );
}
