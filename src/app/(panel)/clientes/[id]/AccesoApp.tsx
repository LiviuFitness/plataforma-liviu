"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Mail, Send } from "lucide-react";

/**
 * Para los clientes que diste de alta tú: darles acceso a la app con su
 * correo (les llega el email para crear su contraseña) o reenviárselo si
 * todavía no han entrado.
 */
export default function AccesoApp({
  clienteId,
  pila,
  estado,
  emailActual,
}: {
  clienteId: string;
  pila: string;
  /** "sin": aún sin correo propio · "pendiente": con correo, sin entrar nunca */
  estado: "sin" | "pendiente";
  emailActual: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(emailActual ?? "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    setEnviando(true);
    setError("");
    try {
      const r = await fetch("/api/clientes/acceso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId, email }),
      });
      const d = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) throw new Error(d.error);
      setEnviado(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No se ha podido enviar. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="tarjeta tarjeta-acento !p-3.5">
      <div className="flex items-center gap-2 mb-1">
        <Mail size={15} className="text-acento shrink-0" />
        <div className="font-bold text-[14.5px]">
          {estado === "sin" ? "Darle acceso a la app" : `${pila} aún no ha entrado en la app`}
        </div>
      </div>
      {enviado ? (
        <div className="text-[13px] text-texto-2 leading-snug flex items-start gap-1.5">
          <Check size={15} className="text-acento shrink-0 mt-[2px]" />
          <span className="min-w-0 break-words">
            Enviado a <b>{email}</b>. Le llegará un correo para crear su contraseña (si no lo ve, que mire en spam).
          </span>
        </div>
      ) : (
        <>
          <div className="text-atenuado text-[12.5px] leading-snug mb-3">
            {estado === "sin"
              ? "Le llegará un correo para crear su contraseña. Al entrar verá la rutina, la dieta y los entrenos que ya le has puesto."
              : "Si no le llegó el correo o lo perdió, reenvíaselo (o corrige el correo si estaba mal)."}
          </div>
          <input
            className="input !mb-2.5"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder={`Correo de ${pila}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={enviando}
          />
          {error && (
            <div className="text-peligro text-[13px] mb-2 flex items-start gap-1.5">
              <AlertCircle size={14} className="shrink-0 mt-[3px]" />
              <span className="min-w-0">{error}</span>
            </div>
          )}
          <button
            className="cta !mb-0 flex items-center justify-center gap-2"
            onClick={enviar}
            disabled={enviando || !email.trim()}
          >
            <Send size={15} /> {enviando ? "Enviando…" : estado === "sin" ? "Enviar acceso" : "Reenviar acceso"}
          </button>
        </>
      )}
    </section>
  );
}
