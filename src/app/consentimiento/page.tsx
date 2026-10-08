import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import PantallaConsentimiento from "./PantallaConsentimiento";

export const dynamic = "force-dynamic";

/**
 * Antes de nada (también antes del onboarding, que ya pide datos de
 * salud): los clientes que dio de alta el entrenador o se importaron no
 * pasaron por la casilla del alta por invitación, y sin su consentimiento
 * no se pueden tratar sus datos de salud.
 */
export default async function PaginaConsentimiento() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, nombre, consentimiento_salud")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil) redirect("/login");
  if (perfil.rol === "entrenador") redirect("/hoy");
  if (perfil.consentimiento_salud) redirect("/inicio");

  return <PantallaConsentimiento nombre={String(perfil.nombre ?? "").split(" ")[0]} />;
}
