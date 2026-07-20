"use client";

import { useState } from "react";
import Link from "next/link";
import { AnilloAdherencia } from "@/componentes/ui";
import EditorRutina from "@/componentes/EditorRutina";
import EditorDieta from "@/componentes/EditorDieta";
import TabResumen from "./TabResumen";
import TabProgreso from "./TabProgreso";
import TabHabitos from "./TabHabitos";
import HiloChat from "@/componentes/HiloChat";
import type { Alimento } from "@/lib/dietas";
import type { ProgresoEntreno } from "@/lib/progresoEntreno";
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
  RespuestaRevisionConPregunta,
  RevisionKcal,
  RutinaUI,
} from "@/lib/tipos";

const PESTANAS = [
  ["resumen", "Resumen"],
  ["entreno", "Entreno"],
  ["dieta", "Dieta"],
  ["progreso", "Progreso"],
  ["habitos", "Hábitos"],
  ["chat", "Chat"],
] as const;

type Pestana = (typeof PESTANAS)[number][0];

/** Ficha de cliente con pestañas (prototipo v1/v2). */
export default function FichaCliente({
  perfil,
  medidas,
  alertas,
  adherencia,
  diasEntrenados,
  rutina,
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
}: {
  perfil: Perfil;
  medidas: Medida[];
  alertas: Alerta[];
  adherencia: number;
  diasEntrenados: boolean[];
  rutina: RutinaUI | null;
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
}) {
  const [pestana, setPestana] = useState<Pestana>("resumen");
  // Cuando el editor de día está abierto ocultamos cabecera y pestañas
  const [editandoDia, setEditandoDia] = useState(false);
  // Sub-pestaña de la dieta: día de entreno o día de descanso
  const [tipoDieta, setTipoDieta] = useState<"entreno" | "descanso">("entreno");

  return (
    <>
      {!editandoDia && (
        <>
          <Link
            href="/clientes"
            className="text-atenuado text-[13.5px] inline-block mb-2"
          >
            ← Clientes
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="h1">{perfil.nombre}</h1>
              <div className="sub">
                {perfil.objetivo ?? "Sin objetivo"}
                {perfil.plan ? ` — plan ${perfil.plan}` : ""}
              </div>
            </div>
            <AnilloAdherencia valor={adherencia} tamano={52} />
          </div>

          <nav className="tabs-texto my-4">
            {PESTANAS.map(([clave, etiqueta]) => (
              <button
                key={clave}
                className={pestana === clave ? "tab-texto tab-texto-activa" : "tab-texto"}
                onClick={() => setPestana(clave)}
              >
                {etiqueta}
              </button>
            ))}
          </nav>
        </>
      )}

      {pestana === "resumen" && (
        <TabResumen perfil={perfil} medidas={medidas} alertas={alertas} diasEntrenados={diasEntrenados} />
      )}

      {pestana === "entreno" && (
        <EditorRutina
          rutina={rutina}
          clienteId={perfil.id}
          nombreCliente={perfil.nombre}
          biblioteca={biblioteca}
          ejerciciosExcluidos={ejerciciosExcluidos}
          alEditarDia={setEditandoDia}
        />
      )}

      {pestana === "dieta" && (
        <>
          {/* Sub-pestaña: dieta de día de entreno vs. día de descanso —
           * mismo lenguaje de subrayado que las pestañas principales,
           * en vez de mezclar con el estilo de chip. */}
          <div className="tabs-texto mb-3.5">
            <button
              className={tipoDieta === "entreno" ? "tab-texto tab-texto-activa" : "tab-texto"}
              onClick={() => setTipoDieta("entreno")}
            >
              Día de entreno
            </button>
            <button
              className={tipoDieta === "descanso" ? "tab-texto tab-texto-activa" : "tab-texto"}
              onClick={() => setTipoDieta("descanso")}
            >
              Día de descanso
            </button>
          </div>
          <EditorDieta
            key={tipoDieta}
            dieta={tipoDieta === "entreno" ? dieta : dietaDescanso}
            tipoDieta={tipoDieta}
            puedeCopiarDeEntreno={!!dieta}
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

      {pestana === "progreso" && (
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
      )}

      {pestana === "habitos" && (
        <TabHabitos habitos={habitos} registros={registrosHabitos} />
      )}

      {pestana === "chat" && (
        <HiloChat
          clienteId={perfil.id}
          mensajesIniciales={mensajes}
          remitentePropio="entrenador"
          nombreOtro={perfil.nombre}
          anchoMaximo="max-w-[480px] md:max-w-[760px]"
        />
      )}
    </>
  );
}
