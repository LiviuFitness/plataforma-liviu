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
  itemsDeOpcion,
  tieneOpcionB,
  type Alimento,
  type ComidaEstructurada,
  type ItemComida,
} from "@/lib/dietas";
import { ArrowDown, ArrowUp, Copy, CopyPlus, MoreHorizontal, Sparkles, Split, X, AlertCircle } from "lucide-react";
import { infoComida } from "@/lib/infoComida";
import { avisarCambio } from "@/lib/avisos";
import { IconoTarjeta } from "@/componentes/ui";
import { generarComida, objetivoPorComida } from "@/lib/generadorDieta";
import { INFO_MACRO, type Dieta } from "@/lib/tipos";
import HojaDietaIA from "@/componentes/HojaDietaIA";
import type { BorradorDietaIA } from "@/lib/iaTipos";
import AsignarPlantilla, { type PlantillaResumen } from "@/componentes/AsignarPlantilla";

interface ItemUI {
  alimento: Alimento;
  gramos: string;
}

interface ComidaUI {
  nombre: string;
  notas: string;
  /** Opción A: la que suma en el día. */
  items: ItemUI[];
  /** Opción B (misma comida, otros alimentos) o null si no tiene. */
  itemsB: ItemUI[] | null;
  nombreB: string;
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
  tipoDieta = "entreno",
  puedeCopiarDeEntreno = false,
  plantillas,
  otraDieta = null,
}: {
  dieta: Dieta | null;
  clienteId?: string | null; // null => plantilla
  autoCalculo?: DatosAutoCalculo;
  alimentos: Alimento[];
  excluidos?: string[]; // ids de alimentos que no le gustan al cliente
  tipoDieta?: "entreno" | "descanso";
  /** true si el cliente tiene dieta de entreno activa de la que copiar */
  puedeCopiarDeEntreno?: boolean;
  /** Plantillas de dieta, para aplicar una sin salir de la ficha. */
  plantillas?: PlantillaResumen[];
  /** La otra dieta del cliente (descanso si esta es la de entreno, o al
   * revés), para "Copiar a la dieta de descanso" desde el menú de una
   * comida. null si no existe todavía o si es una plantilla. */
  otraDieta?: { id: string; tipo: "entreno" | "descanso" } | null;
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
      .map((c) => {
        const aUI = (lista: ItemComida[]) =>
          lista
            .filter((i) => i.alimentos)
            .map((i) => ({ alimento: i.alimentos!, gramos: String(Number(i.gramos)) }));
        return {
          nombre: c.nombre,
          notas: c.descripcion_libre ?? "",
          items: aUI(itemsDeOpcion(c, 0)),
          itemsB: tieneOpcionB(c) ? aUI(itemsDeOpcion(c, 1)) : null,
          nombreB: c.nombre_b ?? "",
        };
      })
  );
  const [buscandoPara, setBuscandoPara] = useState<number | null>(null);
  /* Qué opción de cada comida se está viendo/editando (0 = A, 1 = B) */
  const [opcionVista, setOpcionVista] = useState<Record<number, 0 | 1>>({});
  const opcionDe = (ci: number): 0 | 1 => (opcionVista[ci] === 1 && comidas[ci]?.itemsB ? 1 : 0);
  /** Cambia los alimentos de la opción que se está viendo de una comida. */
  function cambiarItems(ci: number, fn: (items: ItemUI[]) => ItemUI[]) {
    const op = opcionDe(ci);
    setComidas((prev) =>
      prev.map((x, j) =>
        j !== ci ? x : op === 1 && x.itemsB ? { ...x, itemsB: fn(x.itemsB) } : { ...x, items: fn(x.items) }
      )
    );
  }
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [notaCalculo, setNotaCalculo] = useState("");
  const [avisoGeneracion, setAvisoGeneracion] = useState<Record<number, string>>({});
  const [reduccion, setReduccion] = useState(75); // g de hidratos a recortar en descanso

  /* Menú "⋯" de cada comida: mover, duplicar, copiar a la otra dieta
   * y quitar, en una hoja en vez de cuatro botones en la cabecera. */
  const [menuComida, setMenuComida] = useState<number | null>(null);
  const [copiandoComida, setCopiandoComida] = useState(false);
  const [avisoComida, setAvisoComida] = useState("");

  function moverComida(ci: number, delta: -1 | 1) {
    const destino = ci + delta;
    if (destino < 0 || destino >= comidas.length) return;
    const copia = comidas.slice();
    [copia[ci], copia[destino]] = [copia[destino], copia[ci]];
    setComidas(copia);
    setMenuComida(destino);
    tocar();
  }

  function duplicarComida(ci: number) {
    const c = comidas[ci];
    const copia = comidas.slice();
    copia.splice(ci + 1, 0, {
      nombre: c.nombre ? `${c.nombre} (copia)` : "",
      notas: c.notas,
      items: c.items.map((it) => ({ ...it })),
      itemsB: c.itemsB ? c.itemsB.map((it) => ({ ...it })) : null,
      nombreB: c.nombreB,
    });
    setComidas(copia);
    setMenuComida(null);
    tocar();
  }

  function quitarComida(ci: number) {
    const c = comidas[ci];
    if (c.items.length > 0 && !confirm(`¿Quitar «${c.nombre || "esta comida"}» con sus alimentos?`)) return;
    setComidas(comidas.filter((_, j) => j !== ci));
    setMenuComida(null);
    tocar();
  }

  /* Copiar una comida a la otra dieta se escribe al momento: esa dieta
   * no está abierta en este editor. Va tal como se ve aquí (aunque haya
   * cambios sin guardar), al final de la otra dieta. */
  async function copiarComidaAOtraDieta(ci: number) {
    if (!otraDieta) return;
    const c = comidas[ci];
    setCopiandoComida(true);
    setAvisoComida("");
    const supabase = crearClienteNavegador();
    const { count } = await supabase
      .from("dieta_comidas")
      .select("id", { count: "exact", head: true })
      .eq("dieta_id", otraDieta.id);
    const { data: nueva, error: e1 } = await supabase
      .from("dieta_comidas")
      .insert({
        dieta_id: otraDieta.id,
        orden: count ?? 99,
        nombre: c.nombre.trim() || "Comida",
        descripcion_libre: c.notas.trim() || null,
        nombre_b: c.itemsB ? c.nombreB.trim() || null : null,
      })
      .select("id")
      .single();
    let fallo = !!e1 || !nueva;
    const filasCopia = nueva ? filasAlimentos(nueva.id, c) : [];
    if (!fallo && filasCopia.length > 0) {
      const { error: e2 } = await supabase.from("dieta_comida_alimentos").insert(filasCopia);
      fallo = !!e2;
    }
    setCopiandoComida(false);
    setMenuComida(null);
    setAvisoComida(
      fallo
        ? "No se pudo copiar la comida. Inténtalo de nuevo."
        : `«${c.nombre || "Comida"}» copiada a la dieta de ${otraDieta.tipo === "descanso" ? "descanso" : "entreno"}.`
    );
    router.refresh();
  }

  function tocar() {
    setSucio(true);
    setOk(false);
  }

  /* Crear dieta con IA: el borrador entra en el editor sin guardar */
  const [iaAbierta, setIaAbierta] = useState(false);
  function usarBorradorIA(b: BorradorDietaIA) {
    const porId = new Map(alimentos.map((a) => [a.id, a]));
    const aUI = (l: { alimentoId: string; gramos: number }[]) =>
      l
        .filter((i) => porId.has(i.alimentoId))
        .map((i) => ({ alimento: porId.get(i.alimentoId)!, gramos: String(i.gramos) }));
    setComidas(
      b.comidas.map((c) => ({
        nombre: c.nombre,
        notas: "",
        items: aUI(c.items),
        itemsB: c.itemsB ? aUI(c.itemsB) : null,
        nombreB: c.nombreB,
      }))
    );
    setOpcionVista({});
    setIaAbierta(false);
    setAvisoComida("Borrador de la IA en el editor: revísalo y dale a guardar.");
    tocar();
  }

  /** Filas de alimentos de una comida para guardar: la A con opcion 0 y
   * la B (si la tiene) con opcion 1. */
  function filasAlimentos(comidaId: string, c: ComidaUI) {
    const fila = (it: ItemUI, j: number, opcion: 0 | 1) => ({
      comida_id: comidaId,
      alimento_id: it.alimento.id,
      gramos: Number(it.gramos.replace(",", ".")) || 0,
      orden: j,
      opcion,
    });
    return [
      ...c.items.map((it, j) => fila(it, j, 0)),
      ...(c.itemsB ?? []).map((it, j) => fila(it, j, 1)),
    ];
  }

  /** Crea la opción B partiendo de una copia de la A (lo normal es
   * cambiar dos o tres alimentos, no empezar de cero). */
  function anadirOpcionB(ci: number) {
    setComidas(comidas.map((x, j) => (j === ci ? { ...x, itemsB: x.items.map((it) => ({ ...it })), nombreB: "" } : x)));
    setOpcionVista({ ...opcionVista, [ci]: 1 });
    setMenuComida(null);
    tocar();
  }

  function quitarOpcionB(ci: number) {
    if (!confirm("¿Quitar la opción B de esta comida?")) return;
    setComidas(comidas.map((x, j) => (j === ci ? { ...x, itemsB: null, nombreB: "" } : x)));
    setOpcionVista({ ...opcionVista, [ci]: 0 });
    setMenuComida(null);
    tocar();
  }

  /* --- Generador automático: solo alimentos que le gustan al cliente y ya categorizados --- */
  const excluidosSet = useMemo(() => new Set(excluidos ?? []), [excluidos]);
  const alimentosPermitidos = useMemo(
    () => alimentos.filter((a) => a.categoria && !excluidosSet.has(a.id)),
    [alimentos, excluidosSet]
  );

  const MENSAJE_SIN_ALIMENTOS =
    "Al cliente le faltan alimentos variados entre los que le gustan (hace falta al menos una proteína, un carbohidrato y una grasa). Añade más en Mi dieta o hazlo manualmente.";

  function generarAutomatico(ci: number) {
    const c = comidas[ci];
    const actuales = opcionDe(ci) === 1 && c.itemsB ? c.itemsB : c.items;
    if (
      actuales.length > 0 &&
      !confirm(`Esto sustituye los alimentos actuales de «${c.nombre || "esta comida"}». ¿Continuar?`)
    )
      return;

    const nombreComida = c.nombre.trim() || COMIDAS_SUGERIDAS[ci % COMIDAS_SUGERIDAS.length];
    const objetivo = objetivoPorComida({ kcal, prot, carb, gras }, nombreComida);
    const resultado = generarComida(objetivo, alimentosPermitidos);

    if (!resultado) {
      setAvisoGeneracion((prev) => ({ ...prev, [ci]: MENSAJE_SIN_ALIMENTOS }));
      return;
    }

    cambiarItems(ci, () =>
      resultado.items.map((it) => ({
        alimento: it.alimento,
        gramos: String(it.gramos),
      }))
    );
    setAvisoGeneracion((prev) => ({ ...prev, [ci]: resultado.aviso ?? "" }));
    tocar();
  }

  /** Genera de golpe todas las comidas del día (crea las 6 habituales si no hay ninguna). */
  function generarDiaCompleto() {
    const hayAlgo = comidas.some((c) => c.items.length > 0);
    if (hayAlgo && !confirm("Esto sustituye los alimentos de TODAS las comidas del día. ¿Continuar?"))
      return;

    const base: ComidaUI[] =
      comidas.length > 0
        ? comidas
        : COMIDAS_SUGERIDAS.map((nombre) => ({ nombre, notas: "", items: [], itemsB: null, nombreB: "" }));

    const avisos: Record<number, string> = {};
    const nuevas = base.map((c, i) => {
      const nombreComida = c.nombre.trim() || COMIDAS_SUGERIDAS[i % COMIDAS_SUGERIDAS.length];
      const objetivo = objetivoPorComida({ kcal, prot, carb, gras }, nombreComida);
      const resultado = generarComida(objetivo, alimentosPermitidos);
      if (!resultado) {
        avisos[i] = MENSAJE_SIN_ALIMENTOS;
        return c;
      }
      if (resultado.aviso) avisos[i] = resultado.aviso;
      return {
        ...c,
        items: resultado.items.map((it) => ({
          alimento: it.alimento,
          gramos: String(it.gramos),
        })),
      };
    });

    setComidas(nuevas);
    setAvisoGeneracion(avisos);
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
      .insert({ cliente_id: clienteId, activa: true, tipo: tipoDieta });
    setGuardando(false);
    if (error) {
      setError("No se pudo crear la dieta. Inténtalo de nuevo.");
      return;
    }
    router.refresh();
  }

  /* --- Crear la dieta de descanso copiando la de entreno (−N g hidratos) --- */
  async function crearDescansoDesdeEntreno() {
    if (!clienteId) return;
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase.rpc("crear_dieta_descanso", {
      p_cliente: clienteId,
      p_reduccion: reduccion,
    });
    setGuardando(false);
    if (error) {
      setError("No se pudo crear la dieta de descanso. Inténtalo de nuevo.");
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
          nombre_b: c.itemsB ? c.nombreB.trim() || null : null,
        })
        .select("id")
        .single();
      if (e3 || !fila) {
        fallo = true;
        break;
      }
      const filas = filasAlimentos(fila.id, c);
      if (filas.length > 0) {
        const { error: e4 } = await supabase.from("dieta_comida_alimentos").insert(filas);
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
    if (clienteId) avisarCambio(clienteId, "dieta");
    router.refresh();
  }

  if (!dieta) {
    if (tipoDieta === "descanso") {
      return (
        <section className="tarjeta">
          <div className="text-atenuado text-[13.5px] mb-3">
            Sin dieta de descanso todavía. Los días sin entreno se gasta menos:
            lo habitual es la misma dieta con menos hidratos.
          </div>
          {puedeCopiarDeEntreno && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13.5px] text-texto-2">
                  Hidratos a recortar
                </span>
                <select
                  className="input !mb-0 !w-auto"
                  value={reduccion}
                  onChange={(e) => setReduccion(Number(e.target.value))}
                >
                  <option value={50}>−50 g (−200 kcal)</option>
                  <option value={75}>−75 g (−300 kcal)</option>
                  <option value={100}>−100 g (−400 kcal)</option>
                </select>
              </div>
              <button
                className="cta"
                onClick={crearDescansoDesdeEntreno}
                disabled={guardando}
              >
                {guardando
                  ? "Creando…"
                  : `Copiar la dieta de entreno con −${reduccion} g de hidratos`}
              </button>
              <p className="text-atenuado text-[12px] -mt-2 mb-3">
                Recorta los gramos de los alimentos tipo carbohidrato (arroz,
                pasta, pan…) proporcionalmente. Después puedes ajustar lo que
                quieras a mano.
              </p>
            </>
          )}
          {error && <div className="text-peligro text-[13.5px] mb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}
          <button className="ghost w-full" onClick={crearDieta} disabled={guardando}>
            + Crear desde cero
          </button>
        </section>
      );
    }
    return (
      <section className="tarjeta">
        <div className="text-atenuado text-[13.5px] mb-3">
          Sin dieta asignada todavía.{clienteId ? " Créala desde cero y rellénala con «Crear dieta con IA», o usa una plantilla." : ""}
        </div>
        {clienteId && plantillas && (
          <AsignarPlantilla tipo="dieta" plantillas={plantillas} clienteId={clienteId} />
        )}
        {error && <div className="text-peligro text-[13.5px] mb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}
        <button className="ghost w-full" onClick={crearDieta} disabled={guardando}>
          {guardando ? "Creando…" : "+ Crear dieta desde cero"}
        </button>
      </section>
    );
  }

  const objetivos: Array<[string, number, (v: number) => void, number, string]> = [
    [INFO_MACRO.proteina.etiqueta, prot, setProt, totalesPlan.prot, INFO_MACRO.proteina.color],
    [INFO_MACRO.carbohidratos.etiqueta, carb, setCarb, totalesPlan.carb, INFO_MACRO.carbohidratos.color],
    [INFO_MACRO.grasas.etiqueta, gras, setGras, totalesPlan.gras, INFO_MACRO.grasas.color],
  ];

  return (
    <>
      {clienteId && (
        <button
          className="w-full flex items-center justify-center gap-2 bg-panel border border-morado/50 text-morado rounded-[12px] py-3 font-semibold text-[14px] cursor-pointer mb-2.5"
          onClick={() => setIaAbierta(true)}
        >
          <Sparkles size={15} /> Crear dieta con IA
        </button>
      )}
      {iaAbierta && clienteId && (
        <HojaDietaIA
          clienteId={clienteId}
          tipo={tipoDieta}
          objetivos={{ kcal, prot, carb, gras }}
          datos={autoCalculo}
          alimentos={alimentos}
          excluidos={excluidos ?? []}
          hayComidas={comidas.some((c) => c.items.length > 0)}
          onUsar={usarBorradorIA}
          onCerrar={() => setIaAbierta(false)}
        />
      )}
      {autoCalculo && (
        <button
          className="w-full flex items-center justify-center gap-2 bg-panel border border-acento/40 text-acento rounded-[12px] py-3 font-semibold text-[14px] cursor-pointer mb-3.5"
          onClick={autoCalcular}
        >
          <Sparkles size={15} /> Auto-calcular kcal y macros
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

      <button
        className="w-full flex items-center justify-center gap-2 bg-panel border border-acento/40 text-acento rounded-[12px] py-3 font-semibold text-[14px] cursor-pointer mb-3.5"
        onClick={generarDiaCompleto}
      >
        <Sparkles size={15} /> Generar el día completo
      </button>

      {/* Comidas con alimentos estructurados */}
      {comidas.map((c, ci) => {
        const op = opcionDe(ci);
        const lista = op === 1 && c.itemsB ? c.itemsB : c.items;
        const totalesDe = (items: ItemUI[]) =>
          sumar(items.map((i) => macrosDe(i.alimento, Number(i.gramos.replace(",", ".")) || 0)));
        const totalesA = totalesDe(c.items);
        const totales = totalesDe(lista);
        /* La B tiene que parecerse a la A: si se separa más de un 10 %
         * en kcal, el día deja de cuadrar cuando la elige */
        const totalesB = c.itemsB ? totalesDe(c.itemsB) : null;
        const difB =
          totalesB && totalesA.kcal > 0 ? Math.round(((totalesB.kcal - totalesA.kcal) / totalesA.kcal) * 100) : 0;
        const sugerido = COMIDAS_SUGERIDAS[ci % COMIDAS_SUGERIDAS.length];
        const { Icono, color, foto } = infoComida(c.nombre.trim() || sugerido);
        const velo = `color-mix(in srgb, ${color} 13%, var(--color-panel))`;
        return (
          <section className="tarjeta !p-0 overflow-hidden" key={ci}>
            {/* Misma cabecera que ve el cliente: velo del color de la
              * comida, su icono y la foto entrando por la derecha. Antes
              * era un campo de texto gris igual en todas, y con cinco
              * comidas seguidas no se veía dónde empezaba cada una. El
              * nombre sigue siendo editable: es el mismo campo, sin caja. */}
            <div
              className="relative overflow-hidden flex items-center gap-3 px-4 pt-3.5 pb-3 border-b border-borde"
              style={{ background: velo }}
            >
              {foto && (
                <>
                  <span
                    aria-hidden
                    className="absolute inset-y-0 right-0 w-[50%] pointer-events-none"
                    style={{
                      backgroundImage: `url(${foto})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center right",
                    }}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `linear-gradient(90deg, ${velo} 0%, ${velo} 48%, color-mix(in srgb, ${velo} 60%, transparent) 72%, color-mix(in srgb, ${velo} 45%, transparent) 100%)`,
                    }}
                  />
                </>
              )}
              <span className="relative shrink-0">
                <IconoTarjeta Icono={Icono} color={color} tamano={36} />
              </span>
              <div className="relative flex-1 min-w-0">
                <input
                  className="w-full bg-transparent border-0 border-b border-dashed border-transparent focus:border-borde-2 outline-none font-bold text-[15.5px] leading-tight text-white placeholder:text-atenuado py-0.5"
                  placeholder={sugerido}
                  value={c.nombre}
                  onChange={(e) => {
                    setComidas(comidas.map((x, j) => (j === ci ? { ...x, nombre: e.target.value } : x)));
                    tocar();
                  }}
                  aria-label="Nombre de la comida"
                />
                <div className="text-atenuado text-[11.5px]">
                  {c.items.length === 0
                    ? "Sin alimentos"
                    : `${c.items.length} ${c.items.length === 1 ? "alimento" : "alimentos"}`}
                  {c.itemsB && " · con opción B"}
                </div>
              </div>
              {c.items.length > 0 && (
                <span
                  className="relative shrink-0 text-[12px] font-bold rounded-full px-2.5 py-1"
                  title="Kcal de la opción A"
                  style={{
                    color,
                    background: `color-mix(in srgb, ${color} 14%, ${foto ? "var(--color-fondo)" : "transparent"})`,
                  }}
                >
                  {r(totalesA.kcal)} kcal
                </span>
              )}
              <button
                className="mini shrink-0 relative !text-acento"
                onClick={() => setMenuComida(ci)}
                aria-label={`Opciones de ${c.nombre || "esta comida"}`}
              >
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="px-4 pt-2 pb-4">

            {c.itemsB && (
              <>
                <div className="flex gap-2 mt-1 mb-2">
                  {([0, 1] as const).map((o) => (
                    <button
                      key={o}
                      className={`tab !text-[13px] ${op === o ? "tab-activa" : ""}`}
                      onClick={() => setOpcionVista({ ...opcionVista, [ci]: o })}
                    >
                      {o === 0 ? "Opción A" : "Opción B"}
                    </button>
                  ))}
                </div>
                {op === 1 && (
                  <input
                    className="input !mb-2 !text-[13.5px]"
                    placeholder="Nombre de la opción B (p. ej. Avena)"
                    value={c.nombreB}
                    onChange={(e) => {
                      setComidas(comidas.map((x, j) => (j === ci ? { ...x, nombreB: e.target.value } : x)));
                      tocar();
                    }}
                  />
                )}
                {Math.abs(difB) > 10 && (
                  <div className="text-aviso text-[12px] font-semibold mb-1.5">
                    La B tiene un {Math.abs(difB)} % {difB > 0 ? "más" : "menos"} de kcal que la A ({r(totalesB!.kcal)} vs{" "}
                    {r(totalesA.kcal)}).
                  </div>
                )}
              </>
            )}

            {lista.map((it, ii) => {
              const m = macrosDe(it.alimento, Number(it.gramos.replace(",", ".")) || 0);
              return (
                <div
                  key={ii}
                  className="flex items-center gap-2 py-1.5 border-b border-borde last:border-0"
                >
                  <span className="flex-1 min-w-0 text-[13.5px] leading-tight break-words">{it.alimento.nombre}</span>
                  <input
                    className="campo-serie !w-[64px] shrink-0"
                    inputMode="decimal"
                    value={it.gramos}
                    onChange={(e) => {
                      cambiarItems(ci, (items) =>
                        items.map((y, k) => (k === ii ? { ...y, gramos: e.target.value } : y))
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
                      cambiarItems(ci, (items) => items.filter((_, k) => k !== ii));
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
              <Sparkles size={14} /> Generar automáticamente
            </button>
            {avisoGeneracion[ci] && (
              <div className="text-aviso text-[12px] mt-1.5">{avisoGeneracion[ci]}</div>
            )}

            <button
              className="w-full bg-transparent border border-dashed border-[#2A333B] text-atenuado rounded-[10px] py-2 text-[13px] cursor-pointer mt-2"
              onClick={() => setBuscandoPara(ci)}
            >
              + Añadir alimento
            </button>

            {lista.length > 0 && (
              <div className="flex justify-between text-[12.5px] text-atenuado mt-2 pt-2 border-t border-borde">
                <span className="font-bold text-texto-2">{c.itemsB ? `Total ${op === 1 ? "B" : "A"}` : "Total"}</span>
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
            </div>
          </section>
        );
      })}

      {avisoComida && (
        <div
          className={`banner mb-3 ${avisoComida.startsWith("No se pudo") ? "banner-peligro" : "banner-accion"}`}
        >
          {avisoComida}
        </div>
      )}

      {menuComida !== null && comidas[menuComida] && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center anim-fondo-aparece"
          onClick={() => setMenuComida(null)}
        >
          <div
            className="w-full max-w-[480px] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] pb-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="titulo-seccion !mb-0 break-words min-w-0">
                {comidas[menuComida].nombre ||
                  COMIDAS_SUGERIDAS[menuComida % COMIDAS_SUGERIDAS.length]}
              </div>
              <button className="ghost shrink-0" onClick={() => setMenuComida(null)}>
                Cerrar
              </button>
            </div>
            {(
              [
                [ArrowUp, "Subir", () => moverComida(menuComida, -1), menuComida === 0],
                [ArrowDown, "Bajar", () => moverComida(menuComida, 1), menuComida === comidas.length - 1],
                [CopyPlus, "Duplicar comida", () => duplicarComida(menuComida), false],
              ] as const
            ).map(([Icono, texto, accion, desactivado]) => (
              <button
                key={texto}
                className="fila w-full text-left cursor-pointer disabled:opacity-35"
                onClick={accion}
                disabled={desactivado}
              >
                <Icono size={17} className="text-acento shrink-0" />
                <span className="flex-1 text-[14px]">{texto}</span>
              </button>
            ))}
            {comidas[menuComida].itemsB ? (
              <button className="fila w-full text-left cursor-pointer" onClick={() => quitarOpcionB(menuComida)}>
                <Split size={17} className="text-acento shrink-0" />
                <span className="flex-1 text-[14px]">Quitar la opción B</span>
              </button>
            ) : (
              <button className="fila w-full text-left cursor-pointer" onClick={() => anadirOpcionB(menuComida)}>
                <Split size={17} className="text-acento shrink-0" />
                <span className="flex-1 text-[14px]">
                  Añadir opción B
                  <span className="block text-atenuado text-[12px]">Otra versión de esta comida, con los mismos macros</span>
                </span>
              </button>
            )}
            {otraDieta && (
              <button
                className="fila w-full text-left cursor-pointer"
                onClick={() => copiarComidaAOtraDieta(menuComida)}
                disabled={copiandoComida}
              >
                <Copy size={17} className="text-acento shrink-0" />
                <span className="flex-1 text-[14px]">
                  {copiandoComida
                    ? "Copiando…"
                    : `Copiar a la dieta de ${otraDieta.tipo === "descanso" ? "descanso" : "entreno"}`}
                </span>
              </button>
            )}
            <button
              className="fila w-full text-left cursor-pointer"
              onClick={() => quitarComida(menuComida)}
            >
              <X size={17} className="text-peligro shrink-0" />
              <span className="flex-1 text-[14px] text-peligro">Quitar comida</span>
            </button>
            <p className="text-atenuado text-[12px] mt-2">
              Mover, duplicar y quitar se guardan con «Guardar dieta».
            </p>
          </div>
        </div>
      )}

      <button
        className="w-full bg-transparent border border-dashed border-[#2A333B] text-atenuado rounded-[10px] py-2.5 text-[13.5px] cursor-pointer mb-3"
        onClick={() => {
          setComidas([
            ...comidas,
            { nombre: COMIDAS_SUGERIDAS[comidas.length] ?? "", notas: "", items: [], itemsB: null, nombreB: "" },
          ]);
          tocar();
        }}
      >
        + Añadir comida
      </button>

      {error && <div className="text-peligro text-[13.5px] mb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}
      <button className="cta" onClick={guardar} disabled={guardando || !sucio}>
        {ok ? "Guardado ✓" : guardando ? "Guardando…" : "Guardar dieta"}
      </button>

      {/* Hoja de búsqueda de alimentos */}
      {buscandoPara !== null && (
        <HojaAlimentos
          alimentos={alimentos}
          excluidos={excluidos}
          onElegir={(alimento) => {
            cambiarItems(buscandoPara, (items) => [...items, { alimento, gramos: "100" }]);
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
