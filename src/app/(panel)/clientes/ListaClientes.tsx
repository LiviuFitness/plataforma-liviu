"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar, PuntoEstado } from "@/componentes/ui";
import { estadoCliente } from "@/lib/estadoCliente";
import { OBJETIVOS, type Invitacion, type Perfil } from "@/lib/tipos";

/** Listado de clientes con buscador + gestión de invitaciones. */
export default function ListaClientes({
  clientes,
  adherencias,
  alertas,
  diasSinEntrenar,
  diasDesdeAlta,
  chatSinLeer,
  invitaciones,
}: {
  clientes: Perfil[];
  adherencias: Record<string, number>;
  alertas: Record<string, number>;
  /** Días desde la última sesión; sin entrada = nunca ha entrenado */
  diasSinEntrenar: Record<string, number>;
  diasDesdeAlta: Record<string, number>;
  /** true si el último mensaje del hilo lo mandó el cliente (pendiente de responder) */
  chatSinLeer: Record<string, boolean>;
  invitaciones: Invitacion[];
}) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [objetivo, setObjetivo] = useState(OBJETIVOS[0]);
  const [plan, setPlan] = useState<"mensual" | "trimestral">("mensual");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [copiada, setCopiada] = useState<string | null>(null);

  const filtrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  async function crearInvitacion(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombre.trim() || !email.trim()) {
      setError("Rellena nombre y email.");
      return;
    }
    setCargando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.from("invitaciones").insert({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      objetivo,
      plan,
    });
    setCargando(false);
    if (error) {
      setError("No se pudo crear la invitación. Inténtalo de nuevo.");
      return;
    }
    setNombre("");
    setEmail("");
    setMostrarNueva(false);
    router.refresh();
  }

  async function borrarInvitacion(id: string) {
    const supabase = crearClienteNavegador();
    await supabase.from("invitaciones").delete().eq("id", id);
    router.refresh();
  }

  function enlaceAlta(token: string) {
    return `${window.location.origin}/alta/${token}`;
  }

  async function copiarEnlace(inv: Invitacion) {
    await navigator.clipboard.writeText(enlaceAlta(inv.token));
    setCopiada(inv.id);
    setTimeout(() => setCopiada(null), 2000);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="h1">Clientes</h1>
        <button
          className="cta cta-mini"
          onClick={() => setMostrarNueva((v) => !v)}
        >
          {mostrarNueva ? "Cerrar" : "+ Invitar"}
        </button>
      </div>

      {/* Alta por invitación (§3: no hay registro público) */}
      {mostrarNueva && (
        <form onSubmit={crearInvitacion} className="tarjeta mt-3.5">
          <div className="titulo-tarjeta">INVITAR CLIENTE</div>
          <input
            className="input"
            placeholder="Nombre y apellido"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <input
            className="input"
            type="email"
            placeholder="Email del cliente"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="input"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
            >
              {OBJETIVOS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <select
              className="input"
              value={plan}
              onChange={(e) =>
                setPlan(e.target.value as "mensual" | "trimestral")
              }
            >
              <option value="mensual">Plan mensual</option>
              <option value="trimestral">Plan trimestral</option>
            </select>
          </div>
          {error && (
            <div className="text-peligro text-[13.5px] mb-3">— {error}</div>
          )}
          <button className="cta" type="submit" disabled={cargando}>
            {cargando ? "Creando…" : "Crear invitación"}
          </button>
          <p className="text-atenuado text-[12.5px] -mt-2">
            Se genera un enlace de alta para enviárselo por WhatsApp o email.
            Caduca en 7 días.
          </p>
        </form>
      )}

      {/* Invitaciones pendientes */}
      {invitaciones.length > 0 && (
        <section className="tarjeta mt-3.5">
          <div className="titulo-tarjeta">INVITACIONES PENDIENTES</div>
          {invitaciones.map((inv) => (
            <div key={inv.id} className="fila">

              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14px]">{inv.nombre}</div>
                <div className="text-atenuado text-[12.5px] truncate">
                  {inv.email}
                </div>
              </div>
              <button className="ghost" onClick={() => copiarEnlace(inv)}>
                {copiada === inv.id ? "¡Copiado!" : "Copiar enlace"}
              </button>
              <button
                className="mini mini-peligro"
                onClick={() => borrarInvitacion(inv.id)}
                aria-label={`Borrar invitación de ${inv.nombre}`}
              >
                ✕
              </button>
            </div>
          ))}
        </section>
      )}

      <input
        className="input mt-3.5"
        placeholder="Buscar cliente…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {clientes.length === 0 && (
        <div className="tarjeta text-atenuado text-[13.5px]">
          Sin clientes todavía. Crea la primera invitación con «+ Invitar».
        </div>
      )}

      {filtrados.map((c) => {
        const dias = diasSinEntrenar[c.id];
        const adh = adherencias[c.id];
        const estado = estadoCliente({
          diasSinEntrenar: dias,
          diasDesdeAlta: diasDesdeAlta[c.id] ?? 0,
          adherencia: adh ?? 0,
        });
        const actividad =
          dias === undefined ? "Sin sesiones" : dias === 0 ? "Hoy" : dias === 1 ? "Ayer" : `Hace ${dias} días`;
        const plan =
          c.plan === "mensual" ? "Mensual" : c.plan === "trimestral" ? "Trimestral" : "Sin plan";
        return (
          <Link
            key={c.id}
            href={`/clientes/${c.id}`}
            className={`fila ${c.estado !== "activo" ? "opacity-60" : ""}`}
          >
            <Avatar nombre={c.nombre} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px] flex items-center gap-2 truncate">
                {c.nombre}
                {c.estado === "activo" && (
                  <PuntoEstado nivel={estado.nivel} titulo={estado.motivo ?? "Al día"} />
                )}
              </div>
              <div className="text-atenuado text-[12.5px] truncate">
                {plan} · {actividad}
                {adh !== undefined ? ` · ${adh}% adherencia` : ""}
                {c.estado !== "activo" ? ` · ${c.estado}` : ""}
              </div>
            </div>
            {chatSinLeer[c.id] && (
              <span title="Mensaje sin responder" className="shrink-0">
                <MessageCircle size={16} className="text-acento" fill="currentColor" />
              </span>
            )}
            {(alertas[c.id] ?? 0) > 0 && <span className="badge">{alertas[c.id]}</span>}
          </Link>
        );
      })}
    </>
  );
}
