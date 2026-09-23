"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import { Avatar, PuntoEstado } from "@/componentes/ui";
import { estadoCliente } from "@/lib/estadoCliente";
import type { Perfil } from "@/lib/tipos";

type Filtro = "todos" | "atencion" | "sin-rutina" | "sin-dieta" | "inactivos";

/** Listado de clientes con buscador y filtros. Las invitaciones tienen
 * su propia pantalla, en la segunda fila de navegación. */
export default function ListaClientes({
  clientes,
  adherencias,
  alertas,
  diasSinEntrenar,
  diasDesdeAlta,
  chatSinLeer,
  conRutina,
  conDieta,
}: {
  clientes: Perfil[];
  adherencias: Record<string, number>;
  alertas: Record<string, number>;
  /** Días desde la última sesión; sin entrada = nunca ha entrenado */
  diasSinEntrenar: Record<string, number>;
  diasDesdeAlta: Record<string, number>;
  /** true si el último mensaje del hilo lo mandó el cliente (pendiente de responder) */
  chatSinLeer: Record<string, boolean>;
  /** Clientes con rutina activa / con dieta de entreno activa. */
  conRutina: string[];
  conDieta: string[];
}) {
  const [busqueda, setBusqueda] = useState("");

  const [filtro, setFiltro] = useState<Filtro>("todos");

  /* Todo lo que pinta cada fila se calcula una vez, y los filtros
   * cuentan con lo mismo que se ve: si el chip dice "Sin dieta 3", al
   * pulsarlo salen esos tres. */
  const setRutina = new Set(conRutina);
  const setDieta = new Set(conDieta);
  const filas = clientes.map((c) => {
    const dias = diasSinEntrenar[c.id];
    const adh = adherencias[c.id];
    const estado = estadoCliente({
      diasSinEntrenar: dias,
      diasDesdeAlta: diasDesdeAlta[c.id] ?? 0,
      adherencia: adh ?? 0,
    });
    const activo = c.estado === "activo";
    return {
      c,
      dias,
      adh,
      estado,
      activo,
      sinRutina: activo && !setRutina.has(c.id),
      sinDieta: activo && !setDieta.has(c.id),
      atencion:
        activo && (estado.nivel !== "al-dia" || !!chatSinLeer[c.id] || (alertas[c.id] ?? 0) > 0),
    };
  });

  const FILTROS: { clave: Filtro; etiqueta: string; n: number }[] = [
    { clave: "todos", etiqueta: "Activos", n: filas.filter((f) => f.activo).length },
    { clave: "atencion", etiqueta: "Atención", n: filas.filter((f) => f.atencion).length },
    { clave: "sin-rutina", etiqueta: "Sin rutina", n: filas.filter((f) => f.sinRutina).length },
    { clave: "sin-dieta", etiqueta: "Sin dieta", n: filas.filter((f) => f.sinDieta).length },
    { clave: "inactivos", etiqueta: "Inactivos", n: filas.filter((f) => !f.activo).length },
  ];

  const texto = busqueda.trim().toLowerCase();
  const filtrados = filas.filter((f) => {
    /* Buscando por nombre se busca en todos: si escribes "Dani" es que
     * quieres a Daniela, esté pausada o no. */
    if (texto) return f.c.nombre.toLowerCase().includes(texto);
    switch (filtro) {
      case "atencion":
        return f.atencion;
      case "sin-rutina":
        return f.sinRutina;
      case "sin-dieta":
        return f.sinDieta;
      case "inactivos":
        return !f.activo;
      default:
        return f.activo;
    }
  });


  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h1">Clientes</h1>
          <div className="sub !mb-0">
            {FILTROS[0].n} {FILTROS[0].n === 1 ? "activo" : "activos"}
            {FILTROS[4].n > 0 ? ` · ${FILTROS[4].n} pausados o de baja` : ""}
          </div>
        </div>
        <Link href="/invitaciones" className="cta cta-mini shrink-0">
          + Invitar
        </Link>
      </div>


      <div className="relative mt-3.5 mb-2.5">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-atenuado pointer-events-none"
        />
        <input
          className="input !pl-10 !mb-0"
          placeholder="Buscar cliente…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Los filtros solo cuentan cuando no se está buscando */}
      {!texto && clientes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3.5">
          {FILTROS.filter((f) => f.clave === "todos" || f.n > 0).map((f) => (
            <button
              key={f.clave}
              className={`chip ${filtro === f.clave ? "chip-activo" : ""}`}
              onClick={() => setFiltro(f.clave)}
            >
              {f.etiqueta} <span className="opacity-70 tabular-nums">{f.n}</span>
            </button>
          ))}
        </div>
      )}

      {clientes.length === 0 && (
        <div className="tarjeta text-atenuado text-[13.5px]">
          Sin clientes todavía. Invita al primero con «+ Invitar».
        </div>
      )}

      {clientes.length > 0 && filtrados.length === 0 && (
        <div className="tarjeta text-atenuado text-[13.5px] text-center">
          {texto ? `Nadie se llama «${busqueda.trim()}».` : "Nadie en este filtro. Bien."}
        </div>
      )}

      {filtrados.length > 0 && (
        <div className="superficie px-4 mb-6">
          {filtrados.map(({ c, dias, adh, estado, activo, sinRutina, sinDieta }) => {
            const actividad =
              dias === undefined
                ? "Sin sesiones"
                : dias === 0
                  ? "Entrenó hoy"
                  : dias === 1
                    ? "Entrenó ayer"
                    : `Hace ${dias} días`;
            const plan =
              c.plan === "mensual" ? "Mensual" : c.plan === "trimestral" ? "Trimestral" : "Sin plan";
            return (
              <Link
                key={c.id}
                href={`/clientes/${c.id}`}
                className={`fila anim-pulsable ${activo ? "" : "opacity-60"}`}
              >
                <Avatar nombre={c.nombre} tamano={38} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14.5px] flex items-center gap-2 leading-tight">
                    <span className="break-words min-w-0">{c.nombre}</span>
                    {activo && (
                      <PuntoEstado nivel={estado.nivel} titulo={estado.motivo ?? "Al día"} />
                    )}
                  </div>
                  <div className="text-atenuado text-[12.5px] leading-snug break-words mt-0.5">
                    {activo ? (estado.motivo ?? actividad) : c.estado === "baja" ? "De baja" : "Pausado"}
                    {adh !== undefined && activo ? ` · ${adh}%` : ""} · {plan}
                  </div>
                  {(sinRutina || sinDieta) && (
                    <div className="text-aviso text-[12px] font-semibold mt-0.5">
                      {sinRutina && sinDieta
                        ? "Sin rutina ni dieta"
                        : sinRutina
                          ? "Sin rutina"
                          : "Sin dieta"}
                    </div>
                  )}
                </div>
                {chatSinLeer[c.id] && (
                  <span title="Mensaje sin responder" className="shrink-0">
                    <MessageCircle size={16} className="text-acento" fill="currentColor" />
                  </span>
                )}
                {(alertas[c.id] ?? 0) > 0 && <span className="badge shrink-0">{alertas[c.id]}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
