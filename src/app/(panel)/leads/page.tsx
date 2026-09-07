import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import type { Lead } from "@/lib/planes";
import Leads from "./Leads";

export const dynamic = "force-dynamic";

/** Bandeja de leads: quien dejó sus datos en la página pública /planes. */
export default async function PaginaLeads() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("leads")
    .select("*")
    .order("creado_en", { ascending: false });

  return <Leads leads={(data ?? []) as Lead[]} />;
}
