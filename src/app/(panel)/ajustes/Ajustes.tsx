"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import type { Perfil } from "@/lib/tipos";

/** Ajustes del entrenador: nombre, correo y contraseña de su cuenta. */
export default function Ajustes({ perfil, email }: { perfil: Perfil; email: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(perfil.nombre);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [msgNombre, setMsgNombre] = useState<{ ok: boolean; texto: string } | null>(null);

  const [nuevoEmail, setNuevoEmail] = useState(email);
  const [cambiandoEmail, setCambiandoEmail] = useState(false);
  const [msgEmail, setMsgEmail] = useState<{ ok: boolean; texto: string } | null>(null);

  const [contrasena, setContrasena] = useState("");
  const [repetida, setRepetida] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [msgContrasena, setMsgContrasena] = useState<{ ok: boolean; texto: string } | null>(null);

  async function guardarNombre() {
    if (!nombre.trim()) return;
    setGuardandoNombre(true);
    setMsgNombre(null);
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("profiles")
      .update({ nombre: nombre.trim() })
      .eq("id", perfil.id);
    setGuardandoNombre(false);
    if (error) {
      setMsgNombre({ ok: false, texto: "No se pudo guardar. Inténtalo de nuevo." });
      return;
    }
    setMsgNombre({ ok: true, texto: "Nombre actualizado ✓" });
    router.refresh();
  }

  async function cambiarEmail() {
    setMsgEmail(null);
    if (!nuevoEmail.trim() || nuevoEmail.trim() === email) return;
    setCambiandoEmail(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.updateUser({ email: nuevoEmail.trim() });
    setCambiandoEmail(false);
    if (error) {
      setMsgEmail({ ok: false, texto: "No se pudo cambiar. Comprueba el correo e inténtalo de nuevo." });
      return;
    }
    setMsgEmail({
      ok: true,
      texto: `Te hemos enviado un enlace de confirmación a ${nuevoEmail.trim()}. Hasta que lo confirmes, sigue entrando con tu correo actual.`,
    });
  }

  async function cambiarContrasena() {
    setMsgContrasena(null);
    if (contrasena.length < 8) {
      setMsgContrasena({ ok: false, texto: "Mínimo 8 caracteres." });
      return;
    }
    if (contrasena !== repetida) {
      setMsgContrasena({ ok: false, texto: "Las contraseñas no coinciden." });
      return;
    }
    setCambiando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.updateUser({ password: contrasena });
    setCambiando(false);
    if (error) {
      setMsgContrasena({ ok: false, texto: "No se pudo cambiar. Inténtalo de nuevo." });
      return;
    }
    setContrasena("");
    setRepetida("");
    setMsgContrasena({ ok: true, texto: "Contraseña cambiada ✓" });
  }

  return (
    <>
      <h1 className="h1">Ajustes</h1>
      <div className="sub mb-4">tu cuenta de entrenador —</div>

      {/* Una sola superficie con 3 secciones internas — sin espacio
       * muerto entre tarjetas idénticas, estilo Stripe/Vercel. */}
      <div className="superficie">
        <div className="fila-ajuste">
          <div className="titulo-tarjeta">Mis datos</div>
          <input
            className="input !mb-2"
            placeholder="Tu nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          {msgNombre && (
            <div className={`text-[13.5px] mb-2 ${msgNombre.ok ? "text-acento" : "text-peligro"}`}>
              — {msgNombre.texto}
            </div>
          )}
          <button
            className="cta !mb-0"
            onClick={guardarNombre}
            disabled={guardandoNombre || !nombre.trim() || nombre.trim() === perfil.nombre}
          >
            {guardandoNombre ? "Guardando…" : "Guardar nombre"}
          </button>
        </div>

        <div className="fila-ajuste">
          <div className="titulo-tarjeta">Correo de acceso</div>
          <input
            className="input !mb-2"
            type="email"
            placeholder="tu@correo.com"
            value={nuevoEmail}
            onChange={(e) => setNuevoEmail(e.target.value)}
          />
          {msgEmail && (
            <div className={`text-[13.5px] mb-2 ${msgEmail.ok ? "text-acento" : "text-peligro"}`}>
              — {msgEmail.texto}
            </div>
          )}
          <button
            className="cta !mb-0"
            onClick={cambiarEmail}
            disabled={cambiandoEmail || !nuevoEmail.trim() || nuevoEmail.trim() === email}
          >
            {cambiandoEmail ? "Enviando…" : "Cambiar correo"}
          </button>
          <p className="text-atenuado text-[12px] mt-2">
            Por seguridad, Supabase te pedirá confirmar el cambio desde un enlace
            que llegará al nuevo correo.
          </p>
        </div>

        <div className="fila-ajuste">
          <div className="titulo-tarjeta">Cambiar contraseña</div>
          <input
            className="input"
            type="password"
            placeholder="Contraseña nueva (mínimo 8 caracteres)"
            autoComplete="new-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
          />
          <input
            className="input !mb-2"
            type="password"
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
          />
          {msgContrasena && (
            <div className={`text-[13.5px] mb-2 ${msgContrasena.ok ? "text-acento" : "text-peligro"}`}>
              — {msgContrasena.texto}
            </div>
          )}
          <button
            className="cta !mb-0"
            onClick={cambiarContrasena}
            disabled={cambiando || contrasena === ""}
          >
            {cambiando ? "Cambiando…" : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </>
  );
}
