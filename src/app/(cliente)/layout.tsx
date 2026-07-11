import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { Logo } from "@/componentes/ui";
import BarraCliente from "@/componentes/BarraCliente";
import BarraLateralCliente from "@/componentes/BarraLateralCliente";
import BotonSalir from "@/componentes/BotonSalir";

/** Armazón de la app del cliente (móvil primero). */
export default async function LayoutCliente({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, estado, fecha_nacimiento, altura_cm, sexo, chat_visto_en")
    .eq("id", user.id)
    .maybeSingle();

  // El entrenador tiene su panel; los clientes de baja no acceden
  if (perfil?.rol === "entrenador") redirect("/hoy");
  // Primera vez del cliente: completa sus datos físicos antes de entrar
  if (!perfil?.fecha_nacimiento || !perfil?.altura_cm || !perfil?.sexo) {
    redirect("/onboarding");
  }
  if (perfil?.estado === "baja") {
    return (
      <div className="max-w-[480px] w-full mx-auto px-[18px] min-h-screen flex flex-col items-center justify-center text-center gap-6">
        <Logo tamano={72} />
        <p className="text-texto-2 text-[15px]">
          Tu cuenta está dada de baja. Si crees que es un error, habla con tu
          entrenador.
        </p>
        <BotonSalir />
      </div>
    );
  }

  const { count: mensajesSinLeer } = await supabase
    .from("mensajes")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", user.id)
    .eq("remitente", "entrenador")
    .gt("creado_en", perfil?.chat_visto_en ?? "1970-01-01");

  const hayChatSinLeer = (mensajesSinLeer ?? 0) > 0;

  return (
    <div className="w-full min-h-screen md:flex">
      <BarraLateralCliente chatSinLeer={hayChatSinLeer} />

      <div className="max-w-[480px] md:max-w-[640px] w-full mx-auto md:flex-1 relative min-h-screen">
        <header className="md:hidden flex justify-between items-center px-[18px] pt-4 pb-2.5 sticky top-0 z-10 bg-fondo/90 backdrop-blur-md border-b border-borde">
          <Logo tamano={38} />
          <BotonSalir />
        </header>

        <main className="p-[18px] pb-24 md:pb-[18px]">{children}</main>

        <BarraCliente chatSinLeer={hayChatSinLeer} />
      </div>
    </div>
  );
}
