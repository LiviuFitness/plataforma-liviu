import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import Ajustes from "./Ajustes";
import type { Perfil } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Ajustes del entrenador: datos, correo y contraseña. */
export default async function PaginaAjustes() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil) redirect("/login");

  return <Ajustes perfil={perfil as Perfil} email={user.email ?? perfil.email} />;
}
