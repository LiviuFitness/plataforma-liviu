"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarCheck, ChevronDown, AlertCircle } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import ResumenPlan from "./ResumenPlan";
import type { SesionHistorial } from "@/lib/progresoEntreno";
import type { Vista } from "./FichaCliente";
import {
  OBJETIVOS,
  type Alerta,
  type Dieta,
  type Estado,
  type Medida,
  type Mensaje,
  type Perfil,
  type Plan,
  type RespuestaAltaConPregunta,
  type RevisionKcal,
  type RutinaUI,
} from "@/lib/tipos";
import { FACTORES_ACTIVIDAD } from "@/lib/macros";

/** Pantalla principal de la ficha: alertas, cómo va, su plan, notas y datos. */
export default function TabResumen({
  perfil,
  medidas,
  alertas,
  diasEntrenados,
  respuestasAlta,
  rutina,
  dieta,
  dietaDescanso,
  ultimaSesion,
  ultimaRevision,
  ultimoMensaje,
  chatPendiente,
  ahora,
  abrir,
  notasConFecha,
  adherenciaDieta = null,
}: {
  perfil: Perfil;
  medidas: Medida[];
  alertas: Alerta[];
  diasEntrenados: boolean[];
  respuestasAlta: RespuestaAltaConPregunta[];
  rutina: RutinaUI | null;
  dieta: Dieta | null;
  dietaDescanso: Dieta | null;
  ultimaSesion: SesionHistorial | null;
  ultimaRevision: RevisionKcal | null;
  ultimoMensaje: Mensaje | null;
  chatPendiente: boolean;
  ahora: number;
  abrir: (v: Vista) => void;
  /** Las notas con recordatorio, justo debajo de la nota fija */
  notasConFecha?: React.ReactNode;
  adherenciaDieta?: number | null;
}) {
  const router = useRouter();
  /* --- Notas privadas con autoguardado (debounce) --- */
  const [datosAbiertos, setDatosAbiertos] = useState(false);
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
      {/* Lo accionable, primero. Iba detrás de la gráfica de peso,
       * que en un cliente nuevo solo dice que aún no hay registros:
       * se abría la ficha y lo primero era un hueco. */}
      {/* Necesita atención — banners de una línea, no una caja roja */}
      {alertas.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3.5">
          {alertas.map((a, i) =>
            a.tipo === "semana_completa" && a.rutina_id && a.semana_destino ? (
              <div key={i} className="banner banner-accion justify-between">
                <span className="flex items-center gap-1.5 min-w-0">
                  <CalendarCheck size={14} className="shrink-0" />
                  <span className="min-w-0">{a.mensaje}</span>
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

      <ResumenPlan
        medidas={medidas}
        diasEntrenados={diasEntrenados}
        rutina={rutina}
        dieta={dieta}
        dietaDescanso={dietaDescanso}
        ultimaSesion={ultimaSesion}
        ultimaRevision={ultimaRevision}
        ultimoMensaje={ultimoMensaje}
        chatPendiente={chatPendiente}
        ahora={ahora}
        abrir={abrir}
        adherenciaDieta={adherenciaDieta}
      />

      {respuestasAlta.length > 0 && (
        <section className="tarjeta">
          <div className="titulo-tarjeta">CUESTIONARIO DE ALTA</div>
          {respuestasAlta.map((r) => (
            <div key={r.id} className="mb-2.5 last:mb-0">
              <div className="text-atenuado text-[12.5px]">
                {r.preguntas_alta?.texto ?? "Pregunta borrada"}
              </div>
              <div className="text-[13.5px]">{r.respuesta}</div>
            </div>
          ))}
        </section>
      )}

      <section className="tarjeta">
        <div className="titulo-tarjeta flex justify-between">
          <span>Nota fija</span>
          <span className="text-[11px] normal-case tracking-normal">
            {estadoNotas === "guardando" && "Guardando…"}
            {estadoNotas === "ok" && "Guardado ✓"}
          </span>
        </div>
        <textarea
          className="input resize-y"
          rows={3}
          placeholder="Lo que no cambia: lesiones, preferencias, horarios… (el cliente no la ve)"
          value={notas}
          onChange={(e) => cambiarNotas(e.target.value)}
        />
      </section>

      {/* Antes había dos sitios para notas que no se hablaban entre sí:
        * la nota fija y las notas con fecha van juntas, antes de los
        * datos del cliente, que se tocan una vez y ya. */}
      {notasConFecha}

      {/* Los datos del cliente se rellenan una vez y luego estorban:
       * esto es la pestaña "Resumen", no un formulario. Plegado. */}
      <section className="tarjeta !p-0 overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left anim-pulsable"
          onClick={() => setDatosAbiertos((v) => !v)}
          aria-expanded={datosAbiertos}
        >
          <span className="flex-1 min-w-0 font-semibold text-[14.5px]">
            Datos del cliente
          </span>
          <span className="text-atenuado text-[12px] shrink-0">Editar o dar de baja</span>
          <ChevronDown
            size={16}
            className={`icono-rotable text-atenuado shrink-0 ${datosAbiertos ? "icono-rotable-abierto" : ""}`}
          />
        </button>
        <div className={`acordeon ${datosAbiertos ? "acordeon-abierto" : ""}`}>
          <div>
            <div className="border-t border-borde px-4 py-4">
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

        {/* Borrar al cliente vive aquí dentro, plegado: a la vista en
          * cada visita a la ficha era un botón rojo enorme debajo de las
          * notas, a un despiste de distancia. */}
        <div className="border-t border-peligro/30 mt-5 pt-4">
          <div className="titulo-tarjeta !text-peligro">ELIMINAR CLIENTE</div>
          <p className="text-texto-2 text-[13.5px] mb-3">
            Borra la cuenta de {perfil.nombre} y todos sus datos (rutina, dieta,
            medidas, sesiones). No se puede deshacer. Si solo deja de venir,
            mejor ponle en «Baja» arriba y conservas su historial.
          </p>
          <label className="text-[13px] text-texto-2 block mb-1">
            Escribe «{perfil.nombre}» para confirmar
          </label>
          <input
            className="input"
            value={confirmacionNombre}
            onChange={(e) => setConfirmacionNombre(e.target.value)}
            placeholder="Nombre completo"
          />
          {errorEliminar && (
            <div className="text-peligro text-[13.5px] mb-3 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-[3px]" /><span className="min-w-0">{errorEliminar}</span></div>
          )}
          <button
            className="w-full bg-transparent border border-peligro text-peligro rounded-[12px] py-[13px] font-bold text-[15px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={confirmacionNombre.trim() !== perfil.nombre.trim() || eliminando}
            onClick={eliminarCliente}
          >
            {eliminando ? "Eliminando…" : "Eliminar cliente definitivamente"}
          </button>
        </div>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
