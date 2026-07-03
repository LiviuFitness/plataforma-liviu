"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Logo } from "@/componentes/ui";

/** Icono "G" de Google (inline, sin peticiones externas). */
function IconoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default function PaginaLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Errores que llegan por URL desde el callback de Google
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get("error") === "google") {
      setError(
        "No se pudo iniciar sesión con Google. Si todavía no tienes cuenta, pide una invitación a tu entrenador."
      );
    }
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: contrasena,
    });
    setCargando(false);
    if (error) {
      setError(
        error.message.includes("Invalid login credentials")
          ? "Email o contraseña incorrectos. Revísalos e inténtalo de nuevo."
          : "No se pudo iniciar sesión. Comprueba tu conexión e inténtalo otra vez."
      );
      return;
    }
    router.push("/hoy");
    router.refresh();
  }

  async function entrarConGoogle() {
    setError("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError("No se pudo conectar con Google. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="max-w-[480px] w-full mx-auto px-[18px] flex flex-col justify-center min-h-screen py-10">
      <div className="text-center mb-10">
        <Logo tamano={40} />
      </div>

      <h1 className="h1 text-center">Iniciar sesión</h1>
      <p className="text-atenuado text-[14.5px] text-center mt-1 mb-7">
        Bienvenido de vuelta a LivFit
      </p>

      <form onSubmit={entrar}>
        <input
          className="input"
          type="email"
          placeholder="Email"
          autoComplete="email"
          aria-label="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Contraseña"
          autoComplete="current-password"
          aria-label="Contraseña"
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
        {error && (
          <div className="text-peligro text-[13.5px] mb-3">— {error}</div>
        )}
        <button className="cta" type="submit" disabled={cargando}>
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      {/* Separador */}
      <div className="flex items-center gap-3 my-2 mb-4">
        <div className="flex-1 h-px bg-borde-2" />
        <span className="text-atenuado text-[12.5px]">O continuar con</span>
        <div className="flex-1 h-px bg-borde-2" />
      </div>

      <button
        type="button"
        className="w-full flex items-center justify-center gap-2.5 bg-panel border border-borde-2 text-white rounded-[12px] py-[13px] font-semibold text-[14.5px] cursor-pointer mb-5"
        onClick={entrarConGoogle}
      >
        <IconoGoogle />
        Continuar con Google
      </button>

      <div className="text-center">
        <Link
          href="/recuperar"
          className="text-atenuado text-[13.5px] underline underline-offset-2"
        >
          He olvidado mi contraseña
        </Link>
      </div>

      <p className="text-atenuado text-[12.5px] text-center mt-4">
        ¿Todavía no tienes cuenta? El alta es por invitación de tu entrenador.
      </p>
      <p className="text-center mt-6 text-[12px] text-atenuado">
        <Link href="/aviso-legal" className="underline underline-offset-2">
          Aviso legal
        </Link>
        {" · "}
        <Link
          href="/politica-privacidad"
          className="underline underline-offset-2"
        >
          Privacidad
        </Link>
      </p>
    </div>
  );
}
