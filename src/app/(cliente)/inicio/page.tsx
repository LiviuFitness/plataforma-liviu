import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { aRutinaUI, SELECT_RUTINA_COMPLETA, type FilaRutina } from "@/lib/rutinas";
import { fraseDelDia, saludoSegunHora } from "@/lib/frases";
import {
  Bell,
  Check,
  ChevronRight,
  Flame,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
} from "lucide-react";
import RegistroPesoRapido from "./RegistroPesoRapido";
import MarcarAvisosVistos from "./MarcarAvisosVistos";
import IconoMancuerna from "@/componentes/IconoMancuerna";
import WidgetHabitos from "./WidgetHabitos";
import WidgetLogros from "./WidgetLogros";
import TarjetaSemanaPasada from "./TarjetaSemanaPasada";
import { resumenSemanaPasada, type SesionResumen } from "@/lib/resumenSemana";
import { semanaHabitosCompleta } from "@/lib/habitos";
import { logrosCumplidos } from "@/lib/logros";
import { calcularVolumenMuscular, grupoMasDescuidado } from "@/lib/musculos";
import { INFO_MACRO } from "@/lib/tipos";
import { IconoTarjeta, type IconoApp } from "@/componentes/ui";
import { calcularRachaSemanas } from "@/lib/racha";
import { fotoEntreno } from "@/lib/fotoEntreno";

export const dynamic = "force-dynamic";


