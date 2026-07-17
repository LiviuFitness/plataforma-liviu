"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarCheck } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Sparkline } from "@/componentes/ui";
import { OBJETIVOS, type Alerta, type Estado, type Medida, type Perfil, type Plan } from "@/lib/tipos";
import { FACTORES_ACTIVIDAD } from "@/lib/macros";

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

  /* --- Avanzar de semana desde el aviso de "semana completada" --- */
  const [avanzando, setAvanzando] = useState<string | null>(null);
  async function avanzarSemana(rutinaId: string, semanaDestino: number) {
    setAvanzando(rutinaId);
    const supabase = crearClienteNavegador();
    await supabase
      .from("rutinas")
      .update({ semana_actual: semanaDestino })
      .eq("id", rutinaId);
    setAvanzando(null);
    router.refresh();
  }

  /* --- Datos del cliente editables --- */
  const [nombre, setNombre] = useState(perfil.nombre);
  const [objetivo, setObjetivo] = useState(perfil.objetivo ?? OBJETIVOS[0]);
  const [plan, setPlan] = useState<Plan>(perfil.plan ?? "mensual");
  const [estado, setEstado] = useState<Estado>(perfil.estado);
  const [nacimiento, setNacimiento] = useState(perfil.fecha_nacimiento ?? "");
  const [altura, setAltura] = useState(
    perfil.altura_cm === null ? "" : String(perfil.altura_cm)
  );
  const [sexo, setSexo] = useState<string>(perfil.sexo ?? "");
  const [factor, setFactor] = useState(String(perfil.factor_actividad ?? 1.55));
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [datosOk, setDatosOk] = useState(false);

  /* --- Eliminar cliente (irreversible) --- */
  const [confirmacionNombre, setConfirmacionNombre] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");

  async function eliminarCliente() {
    if (
      !confirm(
        `Esto borra para siempre a ${perfil.nombre}: su cuenta, rutina, dieta, medidas y sesiones. No se puede deshacer. ¿Seguro?`
      )
    )
      return;
    setEliminando(true);
    setErrorEliminar("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase.rpc("eliminar_cliente", {
      p_cliente_id: perfil.id,
    });
    setEliminando(false);
    if (error) {
      setErrorEliminar("No se pudo eliminar. Inténtalo de nuevo.");
      return;
    }
    router.push("/clientes");
    router.refresh();
  }

  async function guardarDatos() {
    setGuardandoDatos(true);
    const supabase = crearClienteNavegador();
    const alturaNum = Number(altura.replace(",", "."));
    const { error } = await supabase
      .from("profiles")
      .update({
        nombre: nombre.trim(),
        objetivo,
        plan,
        estado,
        fecha_nacimiento: nacimiento || null,
        altura_cm: altura && Number.isFinite(alturaNum) ? alturaNum : null,
        sexo: sexo || null,
        factor_actividad: Number(factor),
      })
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
      {/* Peso + adherencia agrupados en una sola superficie — dos datos
       * relacionados de la semana, no necesitan dos cajas separadas. */}
      <section className="tarjeta">
        <div className="titulo-tarjeta">Peso — evolución</div>
        <Sparkline datos={pesos} />
        {pesos.length >= 2 && (
          <div className="flex justify-between items-center">
            <span className="text-atenuado text-[13.5px]">
              Inicio {pesos[0]} kg
            </span>
            <span className="num-grande">{pesos[pesos.length - 1]} kg</span>
          </div>
        )}
        <div className="border-t border-borde my-3.5" />
        <div className="titulo-tarjeta">Adherencia — esta semana</div>
        <div className="flex justify-between px-1.5 py-1">
          {diasEntrenados.map((activo, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${activo ? "bg-acento" : "bg-borde-2"}`}
              />
              <span className="text-[11px] text-atenuado">{DIAS[i]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Necesita atención — banners de una línea, no una caja roja */}
      {alertas.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3.5">
          {alertas.map((a, i) =>
            a.tipo === "semana_completa" && a.rutina_id && a.semana_destino ? (
              <div key={i} className="banner banner-accion justify-between">
                <span className="flex items-center gap-1.5 min-w-0">
                  <CalendarCheck size={14} className="shrink-0" />
                  <span className="truncate">{a.mensaje}</span>
                </span>
                <button
                  className="mini !w-auto !px-2.5 shrink-0"
                  onClick={() => avanzarSemana(a.rutina_id!, a.semana_destino!)}
                  disabled={avanzando === a.rutina_id}
                >
                  {avanzando === a.rutina_id
                    ? "Avanzando…"
                    : `Avanzar a semana ${a.semana_destino}`}
                </button>
              </div>
            ) : (
              <div key={i} className="banner banner-peligro">
                <AlertTriangle size={14} className="shrink-0 mt-px" /> {a.mensaje}
              </div>
            )
          )}
        </div>
      )}

      <section className="tarjeta">
        <div className="titulo-tarjeta flex justify-between">
          <span>Notas del entrenador</span>
          <span className="text-[11px] normal-case tracking-normal">
            {estadoNotas === "guardando" && "Guardando…"}
            {estadoNotas === "ok" && "Guardado ✓"}
          </span>
        </div>
        <textarea
          className="input resize-y"
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

        {/* Datos físicos: alimentan el auto-cálculo de macros de la dieta */}
        <div className="titulo-tarjeta !mb-2 mt-3">DATOS FÍSICOS</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[13px] text-texto-2 block mb-1">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              className="input"
              value={nacimiento}
              onChange={(e) => setNacimiento(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[13px] text-texto-2 block mb-1">
              Altura (cm)
            </label>
            <input
              className="input"
              inputMode="decimal"
              placeholder="175"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
            />
          </div>
        </div>
        <label className="text-[13px] text-texto-2 block mb-1">Sexo</label>
        <select
          className="input"
          value={sexo}
          onChange={(e) => setSexo(e.target.value)}
        >
          <option value="">Sin indicar</option>
          <option value="hombre">Hombre</option>
          <option value="mujer">Mujer</option>
          <option value="otro">Otro</option>
        </select>
        <label className="text-[13px] text-texto-2 block mb-1">
          Nivel de actividad
        </label>
        <select
          className="input"
          value={factor}
          onChange={(e) => setFactor(e.target.value)}
        >
          {FACTORES_ACTIVIDAD.map((f) => (
            <option key={f.valor} value={String(f.valor)}>
              {f.etiqueta}
            </option>
          ))}
        </select>

        <button className="cta" onClick={guardarDatos} disabled={guardandoDatos}>
          {datosOk ? "Guardado ✓" : guardandoDatos ? "Guardando…" : "Guardar datos"}
        </button>
      </section>

      <section className="tarjeta !border-peligro/40">
        <div className="titulo-tarjeta !text-peligro">ZONA DE PELIGRO</div>
        <p className="text-texto-2 text-[13.5px] mb-3">
          Elimina la cuenta de {perfil.nombre} y todos sus datos (rutina,
          dieta, medidas, sesiones). Esta acción no se puede deshacer.
        </p>
        <label className="text-[13px] text-texto-2 block mb-1">
          Escribe «{perfil.nombre}» para confirmar
        </label>
        <input
          className="input"
          value={confirmacionNombre}
          onChange={(e) => setConfirmacionNombre(e.target.value)}
          placeholder={perfil.nombre}
        />
        {errorEliminar && (
          <div className="text-peligro text-[13.5px] mb-3">— {errorEliminar}</div>
        )}
        <button
          className="w-full bg-transparent border border-peligro text-peligro rounded-[12px] py-[13px] font-bold text-[15px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={confirmacionNombre.trim() !== perfil.nombre.trim() || eliminando}
          onClick={eliminarCliente}
        >
          {eliminando ? "Eliminando…" : "Eliminar cliente definitivamente"}
        </button>
      </section>
    </>
  );
}
