import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { calcularRacha } from "@/lib/racha";
import PerfilCliente from "./PerfilCliente";
import type { Ejercicio, Perfil } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Perfil del cliente: dashboard (racha/sesiones/peso), datos, contraseña,
 * ejercicios a evitar y RGPD. */
export default async function PaginaPerfil() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const hace60dias = new Date(Date.now() - 60 * 86400000).toISOString();

  const [
    { data: perfil },
    { data: biblioteca },
    { data: exclusiones },
    { data: sesionesRecientes },
    { count: totalSesiones },
    { data: ultimaMedida },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("ejercicios")
      .select("id, nombre, nombre_en, grupo_muscular, material, instrucciones, video_url, creado_por")
      .order("nombre"),
    supabase
      .from("ejercicios_excluidos")
      .select("ejercicio_id")
      .eq("cliente_id", user.id),
    supabase
      .from("sesiones")
      .select("fecha_inicio")
      .eq("cliente_id", user.id)
      .gte("fecha_inicio", hace60dias),
    supabase.from("sesiones").select("id", { count: "exact", head: true }).eq("cliente_id", user.id),
    supabase
      .from("medidas")
      .select("peso")
      .eq("cliente_id", user.id)
      .not("peso", "is", null)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!perfil) redirect("/login");

  return (
    <PerfilCliente
      perfil={perfil as Perfil}
      biblioteca={(biblioteca ?? []) as Ejercicio[]}
      ejerciciosExcluidos={(exclusiones ?? []).map((e) => e.ejercicio_id)}
      racha={calcularRacha((sesionesRecientes ?? []).map((s) => s.fecha_inicio))}
      totalSesiones={totalSesiones ?? 0}
      ultimoPeso={ultimaMedida?.peso ? Number(ultimaMedida.peso) : null}
    />
  );
}
