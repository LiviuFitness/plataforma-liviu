"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ruler } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { aNumero } from "@/lib/rutinas";
import { fechaCorta, Sparkline } from "./ui";
import {
  MEDIDAS,
  MEDIDA_POR_CLAVE,
  indiceCinturaCadera,
  serieDe,
  tonoDelta,
  ultimasMedidas,
  type ClaveMedida,
} from "@/lib/medidas";
import type { Medida } from "@/lib/tipos";

/** Silueta con los perímetros del cuerpo: enseña dónde va la cinta al
 * tocar cada medida, que es lo único que hace que los números sirvan
 * para comparar de un mes a otro. Se usa igual en Mi Progreso (el
 * cliente se mide) y en la ficha del entrenador (mide él en la
 * revisión presencial). */
export default function PanelMedidas({
  clienteId,
  medidas,
}: {
  clienteId: string;
  medidas: Medida[];
}) {
  const router = useRouter();
  const [activa, setActiva] = useState<ClaveMedida | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const valores = useMemo(() => ultimasMedidas(medidas), [medidas]);
  const whr = indiceCinturaCadera(valores);
  const def = activa ? MEDIDA_POR_CLAVE.get(activa) : null;
  const serie = activa ? serieDe(medidas, activa) : [];

  function abrir(clave: ClaveMedida) {
    setActiva(clave);
    setValor(valores[clave] ? String(valores[clave]!.valor) : "");
    setError("");
  }

  function cerrar() {
    setCerrando(true);
    setTimeout(() => {
      setActiva(null);
      setCerrando(false);
    }, 200);
  }

  async function guardar() {
    if (!def) return;
    const n = aNumero(valor);
    if (!n || n < def.min || n > def.max) {
      setError(`Escribe una medida entre ${def.min} y ${def.max} cm.`);
      return;
    }
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { error: fallo } = await supabase.rpc("guardar_medidas", {
      p_cliente_id: clienteId,
      [`p_${def.clave}`]: n,
    } as Record<string, unknown>);
    setGuardando(false);
    if (fallo) {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      return;
    }
    cerrar();
    router.refresh();
  }

  return (
    <section className="tarjeta">
      <div className="titulo-tarjeta flex items-center gap-1.5">
        <Ruler size={12} /> MIS MEDIDAS
      </div>

      {/* El contenedor toma su altura del propio SVG, así que el `top` en %
       * de cada chip cae justo sobre su parte del cuerpo sea cual sea el
       * ancho disponible. La silueta se queda en el 42% central y los chips
       * en el 29% de cada lado: nunca llegan a tapar las líneas de medición,
       * que es justo lo que esta pantalla tiene que enseñar. */}
      {/* Tope de ancho: en la ficha del entrenador la tarjeta es mucho más
       * ancha que en la app del cliente, y sin esto los chips acabarían
       * pegados a los bordes, lejísimos de la parte del cuerpo que nombran. */}
      <div className="relative max-w-[380px] mx-auto">
        <svg
          viewBox="0 0 200 400"
          className="mx-auto block"
          style={{ width: "clamp(120px, 44%, 155px)", aspectRatio: "1 / 2" }}
          role="img"
          aria-label="Silueta del cuerpo con los puntos de medición"
        >
          <defs>
            <linearGradient id="piel-medidas" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#20272e" />
              <stop offset="100%" stopColor="#141a20" />
            </linearGradient>
          </defs>

          <g fill="url(#piel-medidas)" stroke="var(--color-borde-2)" strokeWidth="1">
            <ellipse cx="100" cy="26" rx="16" ry="20" />
            <rect x="93" y="42" width="14" height="13" rx="6" />
            <path d="M70 62 Q100 50 130 62 L134 76 Q100 68 66 76 Z" />
            <rect x="67" y="66" width="66" height="52" rx="21" />
            <rect x="74" y="112" width="52" height="54" rx="18" />
            <rect x="70" y="160" width="60" height="34" rx="15" />
            <rect x="45" y="70" width="19" height="62" rx="9.5" />
            <rect x="136" y="70" width="19" height="62" rx="9.5" />
            <rect x="42" y="128" width="17" height="56" rx="8.5" />
            <rect x="141" y="128" width="17" height="56" rx="8.5" />
            <rect x="72" y="190" width="26" height="86" rx="13" />
            <rect x="102" y="190" width="26" height="86" rx="13" />
            <rect x="75" y="272" width="21" height="76" rx="10.5" />
            <rect x="104" y="272" width="21" height="76" rx="10.5" />
          </g>

          {/* Trazos de la cinta: apagados salvo el que se está tomando.
           * Sin transición CSS a propósito: los atributos de presentación
           * del SVG (stroke, stroke-width, opacity) se quedan clavados en
           * su valor inicial si se les pone una `transition` y luego React
           * cambia el atributo — comprobado en el navegador, la línea
           * activa no llegaba a encenderse nunca. */}
          {MEDIDAS.map((m) => {
            const encendido = activa === m.clave;
            return (
              <path
                key={m.clave}
                d={m.trazo}
                fill="none"
                stroke={encendido ? "var(--color-acento)" : "var(--color-atenuado)"}
                strokeWidth={encendido ? 1.8 : 1.2}
                strokeDasharray={encendido ? "4 3.5" : "3 4"}
                opacity={encendido ? 1 : 0.45}
              />
            );
          })}
        </svg>

        {MEDIDAS.map((m) => {
          const v = valores[m.clave];
          const lado = m.chip.lado === "izquierda" ? { left: 0 } : { right: 0 };
          return (
            <button
              key={m.clave}
              onClick={() => abrir(m.clave)}
              style={{ ...lado, top: `${m.chip.top}%`, maxWidth: "29%" }}
              className={`absolute -translate-y-1/2 flex flex-col items-start leading-none gap-0.5
                rounded-[10px] px-2 py-1 border transition-colors text-left
                ${
                  v
                    ? "bg-panel/90 border-borde-2"
                    : "bg-panel/70 border-dashed border-acento/35"
                }`}
              aria-label={
                v
                  ? `${m.etiqueta}: ${v.valor} centímetros. Tocar para actualizar`
                  : `Añadir medida de ${m.etiqueta.toLowerCase()}`
              }
            >
              <span className="text-[9.5px] uppercase tracking-[0.5px] text-atenuado font-semibold">
                {m.etiqueta}
              </span>
              {v ? (
                <span className="flex items-baseline gap-1">
                  <b className="text-white text-[12.5px] tabular-nums">{v.valor}</b>
                  {v.delta !== null && Math.abs(v.delta) >= 0.1 && (
                    <span
                      className="text-[9.5px] font-bold"
                      style={{ color: tonoDelta(m.clave, v.delta) }}
                    >
                      {v.delta > 0 ? "+" : ""}
                      {v.delta}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-acento text-[12.5px] font-bold leading-none pb-0.5">
                  + añadir
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-px bg-borde border border-borde rounded-[12px] overflow-hidden mt-3">
        <Dato
          etiqueta="Cintura"
          valor={valores.cintura ? `${valores.cintura.valor}` : "—"}
          unidad="cm"
        />
        <Dato
          etiqueta="Cadera"
          valor={valores.cadera ? `${valores.cadera.valor}` : "—"}
          unidad="cm"
        />
        <Dato
          etiqueta="Cint./cad."
          valor={whr !== null ? whr.toFixed(2) : "—"}
          ayuda="Índice cintura/cadera: se mueve durante una definición aunque el peso no baje."
        />
      </div>

      {/* Hoja de toma de medida — mismo patrón que las equivalencias de
       * alimentos y la calculadora de discos. */}
      {def && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center ${
            cerrando ? "anim-fondo-desaparece" : "anim-fondo-aparece"
          }`}
          onClick={cerrar}
        >
          <div
            className={`w-full max-w-[480px] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] ${
              cerrando ? "anim-hoja-baja" : "anim-hoja-sube"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={`Medida de ${def.etiqueta.toLowerCase()}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="min-w-0">
                <div className="font-bold text-[17px]">{def.etiqueta}</div>
                {valores[def.clave] && (
                  <div className="text-atenuado text-[12.5px] mt-0.5">
                    Última toma: {valores[def.clave]!.valor} cm ·{" "}
                    {fechaCorta(valores[def.clave]!.fecha)}
                  </div>
                )}
              </div>
              <button className="ghost shrink-0" onClick={cerrar}>
                Cerrar
              </button>
            </div>

            <p className="text-texto-2 text-[13.5px] leading-[1.55] mb-4">
              {def.comoMedir}
            </p>

            {serie.length >= 2 && (
              <div className="mb-4">
                <Sparkline datos={serie} color="var(--color-acento)" />
              </div>
            )}

            <div className="flex gap-2">
              <input
                className="input !mb-0 flex-1"
                inputMode="decimal"
                placeholder="cm"
                autoFocus
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") guardar();
                }}
              />
              <button
                className="cta cta-mini !mb-0"
                onClick={guardar}
                disabled={guardando || valor.trim() === ""}
              >
                {guardando ? "…" : "Guardar"}
              </button>
            </div>
            {error && <div className="text-peligro text-[13.5px] mt-2">— {error}</div>}
          </div>
        </div>
      )}
    </section>
  );
}

function Dato({
  etiqueta,
  valor,
  unidad,
  ayuda,
}: {
  etiqueta: string;
  valor: string;
  unidad?: string;
  ayuda?: string;
}) {
  return (
    <div className="bg-panel px-2.5 py-2.5" title={ayuda}>
      <div className="text-[10px] uppercase tracking-[0.8px] text-atenuado font-semibold">
        {etiqueta}
      </div>
      <div className="text-[18px] font-extrabold mt-0.5 tabular-nums tracking-[-0.3px]">
        {valor}
        {unidad && valor !== "—" && (
          <span className="text-[11px] font-semibold text-atenuado ml-0.5">{unidad}</span>
        )}
      </div>
    </div>
  );
}
