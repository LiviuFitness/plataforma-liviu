import Link from "next/link";
import { Logo } from "@/componentes/ui";

/*
 * ⚠️ AVISO IMPORTANTE (también visible en pantalla):
 * Los textos legales de esta sección son BORRADORES generados como punto
 * de partida. Deben revisarse por un profesional del derecho antes del
 * lanzamiento. Los [CORCHETES] marcan datos que debe rellenar Liviu.
 */
export default function LayoutLegal({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[720px] w-full mx-auto px-[18px] py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/">
          <Logo tamano={24} />
        </Link>
        <Link href="/login" className="ghost">
          Iniciar sesión
        </Link>
      </header>

      <div className="tarjeta !border-aviso/50 text-[13px] text-texto-2">
        <b className="text-aviso">Borrador pendiente de revisión legal.</b>{" "}
        Este texto es un punto de partida generado automáticamente y debe ser
        revisado por un profesional antes del lanzamiento. Los datos entre
        [corchetes] están pendientes de completar.
      </div>

      <article className="legal text-texto-2 text-[14.5px] leading-relaxed [&_h1]:text-white [&_h1]:text-[26px] [&_h1]:font-display [&_h1]:italic [&_h1]:uppercase [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-white [&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1">
        {children}
      </article>

      <footer className="mt-10 pt-4 border-t border-borde text-[12.5px] text-atenuado flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/aviso-legal">Aviso legal</Link>
        <Link href="/politica-privacidad">Privacidad</Link>
        <Link href="/politica-cookies">Cookies</Link>
        <Link href="/terminos">Términos</Link>
      </footer>
    </div>
  );
}
