"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Sparkline } from "@/componentes/ui";
import { OBJETIVOS, type Alerta, type Estado, type Medida, type Perfil, type Plan } from "@/lib/tipos";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

/** Pestaña Resumen: peso, adherencia semanal, alertas, notas y datos. */
export default function TabResumen({
  perfil,
  medidas,
  alertas,
  diasEntrenados,
}: {
  perfil: Perfil;
  medidas: Medida[];
  alertas: Alerta[];
  diasEntrenados: boolean[];
}) {
  const router = useRouter();
  const pesos = medidas
    .filter((m) => m.peso !== null)
    .map((m) => Number(m.peso));

  /* --- Notas privadas con autoguardado (debounce) --- */
  const [notas, setNotas] = useState(perfil.notas_entrenador ?? "");
  const [estadoNotas, setEstadoNotas] = useState<"" | "guardando" | "ok">("");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cambiarNotas(valor: string) {
    setNotas(valor);
    setEstadoNotas("guardando");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      const supabase = crearClienteNavegador();
      const { error } = await supabase
        .from("profiles")
        .update({ notas_entrenador: valor })
        .eq("id", perfil.id);
      setEstadoNotas(error ? "" : "ok");
    }, 800);
  }
  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  /* --- Datos del cliente editables --- */
  const [nombre, setNombre] = useState(perfil.nombre);
  const [objetivo, setObjetivo] = useState(perfil.objetivo ?? OBJETIVOS[0]);
  const [plan, setPlan] = useState<Plan>(perfil.plan ?? "mensual");
  const [estado, setEstado] = useState<Estado>(perfil.estado);
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [datosOk, setDatosOk] = useState(false);

  async function guardarDatos() {
    setGuardandoDatos(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("profiles")
      .update({ nombre: nombre.trim(), objetivo, plan, estado })
      .eq("id", perfil.id);
    setGuardandoDatos(false);
    if (!error) {
      setDatosOk(true);
      setTimeout(() => setDatosOk(false), 2000);
      router.refresh();
    }
  }

  return (
    <>
      <section className="tarjeta">
        <div className="titulo-tarjeta">PESO — evolución</div>
        <Sparkline datos={pesos} />
        {pesos.length >= 2 && (
          <div className="flex justify-between items-center">
            <span className="text-atenuado text-[13.5px]">
              Inicio {pesos[0]} kg
            </span>
            <span className="num-grande">{pesos[pesos.length - 1]} kg</span>
          </div>
        )}
      </section>

      <section className="tarjeta">
        <div className="titulo-tarjeta">ADHERENCIA — esta semana</div>
        <div className="flex justify-between px-1.5 py-1">
          {diasEntrenados.map((activo, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  activo
                    ? "bg-acento shadow-[0_0_8px_rgba(41,171,226,0.7)]"
                    : "bg-borde-2"
                }`}
              />
              <span className="text-[11px] text-atenuado">{DIAS[i]}</span>
            </div>
          ))}
        </div>
      </section>

      {alertas.length > 0 && (
        <section className="tarjeta !border-peligro/35">
          <div className="titulo-tarjeta !text-peligro">NECESITA ATENCIÓN</div>
          {alertas.map((a, i) => (
            <div key={i} className="text-texto-2 text-[13px] mt-0.5">
              — {a.mensaje}
            </div>
          ))}
        </section>
      )}

      <section className="tarjeta">
        <div className="titulo-tarjeta flex justify-between">
          <span>NOTAS DEL ENTRENADOR</span>
          <span className="text-[11px] normal-case tracking-normal">
            {estadoNotas === "guardando" && "Guardando…"}
            {estadoNotas === "ok" && "Guardado ✓"}
          </span>
        </div>
        <textarea
          className="w-full bg-campo border border-borde-2 rounded-[10px] text-white p-2.5 px-3 text-[14px] resize-y font-cuerpo"
          rows={3}
          placeholder="Escribe una nota interna… (el cliente no la ve)"
          value={notas}
          onChange={(e) => cambiarNotas(e.target.value)}
        />
      </section>

      <section className="tarjeta">
        <div className="titulo-tarjeta">DATOS DEL CLIENTE</div>
        <label className="text-[13px] text-texto-2 block mb-1">Nombre</label>
        <input
          className="input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <label className="text-[13px] text-texto-2 block mb-1">Email</label>
        <input className="input opacity-60" value={perfil.email} disabled />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[13px] text-texto-2 block mb-1">
              Objetivo
            </label>
            <select
              className="input"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
            >
              {OBJETIVOS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[13px] text-texto-2 block mb-1">Plan</label>
            <select
              className="input"
              value={plan}
              onChange={(e) => setPlan(e.target.value as Plan)}
            >
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
            </select>
          </div>
        </div>
        <label className="text-[13px] text-texto-2 block mb-1">Estado</label>
        <select
          className="input"
          value={estado}
          onChange={(e) => setEstado(e.target.value as Estado)}
        >
          <option value="activo">Activo</option>
          <option value="pausado">Pausado</option>
          <option value="baja">Baja</option>
        </select>
        <button className="cta" onClick={guardarDatos} disabled={guardandoDatos}>
          {datosOk ? "Guardado ✓" : guardandoDatos ? "Guardando…" : "Guardar datos"}
        </button>
      </section>
    </>
  );
}
