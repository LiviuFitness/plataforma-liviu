"use client";

import { textoVisible } from "@/lib/guias";
import { Check, ChevronRight, MessageCircle, TrendingUp, UtensilsCrossed } from "lucide-react";
import { IconoTarjeta, Sparkline } from "@/componentes/ui";
import IconoMancuerna from "@/componentes/IconoMancuerna";
import type { SesionHistorial } from "@/lib/progresoEntreno";
import type { Dieta, Medida, Mensaje, RevisionKcal, RutinaUI } from "@/lib/tipos";
import type { Vista } from "./FichaCliente";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

const kg = (n: number) => n.toFixed(1).replace(".", ",");

/** +1,2 · −0,8 · 0,0 — con el signo menos tipográfico, no el guion. */
function conSigno(n: number): string {
  if (Math.abs(n) < 0.05) return "0,0";
  return `${n > 0 ? "+" : "−"}${kg(Math.abs(n))}`;
}

/** "hoy", "ayer", "hace 5 días" — contra una fecha AAAA-MM-DD o ISO. */
function haceDias(fecha: string, ahora: number): string {
  const dias = Math.floor(
    (ahora - new Date(fecha.length === 10 ? `${fecha}T12:00:00` : fecha).getTime()) / 86400000
  );
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

/**
 * Cabecera de la pestaña Resumen: cómo va y qué lleva pautado.
 *
 * Antes la ficha se abría con una gráfica de peso y siete puntitos, y
 * para saber qué rutina tenía o cuántas kcal le habías puesto había que
 * entrar en dos pestañas. Aquí está todo lo que se mira de un vistazo
 * antes de decidir si hay que tocar algo, y cada fila del plan lleva a
 * su pestaña.
 */
export default function ResumenPlan({
  medidas,
  diasEntrenados,
  rutina,
  dieta,
  dietaDescanso,
  ultimaSesion,
  ultimaRevision,
  ultimoMensaje,
  chatPendiente,
  ahora,
  abrir,
}: {
  medidas: Medida[];
  diasEntrenados: boolean[];
  rutina: RutinaUI | null;
  dieta: Dieta | null;
  dietaDescanso: Dieta | null;
  ultimaSesion: SesionHistorial | null;
  ultimaRevision: RevisionKcal | null;
  /** Instante de referencia, fijado una vez al montar la ficha. */
  ultimoMensaje: Mensaje | null;
  chatPendiente: boolean;
  ahora: number;
  abrir: (v: Vista) => void;
}) {
  const conPeso = medidas.filter((m) => m.peso !== null);
  const pesos = conPeso.map((m) => Number(m.peso));
  const pesoActual = pesos.length > 0 ? pesos[pesos.length - 1] : null;

  /* Variación de los últimos 30 días, no desde el inicio: el cambio
   * desde el alta ya lo cuenta la gráfica, lo que interesa al abrir la
   * ficha es hacia dónde va ahora. */
  const hace30 = new Date(ahora - 30 * 86400000).toLocaleDateString("sv-SE");
  const pesosMes = conPeso.filter((m) => m.fecha >= hace30);
  const variacionMes =
    pesosMes.length >= 2
      ? Number(pesosMes[pesosMes.length - 1].peso) - Number(pesosMes[0].peso)
      : null;

  const hoy = (new Date(ahora).getDay() + 6) % 7;
  const hechos = diasEntrenados.filter(Boolean).length;
  const diasSemana = rutina ? rutina.dias.filter((d) => d.semana === rutina.semana_actual).length : 0;
  const totalSemanas = rutina ? Math.max(1, ...rutina.dias.map((d) => d.semana)) : 0;

  return (
    <>
      {/* Tres cifras, cada una con su contexto debajo */}
      <div className="grid grid-cols-3 gap-2 mb-3.5">
        <div className="tarjeta !mb-0 !p-3 min-w-0">
          <div className="titulo-tarjeta !text-[10px] !mb-1">Peso</div>
          <div className="num-grande !text-[21px] leading-none tabular-nums">
            {pesoActual !== null ? kg(pesoActual) : "Sin peso"}
          </div>
          <div className="text-atenuado text-[11.5px] mt-1.5 leading-snug">
            {variacionMes === null
              ? pesoActual !== null
                ? `${haceDias(conPeso[conPeso.length - 1].fecha, ahora)}`
                : "sin registros"
              : Math.abs(variacionMes) < 0.05
                ? "estable en 30 d"
                : `${conSigno(variacionMes)} en 30 d`}
          </div>
        </div>
        <div className="tarjeta !mb-0 !p-3 min-w-0">
          <div className="titulo-tarjeta !text-[10px] !mb-1">Semana</div>
          <div className="num-grande !text-[21px] leading-none tabular-nums">
            {hechos}
            <span className="text-atenuado text-[14px] font-semibold">
              {diasSemana > 0 ? ` / ${diasSemana}` : ""}
            </span>
          </div>
          <div className="text-atenuado text-[11.5px] mt-1.5 leading-snug">entrenos</div>
        </div>
        <div className="tarjeta !mb-0 !p-3 min-w-0">
          <div className="titulo-tarjeta !text-[10px] !mb-1">Último</div>
          <div
            className={`font-bold text-[15px] leading-tight first-letter:uppercase ${
              ultimaSesion ? "" : "text-atenuado"
            }`}
          >
            {ultimaSesion ? haceDias(ultimaSesion.fecha, ahora) : "Nunca"}
          </div>
          <div className="text-atenuado text-[11.5px] mt-1 leading-snug break-words">
            {ultimaSesion ? ultimaSesion.nombreDia : "sin entrenos"}
          </div>
        </div>
      </div>

      {/* La semana día a día: con puntos de 10 px no se distinguía qué
        * día era cuál desde el móvil. */}
      <section className="tarjeta !p-4">
        <div className="grid grid-cols-7 gap-1.5">
          {DIAS.map((d, i) => (
            <div key={d} className="flex flex-col items-center gap-1.5">
              <span
                className={`text-[10.5px] font-semibold ${i === hoy ? "text-acento" : "text-atenuado"}`}
              >
                {d}
              </span>
              <span
                className={`w-full aspect-square max-w-[34px] rounded-[9px] flex items-center justify-center border ${
                  diasEntrenados[i]
                    ? "bg-acento/15 border-acento/45 text-acento"
                    : i === hoy
                      ? "border-acento/45 border-dashed"
                      : "border-borde-2"
                }`}
              >
                {diasEntrenados[i] && <Check size={13} strokeWidth={3} />}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Lo que tiene pautado — cada fila abre su pestaña */}
      <div className="titulo-seccion">Su plan</div>
      <div className="superficie px-4 mb-3.5">
        <button className="fila w-full text-left anim-pulsable" onClick={() => abrir("entreno")}>
          <IconoTarjeta
            Icono={IconoMancuerna}
            color={rutina ? "var(--color-acento)" : "var(--color-aviso)"}
            tamano={34}
          />
          <div className="flex-1 min-w-0">
            {rutina ? (
              <>
                <div className="text-[14px] font-semibold leading-tight break-words">
                  {rutina.nombre || "Rutina sin nombre"}
                </div>
                <div className="text-atenuado text-[12.5px] leading-snug">
                  Semana {rutina.semana_actual}
                  {totalSemanas > 1 ? ` de ${totalSemanas}` : ""} · {diasSemana}{" "}
                  {diasSemana === 1 ? "día" : "días"} por semana
                </div>
              </>
            ) : (
              <>
                <div className="text-[14px] font-semibold leading-tight text-aviso">
                  Sin rutina asignada
                </div>
                <div className="text-atenuado text-[12.5px] leading-snug">
                  Asígnale una plantilla desde Entreno
                </div>
              </>
            )}
          </div>
          <ChevronRight size={16} className="text-atenuado shrink-0" />
        </button>

        <button className="fila w-full text-left anim-pulsable" onClick={() => abrir("dieta")}>
          <IconoTarjeta
            Icono={UtensilsCrossed}
            color={dieta ? "var(--color-verde)" : "var(--color-aviso)"}
            tamano={34}
          />
          <div className="flex-1 min-w-0">
            {dieta ? (
              <>
                <div className="text-[14px] leading-tight">
                  <b>{dieta.kcal_obj} kcal</b>
                  <span className="text-atenuado text-[12.5px]">
                    {" "}
                    · P{dieta.prot_obj} C{dieta.carb_obj} G{dieta.gras_obj}
                  </span>
                </div>
                <div className="text-atenuado text-[12.5px] leading-snug">
                  {dietaDescanso
                    ? `Descanso: ${dietaDescanso.kcal_obj} kcal`
                    : "Sin dieta de descanso"}
                  {ultimaRevision
                    ? ` · ajuste ${haceDias(ultimaRevision.creado_en, ahora)}`
                    : ""}
                </div>
              </>
            ) : (
              <>
                <div className="text-[14px] font-semibold leading-tight text-aviso">
                  Sin dieta asignada
                </div>
                <div className="text-atenuado text-[12.5px] leading-snug">
                  Asígnale una plantilla desde Dieta
                </div>
              </>
            )}
          </div>
          <ChevronRight size={16} className="text-atenuado shrink-0" />
        </button>
      </div>

      {/* Seguimiento: cómo va y qué te ha dicho. La gráfica del peso es
        * la puerta a Progreso (medidas, fotos, récords, cuestionarios y
        * hábitos), y el chat enseña el último mensaje sin abrirlo. */}
      <div className="titulo-seccion">Seguimiento</div>
      <div className="superficie px-4 mb-3.5">
        <button className="w-full text-left py-3.5 border-b border-borde anim-pulsable" onClick={() => abrir("progreso")}>
          <div className="flex items-center gap-3">
            <IconoTarjeta Icono={TrendingUp} color="var(--color-turquesa)" tamano={34} />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold leading-tight">Progreso</div>
              <div className="text-atenuado text-[12.5px] leading-snug">
                Peso, medidas, fotos, récords y hábitos
              </div>
            </div>
            <ChevronRight size={16} className="text-atenuado shrink-0" />
          </div>
          {pesos.length >= 2 ? (
            <div className="mt-2.5">
              <Sparkline datos={pesos} color="var(--color-turquesa)" />
              <div className="flex justify-between items-baseline text-[12.5px] mt-1">
                <span className="text-atenuado">
                  Inicio <b className="text-texto-2">{kg(pesos[0])} kg</b>
                </span>
                <span className="text-atenuado">
                  Cambio{" "}
                  <b className="text-texto-2">{conSigno(pesos[pesos.length - 1] - pesos[0])} kg</b>
                </span>
              </div>
            </div>
          ) : (
            <div className="text-atenuado text-[12.5px] mt-2">
              {pesos.length === 0
                ? "Todavía no se ha pesado."
                : "Un solo peso: la gráfica sale a partir del segundo."}
            </div>
          )}
        </button>

        <button className="fila w-full text-left anim-pulsable" onClick={() => abrir("chat")}>
          <IconoTarjeta Icono={MessageCircle} color="var(--color-acento)" tamano={34} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold leading-tight flex items-center gap-2">
              Chat
              {chatPendiente && (
                <span className="text-acento text-[12px] font-semibold">· te ha escrito</span>
              )}
            </div>
            <div className="text-atenuado text-[12.5px] leading-snug break-words line-clamp-2">
              {ultimoMensaje
                ? `${ultimoMensaje.remitente === "entrenador" ? "Tú: " : ""}${textoVisible(ultimoMensaje.texto)}`
                : "Sin mensajes todavía"}
            </div>
          </div>
          {chatPendiente && <span className="w-2 h-2 rounded-full bg-acento shrink-0" />}
          <ChevronRight size={16} className="text-atenuado shrink-0" />
        </button>
      </div>
    </>
  );
}
