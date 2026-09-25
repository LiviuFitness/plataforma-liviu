"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { AnilloAdherencia } from "@/componentes/ui";
import EditorRutina from "@/componentes/EditorRutina";
import EditorDieta from "@/componentes/EditorDieta";
import TabResumen from "./TabResumen";
import TabProgreso from "./TabProgreso";
import TabHabitos from "./TabHabitos";
import HiloChat from "@/componentes/HiloChat";
import VistaComoCliente from "@/componentes/VistaComoCliente";
import type { Alimento, Alternativa } from "@/lib/dietas";
import type { ProgresoEntreno } from "@/lib/progresoEntreno";
import type { PlantillaResumen } from "@/componentes/AsignarPlantilla";
import type {
  Alerta,
  Dieta,
  Ejercicio,
  EntradaFotosProgreso,
  Habito,
  HabitoRegistro,
  Medida,
  Mensaje,
  Perfil,
  RespuestaAltaConPregunta,
  RespuestaRevisionConPregunta,
  RevisionKcal,
  RutinaUI,
} from "@/lib/tipos";

export type Vista = "entreno" | "dieta" | "progreso" | "chat";

const TITULOS: Record<Vista, string> = {
  entreno: "Entreno",
  dieta: "Dieta",
  progreso: "Progreso",
  chat: "Chat",
};

function esVista(v: string | null): v is Vista {
  return v === "entreno" || v === "dieta" || v === "progreso" || v === "chat";
}

/**
 * Ficha de cliente: una pantalla principal y cuatro secciones.
 *
 * Antes eran seis pestañas en fila (Resumen, Entreno, Dieta, Progreso,
 * Hábitos, Chat) más dos subpestañas dentro de Dieta, y en el móvil la
 * última se salía de la pantalla. Ahora la ficha ES el resumen: se abre
 * con lo que hay que saber de la persona, y Entreno, Dieta, Progreso y
 * Chat se abren desde ahí a pantalla completa, con "← Nombre" para
 * volver. Hábitos vive dentro de Progreso, que es donde se mira cómo va.
 *
 * La sección va en la URL (?vista=dieta) con history.pushState: así el
 * gesto de atrás del iPhone vuelve a la ficha y no a la lista de
 * clientes, y no se vuelven a pedir los datos al servidor al cambiar.
 */
