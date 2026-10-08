"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, ShieldCheck, Users } from "lucide-react";
import { Logo } from "@/componentes/ui";
import Switch from "@/componentes/Switch";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

function Casilla({ marcada, onCambio, children }: { marcada: boolean; onCambio: () => void; children: React.ReactNode }) {
  return (
    <div
      role="checkbox"
      aria-checked={marcada}
      tabIndex={0}
      onClick={onCambio}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), onCambio())}
      className={`w-full text-left flex items-start gap-3 rounded-[14px] border p-3.5 mb-2.5 transition-colors cursor-pointer ${
        marcada ? "border-acento bg-acento/10" : "border-borde-2 bg-campo/60"
      }`}
    >
      <span
        className={`mt-0.5 w-[22px] h-[22px] rounded-[7px] border-2 shrink-0 flex items-center justify-center ${
          marcada ? "bg-acento border-acento text-fondo" : "border-borde-2"
        }`}
      >
        {marcada && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="text-[13.5px] text-texto-2 leading-snug">{children}</span>
    </div>
  );
}

/** Aceptar términos, privacidad y datos de salud; la comunidad, opcional y apagada. */
export default function PantallaConsentimiento({ nombre }: { nombre: string }) {
  const router = useRouter();
  const [terminos, setTerminos] = useState(false);
  const [salud, setSalud] = useState(false);
  const [comunidad, setComunidad] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const listo = terminos && salud;

  async function aceptar() {
    if (!listo) return;
    setGuardando(true);
    setError("");
    try {
      const r = await fetch("/api/consentimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terminos, salud, comunidad }),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(d.error);
      /* /inicio manda al onboarding si aún le faltan sus datos físicos */
      router.replace("/inicio");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No se ha podido guardar. Inténtalo de nuevo.");
      setGuardando(false);
    }
  }

  async function salir() {
    await crearClienteNavegador().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  /* Los enlaces abren aparte para no perder lo marcado */
  const enlace = (href: string, texto: string) => (
    <Link
      href={href}
      target="_blank"
      onClick={(e) => e.stopPropagation()}
      className="text-acento underline underline-offset-2"
    >
      {texto}
    </Link>
  );

  return (
    <div
      className="max-w-[480px] mx-auto min-h-dvh px-[18px] flex flex-col"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
    >
      <Logo tamano={38} />
      <span className="icono-tarjeta w-12 h-12 bg-acento/15 text-acento mt-7 mb-3">
        <ShieldCheck size={24} />
      </span>
      <h1 className="h1 !mb-1">Antes de empezar</h1>
      <p className="text-atenuado text-[14px] leading-snug mb-5">
        {nombre ? `Hola, ${nombre}. ` : ""}Para llevar tu seguimiento necesito tu permiso para guardar tus datos. Solo lo
        verás esta vez.
      </p>

      <Casilla marcada={terminos} onCambio={() => setTerminos(!terminos)}>
        He leído y acepto los {enlace("/terminos", "términos del servicio")} y la{" "}
        {enlace("/politica-privacidad", "política de privacidad")}.
      </Casilla>
      <Casilla marcada={salud} onCambio={() => setSalud(!salud)}>
        Doy mi <b className="text-white">consentimiento explícito</b> para que LIVIU Fitness Studio trate mis datos de salud
        (peso, medidas, entrenos, alimentación y las fotos y vídeos que mande) solo para mi seguimiento. Puedo retirarlo
        cuando quiera.
      </Casilla>

      <div className="titulo-tarjeta mt-4">OPCIONAL</div>
      <div className="rounded-[14px] border border-borde-2 bg-campo/60 p-3.5 flex items-start gap-3">
        <span
          className="icono-tarjeta w-9 h-9 shrink-0"
          style={{ color: "#fb923c", background: "rgba(251,146,60,.15)" }}
        >
          <Users size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[14.5px]">Aparecer en la comunidad</div>
          <div className="text-atenuado text-[12.5px] leading-snug mt-0.5">
            Los demás clientes verán tu nombre, los entrenos que compartas, tus logros y tu puesto en el reto. Lo puedes
            cambiar cuando quieras en tu perfil.
          </div>
        </div>
        <Switch checked={comunidad} onChange={setComunidad} label="Aparecer en la comunidad" />
      </div>

      <div className="flex-1 min-h-6" />
      {error && (
        <div className="text-peligro text-[13px] mb-2 flex items-start gap-1.5">
          <AlertCircle size={14} className="shrink-0 mt-[3px]" />
          <span className="min-w-0">{error}</span>
        </div>
      )}
      <button className="cta !mb-2 mt-6" disabled={!listo || guardando} onClick={() => void aceptar()}>
        {guardando ? "Guardando…" : listo ? "Aceptar y entrar" : "Marca las dos casillas para seguir"}
      </button>
      <button className="ghost w-full !text-[13px]" onClick={() => void salir()} disabled={guardando}>
        No acepto · cerrar sesión
      </button>
    </div>
  );
}
