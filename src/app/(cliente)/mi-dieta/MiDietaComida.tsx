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

/** Icono, color y foto según el nombre de la comida (Desayuno → café
 * azul, Cena → luna morada…), mismo criterio de color que el resto de la
 * app. La foto es ambiente, no el plato pautado: se eligió a propósito
 * que fuera genérica y apetecible, no un intento de representar lo que
 * el cliente tiene puesto ese día. */
function infoComida(nombre: string): {
  Icono: LucideIcon;
  color: string;
  foto: string | null;
} {
  const n = nombre.toLowerCase();
  if (n.includes("desayuno"))
    return { Icono: Coffee, color: "var(--color-acento)", foto: "/comidas/desayuno.webp" };
  if (n.includes("media mañana") || n.includes("almuerzo"))
    return { Icono: Apple, color: "var(--color-verde)", foto: "/comidas/almuerzo.webp" };
  if (n.includes("merienda"))
    return { Icono: Cookie, color: "var(--color-naranja)", foto: "/comidas/merienda.webp" };
  if (n.includes("recena"))
    return { Icono: BedDouble, color: "var(--color-turquesa)", foto: "/comidas/recena.webp" };
  if (n.includes("cena"))
    return { Icono: Moon, color: "var(--color-morado)", foto: "/comidas/cena.webp" };
  if (n.includes("comida"))
    return { Icono: UtensilsCrossed, color: "var(--color-dorado)", foto: "/comidas/comida.webp" };
  return { Icono: Utensils, color: "var(--color-atenuado)", foto: null };
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
 * alimentos con la cantidad destacada, equivalencias intercambiables (en un
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
  const { Icono, color, foto } = infoComida(comida.nombre);
  const velo = `color-mix(in srgb, ${color} 13%, var(--color-panel))`;

  return (
    <>
      <section className="tarjeta !p-0 overflow-hidden">
        {/* Cabecera: icono + nombre + kcal de la comida, pulsable para plegar.
         * Lleva fondo propio, un velo del color de la comida, porque antes
         * compartía el de la tarjeta con la lista de alimentos y lo único
         * que las separaba era una línea de un píxel: con cinco comidas
         * seguidas costaba ver dónde empezaba cada una. De paso, el tinte
         * distingue unas de otras (desayuno, media mañana…) sin añadir
         * ningún elemento nuevo. Encima va la foto, entrando por la
         * derecha: el degradado la apaga antes de llegar al nombre y deja
         * el lado izquierdo en el velo liso de siempre, así el texto no
         * depende de lo clara que salga la imagen. */}
        <button
          className={`relative overflow-hidden flex items-center gap-3 px-4 pt-3.5 pb-3 w-full text-left anim-pulsable ${
            expandida ? "border-b border-borde" : ""
          }`}
          style={{ background: velo }}
          onClick={() => setExpandida((v) => !v)}
          aria-expanded={expandida}
        >
          {foto && (
            <>
              {/* La foto ocupa solo la mitad derecha; encima, un degradado
               * que llega opaco hasta pasado el nombre. Así el texto se
               * lee siempre igual, salga la imagen clara u oscura, y a la
               * foto le queda sitio para reconocerse. */}
              <span
                aria-hidden
                className="absolute inset-y-0 right-0 w-[54%] pointer-events-none"
                style={{
                  backgroundImage: `url(${foto})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center right",
                }}
              />
              <span
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, ${velo} 0%, ${velo} 44%, color-mix(in srgb, ${velo} 60%, transparent) 70%, color-mix(in srgb, ${velo} 45%, transparent) 100%)`,
                }}
              />
            </>
          )}
          <span className="relative shrink-0">
            <IconoTarjeta Icono={Icono} color={color} tamano={36} />
          </span>
          <div className="flex-1 min-w-0 relative">
            <div className="font-bold text-[15.5px] leading-tight truncate">
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
              className="relative shrink-0 text-[12px] font-bold rounded-full px-2.5 py-1"
              style={{
                color,
                /* Sobre la foto un fondo translúcido no basta: se mezcla
                 * con el color del plato y el número deja de leerse. */
                background: `color-mix(in srgb, ${color} 14%, ${foto ? "var(--color-fondo)" : "transparent"})`,
              }}
            >
              {r(total.kcal)} kcal
            </span>
          )}
          <ChevronDown
            size={16}
            className={`icono-rotable text-atenuado shrink-0 relative ${expandida ? "icono-rotable-abierto" : ""}`}
          />
        </button>

        <div className={`acordeon ${expandida ? "acordeon-abierto" : ""}`}>
          <div>
            <div>
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

                  // Manda la cantidad: es el dato que se usa (en la cocina se
                  // busca el número, el alimento ya se sabe cuál es). Va en
                  // columna fija alineada a la derecha y con cifras de ancho
                  // igual, así 150 / 60 / 110 / 10 cuadran por las unidades y
                  // la lista se lee de una pasada; centrada dentro de un chip
                  // no cuadraba ninguna. El nombre baja de peso para no
                  // competir, pero sigue siendo perfectamente legible.
                  const contenidoFila = (
                    <>
                      <span className="shrink-0 w-[52px] text-right tabular-nums leading-none">
                        <span className="text-[16.5px] font-bold">{r(g)}</span>
                        <span className="text-[11px] text-atenuado ml-0.5">g</span>
                      </span>
                      <span className="flex-1 min-w-0 text-[14.5px] text-texto-2 leading-tight truncate">
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

              {/* Macros de la comida en una línea. Eran tres cajas con
               * fondo tintado y dos alturas de texto cada una; con cinco o
               * seis comidas al día eso son casi veinte recuadros de
               * colores en la misma pantalla, compitiendo con los propios
               * alimentos, que es lo que se viene a leer. El color se queda
               * solo en la letra del macro, que es donde hace falta. */}
              {items.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 border-t border-borde/60 text-[12.5px] tabular-nums">
                  {MACROS_LEYENDA.map((m, i) => (
                    <span key={m.etiqueta} className="inline-flex items-baseline gap-1">
                      <span className="font-bold" style={{ color: m.color }}>
                        {m.etiqueta}
                      </span>
                      <span className="text-texto-2">{r1(valores[i])} g</span>
                    </span>
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
