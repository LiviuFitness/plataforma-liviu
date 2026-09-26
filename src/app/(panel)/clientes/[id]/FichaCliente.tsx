"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Eye, FileText } from "lucide-react";
import { AnilloAdherencia, Avatar } from "@/componentes/ui";
import EditorRutina from "@/componentes/EditorRutina";
import EditorDieta from "@/componentes/EditorDieta";
import TabResumen from "./TabResumen";
import TabProgreso from "./TabProgreso";
import TabHabitos from "./TabHabitos";
import HiloChat from "@/componentes/HiloChat";
import VistaComoCliente from "@/componentes/VistaComoCliente";
import NotasCliente, { type NotaCliente } from "@/componentes/NotasCliente";
import HojaInforme from "@/componentes/HojaInforme";
import ListaArranque, { type PasoArranque } from "./ListaArranque";
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
  notas,
  guias,
  adherenciaDieta,
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
  notas: NotaCliente[];
  guias: { id: string; titulo: string }[];
  /** % de comidas marcadas en 7 días, o null si no usa el check */
  adherenciaDieta: number | null;
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
  const [informeAbierto, setInformeAbierto] = useState(false);
  const [borradorChat, setBorradorChat] = useState("");

  const nombrePila = perfil.nombre.split(" ")[0];
  const ultimoMensaje = mensajes[mensajes.length - 1] ?? null;
  const chatPendiente = ultimoMensaje?.remitente === "cliente";

  const desde = new Date(perfil.fecha_alta).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  /* Lista de arranque: solo en sus primeros 60 días */
  const diasDeAlta = Math.floor((ahora - new Date(perfil.fecha_alta).getTime()) / 86400000);
  const pasosArranque: PasoArranque[] = [
    {
      clave: "rutina",
      texto: "Rutina asignada",
      hecho: !!rutina,
      accion: { tipo: "abrir", vista: "entreno", etiqueta: "Asignar" },
    },
    {
      clave: "dieta",
      texto: "Dieta asignada",
      hecho: !!dieta,
      accion: { tipo: "abrir", vista: "dieta", etiqueta: "Asignar" },
    },
    {
      clave: "alta",
      texto: "Cuestionario de alta respondido",
      hecho: respuestasAlta.length > 0,
    },
    {
      clave: "peso",
      texto: "Primera medida de peso",
      hecho: medidas.some((m) => m.peso !== null),
      accion: {
        tipo: "pedir",
        etiqueta: "Pedírsela",
        mensaje: `Hola ${nombrePila}, apunta tu peso en la app (Inicio › Tu día), mejor por la mañana y en ayunas. Así tengo tu punto de partida 💪`,
      },
    },
    {
      clave: "fotos",
      texto: "Fotos de inicio",
      hecho: entradasFotos.length > 0,
      accion: {
        tipo: "pedir",
        etiqueta: "Pedírselas",
        mensaje: `Hola ${nombrePila}, súbeme tus fotos de inicio (Mi progreso › Fotos): de frente, de lado y de espalda, con buena luz. Solo las vemos tú y yo, y dentro de unas semanas vas a alucinar con el cambio 📸`,
      },
    },
  ];

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
          <div className="min-w-0 flex items-start gap-3">
            <Avatar nombre={perfil.nombre} tamano={52} foto={perfil.avatar_url} />
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
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <AnilloAdherencia valor={adherencia} tamano={52} />
            <span className="text-atenuado text-[10px] font-semibold uppercase tracking-[0.06em]">
              28 días
            </span>
          </div>
        </div>

        {perfil.estado === "activo" && diasDeAlta <= 60 && (
          <ListaArranque
            pila={nombrePila}
            pasos={pasosArranque}
            abrir={abrir}
            pedir={(mensaje) => {
              setBorradorChat(mensaje);
              abrir("chat");
            }}
          />
        )}

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
          adherenciaDieta={adherenciaDieta}
          notasConFecha={<NotasCliente clienteId={perfil.id} nombre={perfil.nombre} notas={notas} />}
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
          {/* El informe para mandarle: lo mismo que sale en Hoy cuando
            * renueva, pero a mano, cuando quieras */}
          <button
            className="fila w-full text-left cursor-pointer anim-pulsable !py-3 mb-3"
            onClick={() => setInformeAbierto(true)}
          >
            <FileText size={17} className="text-acento shrink-0" />
            <span className="flex-1 min-w-0 text-[13.5px] text-texto-2">
              Crear informe de progreso para {nombrePila}
            </span>
            <ChevronRight size={16} className="text-atenuado shrink-0" />
          </button>
          {informeAbierto && (
            <HojaInforme
              clienteId={perfil.id}
              nombre={perfil.nombre}
              onCerrar={() => setInformeAbierto(false)}
            />
          )}
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
          textoInicial={borradorChat}
          guias={guias}
        />
      )}
    </>
  );
}
