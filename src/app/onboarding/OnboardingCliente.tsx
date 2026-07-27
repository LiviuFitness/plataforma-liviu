"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell,
  Flame,
  MessageCircle,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { IconoTarjeta, Logo } from "@/componentes/ui";
import type { PreguntaAlta } from "@/lib/tipos";

type Sexo = "hombre" | "mujer" | "otro";

const PASOS_FIJOS = ["sexo", "nacimiento", "altura", "peso"] as const;
const PASOS_TOUR = ["tour-rutina", "tour-dieta", "tour-progreso", "tour-chat"] as const;
const PREFIJO_ALTA = "alta:";

// Mismo color por dominio que el resto de la app (Inicio, Mi Progreso…):
// entreno = acento, dieta = verde, progreso/racha = dorado.
const TOUR: Record<string, { Icono: LucideIcon; color: string; titulo: string; texto: string }> = {
  "tour-rutina": {
    Icono: Dumbbell,
    color: "var(--color-acento)",
    titulo: "Tu rutina",
    texto: "Tu entrenador te asigna la rutina semana a semana. En Inicio siempre verás tu próximo entreno listo para empezar.",
  },
  "tour-dieta": {
    Icono: UtensilsCrossed,
    color: "var(--color-verde)",
    titulo: "Tu dieta",
    texto: "Comidas con gramos exactos de cada alimento, con equivalencias intercambiables y un plan distinto para tus días de entreno y de descanso.",
  },
  "tour-progreso": {
    Icono: Flame,
    color: "var(--color-dorado)",
    titulo: "Progreso y hábitos",
    texto: "Registra tu peso y mira tu evolución, y marca a diario tus hábitos (pasos, agua, sueño…) desde la tarjeta de Inicio.",
  },
  "tour-chat": {
    Icono: MessageCircle,
    color: "var(--color-acento)",
    titulo: "Habla con tu entrenador",
    texto: "Desde la pestaña Chat puedes escribirle directamente cuando lo necesites: dudas, molestias o lo que quieras contarle.",
  },
};

/**
 * Mini-onboarding del cliente (estilo Hevy): sexo → fecha de
 * nacimiento → altura → peso actual, un paso por pantalla, con
 * botones grandes para que sea evidente sin explicación. Termina con
 * un tour de bienvenida (rutina/dieta/progreso-hábitos/chat) antes
 * de entrar a la app.
 */
export default function OnboardingCliente({
  nombre,
  preguntasAlta,
}: {
  nombre: string;
  preguntasAlta: PreguntaAlta[];
}) {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [sexo, setSexo] = useState<Sexo | "">("");
  const [nacimiento, setNacimiento] = useState("");
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [respuestasAlta, setRespuestasAlta] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Pasos fijos + una pantalla por cada pregunta de alta activa + el tour.
  const pasos = useMemo(
    () => [
      ...PASOS_FIJOS,
      ...preguntasAlta.map((p) => `${PREFIJO_ALTA}${p.id}`),
      ...PASOS_TOUR,
    ],
    [preguntasAlta]
  );

  const clave = pasos[paso];
  const esUltimo = paso === pasos.length - 1;
  const esAlta = clave.startsWith(PREFIJO_ALTA);
  const preguntaAltaActual = esAlta
    ? preguntasAlta.find((p) => p.id === clave.slice(PREFIJO_ALTA.length))
    : undefined;

  const puedeContinuar =
    (clave === "sexo" && sexo !== "") ||
    (clave === "nacimiento" && nacimiento !== "") ||
    (clave === "altura" && Number(altura.replace(",", ".")) > 0) ||
    (clave === "peso" && Number(peso.replace(",", ".")) > 0) ||
    esAlta || // opcional: se puede dejar sin responder
    clave in TOUR;

  async function continuar() {
    if (!esUltimo) {
      setPaso((p) => p + 1);
      return;
    }
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const {
      data: { user: usuarioAuth },
    } = await supabase.auth.getUser();
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
    // Cuestionario de alta: opcional, no bloquea el onboarding si falla.
    const clienteId = usuarioAuth?.id;
    const respuestas = Object.entries(respuestasAlta)
      .map(([pregunta_id, respuesta]) => ({ pregunta_id, respuesta: respuesta.trim() }))
      .filter((r) => r.respuesta !== "");
    if (clienteId && respuestas.length > 0) {
      await supabase.from("respuestas_alta").insert(
        respuestas.map((r) => ({ cliente_id: clienteId, ...r }))
      );
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
      <div className="flex justify-between items-center mb-4">
        <Logo tamano={30} />
        <span className="text-atenuado text-[12.5px] tabular-nums">
          {paso + 1}/{pasos.length}
        </span>
      </div>
      <div className="barra-capsula mb-8">
        <div
          className="barra-capsula-relleno"
          style={
            {
              "--tc": "var(--color-acento)",
              width: `${((paso + 1) / pasos.length) * 100}%`,
            } as React.CSSProperties
          }
        />
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
                  className={`text-left px-4 py-4 rounded-[12px] border font-semibold text-[15px] cursor-pointer anim-pulsable transition-colors ${
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

        {esAlta && preguntaAltaActual && (
          <>
            <h2 className="h1 !text-[22px] mb-5">{preguntaAltaActual.texto}</h2>
            <textarea
              className="input !text-[15.5px]"
              rows={4}
              placeholder="Tu respuesta (opcional)…"
              value={respuestasAlta[preguntaAltaActual.id] ?? ""}
              onChange={(e) =>
                setRespuestasAlta({ ...respuestasAlta, [preguntaAltaActual.id]: e.target.value })
              }
              autoFocus
            />
          </>
        )}

        {clave in TOUR && (
          <div className="flex flex-col items-center text-center pt-10 anim-aparecer">
            {(() => {
              const { Icono, color, titulo, texto } = TOUR[clave];
              return (
                <>
                  <div className="mb-5">
                    <IconoTarjeta Icono={Icono} color={color} tamano={64} />
                  </div>
                  <h2 className="h1 !text-[22px] mb-2.5">{titulo}</h2>
                  <p className="text-atenuado text-[14.5px] leading-relaxed max-w-[320px]">
                    {texto}
                  </p>
                </>
              );
            })()}
          </div>
        )}

        {error && (
          <div className="text-peligro text-[13.5px] mt-4">— {error}</div>
        )}
      </div>

      {!(clave in TOUR) && !esAlta && (
        <p className="text-atenuado text-[12px] text-center mb-3">
          Tus datos son privados y sirven para calcular tus objetivos de
          nutrición. Tu entrenador puede corregirlos si algo cambia.
        </p>
      )}
      {esAlta && (
        <p className="text-atenuado text-[12px] text-center mb-3">
          Esto le sirve a tu entrenador para conocerte mejor. Puedes dejarlo en
          blanco y contárselo más adelante.
        </p>
      )}

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
