"use client";

import { useEffect } from "react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

/**
 * Marca como vistos los avisos de "tu entrenador actualizó tu
 * rutina/dieta" en cuanto se enseñan, para que no vuelvan a salir la
 * próxima vez. No pinta nada: las filas viven en "Novedades", junto al
 * resto de lo que ha cambiado desde la última visita.
 */
export default function MarcarAvisosVistos({
  avisoRutina,
  avisoDieta,
}: {
  avisoRutina: boolean;
  avisoDieta: boolean;
}) {
  useEffect(() => {
    if (!avisoRutina && !avisoDieta) return;
    // Ojo: las consultas de supabase-js son perezosas — sin await/then
    // la petición no llega a enviarse y el aviso saldría para siempre.
    (async () => {
      const supabase = crearClienteNavegador();
      if (avisoRutina) await supabase.rpc("marcar_rutina_vista");
      if (avisoDieta) await supabase.rpc("marcar_dieta_vista");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
