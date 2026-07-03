"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Logo } from "@/componentes/ui";

export default function PaginaLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

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

  return (
    <div className="max-w-[480px] w-full mx-auto px-[18px] flex flex-col justify-center min-h-screen">
      <div className="text-center mb-8">
        <Logo tamano={40} />
        <div className="sub serifa mt-1">tu estudio, en tu bolsillo —</div>
      </div>

      <form onSubmit={entrar} className="tarjeta">
        <div className="titulo-tarjeta">INICIAR SESIÓN</div>
        <label className="text-[13px] text-texto-2 block mb-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label
          className="text-[13px] text-texto-2 block mb-1"
          htmlFor="contrasena"
        >
          Contraseña
        </label>
        <input
          id="contrasena"
          className="input"
          type="password"
          autoComplete="current-password"
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
        <div className="text-center">
          <Link
            href="/recuperar"
            className="text-atenuado text-[13.5px] underline underline-offset-2"
          >
            He olvidado mi contraseña
          </Link>
        </div>
      </form>

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
