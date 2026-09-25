"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileText } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/componentes/ui";
import HojaInforme from "@/componentes/HojaInforme";

export interface FilaRenovacion {
  clienteId: string;
  nombre: string;
  plan: string | null;
  cuando: string;
  pronto: boolean;
  meses: number;
  /** Pago ya apuntado para esta renovación (para poder deshacerlo). */
  pagoId: string | null;
  pagoImporte: number | null;
  /** Lo que pagó la última vez: se propone por defecto. */
  ultimoImporte: number | null;
}

/* Los precios de tus planes, para no teclear */
const IMPORTES = [39, 99, 100, 300];
const euros = (n: number) => `${n.toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;

/**
 * Quién renueva en los próximos 7 días, con lo que hace falta para ese
 * momento: el informe de su progreso para mandárselo y apuntar el cobro.
 */
export default function RenuevanSemana({ filas }: { filas: FilaRenovacion[] }) {
  const router = useRouter();
  const [informePara, setInformePara] = useState<FilaRenovacion | null>(null);
  const [cobrando, setCobrando] = useState<FilaRenovacion | null>(null);

  async function deshacer(f: FilaRenovacion) {
    if (!f.pagoId || !confirm(`¿Quitar el pago de ${euros(f.pagoImporte ?? 0)} de ${f.nombre}?`)) return;
    const supabase = crearClienteNavegador();
    await supabase.from("pagos").delete().eq("id", f.pagoId);
    router.refresh();
  }

  return (
    <>
      <div className="superficie px-4 mb-6">
        {filas.map((f) => (
          <div key={f.clienteId} className="fila !items-start">
            <Link href={`/clientes/${f.clienteId}`} className="shrink-0">
              <Avatar nombre={f.nombre} tamano={34} />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/clientes/${f.clienteId}`} className="block">
                <div className="font-bold text-[14.5px] leading-tight break-words">{f.nombre}</div>
                <div className="text-texto-2 text-[12.5px] leading-snug break-words">
                  Plan {f.plan} · renueva{" "}
                  <b className={f.pronto ? "text-acento" : "text-texto-2"}>{f.cuando}</b>
                </div>
                <div className="text-atenuado text-[12px]">
                  {f.meses === 1 ? "Cumple su primer mes" : `Cumple ${f.meses} meses contigo`}
                </div>
              </Link>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  className="chip !text-acento !border-acento/40 flex items-center gap-1.5"
                  onClick={() => setInformePara(f)}
                >
                  <FileText size={13} /> Informe
                </button>
                {f.pagoId ? (
                  <button
                    className="chip !text-verde !border-verde/40 flex items-center gap-1"
                    onClick={() => deshacer(f)}
                    title="Tocar para deshacer"
                  >
                    <Check size={13} strokeWidth={3} /> Pagado {euros(f.pagoImporte ?? 0)}
                  </button>
                ) : (
                  <button className="chip !text-verde !border-verde/40" onClick={() => setCobrando(f)}>
                    Marcar pagado
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {informePara && (
        <HojaInforme
          clienteId={informePara.clienteId}
          nombre={informePara.nombre}
          onCerrar={() => setInformePara(null)}
        />
      )}
      {cobrando && (
        <HojaCobro
          fila={cobrando}
          onHecho={() => {
            setCobrando(null);
            router.refresh();
          }}
          onCerrar={() => setCobrando(null)}
        />
      )}
    </>
  );
}

function HojaCobro({
  fila,
  onHecho,
  onCerrar,
}: {
  fila: FilaRenovacion;
  onHecho: () => void;
  onCerrar: () => void;
}) {
  const pila = fila.nombre.split(" ")[0];
  const opciones = [...new Set([...(fila.ultimoImporte ? [fila.ultimoImporte] : []), ...IMPORTES])];
  const [importe, setImporte] = useState<number | null>(fila.ultimoImporte);
  const [otro, setOtro] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const valor = otro.trim() ? Number(otro.replace(",", ".")) : importe;
  const valido = valor !== null && Number.isFinite(valor) && valor > 0;

  async function guardar() {
    if (!valido) return;
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("pagos")
      .insert({ cliente_id: fila.clienteId, importe: valor, fecha: new Date().toLocaleDateString("sv-SE") });
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
        <div className="flex justify-between items-center mb-2">
          <div className="titulo-seccion !mb-0 break-words min-w-0">¿Cuánto paga {pila}?</div>
          <button className="ghost shrink-0" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        <div className="text-atenuado text-[12.5px] mb-3">
          {fila.ultimoImporte
            ? "Lo mismo que la última vez, si no ha cambiado."
            : "Solo la primera vez: la próxima renovación ya lo sabrá."}
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {opciones.map((n) => (
            <button
              key={n}
              className={`chip ${!otro.trim() && importe === n ? "chip-activo" : ""}`}
              onClick={() => {
                setImporte(n);
                setOtro("");
              }}
            >
              {euros(n)}
            </button>
          ))}
          <input
            className="chip !w-[92px] !cursor-text text-center"
            inputMode="decimal"
            placeholder="Otro €"
            value={otro}
            onChange={(e) => setOtro(e.target.value)}
            aria-label="Otro importe en euros"
          />
        </div>
        {error && <div className="text-peligro text-[13px] mb-2">— {error}</div>}
        <button className="cta !mb-0" onClick={guardar} disabled={!valido || guardando}>
          {guardando ? "Guardando…" : valido ? `Marcar ${euros(valor!)} como pagado` : "Elige el importe"}
        </button>
      </div>
    </div>
  );
}
