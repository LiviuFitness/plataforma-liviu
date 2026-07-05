"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import {
  calcularMacros,
  datosQueFaltan,
  type DatosAutoCalculo,
} from "@/lib/macros";
import {
  macrosDe,
  r,
  r1,
  sumar,
  type Alimento,
  type ComidaEstructurada,
} from "@/lib/dietas";
import { generarComida, objetivoPorComida } from "@/lib/generadorDieta";
import type { Dieta } from "@/lib/tipos";

interface ItemUI {
  alimento: Alimento;
  gramos: string;
}

interface ComidaUI {
  nombre: string;
  notas: string;
  items: ItemUI[];
}

const COMIDAS_SUGERIDAS = ["Desayuno", "Media mañana", "Comida", "Merienda", "Cena", "Recena"];

/**
 * Editor de dieta estructurada (como el Excel de Liviu):
 * comidas con alimento + gramos, kcal y macros calculados al vuelo,
 * y comparación del plan contra el objetivo diario.
 */
export default function EditorDieta({
  dieta,
  clienteId,
  autoCalculo,
  alimentos,
  excluidos,
}: {
  dieta: Dieta | null;
  clienteId?: string | null; // null => plantilla
  autoCalculo?: DatosAutoCalculo;
  alimentos: Alimento[];
  excluidos?: string[]; // ids de alimentos que no le gustan al cliente
}) {
  const router = useRouter();
  const [kcal, setKcal] = useState(dieta?.kcal_obj ?? 2000);
  const [prot, setProt] = useState(dieta?.prot_obj ?? 150);
  const [carb, setCarb] = useState(dieta?.carb_obj ?? 180);
  const [gras, setGras] = useState(dieta?.gras_obj ?? 60);
  const [comidas, setComidas] = useState<ComidaUI[]>(() =>
    ((dieta?.dieta_comidas ?? []) as unknown as ComidaEstructurada[])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((c) => ({
        nombre: c.nombre,
        notas: c.descripcion_libre ?? "",
        items: (c.dieta_comida_alimentos ?? [])
          .slice()
          .sort((a, b) => a.orden - b.orden)
          .filter((i) => i.alimentos)
          .map((i) => ({
            alimento: i.alimentos!,
            gramos: String(Number(i.gramos)),
          })),
      }))
  );
  const [buscandoPara, setBuscandoPara] = useState<number | null>(null);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [notaCalculo, setNotaCalculo] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState<Record<number, string>>({});

  function tocar() {
    setSucio(true);
    setOk(false);
  }

  /* --- Generador automático: solo alimentos que le gustan al cliente y ya categorizados --- */
  const excluidosSet = useMemo(() => new Set(excluidos ?? []), [excluidos]);
  const alimentosPermitidos = useMemo(
    () => alimentos.filter((a) => a.categoria && !excluidosSet.has(a.id)),
    [alimentos, excluidosSet]
  );

  function generarAutomatico(ci: number) {
    const c = comidas[ci];
    if (
      c.items.length > 0 &&
      !confirm(`Esto sustituye los alimentos actuales de «${c.nombre || "esta comida"}». ¿Continuar?`)
    )
      return;

    const nombres = comidas.map((x, j) => x.nombre.trim() || COMIDAS_SUGERIDAS[j % COMIDAS_SUGERIDAS.length]);
    const objetivo = objetivoPorComida({ kcal, prot, carb, gras }, nombres, nombres[ci]);
    const resultado = generarComida(objetivo, alimentosPermitidos);

    if (!resultado) {
      setAvisoGeneracion((prev) => ({
        ...prev,
        [ci]:
          "Al cliente le faltan alimentos variados entre los que le gustan (hace falta al menos una proteína, un carbohidrato y una grasa). Añade más en Mi dieta o hazlo manualmente.",
      }));
      return;
    }

    setComidas(
      comidas.map((x, j) =>
        j === ci
          ? {
              ...x,
              items: resultado.items.map((it) => ({
                alimento: it.alimento,
                gramos: String(it.gramos),
              })),
            }
          : x
      )
    );
    setAvisoGeneracion((prev) => ({ ...prev, [ci]: resultado.aviso ?? "" }));
    tocar();
  }

  /* --- Totales del plan (suma de todas las comidas) --- */
  const totalesPlan = useMemo(
    () =>
      sumar(
        comidas.flatMap((c) =>
          c.items.map((i) =>
            macrosDe(i.alimento, Number(i.gramos.replace(",", ".")) || 0)
          )
        )
      ),
    [comidas]
  );

  /* --- Auto-cálculo de objetivos (Mifflin-St Jeor) --- */
  function autoCalcular() {
    if (!autoCalculo) return;
    const faltan = datosQueFaltan(autoCalculo);
    if (faltan.length > 0) {
      setError(`Para auto-calcular faltan datos: ${faltan.join(", ")}. Rellénalos en la pestaña Resumen.`);
      return;
    }
    const res = calcularMacros(autoCalculo);
    if (!res) {
      setError("No se pudo calcular con esos datos. Revisa la fecha de nacimiento y la altura.");
      return;
    }
    setError("");
    setKcal(res.kcal);
    setProt(res.prot);
    setCarb(res.carb);
    setGras(res.gras);
    tocar();
    setNotaCalculo(
      `Basal ${res.tmb} kcal · mantenimiento ${res.tdee} kcal · ajustado a "${autoCalculo.objetivo ?? "mantenimiento"}". Revísalo y guarda.`
    );
  }

  /* --- Crear la dieta si aún no existe --- */
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

  /* --- Guardar todo (objetivos + comidas + alimentos) --- */
  async function guardar() {
    if (!dieta) return;
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();

    const { error: e1 } = await supabase
      .from("dietas")
      .update({ kcal_obj: kcal, prot_obj: prot, carb_obj: carb, gras_obj: gras })
      .eq("id", dieta.id);

    const { error: e2 } = await supabase
      .from("dieta_comidas")
      .delete()
      .eq("dieta_id", dieta.id);

    let fallo = !!(e1 || e2);
    const validas = comidas.filter((c) => c.nombre.trim() !== "");

    for (let i = 0; i < validas.length && !fallo; i++) {
      const c = validas[i];
      const { data: fila, error: e3 } = await supabase
        .from("dieta_comidas")
        .insert({
          dieta_id: dieta.id,
          orden: i,
          nombre: c.nombre.trim(),
          descripcion_libre: c.notas.trim() || null,
        })
        .select("id")
        .single();
      if (e3 || !fila) {
        fallo = true;
        break;
      }
      if (c.items.length > 0) {
        const { error: e4 } = await supabase.from("dieta_comida_alimentos").insert(
          c.items.map((it, j) => ({
            comida_id: fila.id,
            alimento_id: it.alimento.id,
            gramos: Number(it.gramos.replace(",", ".")) || 0,
            orden: j,
          }))
        );
        if (e4) fallo = true;
      }
    }

    setGuardando(false);
    if (fallo) {
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
        {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}
        <button className="cta !mb-0" onClick={crearDieta} disabled={guardando}>
          {guardando ? "Creando…" : "+ Crear dieta desde cero"}
        </button>
      </section>
    );
  }

  const objetivos: Array<[string, number, (v: number) => void, number, string]> = [
    ["Proteína", prot, setProt, totalesPlan.prot, "#fff"],
    ["Carbohidratos", carb, setCarb, totalesPlan.carb, "#29ABE2"],
    ["Grasas", gras, setGras, totalesPlan.gras, "#8A949C"],
  ];

  return (
    <>
      {autoCalculo && (
        <button
          className="w-full flex items-center justify-center gap-2 bg-panel border border-acento/40 text-acento rounded-[12px] py-3 font-semibold text-[14px] cursor-pointer mb-3.5"
          onClick={autoCalcular}
        >
          ✨ Auto-calcular kcal y macros
        </button>
      )}
      {notaCalculo && (
        <div className="text-atenuado text-[12.5px] mb-3 -mt-1">{notaCalculo}</div>
      )}

      {/* Objetivo diario vs. lo que suma el plan */}
      <section className="tarjeta">
        <div className="titulo-tarjeta">OBJETIVO DIARIO · PLAN ACTUAL</div>
        <div className="flex justify-between items-center mb-3.5">
          <div>
            <span className="num-grande">{r(totalesPlan.kcal)}</span>
            <span className="text-atenuado text-[13.5px]"> / {kcal} kcal</span>
          </div>
          <div className="stepper">
            <button onClick={() => { setKcal(Math.max(800, kcal - 50)); tocar(); }}>−</button>
            <span className="text-acento">{kcal}</span>
            <button onClick={() => { setKcal(kcal + 50); tocar(); }}>+</button>
          </div>
        </div>
        {objetivos.map(([etiqueta, objetivo, setter, plan, color]) => (
          <div
            key={etiqueta}
            className="flex justify-between items-center py-2 border-b border-borde last:border-0"
          >
            <span className="text-[14px]">
              {etiqueta}
              <span className="text-atenuado text-[12.5px]"> · plan {r(plan)} g</span>
            </span>
            <div className="stepper">
              <button onClick={() => { setter(Math.max(0, objetivo - 5)); tocar(); }}>−</button>
              <span style={{ color }}>{objetivo} g</span>
              <button onClick={() => { setter(objetivo + 5); tocar(); }}>+</button>
            </div>
          </div>
        ))}
      </section>

      {/* Comidas con alimentos estructurados */}
      {comidas.map((c, ci) => {
        const totales = sumar(
          c.items.map((i) =>
            macrosDe(i.alimento, Number(i.gramos.replace(",", ".")) || 0)
          )
        );
        return (
          <section className="tarjeta" key={ci}>
            <div className="flex gap-2 items-center mb-2">
              <input
                className="input !mb-0 font-bold"
                placeholder={COMIDAS_SUGERIDAS[ci % COMIDAS_SUGERIDAS.length]}
                value={c.nombre}
                onChange={(e) => {
                  setComidas(comidas.map((x, j) => (j === ci ? { ...x, nombre: e.target.value } : x)));
                  tocar();
                }}
              />
              <button
                className="mini mini-peligro shrink-0"
                onClick={() => {
                  if (c.items.length > 0 && !confirm(`¿Quitar «${c.nombre || "esta comida"}» con sus alimentos?`)) return;
                  setComidas(comidas.filter((_, j) => j !== ci));
                  tocar();
                }}
                aria-label="Quitar comida"
              >
                ✕
              </button>
            </div>

            {c.items.map((it, ii) => {
              const m = macrosDe(it.alimento, Number(it.gramos.replace(",", ".")) || 0);
              return (
                <div
                  key={ii}
                  className="flex items-center gap-2 py-1.5 border-b border-borde last:border-0"
                >
                  <span className="flex-1 text-[13.5px] truncate">{it.alimento.nombre}</span>
                  <input
                    className="campo-serie !w-[64px] shrink-0"
                    inputMode="decimal"
                    value={it.gramos}
                    onChange={(e) => {
                      setComidas(
                        comidas.map((x, j) =>
                          j === ci
                            ? { ...x, items: x.items.map((y, k) => (k === ii ? { ...y, gramos: e.target.value } : y)) }
                            : x
                        )
                      );
                      tocar();
                    }}
                    aria-label={`Gramos de ${it.alimento.nombre}`}
                  />
                  <span className="text-atenuado text-[12px] w-[64px] text-right shrink-0">
                    {r(m.kcal)} kcal
                  </span>
                  <button
                    className="mini mini-peligro shrink-0"
                    onClick={() => {
                      setComidas(
                        comidas.map((x, j) =>
                          j === ci ? { ...x, items: x.items.filter((_, k) => k !== ii) } : x
                        )
                      );
                      tocar();
                    }}
                    aria-label={`Quitar ${it.alimento.nombre}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            <button
              className="w-full flex items-center justify-center gap-1.5 bg-panel border border-acento/40 text-acento rounded-[10px] py-2 text-[13px] cursor-pointer mt-2"
              onClick={() => generarAutomatico(ci)}
            >
              ✨ Generar automáticamente
            </button>
            {avisoGeneracion[ci] && (
              <div className="text-aviso text-[12px] mt-1.5">— {avisoGeneracion[ci]}</div>
            )}

            <button
              className="w-full bg-transparent border border-dashed border-[#2A333B] text-atenuado rounded-[10px] py-2 text-[13px] cursor-pointer mt-2"
              onClick={() => setBuscandoPara(ci)}
            >
              + Añadir alimento
            </button>

            {c.items.length > 0 && (
              <div className="flex justify-between text-[12.5px] text-atenuado mt-2 pt-2 border-t border-borde">
                <span className="font-bold text-texto-2">Total</span>
                <span>
                  <b className="text-acento">{r(totales.kcal)} kcal</b> · P{r1(totales.prot)} · C{r1(totales.carb)} · G{r1(totales.gras)}
                </span>
              </div>
            )}

            <textarea
              className="w-full bg-campo border border-borde-2 rounded-[10px] text-white p-2 px-3 text-[13px] resize-y font-cuerpo mt-2"
              rows={1}
              placeholder="Notas de la comida (opcional)"
              value={c.notas}
              onChange={(e) => {
                setComidas(comidas.map((x, j) => (j === ci ? { ...x, notas: e.target.value } : x)));
                tocar();
              }}
            />
          </section>
        );
      })}

      <button
        className="w-full bg-transparent border border-dashed border-[#2A333B] text-atenuado rounded-[10px] py-2.5 text-[13.5px] cursor-pointer mb-3"
        onClick={() => {
          setComidas([
            ...comidas,
            { nombre: COMIDAS_SUGERIDAS[comidas.length] ?? "", notas: "", items: [] },
          ]);
          tocar();
        }}
      >
        + Añadir comida
      </button>

      {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}
      <button className="cta" onClick={guardar} disabled={guardando || !sucio}>
        {ok ? "Guardado ✓" : guardando ? "Guardando…" : "Guardar dieta"}
      </button>

      {/* Hoja de búsqueda de alimentos */}
      {buscandoPara !== null && (
        <HojaAlimentos
          alimentos={alimentos}
          excluidos={excluidos}
          onElegir={(alimento) => {
            setComidas(
              comidas.map((x, j) =>
                j === buscandoPara
                  ? { ...x, items: [...x.items, { alimento, gramos: "100" }] }
                  : x
              )
            );
            tocar();
            setBuscandoPara(null);
          }}
          onCerrar={() => setBuscandoPara(null)}
        />
      )}
    </>
  );
}

/* ============================================================
   Hoja inferior: buscador sobre la base de alimentos de Liviu
   ============================================================ */
function HojaAlimentos({
  alimentos,
  excluidos,
  onElegir,
  onCerrar,
}: {
  alimentos: Alimento[];
  excluidos?: string[];
  onElegir: (a: Alimento) => void;
  onCerrar: () => void;
}) {
  const noLeGustan = new Set(excluidos ?? []);
  const [busqueda, setBusqueda] = useState("");
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    const lista = q
      ? alimentos.filter((a) => a.nombre.toLowerCase().includes(q))
      : alimentos;
    return lista.slice(0, 60);
  }, [alimentos, busqueda]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[480px] max-h-[82vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="titulo-tarjeta !m-0">AÑADIR ALIMENTO</div>
          <button className="ghost" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        <input
          className="input"
          placeholder="Buscar alimento…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoFocus
        />
        <div className="overflow-y-auto flex-1">
          {filtrados.map((a) => (
            <button
              key={a.id}
              className="flex justify-between items-center w-full text-left border-b border-borde py-3 px-1 cursor-pointer gap-3"
              onClick={() => onElegir(a)}
            >
              <span className="font-bold text-[14.5px] flex-1">
                {noLeGustan.has(a.id) && (
                  <span title="Al cliente no le gusta" className="mr-1">
                    ⚠️
                  </span>
                )}
                {a.nombre}
              </span>
              <span className="text-atenuado text-[12px] shrink-0">
                {r(a.kcal_100)} kcal · P{r1(a.prot_100)} C{r1(a.carb_100)} G{r1(a.gras_100)} /100g
              </span>
            </button>
          ))}
          {filtrados.length === 0 && (
            <div className="text-atenuado text-[13.5px] p-3">
              Sin resultados con ese nombre.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
