import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import PerfilCliente from "./PerfilCliente";
import type { Ejercicio, Perfil } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Perfil del cliente: datos, contraseña, ejercicios a evitar y RGPD. */
export default async function PaginaPerfil() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const [{ data: perfil }, { data: biblioteca }, { data: exclusiones }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("ejercicios")
        .select("id, nombre, nombre_en, grupo_muscular, material, instrucciones, video_url, creado_por")
        .order("nombre"),
      supabase
        .from("ejercicios_excluidos")
        .select("ejercicio_id")
        .eq("cliente_id", user.id),
    ]);

  if (!perfil) redirect("/login");

  return (
    <PerfilCliente
      perfil={perfil as Perfil}
      biblioteca={(biblioteca ?? []) as Ejercicio[]}
      ejerciciosExcluidos={(exclusiones ?? []).map((e) => e.ejercicio_id)}
    />
  );
}