interface FilaSerieParaPR {
  kg: number | null;
  completada: boolean;
  tipo: string;
  ejercicio_sustituto_id?: string | null;
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
      if (s.ejercicio_sustituto_id) continue; // hecha con otro ejercicio
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
    { data: revisionMeta },
    { data: habitos },
    { data: registrosHabitos },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("nombre, rutina_vista_en, dieta_vista_en, revisiones_visto_en")
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
         series_realizadas ( kg, reps, reps_extra, completada, tipo, ejercicio_sustituto_id,
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
      .from("revisiones_kcal")
      .select("creado_en")
      .eq("cliente_id", user.id)
      .order("creado_en", { ascending: false })
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

  /* Medio año de fechas, sin series: la racha por semanas necesita ir
   * más atrás que los 60 días de arriba, y cargar las series de todo
   * ese tiempo solo para contar días sería tirar datos. */
  const desde26semanas = new Date();
  desde26semanas.setDate(desde26semanas.getDate() - 26 * 7);
  const hace26semanas = desde26semanas.toISOString();

  const [
    { count: totalSesiones },
    { count: totalRegistrosHabitos },
    { data: logrosPrevios },
    { data: fechasSesiones },
  ] = await Promise.all([
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
      supabase
        .from("sesiones")
        .select("fecha_inicio")
        .eq("cliente_id", user.id)
        .gte("fecha_inicio", hace26semanas),
    ]);

  /* El aviso de "te han ajustado las kcal" lo llevaba la pestaña
   * Progreso; al salir de la barra lo hereda Inicio. Se compara la
   * revisión más reciente con la última visita, igual que la rutina y la
   * dieta, para no añadir otra ida y vuelta al servidor. */
  const hayRevisionSinLeer = !!(
    revisionMeta?.creado_en &&
    (!perfil?.revisiones_visto_en ||
      new Date(revisionMeta.creado_en) > new Date(perfil.revisiones_visto_en))
  );

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
  const objetivoSemana = rutina?.dias.length ?? 0;

  const rachaSemanas = calcularRachaSemanas(
    (fechasSesiones ?? []).map((s) => s.fecha_inicio),
    objetivoSemana
  );
  const prReciente = calcularPrReciente(listaSesiones as unknown as FilaSesionParaPR[]);

  // Logros: se calculan y desbloquean aquí (idempotente, unique en la
  // tabla) en vez de en un cron aparte — este es el único sitio por el
  // que el cliente pasa cada vez que abre la app.
  const clavesPrevias = new Set((logrosPrevios ?? []).map((l) => l.clave));
  const cumplidos = logrosCumplidos({
    totalSesiones: totalSesiones ?? 0,
    rachaSemanas,
    totalRegistrosHabitos: totalRegistrosHabitos ?? 0,
    semanaHabitosCompleta: semanaHabitosCompleta(habitos ?? [], registrosHabitos ?? []),
    retoMesCumplido: (() => {
      /* Mismo cálculo que el reto de Comunidad, en hora de Madrid */
      const madrid = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
      const mes = madrid(new Date()).slice(0, 7);
      const dias = new Set(
        (fechasSesiones ?? []).map((x) => madrid(new Date(x.fecha_inicio))).filter((d) => d.startsWith(mes))
      ).size;
      return objetivoSemana > 0 && dias >= Math.max(4, objetivoSemana * 4);
    })(),
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

  const nombrePila = perfil?.nombre?.split(" ")[0] ?? "";

  /* Días entre dos fechas AAAA-MM-DD. Las dos se leen como medianoche
   * UTC, así que la resta da días exactos sin sustos de horario de verano. */
  const hoyISO = new Date().toLocaleDateString("sv-SE");
  const diasEntre = (desde: string, hasta: string) =>
    Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000);

  // listaMedidas viene ordenada de más reciente a más antigua (limit 20)
  const listaMedidas = medidas ?? [];
  const ultimoPeso = listaMedidas[0]?.peso ?? null;
  const diasDesdeUltimoPeso = listaMedidas[0]
    ? diasEntre(listaMedidas[0].fecha, hoyISO)
    : null;

  /* "−1,2 kg este mes": del peso más antiguo de los últimos 30 días al
   * más reciente. Con un solo registro en ese tiempo no hay variación
   * que contar, y el mosaico dice qué hay dentro en vez de un cero. */
  const desde30 = new Date();
  desde30.setDate(desde30.getDate() - 30);
  const hace30ISO = desde30.toLocaleDateString("sv-SE");
  const pesosMes = listaMedidas.filter((m) => m.fecha >= hace30ISO);
  let resumenProgreso = "Peso, medidas y fotos";
  if (pesosMes.length >= 2) {
    const delta = Number(pesosMes[0].peso) - Number(pesosMes[pesosMes.length - 1].peso);
    resumenProgreso =
      Math.abs(delta) < 0.05
        ? "Estable este mes"
        : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1).replace(".", ",")} kg este mes`;
  }

  const hoySemana = (new Date().getDay() + 6) % 7;
  const hechosSemana = diasEntrenados.filter(Boolean).length;

  /* Lunes y martes: el cierre de la semana anterior */
  const semanaPasada =
    hoySemana <= 1
      ? resumenSemanaPasada(
          listaSesiones as unknown as SesionResumen[],
          listaMedidas,
          objetivoSemana,
          new Date()
        )
      : null;

  const fechaHoy = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  });

  /* Novedades: todo lo que ha cambiado desde la última vez, en un solo
   * sitio y con un solo formato. Antes cada cosa llegaba a su manera —
   * una tarjeta para la rutina, texto naranja dentro de una fila para
   * las kcal, un banner amarillo para el récord, una línea gris al final
   * para el grupo descuidado— y ninguna parecía importante. */
  const novedades: {
    clave: string;
    Icono: IconoApp;
    color: string;
    titulo: string;
    detalle: string;
    href?: string;
  }[] = [];
  if (avisoRutina) {
    novedades.push({
      clave: "rutina",
      Icono: Bell,
      color: "var(--color-acento)",
      titulo: "Tu entrenador ha actualizado tu rutina",
      detalle: "Échale un vistazo antes de entrenar",
      href: "/mi-rutina",
    });
  }
  if (avisoDieta) {
    novedades.push({
      clave: "dieta",
      Icono: Bell,
      color: "var(--color-verde)",
      titulo: "Tu entrenador ha actualizado tu dieta",
      detalle: "Mira qué ha cambiado",
      href: "/mi-dieta",
    });
  }
  if (hayRevisionSinLeer) {
    novedades.push({
      clave: "kcal",
      Icono: Bell,
      color: "var(--color-aviso)",
      titulo: "Tu entrenador te ha ajustado las kcal",
      detalle: "Mira por qué en Mi progreso",
      href: "/mi-progreso",
    });
  }
  if (prReciente) {
    const hace = diasEntre(new Date(prReciente.fecha).toLocaleDateString("sv-SE"), hoyISO);
    const cuando =
      hace <= 0
        ? "hoy"
        : hace === 1
          ? "ayer"
          : hace >= 7
            ? "hace una semana"
            : `el ${new Date(prReciente.fecha).toLocaleDateString("es-ES", { weekday: "long" })}`;
    novedades.push({
      clave: "record",
      Icono: Trophy,
      color: "var(--color-dorado)",
      titulo: `Récord en ${prReciente.ejercicio}`,
      detalle: `${String(prReciente.kg).replace(".", ",")} kg · ${cuando}`,
    });
  }
  if (avisoMuscular) {
    novedades.push({
      clave: "musculo",
      Icono: IconoMancuerna,
      color: "var(--color-texto-2)",
      titulo:
        avisoMuscular.diasDesdeUltimoEntreno === null
          ? `Llevas un tiempo sin trabajar ${avisoMuscular.grupo}`
          : `Llevas ${avisoMuscular.diasDesdeUltimoEntreno} días sin trabajar ${avisoMuscular.grupo}`,
      detalle: "Y está en tu rutina",
      href: "/mi-rutina",
    });
  }

  /* La foto va arriba, a lo ancho, y el degradado la funde con la
   * tarjeta justo donde empieza el título. Antes iba apretada en una
   * franja a la derecha y apenas se veía. */
  const cabeceraFoto = (foto: string) => ({
    backgroundImage: `linear-gradient(180deg, transparent 20%, var(--color-panel) 96%), url(${foto})`,
    backgroundSize: "cover",
    backgroundPosition: "center 35%",
  });

  return (
    <>
      <MarcarAvisosVistos avisoRutina={avisoRutina} avisoDieta={avisoDieta} />

      {/* 1. Saludo, con la fecha: es lo que da sentido a "tu entreno de hoy" */}
      <div className="text-atenuado text-[13px] first-letter:uppercase">{fechaHoy}</div>
      <h1 className="h1 !mt-0.5 mb-4">
        {saludoSegunHora()}
        {nombrePila ? `, ${nombrePila}` : ""}
      </h1>

      {/* 2. UNA tarjeta que contesta "qué hago hoy" y "cómo voy". La
        * semana y la racha iban cada una por su cuenta encima del
        * entreno y le quitaban el sitio; son su contexto, van dentro. */}
      {proximoDia ? (
        <section className="tarjeta tarjeta-acento anim-entrada-1 !p-0 !mb-3 overflow-hidden">
          <div
            className="relative h-[150px] flex items-end px-5 pb-3.5"
            style={cabeceraFoto(
              fotoEntreno(proximoDia.ejercicios.map((e) => e.grupo_muscular))
            )}
          >
            <div className="min-w-0">
              <div className="text-acento text-[11.5px] font-bold tracking-[0.08em] uppercase mb-1">
                Tu entreno de hoy
              </div>
              <div className="font-bold text-[24px] leading-tight break-words">
                {proximoDia.nombre}
              </div>
            </div>
          </div>
          <div className="px-5 pb-5">
            {/* Sin `truncate`: en un móvil estrecho la línea se cortaba
              * justo en la duración, que es el dato por el que más se
              * decide si da tiempo a entrenar ahora. Envuelve. */}
            <div className="text-atenuado text-[13px] leading-snug mb-4">
              Semana {rutina?.semana_actual ?? 1} · {proximoDia.ejercicios.length} ejercicios ·{" "}
              {seriesEfectivasProximo} series · {duracionMin}–{duracionMax} min
            </div>
            <Link
              href={`/sesion/${proximoDia.id}`}
              className="cta anim-pulsable !mb-0 block text-center"
            >
              Empezar sesión →
            </Link>

            <div className="flex items-center gap-3 pt-3.5 mt-4 border-t border-borde">
              <div className="flex gap-1.5">
                {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
                  <span
                    key={i}
                    className={`w-[26px] h-[26px] rounded-[8px] flex items-center justify-center text-[10.5px] font-bold border ${
                      diasEntrenados[i]
                        ? "bg-acento/15 border-acento/45 text-acento"
                        : i === hoySemana
                          ? "border-acento/45 border-dashed text-acento"
                          : "border-borde-2 text-atenuado"
                    }`}
                    aria-label={`${d}${diasEntrenados[i] ? ": entrenado" : ""}${
                      i === hoySemana ? " (hoy)" : ""
                    }`}
                  >
                    {diasEntrenados[i] ? <Check size={12} strokeWidth={3} /> : d}
                  </span>
                ))}
              </div>
              <div className="flex-1 min-w-0 text-right text-[12.5px] leading-tight tabular-nums">
                <b>{hechosSemana}</b>
                <span className="text-atenuado"> de {objetivoSemana}</span>
              </div>
            </div>
            {rachaSemanas > 0 && (
              <div className="flex items-center gap-1.5 text-[12.5px] mt-2.5">
                <Flame size={14} className="text-dorado shrink-0" />
                <span>
                  <b className="text-dorado">
                    {rachaSemanas} {rachaSemanas === 1 ? "semana" : "semanas"}
                  </b>
                  <span className="text-atenuado">
                    {rachaSemanas === 1 ? " cumpliendo" : " seguidas cumpliendo"} tu plan
                  </span>
                </span>
              </div>
            )}
          </div>
        </section>
      ) : (
        /* Primer día del cliente: en vez de un aviso de que no hay nada,
         * se le dice qué está pasando y qué puede hacer ya — pesarse y
         * marcar hábitos, que no dependen de la rutina y están justo
         * debajo, en "Tu día". Mismo tratamiento que la tarjeta de
         * entreno de verdad, para que el primer día se parezca a los que
         * vendrán después. */
        <section className="tarjeta tarjeta-acento anim-entrada-1 !p-0 !mb-3 overflow-hidden">
          <div
            className="relative h-[150px] flex items-end px-5 pb-3.5"
            style={cabeceraFoto("/en-camino.webp")}
          >
            <div className="min-w-0">
              <div className="text-acento text-[11.5px] font-bold tracking-[0.08em] uppercase mb-1">
                Tu entreno
              </div>
              <div className="font-bold text-[22px] leading-tight">Tu rutina está en camino</div>
            </div>
          </div>
          <p className="text-texto-2 text-[13.5px] leading-relaxed px-5 pb-5">
            Tu entrenador la está preparando y aparecerá aquí en cuanto esté.
            Mientras tanto, apunta tu peso y marca tus hábitos ahí abajo: cuanto
            antes empieces a registrar, antes tendrá con qué ajustarte el plan.
          </p>
        </section>
      )}

      {semanaPasada && <TarjetaSemanaPasada r={semanaPasada} />}

      {/* 3. Novedades — solo si hay alguna */}
      {novedades.length > 0 && (
        <>
          <div className="titulo-seccion mt-6">Novedades</div>
          <div className="superficie px-4 mb-6 anim-entrada-2">
            {novedades.map((n) => {
              const contenido = (
                <>
                  <IconoTarjeta Icono={n.Icono} color={n.color} tamano={34} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold leading-tight break-words">
                      {n.titulo}
                    </div>
                    <div className="text-atenuado text-[12.5px] leading-snug">{n.detalle}</div>
                  </div>
                  {n.href && <ChevronRight size={16} className="text-atenuado shrink-0" />}
                </>
              );
              return n.href ? (
                <Link key={n.clave} href={n.href} className="fila anim-pulsable">
                  {contenido}
                </Link>
              ) : (
                <div key={n.clave} className="fila">
                  {contenido}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 4. Tu día: lo que se marca hoy, con un mismo formato */}
      <div className={`titulo-seccion ${novedades.length > 0 ? "" : "mt-6"}`}>Tu día</div>
      <div className="superficie px-4 mb-6 anim-entrada-3">
        <RegistroPesoRapido
          clienteId={user.id}
          ultimoPeso={ultimoPeso === null ? null : Number(ultimoPeso)}
          diasDesdeUltimo={diasDesdeUltimoPeso}
        />
        <WidgetHabitos
          clienteId={user.id}
          habitos={habitos ?? []}
          registros={registrosHabitos ?? []}
        />
        {/* La dieta entera está en su pestaña; aquí basta el objetivo del
          * día. La proteína lleva su color porque es el macro que más se
          * persigue; los otros dos van en gris para no hacer un arcoíris. */}
        {dieta && (
          <Link href="/mi-dieta" className="fila anim-pulsable">
            <IconoTarjeta Icono={UtensilsCrossed} color="var(--color-verde)" tamano={34} />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] leading-tight">
                <b style={{ color: "var(--color-verde)" }}>{dieta.kcal_obj}</b>
                <span className="text-atenuado"> kcal hoy</span>
              </div>
              <div className="text-atenuado text-[12.5px]">
                <span style={{ color: INFO_MACRO.proteina.color }}>{dieta.prot_obj} P</span> ·{" "}
                {dieta.carb_obj} C · {dieta.gras_obj} G
              </div>
            </div>
            <ChevronRight size={16} className="text-atenuado shrink-0" />
          </Link>
        )}
      </div>

      {/* 5. Dos puertas en vez de cuatro filas sueltas. "Ver todos mis
        * entrenos" se ha ido: es la pestaña Entreno, justo debajo. */}
      <div className="grid grid-cols-2 gap-2.5 mb-5 anim-entrada-4">
        <Link href="/mi-progreso" className="tarjeta !mb-0 !p-4 anim-pulsable min-w-0">
          <TrendingUp size={18} className="text-acento mb-2.5" />
          <div className="font-semibold text-[14px] leading-tight">Mi progreso</div>
          <div className="text-atenuado text-[12.5px] mt-0.5 leading-snug">
            {resumenProgreso}
          </div>
        </Link>
        <WidgetLogros desbloqueados={[...clavesDesbloqueadas]} nuevos={nuevosLogros} />
      </div>

      <p className="text-atenuado text-[13px] italic text-center mt-5 px-4">
        “{fraseDelDia()}”
      </p>
    </>
  );
}
