"use client";

import { useEffect } from "react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

/** Aviso de "tu entrenador actualizó tu rutina/dieta" — se marca como
 * visto en cuanto se muestra, así no vuelve a salir la próxima vez. */
export default function AvisosActualizacion({
  avisoRutina,
  avisoDieta,
}: {
  avisoRutina: boolean;
  avisoDieta: boolean;
}) {
  useEffect(() => {
    if (!avisoRutina && !avisoDieta) return;
    const supabase = crearClienteNavegador();
    if (avisoRutina) supabase.rpc("marcar_rutina_vista");
    if (avisoDieta) supabase.rpc("marcar_dieta_vista");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!avisoRutina && !avisoDieta) return null;

  return (
    <div className="tarjeta !border-acento/40 !mb-2.5">
      {avisoRutina && (
        <div className="flex items-center gap-2.5 text-[13.5px] py-1">
          <span className="text-[18px]">🔔</span>
          <span>
            Tu entrenador actualizó tu <b>rutina</b>.
          </span>
        </div>
      )}
      {avisoDieta && (
        <div className="flex items-center gap-2.5 text-[13.5px] py-1">
          <span className="text-[18px]">🔔</span>
          <span>
            Tu entrenador actualizó tu <b>dieta</b>.
          </span>
        </div>
      )}
    </div>
  );
}
