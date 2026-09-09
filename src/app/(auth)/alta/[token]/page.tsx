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
    <div className="relative max-w-[480px] w-full mx-auto px-[18px] py-10 min-h-screen flex flex-col justify-center">
      {/* Misma banda que el login: esta es la primera pantalla de LivFit
       * que ve un cliente en su vida, antes incluso de tener cuenta. El
       * degradado la funde con el fondo antes del formulario — los
       * campos no van nunca encima de una foto. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[230px] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(10,12,14,0.35) 0%, rgba(10,12,14,0.72) 58%, var(--color-fondo) 100%), url(/entrenos/general.webp)",
          backgroundSize: "cover, cover",
          backgroundPosition: "center, center",
        }}
      />
      <div className="relative">
      <div className="text-center mb-8">
        <Logo tamano={80} />
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
    </div>
  );
}
