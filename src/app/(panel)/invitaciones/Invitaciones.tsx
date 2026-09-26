"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MessageCircle, RotateCw, Trash2, AlertCircle } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { OBJETIVOS, type Invitacion } from "@/lib/tipos";
import { URL_PUBLICA } from "@/lib/planes";
import InvitarVarios from "./InvitarVarios";

/** Días de validez de un enlace de alta (lo fija la tabla por defecto). */
const DIAS_VALIDEZ = 7;

/**
 * Invitaciones: dar de alta a alguien y ver quién no ha entrado todavía.
 *
 * Vivía dentro de la lista de clientes, detrás del botón "+ Invitar", y
 * las pendientes empujaban la lista hacia abajo. Tiene su pantalla porque
 * con un traspaso de treinta clientes es un trabajo en sí mismo: aquí se
 * crea, se manda y se sigue hasta que la persona entra y desaparece de
 * la lista.
 */
export default function Invitaciones({
  invitaciones,
  emailsClientes,
  ahora,
}: {
  invitaciones: Invitacion[];
  /** Emails de quienes ya son clientes, en minúsculas: invitarles otra
   * vez les crearía una segunda cuenta de la nada. */
  emailsClientes: string[];
  /** Marca de tiempo del servidor: los días que quedan se cuentan igual
   * al pintar allí y al hidratar aquí. */
  ahora: number;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [objetivo, setObjetivo] = useState(OBJETIVOS[0]);
  const [plan, setPlan] = useState<"mensual" | "trimestral">("mensual");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [recienCreada, setRecienCreada] = useState<string | null>(null);
  const [copiada, setCopiada] = useState<string | null>(null);
  const [renovando, setRenovando] = useState<string | null>(null);
  const [modo, setModo] = useState<"una" | "varias">("una");
  const [creadasLote, setCreadasLote] = useState<number | null>(null);

  async function crearInvitacion(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const limpio = email.trim().toLowerCase();
    if (!nombre.trim() || !limpio) {
      setError("Rellena nombre y email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
      setError("Ese email no parece bien escrito.");
      return;
    }
    /* Dos enlaces vivos para el mismo correo solo sirven para que el
     * cliente abra el viejo y le diga "no válido". */
    if (emailsClientes.includes(limpio)) {
      setError("Ese email ya es de un cliente tuyo.");
      return;
    }
    if (invitaciones.some((i) => i.email.toLowerCase() === limpio)) {
      setError("Ya hay una invitación pendiente para ese email: renuévala o bórrala abajo.");
      return;
    }
    setCargando(true);
    const supabase = crearClienteNavegador();
    const { data, error } = await supabase
      .from("invitaciones")
      .insert({ nombre: nombre.trim(), email: limpio, objetivo, plan })
      .select("id")
      .single();
    setCargando(false);
    if (error || !data) {
      setError("No se pudo crear la invitación. Inténtalo de nuevo.");
      return;
    }
    setNombre("");
    setEmail("");
    setRecienCreada(data.id);
    router.refresh();
  }

  /* Renovar en vez de borrar y volver a escribir nombre y correo: el
   * enlace es el mismo, solo se le corre la fecha de caducidad. */
  async function renovar(id: string) {
    setRenovando(id);
    const supabase = crearClienteNavegador();
    await supabase
      .from("invitaciones")
      .update({ expira: new Date(Date.now() + DIAS_VALIDEZ * 86400000).toISOString() })
      .eq("id", id);
    setRenovando(null);
    router.refresh();
  }

  async function borrar(inv: Invitacion) {
    if (!confirm(`¿Borrar la invitación de ${inv.nombre}? Su enlace dejará de funcionar.`)) return;
    const supabase = crearClienteNavegador();
    await supabase.from("invitaciones").delete().eq("id", inv.id);
    router.refresh();
  }

  /* El dominio público y no window.location: el enlace de WhatsApp se
   * compone al pintar, también en el servidor, donde no hay window. */
  const enlace = (token: string) => `${URL_PUBLICA}/alta/${token}`;

  const diasRestantes = (inv: Invitacion) =>
    Math.ceil((new Date(inv.expira).getTime() - ahora) / 86400000);

  /* Los días del mensaje son los que le quedan de verdad al enlace, no
   * siete fijos: una invitación reenviada al quinto día caduca en dos. */
  function mensaje(inv: Invitacion) {
    const pila = inv.nombre.split(" ")[0];
    const dias = diasRestantes(inv);
    return (
      `¡Hola ${pila}! Ya tienes tu acceso a LivFit: ahí vas a tener tu rutina, ` +
      `tu dieta y el seguimiento conmigo. Crea tu cuenta desde este enlace ` +
      `(caduca en ${dias} ${dias === 1 ? "día" : "días"}): ${enlace(inv.token)}`
    );
  }

  async function copiar(inv: Invitacion) {
    await navigator.clipboard.writeText(mensaje(inv));
    setCopiada(inv.id);
    setTimeout(() => setCopiada(null), 2000);
  }

  return (
    <>
      <h1 className="h1">Invitaciones</h1>
      <div className="sub mb-4">El alta es solo por invitación</div>

      <div className="flex gap-2 mb-3">
        <button className={`tab ${modo === "una" ? "tab-activa" : ""}`} onClick={() => setModo("una")}>
          Una persona
        </button>
        <button className={`tab ${modo === "varias" ? "tab-activa" : ""}`} onClick={() => setModo("varias")}>
          Varias a la vez
        </button>
      </div>

      {creadasLote !== null && (
        <div className="banner banner-accion !mb-3 items-center">
          <Check size={15} className="shrink-0" />
          <span className="flex-1 min-w-0">
            {creadasLote} {creadasLote === 1 ? "invitación creada" : "invitaciones creadas"}. Mándalas
            desde Pendientes, aquí abajo.
          </span>
        </div>
      )}

      {modo === "varias" ? (
        <InvitarVarios
          pendientes={invitaciones.map((i) => i.email.toLowerCase())}
          clientes={emailsClientes}
          onCreadas={setCreadasLote}
        />
      ) : (
      <form onSubmit={crearInvitacion} className="tarjeta">
        <div className="titulo-tarjeta">NUEVA INVITACIÓN</div>
        <input
          className="input"
          placeholder="Nombre y apellido"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          className="input"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          placeholder="Email del cliente"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="grid grid-cols-1 min-[440px]:grid-cols-2 min-[440px]:gap-2">
          <select className="input" value={objetivo} onChange={(e) => setObjetivo(e.target.value)}>
            {OBJETIVOS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <select
            className="input"
            value={plan}
            onChange={(e) => setPlan(e.target.value as "mensual" | "trimestral")}
          >
            <option value="mensual">Plan mensual</option>
            <option value="trimestral">Plan trimestral</option>
          </select>
        </div>
        {error && <div className="text-peligro text-[13.5px] mb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}
        <button className="cta !mb-2" type="submit" disabled={cargando}>
          {cargando ? "Creando…" : "Crear invitación"}
        </button>
        <p className="text-atenuado text-[12.5px]">
          Se crea un enlace personal que caduca en {DIAS_VALIDEZ} días. Cada
          cliente pone su contraseña y acepta él mismo el tratamiento de sus
          datos de salud.
        </p>
      </form>
      )}

      <div className="flex items-baseline justify-between mt-6">
        <div className="titulo-seccion !mb-0">Pendientes</div>
        {invitaciones.length > 0 && (
          <span className="text-atenuado text-[12.5px]">
            {invitaciones.length} sin entrar
          </span>
        )}
      </div>
      <p className="text-atenuado text-[12.5px] mb-2.5 mt-1">
        Cuando alguien crea su cuenta, desaparece de aquí y pasa a Clientes.
      </p>

      {invitaciones.length === 0 ? (
        <div className="superficie px-4 py-4 text-atenuado text-[13.5px] text-center mb-6">
          Nadie pendiente de entrar.
        </div>
      ) : (
        <div className="superficie px-4 mb-6">
          {invitaciones.map((inv) => {
            const dias = diasRestantes(inv);
            const caducada = dias <= 0;
            const nueva = inv.id === recienCreada;
            return (
              <div key={inv.id} className="py-3.5 border-b border-borde last:border-b-0">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14.5px] leading-tight break-words">
                      {inv.nombre}
                      {nueva && (
                        <span className="text-acento text-[12px] font-semibold"> · recién creada</span>
                      )}
                    </div>
                    <div className="text-atenuado text-[12.5px] break-all">{inv.email}</div>
                    {/* Cuánto le queda al enlace. Sin esto, el cliente decía
                     * "no me funciona" y aquí no había forma de saber que
                     * era porque habían pasado más de siete días. */}
                    <div className={`text-[12px] mt-0.5 ${caducada ? "text-peligro" : "text-atenuado"}`}>
                      {caducada
                        ? `Enlace caducado hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`
                        : `Caduca en ${dias} ${dias === 1 ? "día" : "días"}`}
                      {inv.plan ? ` · plan ${inv.plan}` : ""}
                    </div>
                  </div>
                  <button
                    className="mini mini-peligro shrink-0"
                    onClick={() => borrar(inv)}
                    aria-label={`Borrar invitación de ${inv.nombre}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex gap-2 mt-2.5">
                  {caducada ? (
                    <button
                      className="tab !text-[13px] flex items-center justify-center gap-1.5"
                      onClick={() => renovar(inv.id)}
                      disabled={renovando === inv.id}
                    >
                      <RotateCw size={14} />
                      {renovando === inv.id ? "Renovando…" : `Renovar ${DIAS_VALIDEZ} días`}
                    </button>
                  ) : (
                    <>
                      {/* wa.me sin número: abre WhatsApp con el texto ya
                        * escrito y tú eliges el chat. La invitación no
                        * guarda teléfono y no hace falta. */}
                      <a
                        className="tab tab-activa !text-[13px] flex items-center justify-center gap-1.5"
                        href={`https://wa.me/?text=${encodeURIComponent(mensaje(inv))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                      <button
                        className="tab !text-[13px] flex items-center justify-center gap-1.5"
                        onClick={() => copiar(inv)}
                      >
                        {copiada === inv.id ? <Check size={14} /> : <Copy size={14} />}
                        {copiada === inv.id ? "Copiado" : "Copiar mensaje"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
