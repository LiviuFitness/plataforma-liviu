"use client";

import { useState } from "react";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Logo } from "@/componentes/ui";

export default function PaginaRecuperar() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/restablecer`,
    });
    setCargando(false);
    if (error) {
      setError("No se pudo enviar el correo. Inténtalo de nuevo en un minuto.");
      return;
    }
    setEnviado(true);
  }

  return (
    <div className="max-w-[480px] w-full mx-auto px-[18px] flex flex-col justify-center min-h-screen">
      <div className="text-center mb-8">
        <Logo tamano={80} />
      </div>

      {enviado ? (
        <div className="tarjeta text-center">
          <div className="titulo-tarjeta">CORREO ENVIADO</div>
          <p className="text-texto-2 text-[14.5px]">
            Si <b>{email}</b> tiene cuenta, recibirás un enlace para crear una
            contraseña nueva. Revisa también la carpeta de spam.
          </p>
        </div>
      ) : (
        <form onSubmit={enviar} className="tarjeta">
          <div className="titulo-tarjeta">RECUPERAR CONTRASEÑA</div>
          <p className="text-texto-2 text-[14px] mb-3">
            Escribe tu email y te enviamos un enlace para crear una contraseña
            nueva.
          </p>
          <input
            className="input"
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && (
            <div className="text-peligro text-[13.5px] mb-3">— {error}</div>
          )}
          <button className="cta" type="submit" disabled={cargando}>
            {cargando ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      )}

      <p className="text-center mt-2">
        <Link
          href="/login"
          className="text-atenuado text-[13.5px] underline underline-offset-2"
        >
          ← Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
