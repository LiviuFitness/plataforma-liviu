"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { INFO_MACRO, type Dieta } from "@/lib/tipos";
import type { PlantillaRutina } from "./page";

interface ClienteMin {
  id: string;
  nombre: string;
}

/** Listado de plantillas: crear, editar, asignar (copia) y borrar. */
export default function Plantillas({
  rutinas,
  dietas,
  clientes,
}: {
  rutinas: PlantillaRutina[];
  dietas: Dieta[];
  clientes: ClienteMin[];
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
    setCargando(false);
    if (error || !data) {
      setError("No se pudo crear la plantilla. Inténtalo de nuevo.");
      return;
    }
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
    setCargando(false);
    if (error || !data) {
      setError("No se pudo crear la plantilla. Inténtalo de nuevo.");
      return;
    }
    router.push(`/plantillas/dieta/${data.id}`);
  }

  async function borrarPlantilla(tipo: "rutina" | "dieta", id: string, nombre: string) {
    if (!confirm(`¿Borrar la plantilla «${nombre}»? Los clientes que ya la tienen asignada no se ven afectados.`)) return;
    const supabase = crearClienteNavegador();
    await supabase.from(tipo === "rutina" ? "rutinas" : "dietas").delete().eq("id", id);
    router.refresh();
  }

  async function asignar(clienteId: string) {
    if (!asignando) return;
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
    const cliente = clientes.find((c) => c.id === clienteId);
    setAsignadaOk(
      `«${asignando.nombre}» asignada a ${cliente?.nombre ?? "cliente"} ✓`
    );
    setAsignando(null);
    setTimeout(() => setAsignadaOk(""), 3500);
    router.refresh();
  }

  return (
    <>
      <h1 className="h1">Plantillas</h1>
      <div className="sub mb-4">tu método, listo para asignar —</div>

      {asignadaOk && <div className="banner banner-accion mb-3.5">{asignadaOk}</div>}
      {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}

      {/* ---- Entreno ---- */}
      <div className="titulo-seccion mt-2">Entreno</div>
      {rutinas.length === 0 && (
        <div className="text-atenuado text-[13.5px] mb-3">
          Sin plantillas de entreno todavía. Crea la primera.
        </div>
      )}
      {rutinas.map((p) => (
        <div key={p.id} className="fila">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15px] truncate">{p.nombre}</div>
            <div className="text-atenuado text-[12.5px] truncate">
              {p.num_dias} {p.num_dias === 1 ? "día" : "días"}
              {p.notas ? ` · ${p.notas}` : ""}
            </div>
          </div>
          {/* Acción principal destacada; editar/borrar quedan discretos */}
          <button
            className="cta cta-mini !mb-0 shrink-0"
            onClick={() => setAsignando({ id: p.id, tipo: "rutina", nombre: p.nombre })}
          >
            Asignar
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
        <div key={p.id} className="fila">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15px] truncate">
              {p.nombre ?? "Plantilla de dieta"}
            </div>
            <div className="text-atenuado text-[12.5px] truncate">
              {p.kcal_obj} kcal ·{" "}
              <span style={{ color: INFO_MACRO.proteina.color }}>P{p.prot_obj}</span>{" "}
              / <span style={{ color: INFO_MACRO.carbohidratos.color }}>C{p.carb_obj}</span>{" "}
              / <span style={{ color: INFO_MACRO.grasas.color }}>G{p.gras_obj}</span>
            </div>
          </div>
          <button
            className="cta cta-mini !mb-0 shrink-0"
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
      ))}
      <button className="cta mt-3" onClick={nuevaPlantillaDieta} disabled={cargando}>
        + Nueva plantilla de dieta
      </button>

      {/* ---- Hoja de asignación ---- */}
      {asignando && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center"
          onClick={() => setAsignando(null)}
        >
          <div
            className="w-full max-w-[480px] max-h-[70vh] bg-panel border border-borde rounded-t-[20px] p-[18px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="titulo-seccion !mb-0">Asignar «{asignando.nombre}»</div>
              <button className="ghost" onClick={() => setAsignando(null)}>
                Cerrar
              </button>
            </div>
            <p className="text-atenuado text-[12.5px] mb-3">
              Se copia a la ficha del cliente: los cambios posteriores en la
              plantilla no le afectan.
            </p>
            <div className="overflow-y-auto flex-1">
              {clientes.length === 0 && (
                <div className="text-atenuado text-[13.5px]">
                  Sin clientes activos todavía.
                </div>
              )}
              {clientes.map((c) => (
                <button
                  key={c.id}
                  className="fila w-full text-left cursor-pointer"
                  onClick={() => asignar(c.id)}
                  disabled={cargando}
                >
                  <span className="font-bold text-[15px] flex-1 min-w-0 truncate">{c.nombre}</span>
                  <span className="text-acento text-[13.5px] shrink-0">Asignar →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
