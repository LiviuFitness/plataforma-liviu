import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Logo } from "@/componentes/ui";
import FormularioAlta from "./FormularioAlta";

/** Página de alta por invitación: valida el token en el servidor. */
export default async function PaginaAlta({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await crearClienteServidor();

  // RPC pública: solo revela email/nombre si el token es válido y no está usado
  const { data } = await supabase
    .rpc("validar_invitacion", { p_token: token })
    .maybeSingle<{ valida: boolean; email: string; nombre: string }>();

  const valida = data?.valida === true;

  return (
    <div className="max-w-[480px] w-full mx-auto px-[18px] py-10 min-h-screen flex flex-col justify-center">
      <div className="text-center mb-8">
        <Logo tamano={40} />
        <div className="sub serifa mt-1">empieza tu seguimiento —</div>
      </div>

      {valida ? (
        <FormularioAlta
          token={token}
          email={data!.email}
          nombreInicial={data!.nombre}
        />
      ) : (
        <div className="tarjeta text-center">
          <div className="titulo-tarjeta">INVITACIÓN NO VÁLIDA</div>
          <p className="text-texto-2 text-[14.5px]">
            Este enlace de alta no es válido o ha caducado. Pide a tu entrenador
            que te envíe una invitación nueva.
          </p>
        </div>
      )}

      <p className="text-center mt-6 text-[12px] text-atenuado">
        <Link href="/politica-privacidad" className="underline underline-offset-2">
          Política de privacidad
        </Link>
        {" · "}
        <Link href="/terminos" className="underline underline-offset-2">
          Términos del servicio
        </Link>
      </p>
    </div>
  );
}
