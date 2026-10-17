"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Megaphone, MessageCircle, Search, UserPlus } from "lucide-react";
import { Avatar } from "@/componentes/ui";
import { claseTono, estadoRevision } from "@/lib/revisionCliente";
import { estadoCliente } from "@/lib/estadoCliente";
import HojaMensajeVarios from "@/componentes/HojaMensajeVarios";
import HojaAnadirCliente from "./HojaAnadirCliente";
import type { Perfil } from "@/lib/tipos";

type Filtro = "todos" | "atencion" | "revision" | "sin-rutina" | "sin-dieta" | "inactivos";

const ANILLO = { riesgo: "var(--color-peligro)", atencion: "var(--color-aviso)", "al-dia": "var(--color-verde)" } as const;
const ORDEN_NIVEL = { riesgo: 0, atencion: 1, "al-dia": 2 } as const;

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
  sinEntrenarSemana,
  hoy,
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
  /** No han entrenado desde el lunes (para el mensaje a varios) */
  sinEntrenarSemana: string[];
  /** "AAAA-MM-DD" de hoy en Madrid, calculado en el servidor */
  hoy: string;
}) {
  const [busqueda, setBusqueda] = useState("");

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [mensajeVarios, setMensajeVarios] = useState(false);
  const [anadiendo, setAnadiendo] = useState(false);

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
    const revision = c.proxima_revision ? estadoRevision(c.proxima_revision, hoy) : null;
    return {
      revision,
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
    { clave: "todos", etiqueta: "Todos", n: filas.filter((f) => f.activo).length },
    { clave: "atencion", etiqueta: "Necesitan algo", n: filas.filter((f) => f.atencion).length },
    { clave: "revision", etiqueta: "Revisión pronto", n: filas.filter((f) => f.activo && f.revision && f.revision.dias <= 3).length },
    { clave: "sin-rutina", etiqueta: "Sin rutina", n: filas.filter((f) => f.sinRutina).length },
    { clave: "sin-dieta", etiqueta: "Sin dieta", n: filas.filter((f) => f.sinDieta).length },
    { clave: "inactivos", etiqueta: "Inactivos", n: filas.filter((f) => !f.activo).length },
  ];

  const nInactivos = filas.filter((f) => !f.activo).length;
  const texto = busqueda.trim().toLowerCase();
  const filtrados = filas.filter((f) => {
    /* Buscando por nombre se busca en todos: si escribes "Dani" es que
     * quieres a Daniela, esté pausada o no. */
    if (texto) return f.c.nombre.toLowerCase().includes(texto);
    switch (filtro) {
      case "atencion":
        return f.atencion;
      case "revision":
        return f.activo && !!f.revision && f.revision.dias <= 3;
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
            {nInactivos > 0 ? ` · ${nInactivos} ${nInactivos === 1 ? "pausado o de baja" : "pausados o de baja"}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {FILTROS[0].n > 0 && (
            <button
              className="mini !w-[38px] !h-[38px]"
              onClick={() => setMensajeVarios(true)}
              aria-label="Mensaje a varios clientes"
              title="Mensaje a varios"
            >
              <Megaphone size={17} />
            </button>
          )}
          <button
            className="ghost !py-2 !px-3 flex items-center gap-1.5 text-[13px] shrink-0"
            onClick={() => setAnadiendo(true)}
          >
            <UserPlus size={15} /> Añadir
          </button>
        </div>
      </div>

      {anadiendo && <HojaAnadirCliente onCerrar={() => setAnadiendo(false)} />}

      {mensajeVarios && (
        <HojaMensajeVarios
          clientes={filas
            .filter((f) => f.activo)
            .map((f) => ({
              id: f.c.id,
              nombre: f.c.nombre,
              foto: f.c.avatar_url,
              plan: f.c.plan,
              diasSinEntrenar: f.dias,
              sinEntrenarSemana: sinEntrenarSemana.includes(f.c.id),
            }))}
          /* Viene marcado lo que estabas viendo: con el filtro "Sin dieta"
           * puesto, el mensaje es para esos. Sin filtro, para todos. */
          preseleccion={filtrados.filter((f) => f.activo).map((f) => f.c.id)}
          onCerrar={() => setMensajeVarios(false)}
        />
      )}


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
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {filtrados
            .slice()
            .sort((a, b) => Number(b.activo) - Number(a.activo) || ORDEN_NIVEL[a.estado.nivel] - ORDEN_NIVEL[b.estado.nivel])
            .map(({ c, dias, adh, estado, activo, sinRutina, sinDieta, revision }) => {
              const actividad =
                dias === undefined ? "Sin sesiones" : dias === 0 ? "Entrenó hoy" : dias === 1 ? "Entrenó ayer" : `Hace ${dias} días`;
              const aviso = !activo
                ? c.estado === "baja"
                  ? "De baja"
                  : "Pausado"
                : sinRutina && sinDieta
                  ? "Sin rutina ni dieta"
                  : sinRutina
                    ? "Sin rutina"
                    : sinDieta
                      ? "Sin dieta"
                      : estado.nivel !== "al-dia" && estado.motivo && dias !== undefined && dias >= 3
                        ? `${dias} días sin entrenar`
                        : estado.nivel !== "al-dia"
                          ? estado.motivo
                          : null;
              const pct = adh ?? 0;
              return (
                <Link
                  key={c.id}
                  href={`/clientes/${c.id}`}
                  className={`tarjeta !mb-0 !p-3 flex flex-col items-center text-center relative anim-pulsable ${activo ? "" : "opacity-60"}`}
                >
                  {chatSinLeer[c.id] && (
                    <span title="Te ha escrito" className="absolute top-2.5 right-2.5">
                      <MessageCircle size={15} className="text-acento" fill="currentColor" />
                    </span>
                  )}
                  {(alertas[c.id] ?? 0) > 0 && <span className="badge absolute top-2 left-2">{alertas[c.id]}</span>}
                  <span
                    className="rounded-full"
                    style={{ boxShadow: activo ? `0 0 0 2px var(--color-fondo), 0 0 0 4px ${ANILLO[estado.nivel]}` : "none" }}
                    title={estado.motivo ?? "Al día"}
                  >
                    <Avatar nombre={c.nombre} tamano={52} foto={c.avatar_url} />
                  </span>
                  <div className="font-bold text-[14px] leading-tight mt-2.5 break-words w-full">{c.nombre}</div>
                  <div className="text-atenuado text-[11.5px] mt-0.5">{actividad}</div>
                  {activo && adh !== undefined && (
                    <>
                      <div className="w-full h-1.5 rounded bg-borde-2 overflow-hidden mt-2">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${Math.max(3, Math.min(100, pct))}%`,
                            background: pct >= 85 ? "var(--color-verde)" : pct >= 60 ? "var(--color-aviso)" : "var(--color-peligro)",
                          }}
                        />
                      </div>
                      <div className="text-[11px] text-atenuado mt-1">{pct} % cumplido</div>
                    </>
                  )}
                  {activo && revision && (
                    <span
                      className={`mt-2 text-[11px] font-bold rounded-full px-2 py-0.5 inline-flex items-center gap-1 ${claseTono[revision.tono]}`}
                      title="Próxima revisión"
                    >
                      <CalendarClock size={11} /> {revision.tono === "atrasada" ? `revisión ${revision.corto}` : revision.corto}
                    </span>
                  )}
                  {aviso && (
                    <div
                      className={`text-[11.5px] font-semibold mt-1.5 leading-tight break-words ${
                        !activo ? "text-atenuado" : estado.nivel === "riesgo" ? "text-peligro" : "text-aviso"
                      }`}
                    >
                      {aviso}
                    </div>
                  )}
                </Link>
              );
            })}
        </div>
      )}
    </>
  );
}
