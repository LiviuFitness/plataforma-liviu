"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Logo } from "@/componentes/ui";

type Sexo = "hombre" | "mujer" | "otro";

const PASOS = ["sexo", "nacimiento", "altura", "peso"] as const;

/**
 * Mini-onboarding del cliente (estilo Hevy): sexo → fecha de
 * nacimiento → altura → peso actual, un paso por pantalla, con
 * botones grandes para que sea evidente sin explicación.
 */
export default function OnboardingCliente({ nombre }: { nombre: string }) {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [sexo, setSexo] = useState<Sexo | "">("");
  const [nacimiento, setNacimiento] = useState("");
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const clave = PASOS[paso];
  const esUltimo = paso === PASOS.length - 1;

  const puedeContinuar =
    (clave === "sexo" && sexo !== "") ||
    (clave === "nacimiento" && nacimiento !== "") ||
    (clave === "altura" && Number(altura.replace(",", ".")) > 0) ||
    (clave === "peso" && Number(peso.replace(",", ".")) > 0);

  async function continuar() {
    if (!esUltimo) {
      setPaso((p) => p + 1);
      return;
    }
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase.rpc("completar_datos_fisicos", {
      p_fecha_nacimiento: nacimiento,
      p_altura_cm: Number(altura.replace(",", ".")),
      p_sexo: sexo,
      p_peso_kg: Number(peso.replace(",", ".")),
    });
    setGuardando(false);
    if (error) {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      return;
    }
    router.push("/inicio");
    router.refresh();
  }

  function atras() {
    if (paso === 0) return;
    setPaso((p) => p - 1);
  }

  return (
    <div className="max-w-[480px] w-full mx-auto px-[18px] py-8 min-h-screen flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <Logo tamano={30} />
        <span className="text-atenuado text-[12.5px]">
          Paso {paso + 1} de {PASOS.length}
        </span>
      </div>

      <div className="flex-1">
        {paso === 0 && (
          <h1 className="h1 mb-1">Hola{nombre ? `, ${nombre.split(" ")[0]}` : ""} 👋</h1>
        )}

        {clave === "sexo" && (
          <>
            <h2 className="h1 !text-[22px] mb-5">¿Eres hombre o mujer?</h2>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  ["hombre", "Hombre"],
                  ["mujer", "Mujer"],
                  ["otro", "Otro"],
                ] as const
              ).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  className={`text-left px-4 py-4 rounded-[12px] border font-semibold text-[15px] cursor-pointer ${
                    sexo === valor
                      ? "border-acento bg-acento/10 text-acento"
                      : "border-borde-2 bg-panel text-white"
                  }`}
                  onClick={() => setSexo(valor)}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </>
        )}

        {clave === "nacimiento" && (
          <>
            <h2 className="h1 !text-[22px] mb-5">¿Cuándo naciste?</h2>
            <input
              type="date"
              className="input !text-[17px] !py-4"
              value={nacimiento}
              onChange={(e) => setNacimiento(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </>
        )}

        {clave === "altura" && (
          <>
            <h2 className="h1 !text-[22px] mb-5">¿Cuánto mides?</h2>
            <div className="relative">
              <input
                className="input !text-[17px] !py-4 pr-12"
                inputMode="decimal"
                placeholder="175"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-atenuado">
                cm
              </span>
            </div>
          </>
        )}

        {clave === "peso" && (
          <>
            <h2 className="h1 !text-[22px] mb-2">¿Cuánto pesas ahora?</h2>
            <p className="text-atenuado text-[13.5px] mb-4">
              Pésate en las mismas condiciones cada vez (por la mañana, en ayunas) para que las próximas medidas sean comparables.
            </p>
            <div className="relative">
              <input
                className="input !text-[17px] !py-4 pr-12"
                inputMode="decimal"
                placeholder="70"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-atenuado">
                kg
              </span>
            </div>
          </>
        )}

        {error && (
          <div className="text-peligro text-[13.5px] mt-4">— {error}</div>
        )}
      </div>

      <p className="text-atenuado text-[12px] text-center mb-3">
        Tus datos son privados y sirven para calcular tus objetivos de
        nutrición. Tu entrenador puede corregirlos si algo cambia.
      </p>

      <div className="flex gap-2">
        {paso > 0 && (
          <button className="ghost !py-4 !px-6" onClick={atras}>
            Atrás
          </button>
        )}
        <button
          className="cta !mb-0 flex-1"
          onClick={continuar}
          disabled={!puedeContinuar || guardando}
        >
          {guardando ? "Guardando…" : esUltimo ? "Empezar" : "Continuar"}
        </button>
      </div>
    </div>
  );
}
