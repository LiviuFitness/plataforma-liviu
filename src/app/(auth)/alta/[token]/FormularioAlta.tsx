"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

/**
 * Formulario de alta del cliente invitado.
 * RGPD: el consentimiento para tratar datos de salud es un checkbox
 * separado, NO premarcado, y se guarda con fecha y hora (§8.1).
 */
export default function FormularioAlta({
  token,
  email,
  nombreInicial,
}: {
  token: string;
  email: string;
  nombreInicial: string;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [contrasena, setContrasena] = useState("");
  const [repetida, setRepetida] = useState("");
  const [consentimiento, setConsentimiento] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [pendienteConfirmar, setPendienteConfirmar] = useState(false);

  async function crearCuenta(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) {
      setError("Escribe tu nombre.");
      return;
    }
    if (contrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (contrasena !== repetida) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!consentimiento) {
      setError(
        "Para usar la plataforma necesitamos tu consentimiento para tratar tus datos de salud."
      );
      return;
    }

    setCargando(true);
    const supabase = crearClienteNavegador();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: contrasena,
      options: {
        data: {
          nombre: nombre.trim(),
          invitacion: token,
          consentimiento: new Date().toISOString(),
        },
      },
    });
    setCargando(false);

    if (error) {
      setError(
        error.message.includes("invitación")
          ? error.message
          : "No se pudo crear la cuenta. Inténtalo de nuevo o avisa a tu entrenador."
      );
      return;
    }

    // Si el proyecto exige confirmación por email no hay sesión todavía
    if (!data.session) {
      setPendienteConfirmar(true);
      return;
    }
    router.push("/hoy");
    router.refresh();
  }

  if (pendienteConfirmar) {
    return (
      <div className="tarjeta text-center">
        <div className="titulo-tarjeta">UN ÚLTIMO PASO</div>
        <p className="text-texto-2 text-[14.5px]">
          Te hemos enviado un correo a <b>{email}</b>. Abre el enlace de
          confirmación y ya podrás iniciar sesión.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={crearCuenta} className="tarjeta">
      <div className="titulo-tarjeta">CREAR MI CUENTA</div>

      <label className="text-[13px] text-texto-2 block mb-1">Email</label>
      <input className="input opacity-60" type="email" value={email} disabled />

      <label className="text-[13px] text-texto-2 block mb-1" htmlFor="nombre">
        Nombre y apellido
      </label>
      <input
        id="nombre"
        className="input"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
      />

      <label className="text-[13px] text-texto-2 block mb-1" htmlFor="pass1">
        Contraseña (mínimo 8 caracteres)
      </label>
      <input
        id="pass1"
        className="input"
        type="password"
        autoComplete="new-password"
        value={contrasena}
        onChange={(e) => setContrasena(e.target.value)}
        required
      />

      <label className="text-[13px] text-texto-2 block mb-1" htmlFor="pass2">
        Repite la contraseña
      </label>
      <input
        id="pass2"
        className="input"
        type="password"
        autoComplete="new-password"
        value={repetida}
        onChange={(e) => setRepetida(e.target.value)}
        required
      />

      {/* Consentimiento RGPD datos de salud — separado y sin premarcar */}
      <label className="flex items-start gap-3 my-4 cursor-pointer">
        <input
          type="checkbox"
          checked={consentimiento}
          onChange={(e) => setConsentimiento(e.target.checked)}
          className="mt-1 w-[18px] h-[18px] accent-acento shrink-0"
        />
        <span className="text-[13px] text-texto-2 leading-snug">
          Doy mi consentimiento explícito para que LIVIU Fitness Studio trate
          mis datos de salud (peso, medidas corporales, entrenamientos y
          alimentación) con la única finalidad de mi seguimiento deportivo y
          nutricional, según la{" "}
          <Link
            href="/politica-privacidad"
            className="text-acento underline underline-offset-2"
            target="_blank"
          >
            política de privacidad
          </Link>
          .
        </span>
      </label>

      {error && (
        <div className="text-peligro text-[13.5px] mb-3">— {error}</div>
      )}

      <button className="cta" type="submit" disabled={cargando}>
        {cargando ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