export default function FichaCliente({
  perfil,
  medidas,
  alertas,
  adherencia,
  diasEntrenados,
  rutina,
  plantillasRutina,
  plantillasDieta,
  dieta,
  dietaDescanso,
  biblioteca,
  alimentos,
  excluidos,
  ejerciciosExcluidos,
  entradasFotos,
  progresoEntreno,
  habitos,
  registrosHabitos,
  mensajes,
  revisiones,
  respuestasCuestionario,
  respuestasAlta,
  ahora,
  diasHechosSemana,
  ultimoDiaId,
  alternativas,
  respuestasRapidas,
}: {
  perfil: Perfil;
  medidas: Medida[];
  alertas: Alerta[];
  adherencia: number;
  diasEntrenados: boolean[];
  rutina: RutinaUI | null;
  plantillasRutina: PlantillaResumen[];
  plantillasDieta: PlantillaResumen[];
  dieta: Dieta | null;
  dietaDescanso: Dieta | null;
  biblioteca: Ejercicio[];
  alimentos: Alimento[];
  excluidos: string[];
  ejerciciosExcluidos: string[];
  entradasFotos: EntradaFotosProgreso[];
  progresoEntreno: ProgresoEntreno;
  habitos: Habito[];
  registrosHabitos: HabitoRegistro[];
  mensajes: Mensaje[];
  revisiones: RevisionKcal[];
  respuestasCuestionario: RespuestaRevisionConPregunta[];
  respuestasAlta: RespuestaAltaConPregunta[];
  /** Instante del servidor, para que "hace 3 días" diga lo mismo al
   * pintar allí y al hidratar aquí. */
  ahora: number;
  /** Para "Ver como el cliente" */
  diasHechosSemana: string[];
  ultimoDiaId: string | null;
  alternativas: Alternativa[];
  respuestasRapidas: string[];
}) {
  const router = useRouter();
  const parametros = useSearchParams();
  const crudo = parametros.get("vista");
  const vista: Vista | null = esVista(crudo) ? crudo : null;

  // Cuando el editor de día está abierto ocultamos la cabecera
  const [editandoDia, setEditandoDia] = useState(false);
  // Dieta: día de entreno o día de descanso
  const [tipoDieta, setTipoDieta] = useState<"entreno" | "descanso">("entreno");
  const [viendoComoCliente, setViendoComoCliente] = useState(false);

  const nombrePila = perfil.nombre.split(" ")[0];
  const ultimoMensaje = mensajes[mensajes.length - 1] ?? null;
  const chatPendiente = ultimoMensaje?.remitente === "cliente";

  const desde = new Date(perfil.fecha_alta).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  function abrir(v: Vista | null) {
    setEditandoDia(false);
    window.history.pushState(null, "", v ? `?vista=${v}` : window.location.pathname);
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------ pantalla principal */
  if (vista === null) {
    return (
      <>
        <Link href="/clientes" className="text-atenuado text-[13.5px] inline-flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> Clientes
        </Link>
        <div className="flex justify-between items-center gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="h1 break-words">{perfil.nombre}</h1>
            <div className="sub !mb-0 break-words">
              {perfil.objetivo ?? "Sin objetivo"}
              {perfil.plan ? ` · plan ${perfil.plan}` : ""} · desde {desde}
            </div>
            {perfil.estado !== "activo" && (
              <span
                className={`chip !cursor-default mt-2 inline-flex ${
                  perfil.estado === "baja" ? "!text-peligro" : "!text-aviso"
                }`}
              >
                {perfil.estado === "baja" ? "De baja" : "Pausado"}
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <AnilloAdherencia valor={adherencia} tamano={52} />
            <span className="text-atenuado text-[10px] font-semibold uppercase tracking-[0.06em]">
              28 días
            </span>
          </div>
        </div>

        <TabResumen
          perfil={perfil}
          medidas={medidas}
          alertas={alertas}
          diasEntrenados={diasEntrenados}
          respuestasAlta={respuestasAlta}
          rutina={rutina}
          dieta={dieta}
          dietaDescanso={dietaDescanso}
          ultimaSesion={progresoEntreno.historial[0] ?? null}
          ultimaRevision={revisiones[0] ?? null}
          ultimoMensaje={ultimoMensaje}
          chatPendiente={chatPendiente}
          ahora={ahora}
          abrir={abrir}
        />
      </>
    );
  }

  /* ------------------------------------------------------- una sección */
  return (
    <>
      {/* Solo Entreno oculta la cabecera, y solo con un día abierto: si
        * se sale con el gesto de atrás a mitad de edición, el aviso se
        * queda en true y no debe esconder la de otra sección. */}
      {!(editandoDia && vista === "entreno") && (
        <div className="mb-4">
          <button
            className="text-atenuado text-[13.5px] inline-flex items-center gap-1 mb-2 cursor-pointer"
            onClick={() => abrir(null)}
          >
            <ArrowLeft size={14} /> {nombrePila}
          </button>
          {/* La sección de título y el nombre completo debajo: con el
            * botón "Ver como" al lado, "Entreno · Lucía Fernández de
            * Córdoba" en una sola línea se partía por la mitad. */}
          <div className="flex items-center justify-between gap-2">
            <h1 className="h1 !mb-0 break-words min-w-0">{TITULOS[vista]}</h1>
            {(vista === "entreno" || vista === "dieta") && (
              <button
                className="chip !text-acento !border-acento/40 flex items-center gap-1.5 shrink-0"
                onClick={() => {
                  /* Lo guardado en el editor no está aún en los datos de
                   * la página: se piden de nuevo antes de enseñarlo. */
                  router.refresh();
                  setViendoComoCliente(true);
                }}
              >
                <Eye size={14} /> Ver como {nombrePila}
              </button>
            )}
          </div>
          <div className="sub !mb-0 mt-0.5 break-words">{perfil.nombre}</div>
        </div>
      )}

      {viendoComoCliente && (vista === "entreno" || vista === "dieta") && (
        <VistaComoCliente
          que={vista}
          nombreCliente={perfil.nombre}
          rutina={rutina}
          diasHechosSemana={diasHechosSemana}
          ultimoDiaId={ultimoDiaId}
          dieta={dieta}
          dietaDescanso={dietaDescanso}
          alternativas={alternativas}
          onSalir={() => setViendoComoCliente(false)}
        />
      )}

      {vista === "entreno" && (
        <EditorRutina
          rutina={rutina}
          plantillas={plantillasRutina}
          clienteId={perfil.id}
          nombreCliente={perfil.nombre}
          biblioteca={biblioteca}
          ejerciciosExcluidos={ejerciciosExcluidos}
          alEditarDia={setEditandoDia}
        />
      )}

      {vista === "dieta" && (
        <>
          {/* Dos botones de igual peso en vez de una segunda fila de
            * pestañas subrayadas debajo de la primera. */}
          <div className="flex gap-2 mb-4">
            <button
              className={`tab ${tipoDieta === "entreno" ? "tab-activa" : ""}`}
              onClick={() => setTipoDieta("entreno")}
            >
              Día de entreno
            </button>
            <button
              className={`tab ${tipoDieta === "descanso" ? "tab-activa" : ""}`}
              onClick={() => setTipoDieta("descanso")}
            >
              Día de descanso
            </button>
          </div>
          <EditorDieta
            key={tipoDieta}
            dieta={tipoDieta === "entreno" ? dieta : dietaDescanso}
            plantillas={plantillasDieta}
            tipoDieta={tipoDieta}
            puedeCopiarDeEntreno={!!dieta}
            otraDieta={
              tipoDieta === "entreno"
                ? dietaDescanso
                  ? { id: dietaDescanso.id, tipo: "descanso" }
                  : null
                : dieta
                  ? { id: dieta.id, tipo: "entreno" }
                  : null
            }
            clienteId={perfil.id}
            alimentos={alimentos}
            excluidos={excluidos}
            autoCalculo={{
              pesoKg: (() => {
                // Último peso registrado en medidas
                const conPeso = medidas.filter((m) => m.peso !== null);
                return conPeso.length > 0
                  ? Number(conPeso[conPeso.length - 1].peso)
                  : null;
              })(),
              alturaCm: perfil.altura_cm,
              fechaNacimiento: perfil.fecha_nacimiento,
              sexo: perfil.sexo,
              factorActividad: Number(perfil.factor_actividad ?? 1.55),
              objetivo: perfil.objetivo,
            }}
          />
        </>
      )}

      {vista === "progreso" && (
        <>
          <TabProgreso
            clienteId={perfil.id}
            medidas={medidas}
            perfil={perfil}
            dietaId={dieta?.id ?? null}
            dietaKcal={dieta?.kcal_obj ?? null}
            entradasFotos={entradasFotos}
            progresoEntreno={progresoEntreno}
            revisiones={revisiones}
            respuestasCuestionario={respuestasCuestionario}
          />
          <div className="titulo-seccion mt-6">Hábitos</div>
          <TabHabitos habitos={habitos} registros={registrosHabitos} />
        </>
      )}

      {vista === "chat" && (
        <HiloChat
          clienteId={perfil.id}
          mensajesIniciales={mensajes}
          remitentePropio="entrenador"
          nombreOtro={perfil.nombre}
          anchoMaximo="max-w-[480px] md:max-w-[760px]"
          respuestasRapidas={respuestasRapidas}
        />
      )}
    </>
  );
}
