import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import type { Lead } from "@/lib/planes";
import Leads from "./Leads";
import SeccionesPanel from "@/componentes/SeccionesPanel";
import QrPlanes from "@/componentes/QrPlanes";
import { contadoresPanel } from "@/lib/contadoresPanel";

export const dynamic = "force-dynamic";

/** Bandeja de leads: quien dejó sus datos en la página pública /planes. */
export default async function PaginaLeads() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const [{ data }, contadores] = await Promise.all([
    supabase.from("leads").select("*").order("creado_en", { ascending: false }),
    contadoresPanel(supabase),
  ]);

  return (
    <>
      <SeccionesPanel grupo="personas" contadores={contadores} />
      <Leads leads={(data ?? []) as Lead[]} />
      {/* El QR vivía en Ajustes, lejos de lo que produce: aquí se genera
        * el cartel y justo encima se ve quién ha llegado con él. */}
      <div className="titulo-seccion mt-6">Tu QR de captación</div>
      <QrPlanes />
    </>
  );
}
