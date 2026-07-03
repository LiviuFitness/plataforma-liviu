import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Logo } from "@/componentes/ui";
import BarraCliente from "@/componentes/BarraCliente";
import BotonSalir from "@/componentes/BotonSalir";

/** Armazón de la app del cliente (móvil primero). */
export default async function LayoutCliente({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, estado")
    .eq("id", user.id)
    .maybeSingle();

  // El entrenador tiene su panel; los clientes de baja no acceden
  if (perfil?.rol === "entrenador") redirect("/hoy");
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

  return (
    <div className="max-w-[480px] w-full mx-auto relative min-h-screen">
      <header className="flex justify-between items-center px-[18px] pt-4 pb-2.5 sticky top-0 z-10 bg-fondo/90 backdrop-blur-md border-b border-borde">
        <Logo tamano={38} />
        <BotonSalir />
      </header>

      <main className="p-[18px] pb-24">{children}</main>

      <BarraCliente />
    </div>
  );
}
