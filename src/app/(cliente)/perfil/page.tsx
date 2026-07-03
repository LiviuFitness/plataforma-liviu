import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import PerfilCliente from "./PerfilCliente";
import type { Perfil } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Perfil del cliente: datos, contraseña y derechos RGPD. */
export default async function PaginaPerfil() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil) redirect("/login");

  return <PerfilCliente perfil={perfil as Perfil} />;
}
