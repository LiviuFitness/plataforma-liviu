"use client";

import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

/**
 * Asignar una plantilla desde la propia ficha del cliente.
 *
 * Antes, la ficha sin rutina (o sin dieta) decía "asigna una plantilla
 * desde «Plantillas»": había que salir del cliente, buscar la plantilla,
 * elegir el cliente otra vez en una lista y volver. Ese rodeo se hacía
 * con CADA cliente nuevo, que es justo el momento en el que hay más
 * prisa. Aquí la plantilla se aplica donde ya estás.
 *
 * Copia por el mismo RPC que usa la pantalla de plantillas, así que el
 * resultado es idéntico: una rutina/dieta propia del cliente, editable
 * sin tocar la plantilla original.
 */

export interface PlantillaResumen {
  id: string;
  nombre: string;
  detalle: string;
}

export default function AsignarPlantilla({
  tipo,
  plantillas,
  clienteId,
}: {
  tipo: "rutina" | "dieta";
  plantillas: PlantillaResumen[];
  clienteId: string;
}) {
  const router = useRouter();
  const [aplicando, setAplicando] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (plantillas.length === 0) {
    return (
      <p className="text-atenuado text-[12.5px] mb-3">
        Todavía no tienes plantillas de {tipo}. Créalas una vez en «Plantillas»
        y podrás aplicarlas aquí a cada cliente nuevo en un toque.
      </p>
    );
  }

  async function aplicar(id: string) {
    setAplicando(id);
    setError("");
    const supabase = crearClienteNavegador();
    const { error: e } = await supabase.rpc(
      tipo === "rutina" ? "asignar_plantilla_rutina" : "asignar_plantilla_dieta",
      { p_plantilla: id, p_cliente: clienteId }
    );
    if (e) {
      setAplicando(null);
      setError("No se pudo aplicar la plantilla. Inténtalo de nuevo.");
      return;
    }
    /* No se suelta el bloqueo a propósito: hasta que router.refresh()
     * repinte, otra pulsación asignaría la plantilla dos veces. */
    router.refresh();
  }

  return (
    <div className="mb-3.5">
      <div className="titulo-tarjeta">Aplicar una plantilla</div>
      {plantillas.map((p) => (
        <div key={p.id} className="fila">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14.5px] leading-tight break-words">{p.nombre}</div>
            <div className="text-atenuado text-[12.5px] break-words">{p.detalle}</div>
          </div>
          <button
            className="cta cta-mini !mb-0 shrink-0"
            onClick={() => aplicar(p.id)}
            disabled={aplicando !== null}
          >
            {aplicando === p.id ? "Aplicando…" : "Usar"}
          </button>
        </div>
      ))}
      {error && <div className="text-peligro text-[13.5px] mt-2 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}
    </div>
  );
}
