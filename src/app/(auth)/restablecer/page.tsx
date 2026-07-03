"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Logo } from "@/componentes/ui";

export default function PaginaRestablecer() {
  const router = useRouter();
  const [contrasena, setContrasena] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (contrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (contrasena !== repetida) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.updateUser({ password: contrasena });
    setCargando(false);
    if (error) {
      setError(
        "No se pudo guardar. El enlace puede haber caducado: pide uno nuevo desde «He olvidado mi contraseña»."
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
      </div>

      <form onSubmit={guardar} className="tarjeta">
        <div className="titulo-tarjeta">NUEVA CONTRASEÑA</div>
        <input
          className="input"
          type="password"
          placeholder="Contraseña nueva (mínimo 8 caracteres)"
          autoComplete="new-password"
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Repite la contraseña"
          autoComplete="new-password"
          required
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
        />
        {error && (
          <div className="text-peligro text-[13.5px] mb-3">— {error}</div>
        )}
        <button className="cta" type="submit" disabled={cargando}>
          {cargando ? "Guardando…" : "Guardar y entrar"}
        </button>
      </form>
    </div>
  );
}
