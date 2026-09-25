"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, RefreshCw } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { leerCola, subirPendientes } from "@/lib/subirSesion";

/**
 * Sube los entrenos que se guardaron en el móvil sin cobertura: al abrir
 * la app y en cuanto vuelve la conexión. Mientras quede alguno, lo avisa
 * con un botón para reintentar a mano.
 */
export default function SubidaPendientes() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState(0);
  const [subiendo, setSubiendo] = useState(false);

  const intentar = useCallback(async () => {
    const antes = leerCola().length;
    if (antes === 0) {
      setPendientes(0);
      return;
    }
    setSubiendo(true);
    const quedan = await subirPendientes(crearClienteNavegador());
    setSubiendo(false);
    setPendientes(quedan);
    /* Se subió algo: Inicio, racha y progreso tienen que enterarse */
    if (quedan < antes) router.refresh();
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendientes(leerCola().length);
    void intentar();
    const alVolver = () => void intentar();
    const alCambiar = () => setPendientes(leerCola().length);
    window.addEventListener("online", alVolver);
    window.addEventListener("sesiones-pendientes", alCambiar);
    return () => {
      window.removeEventListener("online", alVolver);
      window.removeEventListener("sesiones-pendientes", alCambiar);
    };
  }, [intentar]);

  if (pendientes === 0) return null;

  return (
    <div className="banner banner-aviso !mb-4 items-center">
      <CloudOff size={15} className="shrink-0" />
      <span className="flex-1 min-w-0">
        {pendientes === 1 ? "1 entreno pendiente de subir" : `${pendientes} entrenos pendientes de subir`}
      </span>
      <button
        className="font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
        onClick={() => void intentar()}
        disabled={subiendo}
      >
        <RefreshCw size={13} className={subiendo ? "animate-spin" : ""} /> {subiendo ? "Subiendo…" : "Reintentar"}
      </button>
    </div>
  );
}
