import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import OnboardingCliente from "./OnboardingCliente";

export const dynamic = "force-dynamic";

/**
 * Onboarding del cliente (estilo Hevy): al entrar por primera vez,
 * completa sus datos físicos él mismo. Alimenta directamente el
 * auto-cálculo de macros sin que el entrenador tenga que teclearlos.
 */
export default async function PaginaOnboarding() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, nombre, fecha_nacimiento, altura_cm, sexo")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil) redirect("/login");
  if (perfil.rol === "entrenador") redirect("/hoy");
  // Ya completó sus datos: no repetir el onboarding
  if (perfil.fecha_nacimiento && perfil.altura_cm && perfil.sexo) {
    redirect("/inicio");
  }

  return <OnboardingCliente nombre={perfil.nombre} />;
}
