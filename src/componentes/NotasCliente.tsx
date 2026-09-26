"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Plus, StickyNote, Trash2, AlertCircle } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

export interface NotaCliente {
  id: string;
  texto: string;
  recordar_en: string | null;
  hecha: boolean;
  creada_en: string;
}

const iso = (d: Date) => d.toLocaleDateString("sv-SE");
function enDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}
/** El próximo lunes (si hoy es lunes, el de la semana que viene) */
function proximoLunes(): string {
  const d = new Date();
  const faltan = ((8 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + faltan);
  return iso(d);
}
function fechaCorta(isoFecha: string): string {
  const [a, m, d] = isoFecha.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Notas privadas sobre un cliente ("molestia en la rodilla", "boda en
 * junio"), con recordatorio opcional: el día que toca salen en Hoy. El
 * cliente nunca las ve.
 */
export default function NotasCliente({
  clienteId,
  nombre,
  notas,
}: {
  clienteId: string;
  nombre: string;
  notas: NotaCliente[];
}) {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [verHechas, setVerHechas] = useState(false);
  const pendientes = notas.filter((n) => !n.hecha);
  const hechas = notas.filter((n) => n.hecha);
  const hoy = iso(new Date());

  async function alternar(n: NotaCliente) {
    const supabase = crearClienteNavegador();
    await supabase.from("notas_cliente").update({ hecha: !n.hecha }).eq("id", n.id);
    router.refresh();
  }

  async function borrar(n: NotaCliente) {
    if (!confirm("¿Borrar esta nota?")) return;
    const supabase = crearClienteNavegador();
    await supabase.from("notas_cliente").delete().eq("id", n.id);
    router.refresh();
  }

  const fila = (n: NotaCliente) => (
    <div key={n.id} className="flex items-start gap-2.5 py-2.5 border-b border-borde last:border-0">
      <button
        className={`w-[22px] h-[22px] mt-0.5 rounded-[7px] border grid place-items-center shrink-0 cursor-pointer ${
          n.hecha ? "bg-acento border-acento text-fondo" : "border-borde-2"
        }`}
        onClick={() => alternar(n)}
        aria-label={n.hecha ? "Marcar como pendiente" : "Marcar como hecha"}
      >
        {n.hecha && <Check size={13} strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] leading-snug break-words whitespace-pre-line ${n.hecha ? "text-atenuado line-through" : ""}`}>
          {n.texto}
        </div>
        <div className="text-atenuado text-[11.5px] mt-0.5 flex items-center gap-1">
          {n.recordar_en && !n.hecha && (
            <>
              <CalendarClock size={11} className={n.recordar_en <= hoy ? "text-aviso" : ""} />
              <span className={n.recordar_en <= hoy ? "text-aviso font-semibold" : ""}>
                {n.recordar_en <= hoy ? "Toca hoy" : `Te lo recuerdo el ${fechaCorta(n.recordar_en)}`}
              </span>
              <span>·</span>
            </>
          )}
          <span>{fechaCorta(n.creada_en.slice(0, 10))}</span>
        </div>
      </div>
      <button className="text-atenuado shrink-0 cursor-pointer p-1" onClick={() => borrar(n)} aria-label="Borrar nota">
        <Trash2 size={14} />
      </button>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mt-2">
        <div className="titulo-seccion !mb-0 flex items-center gap-1.5">
          <StickyNote size={15} /> Notas con fecha
        </div>
        <button className="chip !text-acento !border-acento/40 flex items-center gap-1" onClick={() => setCreando(true)}>
          <Plus size={13} /> Nota
        </button>
      </div>
      <div className="text-atenuado text-[12px] mb-2 mt-0.5">Privadas: {nombre.split(" ")[0]} no las ve.</div>
      <div className="superficie px-4 mb-4">
        {pendientes.length === 0 && (
          <div className="text-atenuado text-[13px] py-3">
            Nada apuntado. Lesiones, fechas importantes, lo que quieras recordar.
          </div>
        )}
        {pendientes.map(fila)}
        {hechas.length > 0 && (
          <>
            <button
              className="w-full text-left text-atenuado text-[12.5px] py-2.5 cursor-pointer"
              onClick={() => setVerHechas(!verHechas)}
            >
              {verHechas ? "Ocultar" : "Ver"} {hechas.length} {hechas.length === 1 ? "hecha" : "hechas"}
            </button>
            {verHechas && hechas.map(fila)}
          </>
        )}
      </div>

      {creando && (
        <HojaNota
          clienteId={clienteId}
          pila={nombre.split(" ")[0]}
          onHecho={() => {
            setCreando(false);
            router.refresh();
          }}
          onCerrar={() => setCreando(false)}
        />
      )}
    </>
  );
}

function HojaNota({
  clienteId,
  pila,
  onHecho,
  onCerrar,
}: {
  clienteId: string;
  pila: string;
  onHecho: () => void;
  onCerrar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const lunes = proximoLunes();
  const opciones: [string, string | null][] = [
    ["No", null],
    ["Mañana", enDias(1)],
    [`Lunes ${Number(lunes.slice(8))}`, lunes],
    ["En 2 semanas", enDias(14)],
  ];
  const esOpcion = opciones.some(([, v]) => v === fecha);

  async function guardar() {
    if (!texto.trim()) return;
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("notas_cliente")
      .insert({ cliente_id: clienteId, texto: texto.trim(), recordar_en: fecha });
    setGuardando(false);
    if (error) {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      return;
    }
    onHecho();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[480px] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] pb-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="titulo-seccion !mb-0">Nota sobre {pila}</div>
          <button className="ghost shrink-0" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        <textarea
          className="w-full bg-campo border border-borde-2 focus:border-acento outline-none rounded-[10px] text-white p-2.5 px-3 text-[14px] resize-none font-cuerpo mb-3"
          rows={3}
          placeholder="Revisar la rodilla: molestia en la búlgara…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
        />
        <div className="titulo-tarjeta">RECUÉRDAMELO</div>
        <div className="flex flex-wrap gap-2 mb-4">
          {opciones.map(([etiqueta, valor]) => (
            <button
              key={etiqueta}
              className={`chip ${!eligiendo && fecha === valor ? "chip-activo" : ""}`}
              onClick={() => {
                setFecha(valor);
                setEligiendo(false);
              }}
            >
              {etiqueta}
            </button>
          ))}
          {eligiendo || (fecha && !esOpcion) ? (
            <input
              type="date"
              className="chip chip-activo !cursor-text"
              min={enDias(0)}
              value={fecha ?? ""}
              onChange={(e) => setFecha(e.target.value || null)}
              aria-label="Fecha del recordatorio"
            />
          ) : (
            <button className="chip" onClick={() => setEligiendo(true)}>
              Elegir…
            </button>
          )}
        </div>
        {error && <div className="text-peligro text-[13px] mb-2 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{error}</span></div>}
        <button className="cta !mb-0" onClick={guardar} disabled={guardando || !texto.trim()}>
          {guardando ? "Guardando…" : fecha ? `Guardar y recordar el ${fechaCorta(fecha)}` : "Guardar nota"}
        </button>
      </div>
    </div>
  );
}
