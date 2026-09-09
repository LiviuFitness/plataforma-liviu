import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
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
  const user = await obtenerUsuario();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, nombre")
    .eq("id", user.id)
    .maybeSingle();

  // Los clientes tienen su propia app en /inicio
  if (perfil?.rol !== "entrenador") redirect("/inicio");

  return (
    /* La barra del panel es más baja que la del cliente (68 px frente a
     * 89): se redefine aquí para que el chat, que comparte componente,
     * se coloque justo encima en las dos vistas. */
    <div
      className="max-w-[480px] md:max-w-[760px] w-full mx-auto relative min-h-screen"
      style={{ "--alto-barra-inferior": "68px" } as React.CSSProperties}
    >
      <header className="flex justify-between items-center px-[18px] pt-4 pb-2.5 sticky top-0 z-10 cabecera-solida border-b border-borde">
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
