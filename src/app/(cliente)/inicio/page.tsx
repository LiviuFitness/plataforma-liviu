import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { aRutinaUI, SELECT_RUTINA_COMPLETA, type FilaRutina } from "@/lib/rutinas";
import { fraseDelDia, saludoSegunHora } from "@/lib/frases";
import { Flame, Trophy, Dumbbell, UtensilsCrossed } from "lucide-react";
import RegistroPesoRapido from "./RegistroPesoRapido";
import AvisosActualizacion from "./AvisosActualizacion";
import WidgetHabitos from "./WidgetHabitos";
import WidgetLogros from "./WidgetLogros";
import { semanaHabitosCompleta } from "@/lib/habitos";
import { logrosCumplidos } from "@/lib/logros";
import { calcularVolumenMuscular, grupoMasDescuidado } from "@/lib/musculos";
import { INFO_MACRO } from "@/lib/tipos";
import { IconoTarjeta } from "@/componentes/ui";

export const dynamic = "force-dynamic";

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

/** Racha: días de calendario consecutivos con sesión, terminando hoy o ayer. */
function calcularRacha(fechas: string[]): number {
  const dias = new Set(
    fechas.map((f) => new Date(f).toLocaleDateString("sv-SE")) // AAAA-MM-DD local
  );
  const cursor = new Date();
  let racha = 0;
  // Si hoy no hay sesión todavía, la racha puede seguir viva desde ayer
  if (!dias.has(cursor.toLocaleDateString("sv-SE"))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dias.has(cursor.toLocaleDateString("sv-SE"))) {
    racha++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

interface FilaSerieParaPR {
  kg: number | null;
  completada: boolean;
  tipo: string;
  rutina_ejercicios: {
    ejercicios: { nombre: string; grupo_muscular: string } | null;
  } | null;
}

interface FilaSesionParaPR {
  fecha_inicio: string;
  series_realizadas: FilaSerieParaPR[];
}

/** Récord reciente: el ejercicio en el que se batió la mejor marca en los últimos 7 días. */
function calcularPrReciente(
  sesiones: FilaSesionParaPR[]
): { ejercicio: string; kg: number; fecha: string } | null {
  const cronologico = sesiones
    .slice()
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));

  const mejores = new Map<string, number>();
  let ultimoRecord: { ejercicio: string; kg: number; fecha: string } | null = null;

  for (const sesion of cronologico) {
    for (const s of sesion.series_realizadas ?? []) {
      const nombre = s.rutina_ejercicios?.ejercicios?.nombre;
      if (!nombre || !s.completada || s.tipo === "calentamiento" || s.kg === null)
        continue;
      const actual = mejores.get(nombre) ?? 0;
      if (Number(s.kg) > actual) {
        mejores.set(nombre, Number(s.kg));
        ultimoRecord = { ejercicio: nombre, kg: Number(s.kg), fecha: sesion.fecha_inicio };
      }
    }
  }

  if (!ultimoRecord) return null;
  const diasDesde = (Date.now() - new Date(ultimoRecord.fecha).getTime()) / 86400000;
  return diasDesde <= 7 ? ultimoRecord : null;
}

