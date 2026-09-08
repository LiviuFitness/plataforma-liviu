import { redirect } from "next/navigation";
import Image from "next/image";
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
      {/* Con cara: el cliente no escribe "al soporte", le escribe a
       * Liviu. Cuesta 24 KB y cambia el tono de lo que se escribe. */}
      <div className="flex items-center gap-3 mb-4">
        <Image
          src="/liviu.webp"
          alt=""
          width={44}
          height={44}
          className="rounded-full shrink-0"
        />
        <div className="min-w-0">
          <h1 className="h1 !mb-0 !text-[20px]">Liviu</h1>
          <div className="text-atenuado text-[12.5px]">tu entrenador</div>
        </div>
      </div>
      <HiloChat
        clienteId={user.id}
        mensajesIniciales={(mensajes ?? []) as Mensaje[]}
        remitentePropio="cliente"
        nombreOtro="tu entrenador"
      />
    </>
  );
}
