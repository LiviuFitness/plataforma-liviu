import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Logo } from "@/componentes/ui";
import BarraInferior from "@/componentes/BarraInferior";
import BotonSalir from "@/componentes/BotonSalir";

/**
 * Armazón del panel de entrenador. Comprueba el rol en servidor:
 * los clientes verán su app en la Fase 2.
 */
export default async function LayoutPanel({
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
    .select("rol, nombre")
    .eq("id", user.id)
    .maybeSingle();

  // Los clientes tienen su propia app en /inicio
  if (perfil?.rol !== "entrenador") redirect("/inicio");

  return (
    <div className="max-w-[480px] md:max-w-[760px] w-full mx-auto relative min-h-screen">
      <header className="flex justify-between items-center px-[18px] pt-4 pb-2.5 sticky top-0 z-10 bg-fondo/90 backdrop-blur-md border-b border-borde">
        <div>
          <Logo tamano={38} />
          <div className="text-[10px] tracking-[2.5px] uppercase text-atenuado mt-0.5">
            Panel de entrenador
          </div>
        </div>
        <BotonSalir />
      </header>

      <main className="p-[18px] pb-24">{children}</main>

      <BarraInferior />
    </div>
  );
}
