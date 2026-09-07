"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, X } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { PLANES, type ClavePlan } from "@/lib/planes";

/**
 * Los dos planes + el formulario de contacto. Es cliente porque elegir
 * un plan en una tarjeta rellena el formulario de abajo — es la única
 * interacción de la pantalla.
 */
export default function Planes({ origen }: { origen: string | null }) {
  const formulario = useRef<HTMLDivElement>(null);

  const [plan, setPlan] = useState<ClavePlan | null>(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [acepta, setAcepta] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  /* Una sola alta por visita, aunque se pulse dos veces mientras va. */
  const envio = useRef<Promise<boolean> | null>(null);

  function elegir(clave: ClavePlan) {
    setPlan(clave);
    formulario.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function enviar() {
    setError("");
    if (nombre.trim().length < 2) return setError("Escribe tu nombre.");
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim()))
      return setError("Escribe un correo válido.");
    if (!acepta) return setError("Necesito que aceptes la política de privacidad.");

    setEnviando(true);
    envio.current ??= (async () => {
      const supabase = crearClienteNavegador();
      const { error: e } = await supabase.rpc("registrar_lead", {
        p_nombre: nombre.trim(),
        p_email: email.trim(),
        p_telefono: telefono.trim() || null,
        p_plan: plan,
        p_mensaje: mensaje.trim() || null,
        p_origen: origen,
      });
      return !e;
    })();

    const ok = await envio.current;
    setEnviando(false);
    if (!ok) {
      envio.current = null;
      setError("No se ha podido enviar. Inténtalo de nuevo en un momento.");
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="tarjeta tarjeta-acento !p-7 text-center">
        <div className="w-14 h-14 rounded-full bg-acento/15 grid place-items-center mx-auto mb-4">
          <Check size={26} className="text-acento" />
        </div>
        <h1 className="h1 !mb-2">Recibido, {nombre.trim().split(" ")[0]}</h1>
        <p className="text-texto-2 text-[14.5px] leading-relaxed">
          Te escribo yo personalmente a <b className="text-white">{email.trim()}</b>{" "}
          para contarte cómo funciona y resolver lo que necesites. Normalmente en
          menos de 24 horas.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-white text-[30px] md:text-[36px] font-bold tracking-tight leading-[1.15] mb-3">
        Entrena con un método,
        <br />
        no a ojo.
      </h1>
      <p className="text-texto-2 text-[15px] leading-relaxed mb-8 max-w-[560px]">
        Soy Liviu. Te preparo el entrenamiento y la alimentación, y los vamos
        ajustando cada semana con tus datos reales: lo que levantas, lo que pesas,
        cómo te ves y cómo te encuentras. Todo dentro de una app hecha para eso.
      </p>

      <div className="grid md:grid-cols-2 gap-3 mb-10">
        {PLANES.map((p) => (
          <section
            key={p.clave}
            className={`tarjeta !p-6 flex flex-col ${
              p.clave === "presencial" ? "tarjeta-acento" : ""
            }`}
          >
            <div className="text-[11px] tracking-[1.5px] uppercase text-atenuado mb-3">
              {p.distintivo}
            </div>
            <h2 className="text-white text-[20px] font-bold tracking-tight mb-1">
              {p.nombre}
            </h2>
            <p className="text-texto-2 text-[13.5px] leading-relaxed mb-4">
              {p.gancho}
            </p>

            <div className="flex items-baseline gap-1.5 mb-0.5">
              <span className="text-white text-[32px] font-bold tracking-tight">
                {p.precio}
              </span>
              <span className="text-atenuado text-[14px]">{p.periodo}</span>
            </div>
            <div className="text-atenuado text-[12.5px] mb-5">{p.alterno}</div>

            <ul className="flex flex-col gap-2 mb-4">
              {p.incluye.map((linea) => (
                <li key={linea} className="flex gap-2 text-[13.5px] text-texto-2">
                  <Check size={15} className="text-acento shrink-0 mt-[3px]" />
                  <span>{linea}</span>
                </li>
              ))}
              {p.excluye.map((linea) => (
                <li key={linea} className="flex gap-2 text-[13.5px] text-atenuado">
                  <X size={15} className="shrink-0 mt-[3px]" />
                  <span>{linea}</span>
                </li>
              ))}
            </ul>

            <button
              className="cta !mb-0 mt-auto anim-pulsable"
              onClick={() => elegir(p.clave)}
            >
              Me interesa este <ChevronRight size={16} className="inline -mt-0.5" />
            </button>
          </section>
        ))}
      </div>

      <div ref={formulario} className="tarjeta !p-6 scroll-mt-4">
        <h2 className="text-white text-[19px] font-bold tracking-tight mb-1">
          Cuéntame y te escribo
        </h2>
        <p className="text-atenuado text-[13px] mb-5">
          No se paga nada aquí ni te doy de alta automáticamente: dejas tus datos y
          te contacto yo para ver si encajamos.
        </p>

        <div className="flex gap-2 mb-4">
          {PLANES.map((p) => (
            <button
              key={p.clave}
              onClick={() => setPlan(plan === p.clave ? null : p.clave)}
              className={`chip flex-1 ${plan === p.clave ? "chip-activo" : ""}`}
            >
              {p.corto}
            </button>
          ))}
        </div>

        <input
          className="input"
          placeholder="Tu nombre"
          autoComplete="name"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          className="input"
          type="email"
          inputMode="email"
          placeholder="Tu correo"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="tel"
          inputMode="tel"
          placeholder="Tu teléfono (opcional)"
          autoComplete="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <textarea
          className="w-full bg-campo border border-borde-2 rounded-[10px] text-white p-2.5 px-3 text-[14px] resize-y font-cuerpo mb-3"
          rows={3}
          placeholder="Tu objetivo, dónde entrenas, lo que quieras contarme (opcional)"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
        />

        <label className="flex gap-2.5 items-start text-[12.5px] text-texto-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            className="mt-[3px] accent-[#29abe2] w-4 h-4 shrink-0"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
          />
          <span>
            Acepto que Liviu guarde estos datos para responderme, según la{" "}
            <Link href="/politica-privacidad" className="text-acento underline">
              política de privacidad
            </Link>
            .
          </span>
        </label>

        {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}

        <button
          className="cta !mb-0 anim-pulsable"
          onClick={enviar}
          disabled={enviando}
        >
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </>
  );
}
