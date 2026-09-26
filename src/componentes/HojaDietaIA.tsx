"use client";

import { useState } from "react";
import { AlertCircle, Check, RefreshCw, Sparkles, X } from "lucide-react";
import type { Alimento } from "@/lib/dietas";
import type { DatosAutoCalculo } from "@/lib/macros";
import type { BorradorDietaIA } from "@/lib/iaTipos";

const PASOS = ["Mirando sus datos…", "Eligiendo alimentos de tu catálogo…", "Cuadrando los macros…", "Casi está…"];

function edad(fecha: string | null): number | null {
  if (!fecha) return null;
  const n = new Date(fecha);
  const hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), n.getMonth(), n.getDate())) e--;
  return e;
}

/**
 * Crear dieta con IA: con sus datos, sus objetivos de macros y lo que tú
 * le cuentes, la IA monta el borrador con tus alimentos. "Usar" lo pone
 * en el editor (sin guardar): lo revisas y lo guardas tú.
 */
export default function HojaDietaIA({
  clienteId,
  tipo,
  objetivos,
  datos,
  alimentos,
  excluidos,
  hayComidas,
  onUsar,
  onCerrar,
}: {
  clienteId: string;
  tipo: "entreno" | "descanso";
  objetivos: { kcal: number; prot: number; carb: number; gras: number };
  datos?: DatosAutoCalculo;
  alimentos: Alimento[];
  excluidos: string[];
  hayComidas: boolean;
  onUsar: (b: BorradorDietaIA) => void;
  onCerrar: () => void;
}) {
  const [notas, setNotas] = useState("");
  const [nComidas, setNComidas] = useState(4);
  const [opcionB, setOpcionB] = useState(true);
  const [creando, setCreando] = useState(false);
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState("");
  const [borrador, setBorrador] = useState<BorradorDietaIA | null>(null);

  const porId = new Map(alimentos.map((a) => [a.id, a]));
  const noCome = excluidos.map((id) => porId.get(id)?.nombre).filter((x): x is string => !!x);
  const anos = edad(datos?.fechaNacimiento ?? null);
  const chips = [
    [datos?.sexo && datos.sexo !== "otro" ? (datos.sexo === "mujer" ? "Mujer" : "Hombre") : null, anos ? `${anos} años` : null]
      .filter(Boolean)
      .join(" · "),
    [datos?.pesoKg ? `${String(datos.pesoKg).replace(".", ",")} kg` : null, datos?.alturaCm ? `${datos.alturaCm} cm` : null]
      .filter(Boolean)
      .join(" · "),
    datos?.objetivo ?? "",
    `${Math.round(objetivos.kcal).toLocaleString("es-ES")} kcal · P ${Math.round(objetivos.prot)} · H ${Math.round(objetivos.carb)} · G ${Math.round(objetivos.gras)}`,
    noCome.length ? `No come: ${noCome.slice(0, 4).join(", ")}${noCome.length > 4 ? "…" : ""}` : "",
  ].filter(Boolean);

  async function crear() {
    setCreando(true);
    setError("");
    setPaso(0);
    const t = setInterval(() => setPaso((p) => Math.min(p + 1, PASOS.length - 1)), 9000);
    try {
      const r = await fetch("/api/ia/dieta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId, tipo, objetivos, comidas: nComidas, opcionB, notas }),
      });
      const d = (await r.json()) as BorradorDietaIA & { error?: string };
      if (!r.ok) throw new Error(d.error);
      setBorrador(d);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No se ha podido crear. Prueba otra vez.");
    } finally {
      clearInterval(t);
      setCreando(false);
    }
  }

  const nombre = (id: string) => porId.get(id)?.nombre ?? "¿?";

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
      onClick={() => !creando && onCerrar()}
    >
      <div
        className="w-full max-w-[560px] max-h-[90dvh] overflow-y-auto bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] anim-hoja-sube"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[16px]">{borrador ? "Borrador de dieta" : "Crear dieta con IA"}</div>
            <div className="text-atenuado text-[12.5px] break-words">
              {borrador
                ? `${borrador.totales.kcal.toLocaleString("es-ES")} kcal · P ${borrador.totales.prot} · H ${borrador.totales.carb} · G ${borrador.totales.gras} (objetivo ${Math.round(objetivos.kcal).toLocaleString("es-ES")})`
                : "Con tus alimentos y tus cantidades. Luego la revisas."}
            </div>
          </div>
          <button className="ghost shrink-0 !px-2" onClick={onCerrar} disabled={creando} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {borrador ? (
          <>
            {borrador.comidas.map((c, k) => (
              <div key={k} className="tarjeta !p-3 !mb-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="titulo-tarjeta !mb-0 min-w-0 break-words">{c.nombre}</div>
                  {c.itemsB && <span className="text-atenuado text-[11.5px] shrink-0">+ opción B</span>}
                </div>
                <div className="text-[13.5px] text-texto-2 leading-snug break-words">
                  {c.items.map((i) => `${nombre(i.alimentoId)} ${i.gramos} g`).join(" · ")}
                </div>
                {c.itemsB && (
                  <div className="text-[12.5px] text-atenuado leading-snug break-words mt-1">
                    B{c.nombreB ? ` (${c.nombreB})` : ""}: {c.itemsB.map((i) => `${nombre(i.alimentoId)} ${i.gramos} g`).join(" · ")}
                  </div>
                )}
              </div>
            ))}
            {borrador.explicacion && (
              <div className="text-atenuado text-[12.5px] mb-3 leading-snug break-words">{borrador.explicacion}</div>
            )}
            {hayComidas && (
              <div className="text-aviso text-[12.5px] mb-2 leading-snug">
                Sustituye las comidas que tiene ahora en el editor. Hasta que guardes, no cambia nada.
              </div>
            )}
            <button className="cta flex items-center justify-center gap-2" onClick={() => onUsar(borrador)}>
              <Check size={16} /> Usar y editar en el editor
            </button>
            <button className="ghost w-full flex items-center justify-center gap-1.5" onClick={() => setBorrador(null)}>
              <RefreshCw size={14} /> Cambiar algo y hacer otra
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {chips.map((t) => (
                <span key={t} className="chip !text-[12.5px] !py-1 !cursor-default">
                  {t}
                </span>
              ))}
            </div>
            <div className="text-[12.5px] text-atenuado mb-1">Algo más que deba saber</div>
            <textarea
              className="w-full bg-campo border border-borde-2 rounded-[12px] text-white p-3 text-[14px] leading-snug resize-none font-cuerpo mb-3 focus:outline-none focus:border-acento"
              rows={4}
              maxLength={1500}
              placeholder="Horarios, a qué hora entrena, qué le gusta, qué no le sienta bien…"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={creando}
            />
            <div className="text-[12.5px] text-atenuado mb-1.5">Comidas al día</div>
            <div className="flex gap-1.5 mb-4">
              {[3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  className={`chip ${nComidas === n ? "chip-activo" : ""} !px-4`}
                  onClick={() => setNComidas(n)}
                  disabled={creando}
                >
                  {n}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[13.5px] text-texto-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[var(--color-acento)]"
                checked={opcionB}
                onChange={(e) => setOpcionB(e.target.checked)}
                disabled={creando}
              />
              Con opción B en cada comida
            </label>
            {error && (
              <div className="text-peligro text-[13px] mb-2 flex items-start gap-1.5">
                <AlertCircle size={14} className="shrink-0 mt-[3px]" />
                <span className="min-w-0">{error}</span>
              </div>
            )}
            <button className="cta flex items-center justify-center gap-2 !mb-1" onClick={crear} disabled={creando}>
              <Sparkles size={16} /> {creando ? PASOS[paso] : "Crear dieta"}
            </button>
            <div className="text-atenuado text-[11.5px] text-center">
              {creando ? "Tarda unos 30-60 segundos: no cierres esta hoja." : "Cuesta unos céntimos de tu saldo de IA."}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
