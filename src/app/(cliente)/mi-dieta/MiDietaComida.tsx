"use client";

import { useState } from "react";
import {
  Apple,
  ArrowLeftRight,
  BedDouble,
  ChevronDown,
  ChevronRight,
  Coffee,
  Cookie,
  Moon,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import {
  macrosDe,
  r,
  r1,
  sumar,
  type Alternativa,
  type ComidaEstructurada,
} from "@/lib/dietas";
import { INFO_MACRO } from "@/lib/tipos";
import { IconoTarjeta } from "@/componentes/ui";

/** Icono + color según el nombre de la comida (Desayuno → café azul,
 * Cena → luna morada…), mismo criterio de color que el resto de la app. */
function infoComida(nombre: string): { Icono: LucideIcon; color: string } {
  const n = nombre.toLowerCase();
  if (n.includes("desayuno")) return { Icono: Coffee, color: "var(--color-acento)" };
  if (n.includes("media mañana") || n.includes("almuerzo"))
    return { Icono: Apple, color: "var(--color-verde)" };
  if (n.includes("merienda")) return { Icono: Cookie, color: "var(--color-naranja)" };
  if (n.includes("recena")) return { Icono: BedDouble, color: "var(--color-turquesa)" };
  if (n.includes("cena")) return { Icono: Moon, color: "var(--color-morado)" };
  if (n.includes("comida")) return { Icono: UtensilsCrossed, color: "var(--color-dorado)" };
  return { Icono: Utensils, color: "var(--color-atenuado)" };
}

// Mismos colores que el resto de la app (objetivo diario, tarjeta de
// dieta en Inicio…) — antes este resumen usaba blanco/azul/gris propios,
// desincronizados del sistema de color de macros real.
const MACROS_LEYENDA = [
  { etiqueta: "P", color: INFO_MACRO.proteina.color },
  { etiqueta: "C", color: INFO_MACRO.carbohidratos.color },
  { etiqueta: "G", color: INFO_MACRO.grasas.color },
] as const;

interface DatosSustitucion {
  nombre: string;
  gramos: number;
  factor: number;
  alt: Alternativa[];
}

/**
 * Una comida del plan del cliente: cabecera plegable con icono y kcal,
 * alimentos con los gramos en chip, equivalencias intercambiables (en un
 * bottom sheet, mismo patrón que la calculadora de discos y las
 * preferencias) y macros abajo.
 */
export default function MiDietaComida({
  comida,
  equivalencias,
}: {
  comida: ComidaEstructurada;
  equivalencias: Map<string, Alternativa[]>;
}) {
  const [expandida, setExpandida] = useState(true);
  const [sustitucion, setSustitucion] = useState<DatosSustitucion | null>(null);
  const [cerrando, setCerrando] = useState(false);

  function abrirSustitucion(datos: DatosSustitucion) {
    setCerrando(false);
    setSustitucion(datos);
  }
  function cerrarSustitucion() {
    setCerrando(true);
    setTimeout(() => {
      setSustitucion(null);
      setCerrando(false);
    }, 220);
  }

  const items = (comida.dieta_comida_alimentos ?? [])
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .filter((i) => i.alimentos);

  const total = sumar(items.map((i) => macrosDe(i.alimentos!, Number(i.gramos))));
  const valores = [total.prot, total.carb, total.gras];
  const { Icono, color } = infoComida(comida.nombre);

  return (
    <>
      <section className="tarjeta !p-0 overflow-hidden">
        {/* Cabecera: icono + nombre + kcal de la comida, pulsable para plegar */}
        <button
          className="flex items-center gap-3 px-4 pt-3.5 pb-2.5 w-full text-left anim-pulsable"
          onClick={() => setExpandida((v) => !v)}
          aria-expanded={expandida}
        >
          <IconoTarjeta Icono={Icono} color={color} tamano={36} />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15px] leading-tight truncate">
              {comida.nombre}
            </div>
            {items.length > 0 && (
              <div className="text-atenuado text-[11.5px]">
                {items.length} {items.length === 1 ? "alimento" : "alimentos"}
              </div>
            )}
          </div>
          {items.length > 0 && (
            <span
              className="shrink-0 text-[12px] font-bold rounded-full px-2.5 py-1"
              style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
            >
              {r(total.kcal)} kcal
            </span>
          )}
          <ChevronDown
            size={16}
            className={`icono-rotable text-atenuado shrink-0 ${expandida ? "icono-rotable-abierto" : ""}`}
          />
        </button>

        <div className={`acordeon ${expandida ? "acordeon-abierto" : ""}`}>
          <div>
            <div className="border-t border-borde">
              {/* Texto libre (compatibilidad con dietas antiguas) */}
              {comida.descripcion_libre && (
                <div className="text-texto-2 text-[13.5px] px-4 pt-2.5">
                  {comida.descripcion_libre}
                </div>
              )}

              <div className="px-4 pb-1">
                {items.map((it) => {
                  const alt = equivalencias.get(it.alimento_id) ?? [];
                  const g = Number(it.gramos);
                  const tieneAlternativas = alt.length > 0;
                  const nombre = it.alimentos!.nombre;

                  // El nombre es lo que el cliente identifica primero — es el
                  // elemento dominante; los gramos son la referencia
                  // secundaria (antes era al revés: el chip de gramos iba en
                  // negrita con borde y el nombre en texto plano).
                  const contenidoFila = (
                    <>
                      <span className="shrink-0 min-w-[48px] text-center text-[11px] font-semibold text-atenuado bg-campo/70 rounded-lg py-1.5 px-1.5">
                        {r(g)} g
                      </span>
                      <span className="flex-1 min-w-0 text-[14.5px] font-semibold leading-tight truncate">
                        {nombre}
                      </span>
                      {tieneAlternativas && (
                        <ChevronRight
                          size={16}
                          strokeWidth={2.25}
                          className="text-atenuado shrink-0"
                        />
                      )}
                    </>
                  );

                  return (
                    <div key={it.id} className="border-b border-borde/50 last:border-0">
                      {/* Toda la fila es el objetivo táctil — antes solo un
                       * icono de flechas en una caja de 36px lo era: ambiguo
                       * y fácil de fallar con el pulgar cansado. Un chevron
                       * (">") es el símbolo universal de "toca para ver
                       * más", sin necesidad de interpretar nada. */}
                      {tieneAlternativas ? (
                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 py-2.5 -mx-1 px-1 rounded-[12px] text-left transition-colors hover:bg-campo/50 anim-pulsable"
                          onClick={() =>
                            abrirSustitucion({
                              nombre,
                              gramos: g,
                              factor: g / 100,
                              alt,
                            })
                          }
                          aria-label={`Ver equivalencias de ${nombre}`}
                        >
                          {contenidoFila}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2.5 py-2.5">{contenidoFila}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Macros de la comida: tiles con tinte de color en vez de tres
               * textos alineados con un punto — mismos colores que el resto
               * de la app (objetivo diario, tarjeta de dieta en Inicio). */}
              {items.length > 0 && (
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-borde/60">
                  {MACROS_LEYENDA.map((m, i) => (
                    <div
                      key={m.etiqueta}
                      className="flex-1 text-center rounded-[10px] py-1.5"
                      style={{ background: `color-mix(in srgb, ${m.color} 10%, transparent)` }}
                    >
                      <div
                        className="text-[9.5px] font-bold uppercase tracking-wide"
                        style={{ color: m.color }}
                      >
                        {m.etiqueta}
                      </div>
                      <div className="text-[13px] font-bold mt-0.5">{r1(valores[i])} g</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom sheet de equivalencias — mismo patrón que la calculadora de
       * discos y las preferencias de alimentos/ejercicios, en vez de un
       * acordeón interno que empujaba el resto de la lista. */}
      {sustitucion && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center ${
            cerrando ? "anim-fondo-desaparece" : "anim-fondo-aparece"
          }`}
          onClick={cerrarSustitucion}
        >
          <div
            className={`w-full max-w-[480px] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] ${
              cerrando ? "anim-hoja-baja" : "anim-hoja-sube"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={`Equivalencias de ${sustitucion.nombre}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="min-w-0">
                <div className="titulo-tarjeta !m-0 flex items-center gap-1.5">
                  <ArrowLeftRight size={12} /> EQUIVALENCIAS
                </div>
                <div className="font-bold text-[17px] mt-1 truncate">{sustitucion.nombre}</div>
                <div className="text-atenuado text-[12.5px] mt-0.5">
                  {r(sustitucion.gramos)} g · mismos macros
                </div>
              </div>
              <button className="ghost shrink-0" onClick={cerrarSustitucion}>
                Cerrar
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sustitucion.alt.map((a) => (
                <span
                  key={a.nombre}
                  className="inline-flex items-center gap-1.5 rounded-full bg-campo border border-borde-2 px-3 py-2 text-[13px]"
                >
                  <span className="text-texto-2">{a.nombre}</span>
                  <span className="text-acento font-bold">
                    {r(a.gramos * sustitucion.factor)} g
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
