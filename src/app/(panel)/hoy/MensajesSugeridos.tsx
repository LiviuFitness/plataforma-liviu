"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Pencil, Send, Trophy } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { IconoTarjeta } from "@/componentes/ui";
import { avisarMensaje } from "@/lib/avisos";
import type { Sugerencia, TipoSugerencia } from "@/lib/sugerencias";

const ICONO: Record<TipoSugerencia, { Icono: typeof Bell; color: string }> = {
  record: { Icono: Trophy, color: "var(--color-dorado)" },
  inactivo: { Icono: Bell, color: "var(--color-aviso)" },
  semana: { Icono: Check, color: "var(--color-acento)" },
};

const CLAVE_DESCARTES = "sugerencias-descartadas";

function leerDescartes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_DESCARTES) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/**
 * Mensajes con el texto ya escrito: "Enviar" lo manda tal cual a su
 * chat, "Editar" deja cambiarlo antes. Descartar se recuerda en este
 * móvil; en cuanto le escribes, deja de salir en todos.
 */
export default function MensajesSugeridos({ items }: { items: Sugerencia[] }) {
  const router = useRouter();
  const [descartadas, setDescartadas] = useState<string[]>([]);
  const [enviadas, setEnviadas] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState("");

  /* localStorage solo existe en el navegador: se lee tras montar */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDescartadas(leerDescartes());
  }, []);

  function descartar(clave: string) {
    /* Solo se guardan las que siguen vigentes: la lista no crece sin fin */
    const vigentes = new Set(items.map((i) => i.clave));
    const nuevas = [...descartadas.filter((c) => vigentes.has(c)), clave];
    setDescartadas(nuevas);
    try {
      localStorage.setItem(CLAVE_DESCARTES, JSON.stringify(nuevas));
    } catch {
      /* sin almacenamiento: se oculta hasta recargar */
    }
  }

  async function enviar(s: Sugerencia) {
    const texto = (editando[s.clave] ?? s.texto).trim();
    if (!texto) return;
    setEnviando(s.clave);
    setError("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("mensajes")
      .insert({ cliente_id: s.clienteId, remitente: "entrenador", texto });
    setEnviando(null);
    if (error) {
      setError("No se pudo enviar. Inténtalo de nuevo.");
      return;
    }
    setEnviadas((prev) => new Set(prev).add(s.clave));
    avisarMensaje([s.clienteId]);
    router.refresh();
  }

  const visibles = items.filter((i) => !descartadas.includes(i.clave));
  if (visibles.length === 0) return null;

  return (
    <>
      <div className="flex items-baseline justify-between">
        <div className="titulo-seccion">Mensajes sugeridos</div>
        <span className="text-atenuado text-[12px]">{visibles.length} hoy</span>
      </div>
      <div className="mb-6">
        {visibles.map((s) => {
          const { Icono, color } = ICONO[s.tipo];
          const hecho = enviadas.has(s.clave);
          const enEdicion = s.clave in editando;
          return (
            <div key={s.clave} className="tarjeta !p-3.5 !mb-2.5">
              <div className="flex items-center gap-2.5 mb-2">
                <IconoTarjeta Icono={Icono} color={color} tamano={30} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14px] leading-tight break-words">{s.nombre}</div>
                  <div className="text-atenuado text-[12px] break-words">{s.motivo}</div>
                </div>
                {!hecho && (
                  <button className="text-atenuado text-[12px] shrink-0 cursor-pointer" onClick={() => descartar(s.clave)}>
                    Descartar
                  </button>
                )}
              </div>
              {enEdicion ? (
                <textarea
                  className="w-full bg-campo border border-acento rounded-[12px] text-white px-3 py-2 text-[13.5px] resize-none font-cuerpo mb-2.5"
                  rows={3}
                  value={editando[s.clave]}
                  onChange={(e) => setEditando({ ...editando, [s.clave]: e.target.value })}
                  autoFocus
                />
              ) : (
                <div className="bg-campo border border-borde rounded-[12px] px-3 py-2 text-[13.5px] text-texto-2 leading-snug mb-2.5 break-words">
                  {s.texto}
                </div>
              )}
              {hecho ? (
                <div className="text-acento text-[13px] font-semibold flex items-center gap-1.5">
                  <Check size={14} strokeWidth={3} /> Enviado a su chat
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    className="tab tab-activa !text-[13px] flex items-center justify-center gap-1.5"
                    onClick={() => enviar(s)}
                    disabled={enviando !== null}
                  >
                    <Send size={14} /> {enviando === s.clave ? "Enviando…" : "Enviar"}
                  </button>
                  {!enEdicion && (
                    <button
                      className="tab !text-[13px] flex items-center justify-center gap-1.5"
                      onClick={() => setEditando({ ...editando, [s.clave]: s.texto })}
                    >
                      <Pencil size={14} /> Editar
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {error && <div className="text-peligro text-[12.5px]">— {error}</div>}
      </div>
    </>
  );
}
