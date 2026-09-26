"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Search, Trash2, AlertCircle } from "lucide-react";
import { copiarDieta, copiarRutina } from "@/lib/copiarPlan";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { INFO_MACRO, type Dieta } from "@/lib/tipos";
import type { ClienteAsignable, PlantillaRutina } from "./page";

/** Listado de plantillas: crear, editar, asignar (copia) y borrar. */
export default function Plantillas({
  rutinas,
  dietas,
  clientes,
}: {
  rutinas: PlantillaRutina[];
  dietas: Dieta[];
  clientes: ClienteAsignable[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  // Asignación en curso: qué plantilla y de qué tipo
  const [asignando, setAsignando] = useState<{
    id: string;
    tipo: "rutina" | "dieta";
    nombre: string;
  } | null>(null);
  const [asignadaOk, setAsignadaOk] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [recienCopiada, setRecienCopiada] = useState<string | null>(null);

  async function nuevaPlantillaEntreno() {
    setCargando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { data, error } = await supabase
      .from("rutinas")
      .insert({
        es_plantilla: true,
        cliente_id: null,
        nombre: "Plantilla nueva",
        activa: false,
      })
      .select("id")
      .single();
    if (error || !data) {
      setCargando(false);
      setError("No se pudo crear la plantilla. Inténtalo de nuevo.");
      return;
    }
    /* No se suelta el bloqueo al salir bien: el botón seguiría pulsable
     * el segundo que tarda la navegación, y otra pulsación crearía una
     * segunda plantilla vacía. */
    router.push(`/plantillas/entreno/${data.id}`);
  }

  async function nuevaPlantillaDieta() {
    setCargando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { data, error } = await supabase
      .from("dietas")
      .insert({
        es_plantilla: true,
        cliente_id: null,
        nombre: "Plantilla nueva",
        activa: false,
      })
      .select("id")
      .single();
    if (error || !data) {
      setCargando(false);
      setError("No se pudo crear la plantilla. Inténtalo de nuevo.");
      return;
    }
    /* No se suelta el bloqueo al salir bien: el botón seguiría pulsable
     * el segundo que tarda la navegación, y otra pulsación crearía una
     * segunda plantilla vacía. */
    router.push(`/plantillas/dieta/${data.id}`);
  }

  /* Duplicar para sacar variantes ("4 días" → su versión de 3) sin
   * empezar en blanco. La copia sale arriba del todo (van por fecha) con
   * la marca "nueva", y el nombre pide a gritos que lo cambies. */
  async function duplicarPlantilla(tipo: "rutina" | "dieta", id: string, nombre: string) {
    setCargando(true);
    setError("");
    setAsignadaOk("");
    const supabase = crearClienteNavegador();
    const destino = { nombre: `${nombre} (copia)`, cliente_id: null, es_plantilla: true, activa: false };
    const nueva =
      tipo === "rutina"
        ? await copiarRutina(supabase, id, destino)
        : await copiarDieta(supabase, id, destino);
    setCargando(false);
    if (!nueva) {
      setError("No se pudo duplicar la plantilla. Inténtalo de nuevo.");
      return;
    }
    setRecienCopiada(nueva);
    router.refresh();
  }

  async function borrarPlantilla(tipo: "rutina" | "dieta", id: string, nombre: string) {
    if (!confirm(`¿Borrar la plantilla «${nombre}»? Los clientes que ya la tienen asignada no se ven afectados.`)) return;
    const supabase = crearClienteNavegador();
    await supabase.from(tipo === "rutina" ? "rutinas" : "dietas").delete().eq("id", id);
    router.refresh();
  }

  async function asignar(clienteId: string) {
    if (!asignando) return;
    const cliente = clientes.find((c) => c.id === clienteId);
    /* Asignar SUSTITUYE lo que tenga activo: la anterior se guarda pero
     * deja de ser la que ve el cliente. Antes pasaba sin preguntar, y un
     * toque en la fila de al lado le cambiaba la rutina a otra persona. */
    const actual =
      asignando.tipo === "rutina"
        ? cliente?.rutinaActual && `la rutina «${cliente.rutinaActual}»`
        : cliente?.dietaActualKcal != null && `una dieta de ${cliente.dietaActualKcal} kcal`;
    if (
      actual &&
      !confirm(
        `${cliente?.nombre} ya tiene ${actual}. Si le asignas «${asignando.nombre}», la sustituye y deja de ver la anterior. ¿Seguir?`
      )
    )
      return;
    setCargando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase.rpc(
      asignando.tipo === "rutina"
        ? "asignar_plantilla_rutina"
        : "asignar_plantilla_dieta",
      { p_plantilla: asignando.id, p_cliente: clienteId }
    );
    setCargando(false);
    if (error) {
      setError("No se pudo asignar la plantilla. Inténtalo de nuevo.");
      return;
    }
    setAsignadaOk(
      `«${asignando.nombre}» asignada a ${cliente?.nombre ?? "cliente"} ✓`
    );
    setAsignando(null);
    setBuscaCliente("");
    setTimeout(() => setAsignadaOk(""), 3500);
    router.refresh();
  }

  return (
    <>
      <h1 className="h1">Plantillas</h1>
      <div className="sub mb-4">Tu método, listo para asignar</div>

      {asignadaOk && <div className="banner banner-accion mb-3.5">{asignadaOk}</div>}
      {recienCopiada && (
        <div className="banner banner-accion mb-3.5">
          Copia creada arriba de su lista. Cámbiale el nombre y ajústala.
        </div>
      )}
      {error && <div className="text-peligro text-[13.5px] mb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}

      {/* ---- Entreno ---- */}
      <div className="titulo-seccion mt-2">Entreno</div>
      {rutinas.length === 0 && (
        <div className="text-atenuado text-[13.5px] mb-3">
          Sin plantillas de entreno todavía. Crea la primera.
        </div>
      )}
      {rutinas.map((p) => (
        <div key={p.id} className="py-3 border-b border-borde last:border-b-0">
          <div className="min-w-0">
            <div className="font-bold text-[15px] leading-tight break-words">
              {p.nombre}
              {p.id === recienCopiada && (
                <span className="text-acento text-[12px] font-semibold"> · nueva</span>
              )}
            </div>
            <div className="text-atenuado text-[12.5px] break-words">
              {p.dias_semana} {p.dias_semana === 1 ? "día" : "días"} por semana
              {p.semanas > 1 ? ` · ${p.semanas} semanas` : ""}
              {p.notas ? ` · ${p.notas}` : ""}
            </div>
          </div>
          {/* Acciones en su propia línea: con cuatro botones al lado,
            * el nombre de la plantilla se quedaba en un tercio del ancho. */}
          <div className="flex items-center gap-2 mt-2.5">
            <button
              className="cta cta-mini !mb-0 flex-1"
              onClick={() => setAsignando({ id: p.id, tipo: "rutina", nombre: p.nombre })}
            >
              Asignar
            </button>
            <button
              className="mini shrink-0"
              onClick={() => duplicarPlantilla("rutina", p.id, p.nombre)}
              disabled={cargando}
              aria-label={`Duplicar ${p.nombre}`}
              title="Duplicar plantilla"
            >
              <Copy size={14} />
            </button>
            <Link
              href={`/plantillas/entreno/${p.id}`}
              className="mini shrink-0"
              aria-label={`Editar ${p.nombre}`}
            >
              <Pencil size={14} />
            </Link>
            <button
              className="mini shrink-0"
              onClick={() => borrarPlantilla("rutina", p.id, p.nombre)}
              aria-label={`Borrar plantilla ${p.nombre}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button className="cta mt-3" onClick={nuevaPlantillaEntreno} disabled={cargando}>
        + Nueva plantilla de entreno
      </button>

      {/* ---- Dieta ---- */}
      <div className="titulo-seccion mt-6">Dieta</div>
      {dietas.length === 0 && (
        <div className="text-atenuado text-[13.5px] mb-3">
          Sin plantillas de dieta todavía. Crea la primera.
        </div>
      )}
      {dietas.map((p) => (
        <div key={p.id} className="py-3 border-b border-borde last:border-b-0">
          <div className="min-w-0">
            <div className="font-bold text-[15px] leading-tight break-words">
              {p.nombre ?? "Plantilla de dieta"}
              {p.id === recienCopiada && (
                <span className="text-acento text-[12px] font-semibold"> · nueva</span>
              )}
            </div>
            <div className="text-atenuado text-[12.5px] break-words">
              {p.kcal_obj} kcal ·{" "}
              <span style={{ color: INFO_MACRO.proteina.color }}>P{p.prot_obj}</span>{" "}
              / <span style={{ color: INFO_MACRO.carbohidratos.color }}>C{p.carb_obj}</span>{" "}
              / <span style={{ color: INFO_MACRO.grasas.color }}>G{p.gras_obj}</span>
            </div>
          </div>
          {/* Acciones en su propia línea: con cuatro botones al lado,
            * el nombre de la plantilla se quedaba en un tercio del ancho. */}
          <div className="flex items-center gap-2 mt-2.5">
            <button
              className="cta cta-mini !mb-0 flex-1"
              onClick={() =>
                setAsignando({
                  id: p.id,
                  tipo: "dieta",
                  nombre: p.nombre ?? "Plantilla de dieta",
                })
              }
            >
              Asignar
            </button>
            <button
              className="mini shrink-0"
              onClick={() => duplicarPlantilla("dieta", p.id, p.nombre ?? "Plantilla de dieta")}
              disabled={cargando}
              aria-label={`Duplicar ${p.nombre ?? "plantilla de dieta"}`}
              title="Duplicar plantilla"
            >
              <Copy size={14} />
            </button>
            <Link
              href={`/plantillas/dieta/${p.id}`}
              className="mini shrink-0"
              aria-label={`Editar ${p.nombre ?? "plantilla de dieta"}`}
            >
              <Pencil size={14} />
            </Link>
            <button
              className="mini shrink-0"
              onClick={() => borrarPlantilla("dieta", p.id, p.nombre ?? "Plantilla de dieta")}
              aria-label={`Borrar plantilla ${p.nombre}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button className="cta mt-3" onClick={nuevaPlantillaDieta} disabled={cargando}>
        + Nueva plantilla de dieta
      </button>

      {/* ---- Hoja de asignación ---- */}
      {asignando && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center"
          onClick={() => {
            setAsignando(null);
            setBuscaCliente("");
          }}
        >
          <div
            className="w-full max-w-[480px] max-h-[70vh] bg-panel border border-borde rounded-t-[20px] p-[18px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="titulo-seccion !mb-0">Asignar «{asignando.nombre}»</div>
              <button
                className="ghost"
                onClick={() => {
                  setAsignando(null);
                  setBuscaCliente("");
                }}
              >
                Cerrar
              </button>
            </div>
            <p className="text-atenuado text-[12.5px] mb-3">
              Se copia a la ficha del cliente: los cambios posteriores en la
              plantilla no le afectan. Si ya tiene una, te pregunto antes de
              sustituirla.
            </p>
            {clientes.length > 6 && (
              <div className="relative mb-2">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-atenuado pointer-events-none"
                />
                <input
                  className="input !pl-10 !mb-0"
                  placeholder="Buscar cliente…"
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                />
              </div>
            )}
            <div className="overflow-y-auto flex-1">
              {clientes.length === 0 && (
                <div className="text-atenuado text-[13.5px]">
                  Sin clientes activos todavía.
                </div>
              )}
              {clientes
                .filter((c) =>
                  c.nombre.toLowerCase().includes(buscaCliente.trim().toLowerCase())
                )
                .map((c) => {
                  const actual =
                    asignando.tipo === "rutina"
                      ? c.rutinaActual
                      : c.dietaActualKcal != null
                        ? `${c.dietaActualKcal} kcal`
                        : null;
                  return (
                    <button
                      key={c.id}
                      className="fila w-full text-left cursor-pointer anim-pulsable"
                      onClick={() => asignar(c.id)}
                      disabled={cargando}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-[14.5px] leading-tight break-words">
                          {c.nombre}
                        </span>
                        <span
                          className={`block text-[12.5px] leading-snug break-words ${
                            actual ? "text-atenuado" : "text-aviso"
                          }`}
                        >
                          {actual
                            ? `Ahora: ${actual}`
                            : asignando.tipo === "rutina"
                              ? "Sin rutina"
                              : "Sin dieta"}
                        </span>
                      </span>
                      <span className="text-acento text-[13.5px] shrink-0">
                        {actual ? "Sustituir →" : "Asignar →"}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
