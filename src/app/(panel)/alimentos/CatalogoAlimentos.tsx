"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { r, r1, type Alimento, type Alternativa } from "@/lib/dietas";

interface AlternativaUI {
  nombre: string;
  gramos: string;
}

/** Catálogo de alimentos: lista + búsqueda, cada uno con sus alternativas
 * (equivalencias) editables desde una hoja inferior. Antes solo se podían
 * tocar entrando a mano en la tabla de Supabase. */
export default function CatalogoAlimentos({
  alimentos,
  alternativas,
}: {
  alimentos: Alimento[];
  alternativas: Alternativa[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [porAlimento, setPorAlimento] = useState<Record<string, AlternativaUI[]>>(() => {
    const mapa: Record<string, AlternativaUI[]> = {};
    for (const a of alternativas) {
      const lista = mapa[a.alimento_id] ?? [];
      lista.push({ nombre: a.nombre, gramos: String(a.gramos) });
      mapa[a.alimento_id] = lista;
    }
    return mapa;
  });
  const [editando, setEditando] = useState<Alimento | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return q ? alimentos.filter((a) => a.nombre.toLowerCase().includes(q)) : alimentos;
  }, [alimentos, busqueda]);

  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <Link href="/ajustes" className="mini shrink-0" aria-label="Volver a Ajustes">
          <ArrowLeft size={14} />
        </Link>
        <h1 className="h1 !mb-0">Alimentos</h1>
      </div>
      <div className="sub mb-4">catálogo y alternativas —</div>

      <input
        className="input"
        placeholder="Buscar alimento…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {filtrados.map((a) => {
        const alts = porAlimento[a.id] ?? [];
        return (
          <div key={a.id} className="fila">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[14.5px] truncate">{a.nombre}</div>
              <div className="text-atenuado text-[12px] truncate">
                {r(a.kcal_100)} kcal · P{r1(a.prot_100)} C{r1(a.carb_100)} G{r1(a.gras_100)} /100g
                {" · "}
                {alts.length === 0
                  ? "sin alternativas"
                  : `${alts.length} ${alts.length === 1 ? "alternativa" : "alternativas"}`}
              </div>
            </div>
            <button
              className="mini shrink-0"
              onClick={() => setEditando(a)}
              aria-label={`Editar alternativas de ${a.nombre}`}
            >
              <Pencil size={14} />
            </button>
          </div>
        );
      })}
      {filtrados.length === 0 && (
        <div className="text-atenuado text-[13.5px] p-3">Sin resultados con ese nombre.</div>
      )}

      {editando && (
        <HojaAlternativas
          alimento={editando}
          alternativas={porAlimento[editando.id] ?? []}
          onGuardado={(lista) => {
            setPorAlimento((prev) => ({ ...prev, [editando.id]: lista }));
            setEditando(null);
          }}
          onCerrar={() => setEditando(null)}
        />
      )}
    </>
  );
}

/* ============================================================
   Hoja inferior: alternativas (equivalencias) de un alimento
   ============================================================ */
function HojaAlternativas({
  alimento,
  alternativas,
  onGuardado,
  onCerrar,
}: {
  alimento: Alimento;
  alternativas: AlternativaUI[];
  onGuardado: (lista: AlternativaUI[]) => void;
  onCerrar: () => void;
}) {
  const [lista, setLista] = useState<AlternativaUI[]>(
    alternativas.length > 0 ? alternativas : []
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();

    const validas = lista
      .map((l) => ({ nombre: l.nombre.trim(), gramos: Number(l.gramos.replace(",", ".")) }))
      .filter((l) => l.nombre !== "" && l.gramos > 0);

    const { error: e1 } = await supabase
      .from("alimento_alternativas")
      .delete()
      .eq("alimento_id", alimento.id);

    let fallo = !!e1;
    if (!fallo && validas.length > 0) {
      const { error: e2 } = await supabase.from("alimento_alternativas").insert(
        validas.map((v, i) => ({
          alimento_id: alimento.id,
          nombre: v.nombre,
          gramos: v.gramos,
          orden: i,
        }))
      );
      fallo = !!e2;
    }

    setGuardando(false);
    if (fallo) {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      return;
    }
    onGuardado(validas.map((v) => ({ nombre: v.nombre, gramos: String(v.gramos) })));
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 flex items-end justify-center"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[480px] max-h-[82vh] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-1">
          <div className="titulo-tarjeta !m-0">ALTERNATIVAS DE {alimento.nombre.toUpperCase()}</div>
          <button className="ghost" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        <p className="text-atenuado text-[12px] mb-3">
          100 g de {alimento.nombre.toLowerCase()} ≈ estos gramos de cada alternativa.
        </p>

        {lista.map((l, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-borde last:border-0">
            <input
              className="input !mb-0 flex-1"
              placeholder="Nombre de la alternativa"
              value={l.nombre}
              onChange={(e) =>
                setLista(lista.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))
              }
            />
            <input
              className="campo-serie !w-[72px] shrink-0"
              inputMode="decimal"
              placeholder="g"
              value={l.gramos}
              onChange={(e) =>
                setLista(lista.map((x, j) => (j === i ? { ...x, gramos: e.target.value } : x)))
              }
              aria-label={`Gramos equivalentes de ${l.nombre || "alternativa"}`}
            />
            <button
              className="mini mini-peligro shrink-0"
              onClick={() => setLista(lista.filter((_, j) => j !== i))}
              aria-label="Quitar alternativa"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          className="w-full bg-transparent border border-dashed border-[#2A333B] text-atenuado rounded-[10px] py-2 text-[13px] cursor-pointer mt-2 mb-3"
          onClick={() => setLista([...lista, { nombre: "", gramos: "" }])}
        >
          + Añadir alternativa
        </button>

        {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}
        <button className="cta !mb-0" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar alternativas"}
        </button>
      </div>
    </div>
  );
}
