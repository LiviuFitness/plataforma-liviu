"use client";

import { useState } from "react";
import Link from "next/link";
import { AnilloAdherencia } from "@/componentes/ui";
import EditorRutina from "@/componentes/EditorRutina";
import EditorDieta from "@/componentes/EditorDieta";
import TabResumen from "./TabResumen";
import TabProgreso from "./TabProgreso";
import type { Alimento } from "@/lib/dietas";
import type {
  Alerta,
  Dieta,
  Ejercicio,
  Medida,
  Perfil,
  RutinaUI,
} from "@/lib/tipos";

const PESTANAS = [
  ["resumen", "Resumen"],
  ["entreno", "Entreno"],
  ["dieta", "Dieta"],
  ["progreso", "Progreso"],
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
  biblioteca,
  alimentos,
}: {
  perfil: Perfil;
  medidas: Medida[];
  alertas: Alerta[];
  adherencia: number;
  diasEntrenados: boolean[];
  rutina: RutinaUI | null;
  dieta: Dieta | null;
  biblioteca: Ejercicio[];
  alimentos: Alimento[];
}) {
  const [pestana, setPestana] = useState<Pestana>("resumen");
  // Cuando el editor de día está abierto ocultamos cabecera y pestañas
  const [editandoDia, setEditandoDia] = useState(false);

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

          <nav className="flex gap-1.5 my-4">
            {PESTANAS.map(([clave, etiqueta]) => (
              <button
                key={clave}
                className={pestana === clave ? "tab tab-activa" : "tab"}
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
          alEditarDia={setEditandoDia}
        />
      )}

      {pestana === "dieta" && (
        <EditorDieta
          dieta={dieta}
          clienteId={perfil.id}
          alimentos={alimentos}
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
      )}

      {pestana === "progreso" && (
        <TabProgreso
          clienteId={perfil.id}
          medidas={medidas}
          perfil={perfil}
          dietaId={dieta?.id ?? null}
          dietaKcal={dieta?.kcal_obj ?? null}
        />
      )}
    </>
  );
}
