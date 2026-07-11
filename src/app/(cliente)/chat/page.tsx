import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import HiloChat from "@/componentes/HiloChat";
import type { Mensaje } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Chat con el entrenador: un hilo simple, sin grupos ni adjuntos. */
export default async function PaginaChat() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const { data: mensajes } = await supabase
    .from("mensajes")
    .select("*")
    .eq("cliente_id", user.id)
    .order("creado_en", { ascending: true });

  return (
    <>
      <h1 className="h1 mb-3">Chat con tu entrenador</h1>
      <HiloChat
        clienteId={user.id}
        mensajesIniciales={(mensajes ?? []) as Mensaje[]}
        remitentePropio="cliente"
        nombreOtro="tu entrenador"
      />
    </>
  );
}
