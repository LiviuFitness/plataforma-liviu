"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import type { Dieta } from "@/lib/tipos";

interface ComidaUI {
  nombre: string;
  descripcion_libre: string;
}

const COMIDAS_SUGERIDAS = ["Desayuno", "Comida", "Merienda", "Cena"];

/**
 * Editor de dieta (Fase 1: objetivos kcal/macros + comidas en texto libre).
 * Se usa en la ficha del cliente y en las plantillas de dieta.
 */
export default function EditorDieta({
  dieta,
  clienteId,
}: {
  dieta: Dieta | null;
  clienteId?: string | null; // null => plantilla
}) {
  const router = useRouter();
  const [kcal, setKcal] = useState(dieta?.kcal_obj ?? 2000);
  const [prot, setProt] = useState(dieta?.prot_obj ?? 150);
  const [carb, setCarb] = useState(dieta?.carb_obj ?? 180);
  const [gras, setGras] = useState(dieta?.gras_obj ?? 60);
  const [comidas, setComidas] = useState<ComidaUI[]>(
    (dieta?.dieta_comidas ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((c) => ({
        nombre: c.nombre,
        descripcion_libre: c.descripcion_libre ?? "",
      }))
  );
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  function marcar<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setSucio(true);
      setOk(false);
    };
  }
  const setKcalM = marcar(setKcal);
  const setProtM = marcar(setProt);
  const setCarbM = marcar(setCarb);
  const setGrasM = marcar(setGras);
  const setComidasM = marcar(setComidas);

  /* --- Crear la dieta si aún no existe (ficha de cliente) --- */
  async function crearDieta() {
    if (!clienteId) return;
    setGuardando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("dietas")
      .insert({ cliente_id: clienteId, activa: true });
    setGuardando(false);
    if (error) {
      setError("No se pudo crear la dieta. Inténtalo de nuevo.");
      return;
    }
    router.refresh();
  }

  async function guardar() {
    if (!dieta) return;
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();

    const { error: e1 } = await supabase
      .from("dietas")
      .update({ kcal_obj: kcal, prot_obj: prot, carb_obj: carb, gras_obj: gras })
      .eq("id", dieta.id);

    // Reescribimos las comidas completas: sencillo y consistente
    const { error: e2 } = await supabase
      .from("dieta_comidas")
      .delete()
      .eq("dieta_id", dieta.id);

    let e3 = null;
    const validas = comidas.filter((c) => c.nombre.trim() !== "");
    if (validas.length > 0) {
      const { error } = await supabase.from("dieta_comidas").insert(
        validas.map((c, i) => ({
          dieta_id: dieta.id,
          orden: i,
          nombre: c.nombre.trim(),
          descripcion_libre: c.descripcion_libre.trim() || null,
        }))
      );
      e3 = error;
    }

    setGuardando(false);
    if (e1 || e2 || e3) {
      setError("No se pudo guardar la dieta. Inténtalo de nuevo.");
      return;
    }
    setSucio(false);
    setOk(true);
    router.refresh();
  }

  if (!dieta) {
    return (
      <section className="tarjeta">
        <div className="text-atenuado text-[13.5px] mb-3">
          Sin dieta asignada todavía. Crea una desde cero o asigna una plantilla
          desde «Plantillas».
        </div>
        {error && (
          <div className="text-peligro text-[13.5px] mb-3">— {error}</div>
        )}
        <button className="cta !mb-0" onClick={crearDieta} disabled={guardando}>
          {guardando ? "Creando…" : "+ Crear dieta desde cero"}
        </button>
      </section>
    );
  }

  const macros: Array<[string, number, (v: number) => void, string]> = [
    ["Proteína", prot, setProtM, "#fff"],
    ["Carbohidratos", carb, setCarbM, "#29ABE2"],
    ["Grasas", gras, setGrasM, "#8A949C"],
  ];

  return (
    <>
      <section className="tarjeta">
        <div className="titulo-tarjeta">OBJETIVO DIARIO</div>
        <div className="flex justify-between items-center mb-3.5">
          <div>
            <span className="num-grande">{kcal}</span>
            <span className="text-atenuado text-[13.5px]"> kcal</span>
          </div>
          <div className="stepper">
            <button onClick={() => setKcalM(Math.max(800, kcal - 50))}>−</button>
            <span className="text-acento">{kcal}</span>
            <button onClick={() => setKcalM(kcal + 50)}>+</button>
          </div>
        </div>
        {macros.map(([etiqueta, valor, setter, color]) => (
          <div
            key={etiqueta}
            className="flex justify-between items-center py-2 border-b border-borde last:border-0"
          >
            <span className="text-[14px]">{etiqueta}</span>
            <div className="stepper">
              <button onClick={() => setter(Math.max(0, valor - 5))}>−</button>
              <span style={{ color }}>{valor} g</span>
              <button onClick={() => setter(valor + 5)}>+</button>
            </div>
          </div>
        ))}
      </section>

      <section className="tarjeta">
        <div className="titulo-tarjeta">COMIDAS</div>
        {comidas.length === 0 && (
          <div className="text-atenuado text-[13.5px] mb-3">
            Sin comidas definidas todavía. Añade la primera.
          </div>
        )}
        {comidas.map((c, i) => (
          <div key={i} className="border-b border-borde last:border-0 py-2.5">
            <div className="flex gap-2 items-center mb-1.5">
              <input
                className="input !mb-0 font-bold"
                placeholder={COMIDAS_SUGERIDAS[i % COMIDAS_SUGERIDAS.length]}
                value={c.nombre}
                onChange={(e) =>
                  setComidasM(
                    comidas.map((x, j) =>
                      j === i ? { ...x, nombre: e.target.value } : x
                    )
                  )
                }
              />
              <button
                className="mini mini-peligro shrink-0"
                onClick={() => setComidasM(comidas.filter((_, j) => j !== i))}
                aria-label={`Quitar ${c.nombre || "comida"}`}
              >
                ✕
              </button>
            </div>
            <textarea
              className="w-full bg-campo border border-borde-2 rounded-[10px] text-white p-2.5 px-3 text-[13.5px] resize-y font-cuerpo"
              rows={2}
              placeholder="Ej.: Avena 80 g · claras 200 g · plátano"
              value={c.descripcion_libre}
              onChange={(e) =>
                setComidasM(
                  comidas.map((x, j) =>
                    j === i ? { ...x, descripcion_libre: e.target.value } : x
                  )
                )
              }
            />
          </div>
        ))}
        <button
          className="w-full bg-transparent border border-dashed border-[#2A333B] text-atenuado rounded-[10px] py-2.5 text-[13.5px] cursor-pointer mt-2"
          onClick={() =>
            setComidasM([
              ...comidas,
              {
                nombre: COMIDAS_SUGERIDAS[comidas.length] ?? "",
                descripcion_libre: "",
              },
            ])
          }
        >
          + Añadir comida
        </button>
      </section>

      {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}
      <button className="cta" onClick={guardar} disabled={guardando || !sucio}>
        {ok ? "Guardado ✓" : guardando ? "Guardando…" : "Guardar dieta"}
      </button>
    </>
  );
}
