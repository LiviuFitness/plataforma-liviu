"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarClock, Pencil } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { claseTono, estadoRevision, fechaRevision, hoyMadrid, sumarSemanas } from "@/lib/revisionCliente";

const CADA = [2, 4, 6, 8];

/**
 * Próxima revisión del cliente (ficha › Su plan). «Hecha» la pasa a dentro
 * de N semanas desde hoy; también se puede poner o cambiar a mano.
 */
export default function ProximaRevision({
  clienteId,
  fecha,
  cadaSemanas,
  ahora,
}: {
  clienteId: string;
  fecha: string | null;
  cadaSemanas: number;
  /** Instante de la página (ms), para no mirar el reloj al pintar */
  ahora: number;
}) {
  const router = useRouter();
  const hoy = hoyMadrid(ahora);
  const [editando, setEditando] = useState(!fecha);
  const [nuevaFecha, setNuevaFecha] = useState(fecha ?? sumarSemanas(hoy, cadaSemanas));
  const [cada, setCada] = useState(cadaSemanas);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(f: string | null, c: number) {
    setGuardando(true);
    setError("");
    const { error } = await crearClienteNavegador()
      .from("profiles")
      .update({ proxima_revision: f, revision_cada_semanas: c })
      .eq("id", clienteId);
    setGuardando(false);
    if (error) {
      setError("No se ha podido guardar. Inténtalo de nuevo.");
      return;
    }
    setEditando(false);
    router.refresh();
  }

  const estado = fecha ? estadoRevision(fecha, hoy) : null;

  return (
    <div className="tarjeta !p-3 !mb-3.5">
      {fecha && estado && !editando ? (
        <>
          <div className="flex items-center gap-3">
            <span className={`icono-tarjeta w-10 h-10 shrink-0 ${claseTono[estado.tono]}`}>
              <CalendarClock size={19} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[14.5px] leading-tight first-letter:uppercase break-words">
                Próxima revisión: {fechaRevision(fecha)}
              </div>
              <div className="text-atenuado text-[12px]">
                {estado.tono === "atrasada" ? `Atrasada, era ${estado.corto}` : estado.corto[0].toUpperCase() + estado.corto.slice(1)} · cada{" "}
                {cadaSemanas} semanas
              </div>
            </div>
            <button className="mini !w-9 !h-9 shrink-0" onClick={() => setEditando(true)} aria-label="Cambiar la fecha">
              <Pencil size={15} />
            </button>
          </div>
          {(
            <button
              className="cta !mb-0 mt-3 !py-2.5 !text-[13.5px]"
              onClick={() => void guardar(sumarSemanas(hoy, cadaSemanas), cadaSemanas)}
              disabled={guardando}
            >
              {guardando ? "Guardando…" : `Hecha · la siguiente en ${cadaSemanas} semanas`}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock size={16} className="text-aviso shrink-0" />
            <div className="font-bold text-[14px]">{fecha ? "Cambiar la revisión" : "Ponle fecha de revisión"}</div>
          </div>
          <input
            type="date"
            className="input !mb-2"
            value={nuevaFecha}
            min={hoy}
            onChange={(e) => setNuevaFecha(e.target.value)}
            disabled={guardando}
          />
          <div className="text-[12.5px] text-atenuado mb-1.5">Y después, cada</div>
          <div className="flex gap-1.5 mb-3">
            {CADA.map((n) => (
              <button key={n} className={`chip !text-[12.5px] ${cada === n ? "chip-activo" : ""}`} onClick={() => setCada(n)} disabled={guardando}>
                {n} sem
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="cta !mb-0 flex-1 !py-2.5 !text-[13.5px]" onClick={() => void guardar(nuevaFecha || null, cada)} disabled={guardando || !nuevaFecha}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            {fecha && (
              <>
                <button className="ghost !py-2.5 !text-[13px]" onClick={() => setEditando(false)} disabled={guardando}>
                  Cancelar
                </button>
                <button className="ghost ghost-peligro !py-2.5 !text-[13px]" onClick={() => void guardar(null, cada)} disabled={guardando}>
                  Quitar
                </button>
              </>
            )}
          </div>
        </>
      )}
      {error && (
        <div className="text-peligro text-[13px] mt-2 flex items-start gap-1.5">
          <AlertCircle size={14} className="shrink-0 mt-[3px]" />
          <span className="min-w-0">{error}</span>
        </div>
      )}
    </div>
  );
}
