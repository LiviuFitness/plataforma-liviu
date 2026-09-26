"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { OBJETIVOS, type Plan } from "@/lib/tipos";
import { leerLista } from "@/lib/invitacionesLote";

/** Validez de los enlaces creados en bloque: mandar treinta mensajes
 * lleva días, y con 7 los primeros caducaban antes de enviar los últimos. */
export const DIAS_VALIDEZ_LOTE = 30;

/**
 * Invitar a varios de golpe: se pega la lista (de las notas, de una hoja
 * de cálculo, de WhatsApp…), se ve cómo ha entendido cada línea y se
 * crean todas las invitaciones válidas en un solo paso. Las que tienen
 * algún problema se quedan en el cuadro para corregirlas.
 */
export default function InvitarVarios({
  pendientes,
  clientes,
  onCreadas,
}: {
  /** Emails con invitación pendiente, en minúsculas. */
  pendientes: string[];
  /** Emails de quienes ya son clientes, en minúsculas. */
  clientes: string[];
  onCreadas: (n: number) => void;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [plan, setPlan] = useState<Plan>("mensual");
  const [objetivo, setObjetivo] = useState(OBJETIVOS[0]);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  const filas = useMemo(
    () =>
      leerLista(texto, {
        planPorDefecto: plan,
        objetivoPorDefecto: objetivo,
        pendientes: new Set(pendientes),
        clientes: new Set(clientes),
      }),
    [texto, plan, objetivo, pendientes, clientes]
  );
  const validas = filas.filter((f) => f.problema === null);
  const conProblema = filas.filter((f) => f.problema !== null);

  async function crear() {
    if (validas.length === 0) return;
    setCreando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const expira = new Date(Date.now() + DIAS_VALIDEZ_LOTE * 86400000).toISOString();
    /* Un solo insert: o se crean todas o ninguna */
    const { error } = await supabase.from("invitaciones").insert(
      validas.map((f) => ({ nombre: f.nombre, email: f.email, plan: f.plan, objetivo: f.objetivo, expira }))
    );
    setCreando(false);
    if (error) {
      setError("No se ha creado ninguna. Comprueba la conexión e inténtalo de nuevo.");
      return;
    }
    /* En el cuadro se quedan solo las líneas que falta arreglar */
    const lineas = texto.split(/\r?\n/);
    setTexto(conProblema.map((f) => lineas[f.linea - 1]).join("\n"));
    onCreadas(validas.length);
    router.refresh();
  }

  return (
    <div className="tarjeta">
      <div className="titulo-tarjeta">VARIAS A LA VEZ</div>
      <textarea
        className="w-full bg-campo border border-borde-2 rounded-[10px] text-white p-2.5 px-3 text-[14px] resize-y font-cuerpo mb-1"
        rows={6}
        placeholder={"Una persona por línea:\nAna López, ana@gmail.com\nMarcos Ruiz, marcos@hotmail.com, trimestral"}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <p className="text-atenuado text-[12px] mb-3 leading-snug">
        Nombre y email en cualquier orden. Si en la línea pones «trimestral» o el objetivo, se usa;
        si no, lo de aquí abajo.
      </p>
      <div className="grid grid-cols-1 min-[440px]:grid-cols-2 min-[440px]:gap-2">
        <select className="input" value={objetivo} onChange={(e) => setObjetivo(e.target.value)}>
          {OBJETIVOS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
          <option value="mensual">Plan mensual</option>
          <option value="trimestral">Plan trimestral</option>
        </select>
      </div>

      {filas.length > 0 && (
        <div className="border border-borde rounded-[12px] px-3 mb-3 max-h-[320px] overflow-y-auto">
          {filas.map((f) => (
            <div key={f.linea} className="flex items-start gap-2.5 py-2 border-b border-borde last:border-0">
              {f.problema ? (
                <AlertCircle size={16} className="text-peligro shrink-0 mt-0.5" />
              ) : (
                <Check size={16} className="text-acento shrink-0 mt-0.5" strokeWidth={3} />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold leading-tight break-words">
                  {f.nombre || <span className="text-atenuado font-normal">sin nombre</span>}
                </div>
                <div className="text-atenuado text-[12px] break-all">{f.email || "sin email"}</div>
                {f.problema ? (
                  <div className="text-peligro text-[12px] font-semibold">
                    Línea {f.linea}: {f.problema}
                  </div>
                ) : (
                  <div className="text-texto-2 text-[12px]">
                    {f.objetivo} · {f.plan}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="text-peligro text-[13.5px] mb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}
      <button className="cta !mb-2" onClick={crear} disabled={creando || validas.length === 0}>
        {creando
          ? "Creando…"
          : validas.length === 0
            ? "Pega la lista para empezar"
            : `Crear ${validas.length} ${validas.length === 1 ? "invitación" : "invitaciones"}`}
      </button>
      <p className="text-atenuado text-[12.5px]">
        {conProblema.length > 0 && validas.length > 0
          ? `Las ${conProblema.length} con problema no se crean: se quedan en el cuadro para arreglarlas. `
          : ""}
        Estos enlaces duran {DIAS_VALIDEZ_LOTE} días, para que te dé tiempo a mandarlos todos.
      </p>
    </div>
  );
}
