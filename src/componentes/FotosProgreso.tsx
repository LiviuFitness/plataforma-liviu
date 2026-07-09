"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { redimensionarImagen } from "@/lib/imagen";
import GaleriaFotosProgreso from "@/componentes/GaleriaFotosProgreso";
import type { EntradaFotosProgreso } from "@/lib/tipos";

const TAMANO_MAX = 1080;

const SLOTS = [
  { tipo: "frontal", campo: "foto_frontal_url", etiqueta: "Frontal" },
  { tipo: "lateral", campo: "foto_lateral_url", etiqueta: "Lateral" },
  { tipo: "espalda", campo: "foto_espalda_url", etiqueta: "Espalda" },
] as const;

type Tipo = (typeof SLOTS)[number]["tipo"];

/** Fotos de progreso del cliente: 3 huecos (frontal/lateral/espalda)
 * para hoy, más la galería de entradas anteriores. */
export default function FotosProgreso({
  clienteId,
  entradasIniciales,
}: {
  clienteId: string;
  entradasIniciales: EntradaFotosProgreso[];
}) {
  const router = useRouter();
  const [entradas, setEntradas] = useState(entradasIniciales);
  const [archivos, setArchivos] = useState<Partial<Record<Tipo, File>>>({});
  const [previas, setPrevias] = useState<Partial<Record<Tipo, string>>>({});
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const refFrontal = useRef<HTMLInputElement>(null);
  const refLateral = useRef<HTMLInputElement>(null);
  const refEspalda = useRef<HTMLInputElement>(null);
  const refs: Record<Tipo, React.RefObject<HTMLInputElement | null>> = {
    frontal: refFrontal,
    lateral: refLateral,
    espalda: refEspalda,
  };

  function elegir(tipo: Tipo, e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      setError("Elige un archivo de imagen.");
      return;
    }
    setError("");
    setArchivos((a) => ({ ...a, [tipo]: archivo }));
    setPrevias((p) => ({ ...p, [tipo]: URL.createObjectURL(archivo) }));
  }

  async function guardar() {
    if (!archivos.frontal && !archivos.lateral && !archivos.espalda) return;
    setSubiendo(true);
    setError("");
    const supabase = crearClienteNavegador();
    try {
      const { data: fila, error: e1 } = await supabase
        .from("medidas")
        .insert({ cliente_id: clienteId })
        .select("id, fecha")
        .single();
      if (e1 || !fila) throw e1 ?? new Error("insert");

      const parche: Record<string, string> = {};
      for (const s of SLOTS) {
        const archivo = archivos[s.tipo];
        if (!archivo) continue;
        const blob = await redimensionarImagen(archivo, TAMANO_MAX, 0.82);
        const ruta = `${clienteId}/${fila.id}-${s.tipo}.jpg`;
        const { error: e2 } = await supabase.storage
          .from("progreso")
          .upload(ruta, blob, { contentType: "image/jpeg", upsert: true });
        if (e2) throw e2;
        parche[s.campo] = ruta;
      }

      const { error: e3 } = await supabase
        .from("medidas")
        .update(parche)
        .eq("id", fila.id);
      if (e3) throw e3;

      // Muestra la nueva entrada al instante, con las mismas previsualizaciones locales
      setEntradas((prev) => [
        {
          id: fila.id,
          fecha: fila.fecha,
          frontal: parche.foto_frontal_url && previas.frontal ? { path: parche.foto_frontal_url, url: previas.frontal } : null,
          lateral: parche.foto_lateral_url && previas.lateral ? { path: parche.foto_lateral_url, url: previas.lateral } : null,
          espalda: parche.foto_espalda_url && previas.espalda ? { path: parche.foto_espalda_url, url: previas.espalda } : null,
        },
        ...prev,
      ]);
      setArchivos({});
      setPrevias({});
      router.refresh();
    } catch {
      setError("No se pudieron guardar las fotos. Inténtalo de nuevo.");
    }
    setSubiendo(false);
  }

  async function borrar(entrada: EntradaFotosProgreso) {
    if (!confirm("¿Borrar estas fotos?")) return;
    const supabase = crearClienteNavegador();
    const rutas = [entrada.frontal?.path, entrada.lateral?.path, entrada.espalda?.path].filter(
      (p): p is string => !!p
    );
    if (rutas.length > 0) {
      await supabase.storage.from("progreso").remove(rutas);
    }
    await supabase.from("medidas").delete().eq("id", entrada.id);
    setEntradas((prev) => prev.filter((e) => e.id !== entrada.id));
    router.refresh();
  }

  const hayAlgunaSeleccionada = !!(archivos.frontal || archivos.lateral || archivos.espalda);

  return (
    <section className="tarjeta">
      <div className="titulo-tarjeta">FOTOS DE PROGRESO</div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {SLOTS.map((s) => (
          <button
            key={s.tipo}
            type="button"
            className="aspect-[3/4] rounded-[12px] overflow-hidden bg-campo border border-dashed border-borde-2 flex flex-col items-center justify-center gap-1 cursor-pointer"
            onClick={() => refs[s.tipo].current?.click()}
          >
            {previas[s.tipo] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previas[s.tipo]} alt="" className="w-full h-full object-cover" />
            ) : (
              <>
                <Camera size={22} className="text-atenuado" />
                <span className="text-atenuado text-[11.5px]">{s.etiqueta}</span>
              </>
            )}
          </button>
        ))}
      </div>
      {SLOTS.map((s) => (
        <input
          key={s.tipo}
          ref={refs[s.tipo]}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => elegir(s.tipo, e)}
        />
      ))}

      {error && <div className="text-peligro text-[13.5px] mb-3">— {error}</div>}

      <button
        className="cta"
        onClick={guardar}
        disabled={subiendo || !hayAlgunaSeleccionada}
      >
        {subiendo ? "Guardando…" : "Guardar fotos de hoy"}
      </button>

      <GaleriaFotosProgreso entradas={entradas} onBorrar={borrar} />
    </section>
  );
}
