"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, ChevronRight, Minus, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { avisarCambio } from "@/lib/avisos";
import { GRUPOS_MUSCULARES } from "@/lib/tipos";
import type { BorradorRutinaIA } from "@/lib/iaTipos";

const DIVISIONES = ["Torso / Pierna", "Empuje / Tirón / Pierna", "Cuerpo completo", "Que decida la IA"];
const MATERIAL = ["Máquinas", "Poleas", "Mancuernas", "Barra", "Multipower"];
const PASOS = ["Mirando su historial…", "Eligiendo ejercicios de tu biblioteca…", "Pautando a tu estilo…", "Casi está…"];

/* Toque: normal → priorizar → poco volumen → normal */
type Peso = "mas" | "menos";

/**
 * Crear rutina con IA (opcional: la rutina a mano y las plantillas siguen
 * igual). La IA devuelve un borrador; al usarlo se crea la rutina con sus
 * semanas, pasa a ser la activa y la anterior queda guardada sin activar.
 */
export default function RutinaConIA({
  clienteId,
  nombreCliente,
  rutinaActivaId,
}: {
  clienteId: string;
  nombreCliente: string;
  rutinaActivaId: string | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [dias, setDias] = useState(4);
  const [division, setDivision] = useState(DIVISIONES[0]);
  const [musculos, setMusculos] = useState<Record<string, Peso>>({});
  const [material, setMaterial] = useState<string[]>(MATERIAL.slice(0, 4));
  const [semanas, setSemanas] = useState(12);
  const [notas, setNotas] = useState("");
  const [creando, setCreando] = useState(false);
  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [borrador, setBorrador] = useState<BorradorRutinaIA | null>(null);
  const pila = nombreCliente.split(" ")[0];
  const ocupado = creando || guardando;

  function tocarMusculo(g: string) {
    setMusculos((m) => {
      const sig: Peso | undefined = m[g] === undefined ? "mas" : m[g] === "mas" ? "menos" : undefined;
      const n = { ...m };
      if (sig) n[g] = sig;
      else delete n[g];
      return n;
    });
  }

  async function crear() {
    setCreando(true);
    setError("");
    setPaso(0);
    const t = setInterval(() => setPaso((p) => Math.min(p + 1, PASOS.length - 1)), 9000);
    try {
      const r = await fetch("/api/ia/rutina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId,
          dias,
          division: division === "Que decida la IA" ? "" : division,
          mas: Object.keys(musculos).filter((g) => musculos[g] === "mas"),
          menos: Object.keys(musculos).filter((g) => musculos[g] === "menos"),
          material,
          semanas,
          notas,
        }),
      });
      const d = (await r.json()) as BorradorRutinaIA & { error?: string };
      if (!r.ok || !d.dias) throw new Error(d.error);
      setBorrador(d);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No se ha podido crear. Prueba otra vez.");
    } finally {
      clearInterval(t);
      setCreando(false);
    }
  }

  /* Tres inserciones (días, ejercicios, series) para todas las semanas.
   * Postgres devuelve las filas en el orden en que se insertaron. */
  async function usar() {
    if (!borrador) return;
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { data: rut, error: e0 } = await supabase
      .from("rutinas")
      .insert({ cliente_id: clienteId, nombre: `Rutina de ${pila}`, es_plantilla: false, activa: false, semana_actual: 1 })
      .select("id")
      .single();
    const deshacer = async (msg: string) => {
      if (rut) await supabase.from("rutinas").delete().eq("id", rut.id);
      setError(msg);
      setGuardando(false);
    };
    if (e0 || !rut) return deshacer("No se ha podido crear la rutina. Inténtalo de nuevo.");

    const filasDias = Array.from({ length: borrador.semanas }, (_, s) =>
      borrador.dias.map((d, i) => ({ rutina_id: rut.id, orden: i, nombre: d.nombre, semana: s + 1 }))
    ).flat();
    const { data: diasNuevos, error: e1 } = await supabase.from("rutina_dias").insert(filasDias).select("id, orden, semana");
    if (e1 || !diasNuevos || diasNuevos.length !== filasDias.length) return deshacer("No se han podido crear los días.");

    const filasEj = diasNuevos.flatMap((dn) =>
      borrador.dias[dn.orden].ejercicios.map((e, k) => ({ dia_id: dn.id, ejercicio_id: e.ejercicioId, orden: k, descanso_seg: 120 }))
    );
    const { data: ejNuevos, error: e2 } = await supabase.from("rutina_ejercicios").insert(filasEj).select("id");
    if (e2 || !ejNuevos || ejNuevos.length !== filasEj.length) return deshacer("No se han podido crear los ejercicios.");

    let k = 0;
    const filasSeries = diasNuevos.flatMap((dn) =>
      borrador.dias[dn.orden].ejercicios.flatMap((e) => {
        const id = ejNuevos[k++].id;
        return e.series.map((s, o) => ({
          rutina_ejercicio_id: id,
          orden: o,
          tipo: "efectiva",
          kg: null,
          reps: s.reps,
          reps_max: s.reps_max > s.reps ? s.reps_max : null,
          rir: s.tecnica ? null : s.rir,
          tecnica: s.tecnica || null,
        }));
      })
    );
    const { error: e3 } = await supabase.from("series_prescritas").insert(filasSeries);
    if (e3) return deshacer("No se han podido crear las series.");

    /* La nueva pasa a ser la activa; la anterior queda guardada */
    if (rutinaActivaId) await supabase.from("rutinas").update({ activa: false }).eq("id", rutinaActivaId);
    const { error: e4 } = await supabase.from("rutinas").update({ activa: true }).eq("id", rut.id);
    if (e4) {
      if (rutinaActivaId) await supabase.from("rutinas").update({ activa: true }).eq("id", rutinaActivaId);
      return deshacer("No se ha podido activar. Inténtalo de nuevo.");
    }
    avisarCambio(clienteId, "rutina");
    setGuardando(false);
    setAbierto(false);
    setBorrador(null);
    router.refresh();
  }

  const maxVol = Math.max(12, ...(borrador?.volumen.map(([, n]) => n) ?? [0]));

  return (
    <>
      <button
        className="w-full flex items-center gap-3 rounded-[12px] px-3.5 py-3 mb-3 text-left cursor-pointer anim-pulsable border bg-panel border-borde"
        onClick={() => setAbierto(true)}
      >
        <Sparkles size={18} className="text-morado shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-semibold">Crear rutina con IA</span>
          <span className="block text-atenuado text-[12px]">Opcional · te prepara un borrador con tus ejercicios</span>
        </span>
        <ChevronRight size={16} className="text-atenuado shrink-0" />
      </button>

      {abierto && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
          onClick={() => !ocupado && setAbierto(false)}
        >
          <div
            className="w-full max-w-[560px] max-h-[90dvh] overflow-y-auto bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] anim-hoja-sube"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[16px]">{borrador ? "Borrador de rutina" : "Crear rutina con IA"}</div>
                <div className="text-atenuado text-[12.5px] break-words">
                  {borrador
                    ? `${borrador.dias.length} días · ${borrador.semanas} semanas · ${borrador.volumen.reduce((a, [, n]) => a + n, 0)} series a la semana`
                    : `Para ${pila} · con tus ejercicios y tu forma de pautar. Luego la revisas.`}
                </div>
              </div>
              <button className="ghost shrink-0 !px-2" onClick={() => setAbierto(false)} disabled={ocupado} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            {borrador ? (
              <>
                {borrador.dias.map((d, i) => (
                  <div key={i} className="tarjeta !p-3 !mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-campo border border-borde-2 text-[11.5px] font-bold grid place-items-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="titulo-tarjeta !mb-0 min-w-0 break-words">{d.nombre}</div>
                    </div>
                    <div className="text-[13px] text-texto-2 leading-snug break-words">
                      {d.ejercicios.map((e) => `${e.nombre} ${e.series.length}`).join(" · ")}
                    </div>
                  </div>
                ))}
                <div className="tarjeta !p-3 !mb-2">
                  <div className="titulo-tarjeta">SERIES A LA SEMANA</div>
                  {borrador.volumen.map(([g, n]) => (
                    <div key={g} className="flex items-center gap-2.5 py-1">
                      <span className="text-[12.5px] w-[96px] shrink-0 break-words">{g}</span>
                      <div className="flex-1 h-2 rounded bg-borde-2 overflow-hidden">
                        <div
                          className={`h-full rounded ${musculos[g] === "mas" ? "bg-verde" : musculos[g] === "menos" ? "bg-aviso" : "bg-acento"}`}
                          style={{ width: `${(n / maxVol) * 100}%` }}
                        />
                      </div>
                      <span className="text-[12.5px] w-6 text-right">{n}</span>
                    </div>
                  ))}
                </div>
                {borrador.explicacion && (
                  <div className="text-atenuado text-[12.5px] mb-3 leading-snug break-words">{borrador.explicacion}</div>
                )}
                {rutinaActivaId && (
                  <div className="text-aviso text-[12.5px] mb-2 leading-snug">
                    Pasa a ser su rutina activa. La que tiene ahora queda guardada, sin activar.
                  </div>
                )}
                {error && (
                  <div className="text-peligro text-[13px] mb-2 flex items-start gap-1.5">
                    <AlertCircle size={14} className="shrink-0 mt-[3px]" />
                    <span className="min-w-0">{error}</span>
                  </div>
                )}
                <button className="cta flex items-center justify-center gap-2" onClick={() => void usar()} disabled={guardando}>
                  <Check size={16} /> {guardando ? "Creando la rutina…" : "Usar y editar en el editor"}
                </button>
                <button
                  className="ghost w-full flex items-center justify-center gap-1.5"
                  onClick={() => setBorrador(null)}
                  disabled={guardando}
                >
                  <RefreshCw size={14} /> Cambiar algo y hacer otra
                </button>
              </>
            ) : (
              <>
                <div className="text-[12.5px] text-atenuado mb-1.5">Días por semana</div>
                <div className="flex gap-1.5 mb-3">
                  {[3, 4, 5, 6].map((n) => (
                    <button key={n} className={`chip !px-4 ${dias === n ? "chip-activo" : ""}`} onClick={() => setDias(n)} disabled={creando}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="text-[12.5px] text-atenuado mb-1.5">División</div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {DIVISIONES.map((d) => (
                    <button key={d} className={`chip !text-[12.5px] ${division === d ? "chip-activo" : ""}`} onClick={() => setDivision(d)} disabled={creando}>
                      {d}
                    </button>
                  ))}
                </div>
                <div className="text-[12.5px] text-atenuado mb-1.5">
                  Músculos <span className="text-[11.5px]">· toca una vez para priorizar, dos para darle poco volumen</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {GRUPOS_MUSCULARES.map((g) => (
                    <button
                      key={g}
                      className={`chip !text-[12.5px] ${
                        musculos[g] === "mas" ? "!border-verde/60 !text-verde" : musculos[g] === "menos" ? "!border-aviso/60 !text-aviso" : ""
                      }`}
                      onClick={() => tocarMusculo(g)}
                      disabled={creando}
                    >
                      {musculos[g] === "mas" && <Plus size={12} className="inline -mt-0.5 mr-0.5" />}
                      {musculos[g] === "menos" && <Minus size={12} className="inline -mt-0.5 mr-0.5" />}
                      {g}
                    </button>
                  ))}
                </div>
                <div className="text-[12.5px] text-atenuado mb-1.5">Material</div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {MATERIAL.map((m) => (
                    <button
                      key={m}
                      className={`chip !text-[12.5px] ${material.includes(m) ? "chip-activo" : ""}`}
                      onClick={() => setMaterial((l) => (l.includes(m) ? l.filter((x) => x !== m) : [...l, m]))}
                      disabled={creando}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="text-[12.5px] text-atenuado mb-1.5">Duración</div>
                <div className="flex gap-1.5 mb-3">
                  {[8, 12, 16].map((n) => (
                    <button key={n} className={`chip !text-[12.5px] ${semanas === n ? "chip-activo" : ""}`} onClick={() => setSemanas(n)} disabled={creando}>
                      {n} sem
                    </button>
                  ))}
                </div>
                <div className="text-[12.5px] text-atenuado mb-1">Algo más que deba saber</div>
                <textarea
                  className="w-full bg-campo border border-borde-2 rounded-[12px] text-white p-3 text-[14px] leading-snug resize-none font-cuerpo mb-3 focus:outline-none focus:border-acento"
                  rows={3}
                  maxLength={1500}
                  placeholder="Molestias, qué le gusta, cuánto tiempo tiene, dónde entrena…"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  disabled={creando}
                />
                {error && (
                  <div className="text-peligro text-[13px] mb-2 flex items-start gap-1.5">
                    <AlertCircle size={14} className="shrink-0 mt-[3px]" />
                    <span className="min-w-0">{error}</span>
                  </div>
                )}
                <button className="cta flex items-center justify-center gap-2 !mb-1" onClick={() => void crear()} disabled={creando}>
                  <Sparkles size={16} /> {creando ? PASOS[paso] : "Crear rutina"}
                </button>
                <div className="text-atenuado text-[11.5px] text-center">
                  {creando ? "Tarda unos 30-60 segundos: no cierres esta hoja." : "Cuesta unos céntimos de tu saldo de IA."}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
