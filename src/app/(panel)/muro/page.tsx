import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import MuroEntrenos, { type EntrenoMuro } from "@/componentes/MuroEntrenos";

export const dynamic = "force-dynamic";

/** El muro de la comunidad visto por el entrenador: lo que comparten sus
 * clientes, con la opción de quitar cualquier publicación. */
export default async function PaginaMuro() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const { data } = await supabase.from("v_comunidad_entrenos").select("*");

  return (
    <div className="max-w-[560px]">
      <Link href="/hoy" className="text-atenuado text-[13.5px] inline-flex items-center gap-1 mb-2">
        <ArrowLeft size={14} /> Hoy
      </Link>
      <h1 className="h1">Comunidad</h1>
      <div className="sub mb-4">Los entrenos que comparten tus clientes (últimos 30 días)</div>
      <MuroEntrenos iniciales={(data ?? []) as EntrenoMuro[]} yoId={user.id} puedoReaccionar={false} esEntrenador />
    </div>
  );
}