/** Inicio del cliente: frase del día, racha, semana, próximo entreno, peso y PR reciente. */
export default async function PaginaInicio() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const hace60dias = new Date(Date.now() - 60 * 86400000).toISOString();
  const hace7dias = new Date();
  hace7dias.setDate(hace7dias.getDate() - 7);

  const [
    { data: perfil },
    { data: rutinaFila },
    { data: sesiones },
    { data: dieta },
    { data: medidas },
    { data: rutinaMeta },
    { data: dietaMeta },
    { data: habitos },
    { data: registrosHabitos },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("nombre, rutina_vista_en, dieta_vista_en")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("rutinas")
      .select(SELECT_RUTINA_COMPLETA)
      .eq("cliente_id", user.id)
      .eq("activa", true)
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sesiones")
      .select(
        `fecha_inicio, dia_id,
         series_realizadas ( kg, completada, tipo,
           rutina_ejercicios ( ejercicios ( nombre, grupo_muscular ) ) )`
      )
      .eq("cliente_id", user.id)
      .gte("fecha_inicio", hace60dias)
      .order("fecha_inicio", { ascending: false }),
    supabase
      .from("dietas")
      .select("kcal_obj, prot_obj, carb_obj, gras_obj")
      .eq("cliente_id", user.id)
      .eq("activa", true)
      .eq("tipo", "entreno")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("medidas")
      .select("peso, fecha")
      .eq("cliente_id", user.id)
      .not("peso", "is", null)
      .order("fecha", { ascending: false })
      .limit(20),
    supabase
      .from("rutinas")
      .select("actualizada_en")
      .eq("cliente_id", user.id)
      .eq("activa", true)
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("dietas")
      .select("actualizada_en")
      .eq("cliente_id", user.id)
      .eq("activa", true)
      // con dieta de entreno y de descanso activas, el aviso salta
      // si CUALQUIERA de las dos cambió desde la última visita
      .order("actualizada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("habitos")
      .select("*")
      .eq("cliente_id", user.id)
      .order("orden"),
    supabase
      .from("habitos_registros")
      .select("*")
      .eq("cliente_id", user.id)
      .gte("fecha", hace7dias.toLocaleDateString("sv-SE")),
  ]);

  const [{ count: totalSesiones }, { count: totalRegistrosHabitos }, { data: logrosPrevios }] =
    await Promise.all([
      supabase
        .from("sesiones")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", user.id),
      supabase
        .from("habitos_registros")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", user.id)
        .eq("completado", true),
      supabase.from("logros_desbloqueados").select("clave").eq("cliente_id", user.id),
    ]);

  const avisoRutina = !!(
    rutinaMeta?.actualizada_en &&
    (!perfil?.rutina_vista_en ||
      new Date(rutinaMeta.actualizada_en) > new Date(perfil.rutina_vista_en))
  );
  const avisoDieta = !!(
    dietaMeta?.actualizada_en &&
    (!perfil?.dieta_vista_en ||
      new Date(dietaMeta.actualizada_en) > new Date(perfil.dieta_vista_en))
  );

  const rutinaCompleta = rutinaFila
    ? aRutinaUI(rutinaFila as unknown as FilaRutina)
    : null;
  // El cliente solo ve la semana activa (microciclo en curso)
  const rutina = rutinaCompleta
    ? {
        ...rutinaCompleta,
        dias: rutinaCompleta.dias.filter(
          (d) => d.semana === rutinaCompleta.semana_actual
        ),
      }
    : null;
  const listaSesiones = sesiones ?? [];

  // Semana actual (L-D)
  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - ((inicioSemana.getDay() + 6) % 7));
  inicioSemana.setHours(0, 0, 0, 0);
  const diasEntrenados = [false, false, false, false, false, false, false];
  for (const s of listaSesiones) {
    const fecha = new Date(s.fecha_inicio);
    if (fecha >= inicioSemana) {
      diasEntrenados[(fecha.getDay() + 6) % 7] = true;
    }
  }
  const hechasSemana = diasEntrenados.filter(Boolean).length;
  const objetivoSemana = rutina?.dias.length ?? 0;

  const racha = calcularRacha(listaSesiones.map((s) => s.fecha_inicio));
  const prReciente = calcularPrReciente(listaSesiones as unknown as FilaSesionParaPR[]);

  // Logros: se calculan y desbloquean aquí (idempotente, unique en la
  // tabla) en vez de en un cron aparte — este es el único sitio por el
  // que el cliente pasa cada vez que abre la app.
  const clavesPrevias = new Set((logrosPrevios ?? []).map((l) => l.clave));
  const cumplidos = logrosCumplidos({
    totalSesiones: totalSesiones ?? 0,
    racha,
    totalRegistrosHabitos: totalRegistrosHabitos ?? 0,
    semanaHabitosCompleta: semanaHabitosCompleta(habitos ?? [], registrosHabitos ?? []),
  });
  const nuevosLogros = cumplidos.filter((c) => !clavesPrevias.has(c));
  if (nuevosLogros.length > 0) {
    await supabase
      .from("logros_desbloqueados")
      .insert(nuevosLogros.map((clave) => ({ cliente_id: user.id, clave })));
  }
  const clavesDesbloqueadas = new Set([...clavesPrevias, ...nuevosLogros]);

  // Grupo muscular más descuidado (de los que sí trabaja su rutina) —
  // solo se avisa si ya lleva unas cuantas sesiones, para no ser
  // repetitivo con clientes que acaban de empezar.
  const volumenMuscular = calcularVolumenMuscular(
    (listaSesiones as unknown as FilaSesionParaPR[]).flatMap((s) =>
      (s.series_realizadas ?? []).flatMap((serie) => {
        const grupo = serie.rutina_ejercicios?.ejercicios?.grupo_muscular;
        return grupo
          ? [{ fecha: s.fecha_inicio, grupo, completada: serie.completada, tipo: serie.tipo }]
          : [];
      })
    )
  );
  const gruposEnRutina = new Set(
    (rutinaCompleta?.dias ?? []).flatMap((d) => d.ejercicios.map((e) => e.grupo_muscular))
  );
  const avisoMuscular =
    (totalSesiones ?? 0) >= 3
      ? grupoMasDescuidado(volumenMuscular, gruposEnRutina)
      : null;

  // Próximo día sugerido: el siguiente al de la última sesión
  let proximoIndice = 0;
  if (rutina && rutina.dias.length > 0) {
    const ultimoDiaId = listaSesiones.find((s) => s.dia_id)?.dia_id;
    const indiceUltimo = rutina.dias.findIndex((d) => d.id === ultimoDiaId);
    if (indiceUltimo >= 0) {
      proximoIndice = (indiceUltimo + 1) % rutina.dias.length;
    }
  }
  const proximoDia = rutina?.dias[proximoIndice] ?? null;

  // Duración estimada: no existe como dato en el modelo, se aproxima a
  // partir de las series efectivas (~2.5-3.2 min por serie, cambio de
  // ejercicio incluido) solo para mostrar un rango orientativo.
  const seriesEfectivasProximo = proximoDia
    ? proximoDia.ejercicios.reduce(
        (a, e) => a + e.series.filter((s) => s.tipo !== "calentamiento").length,
        0
      )
    : 0;
  const duracionMin = Math.round(seriesEfectivasProximo * 2.5);
  const duracionMax = Math.round(seriesEfectivasProximo * 3.2);

  // Proporción de kcal por macro (P/C 4 kcal/g, G 9 kcal/g) para la
  // barra apilada de distribución de la tarjeta de dieta.
  const macroPct = dieta
    ? (() => {
        const kcalP = dieta.prot_obj * 4;
        const kcalC = dieta.carb_obj * 4;
        const kcalG = dieta.gras_obj * 9;
        const total = kcalP + kcalC + kcalG || 1;
        return { p: (kcalP / total) * 100, c: (kcalC / total) * 100, g: (kcalG / total) * 100 };
      })()
    : null;

  const nombrePila = perfil?.nombre?.split(" ")[0] ?? "";

  // listaMedidas viene ordenada de más reciente a más antigua (limit 20)
  const listaMedidas = medidas ?? [];
  const ultimoPeso = listaMedidas[0]?.peso ?? null;
  // "Desde el inicio" = frente al registro más antiguo que tenemos (los
  // últimos 20 pesajes cubren de sobra el histórico real en la práctica).
  const primerPeso = listaMedidas[listaMedidas.length - 1]?.peso ?? null;
  const deltaPeso =
    listaMedidas.length >= 2 && ultimoPeso !== null && primerPeso !== null
      ? Number(ultimoPeso) - Number(primerPeso)
      : null;
  // Cronológico (antiguo → reciente) para el sparkline.
  const historialPeso = listaMedidas
    .slice()
    .reverse()
    .map((m) => Number(m.peso));

  // Mensaje contextual: prioriza racha activa, luego semana, luego invita a empezar
  let mensaje = "hoy es un buen día para tu primera sesión —";
  if (racha >= 2) mensaje = `🔥 llevas ${racha} días seguidos, ¡no la rompas!`;
  else if (racha === 1) mensaje = "empezaste tu racha ayer, ¡a por hoy!";
  else if (hechasSemana > 0)
    mensaje = `ya llevas ${hechasSemana} de ${objetivoSemana || "—"} entrenos esta semana —`;

  return (
    <>
      <h1 className="h1">
        {saludoSegunHora()}
        {nombrePila ? `, ${nombrePila}` : ""}
      </h1>
      <div className="sub mb-3">{mensaje}</div>

      <AvisosActualizacion avisoRutina={avisoRutina} avisoDieta={avisoDieta} />

      <div className="tarjeta !border-acento/20 text-texto-2 text-[13.5px] italic">
        “{fraseDelDia()}”
      </div>

      {prReciente && (
        <div className="tarjeta !border-aviso/40 !mb-2.5">
          <div className="flex items-center gap-2.5">
            <Trophy size={22} className="text-aviso shrink-0" />
            <div>
              <div className="font-bold text-[14.5px]">
                Nuevo récord: {prReciente.ejercicio}
              </div>
              <div className="text-atenuado text-[12.5px]">
                {prReciente.kg} kg — ¡sigue así!
              </div>
            </div>
          </div>
        </div>
      )}

      {avisoMuscular && (
        <div className="tarjeta !border-acento/30 !mb-2.5 text-[13.5px] text-texto-2">
          💪 Llevas{" "}
          {avisoMuscular.diasDesdeUltimoEntreno === null
            ? "un tiempo"
            : `${avisoMuscular.diasDesdeUltimoEntreno} días`}{" "}
          sin trabajar <b>{avisoMuscular.grupo}</b> — está en tu rutina, ¡tócalo pronto!
        </div>
      )}

      {/* Racha y semana */}
      <div className="grid grid-cols-2 gap-2.5 my-[18px] anim-entrada-1">
        <div className={`tarjeta !mb-0 text-center !p-4 ${racha > 0 ? "tarjeta-dorado" : ""}`}>
          <Flame
            size={26}
            className={`mx-auto mb-1 ${racha > 0 ? "text-dorado" : "text-atenuado"}`}
            strokeWidth={1.75}
          />
          <div className="num-grande">{racha}</div>
          <div className="text-[11px] text-atenuado mt-0.5">
            {racha === 1 ? "día de racha" : "días de racha"}
          </div>
        </div>
        <div className="tarjeta tarjeta-acento !mb-0 text-center !p-4">
          <div className="num-grande !text-[30px] text-acento">
            {hechasSemana}
            <span className="text-atenuado text-[17px]">
              /{objetivoSemana || "—"}
            </span>
          </div>
          <div className="text-[11px] text-atenuado mt-1.5">
            entrenos esta semana
          </div>
          <div className="flex justify-center gap-1.5 mt-2">
            {diasEntrenados.map((activo, i) => (
              <div
                key={i}
                title={DIAS_SEMANA[i]}
                className={`w-2 h-2 rounded-full ${
                  activo ? "bg-acento" : "bg-borde-2"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Próximo entreno — hero card, primera llamada a la acción de la pantalla */}
      {proximoDia ? (
        <section className="tarjeta tarjeta-acento anim-entrada-2 !p-5">
          <div className="flex items-center gap-3.5 mb-4">
            <IconoTarjeta Icono={Dumbbell} color="var(--color-acento)" tamano={46} />
            <div className="min-w-0">
              <div className="titulo-tarjeta !mb-1">
                TU PRÓXIMO ENTRENO · SEMANA {rutina?.semana_actual ?? 1}
              </div>
              <div className="font-bold text-[19px]">{proximoDia.nombre}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="chip !cursor-default">
              {proximoDia.ejercicios.length} ejercicios
            </span>
            <span className="chip !cursor-default">{seriesEfectivasProximo} series</span>
            <span className="chip !cursor-default">
              {duracionMin}–{duracionMax} min aprox.
            </span>
          </div>
          <Link
            href={`/sesion/${proximoDia.id}`}
            className="cta anim-pulsable !mb-0 block text-center"
          >
            Empezar sesión →
          </Link>
        </section>
      ) : (
        <section className="tarjeta anim-entrada-2">
          <div className="titulo-tarjeta">TU PRÓXIMO ENTRENO</div>
          <div className="text-atenuado text-[14px]">
            Tu rutina está en el horno 🔥 En cuanto tu entrenador te asigne el
            plan, aparecerá aquí.
          </div>
        </section>
      )}

      {/* Otros días de la rutina */}
      {rutina && rutina.dias.length > 1 && (
        <section className="tarjeta">
          <div className="titulo-tarjeta">O ELIGE OTRO DÍA</div>
          {rutina.dias.map(
            (dia, i) =>
              i !== proximoIndice && (
                <Link
                  key={dia.id}
                  href={`/sesion/${dia.id}`}
                  className="flex justify-between items-center border-b border-borde last:border-0 py-3"
                >
                  <div>
                    <div className="font-bold text-[14.5px]">{dia.nombre}</div>
                    <div className="text-atenuado text-[12.5px]">
                      {dia.ejercicios.length} ejercicios
                    </div>
                  </div>
                  <span className="text-acento text-[13.5px]">Empezar →</span>
                </Link>
              )
          )}
        </section>
      )}

      <RegistroPesoRapido
        clienteId={user.id}
        ultimoPeso={ultimoPeso === null ? null : Number(ultimoPeso)}
        deltaKg={deltaPeso}
        historial={historialPeso}
      />

      <WidgetHabitos
        clienteId={user.id}
        habitos={habitos ?? []}
        registros={registrosHabitos ?? []}
      />

      <WidgetLogros
        desbloqueados={[...clavesDesbloqueadas]}
        nuevos={nuevosLogros}
      />

      {/* Acceso rápido a la dieta */}
      {dieta && (
        <Link
          href="/mi-dieta"
          className="tarjeta tarjeta-verde anim-pulsable anim-entrada-5 flex items-center gap-3.5 w-full"
        >
          <IconoTarjeta Icono={UtensilsCrossed} color="var(--color-verde)" />
          <div className="flex-1 min-w-0">
            <div className="titulo-tarjeta !mb-1">TU DIETA DE HOY</div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="num-grande !text-[20px]" style={{ color: "var(--color-verde)" }}>
                {dieta.kcal_obj}
              </span>
              <span className="text-atenuado text-[12.5px]">kcal</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span
                className="chip !cursor-default"
                style={{ color: INFO_MACRO.proteina.color, borderColor: `${INFO_MACRO.proteina.color}55` }}
              >
                P {dieta.prot_obj}g
              </span>
              <span
                className="chip !cursor-default"
                style={{
                  color: INFO_MACRO.carbohidratos.color,
                  borderColor: `${INFO_MACRO.carbohidratos.color}55`,
                }}
              >
                C {dieta.carb_obj}g
              </span>
              <span
                className="chip !cursor-default"
                style={{ color: INFO_MACRO.grasas.color, borderColor: `${INFO_MACRO.grasas.color}55` }}
              >
                G {dieta.gras_obj}g
              </span>
            </div>
            {macroPct && (
              <div className="barra-capsula flex" style={{ maxWidth: 220 }}>
                <div className="h-full" style={{ width: `${macroPct.p}%`, background: INFO_MACRO.proteina.color }} />
                <div
                  className="h-full"
                  style={{ width: `${macroPct.c}%`, background: INFO_MACRO.carbohidratos.color }}
                />
                <div className="h-full" style={{ width: `${macroPct.g}%`, background: INFO_MACRO.grasas.color }} />
              </div>
            )}
          </div>
          <span className="texto-secundario shrink-0">Ver →</span>
        </Link>
      )}
    </>
  );
}
