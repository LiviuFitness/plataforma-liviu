import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/componentes/ui";
import Planes from "./Planes";

export const metadata: Metadata = {
  title: "Planes de entrenamiento — LIVFIT",
  description:
    "Entrenamiento y nutrición con seguimiento real: plan automático dentro de la app o coaching presencial con Liviu.",
};

/**
 * Única pantalla pública de la app aparte del acceso: a esto apunta el
 * QR del gimnasio. Quien la ve todavía NO es cliente — no hay alta ni
 * pago aquí, solo deja sus datos y Liviu le escribe.
 */
export default async function PaginaPlanes({
  searchParams,
}: {
  searchParams: Promise<{ origen?: string }>;
}) {
  const { origen } = await searchParams;

  return (
    <div className="max-w-[760px] w-full mx-auto px-[18px] py-6">
      <header className="mb-8 flex items-center justify-between">
        <Logo tamano={38} />
        <Link href="/login" className="ghost !w-auto !px-3">
          Ya soy cliente
        </Link>
      </header>

      <Planes origen={origen ?? null} />

      <footer className="mt-12 pt-4 border-t border-borde text-[12.5px] text-atenuado flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/aviso-legal">Aviso legal</Link>
        <Link href="/politica-privacidad">Privacidad</Link>
        <Link href="/politica-cookies">Cookies</Link>
        <Link href="/terminos">Términos</Link>
      </footer>
    </div>
  );
}
