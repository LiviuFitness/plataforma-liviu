import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { calcularRevisionSemanal, lunesDe } from "@/lib/revision";
import { resolverFotosProgreso } from "@/lib/fotosProgreso";
import { resolverProgresoEntreno } from "@/lib/progresoEntreno";
import MiProgreso from "./MiProgreso";
import type {
  Habito,
  HabitoRegistro,
  Medida,
  PreguntaRevision,
  RespuestaRevision,
  RevisionKcal,
} from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Progreso del cliente: peso propio, récords personales e historial. */
export default async function PaginaMiProgreso() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const semanaActualISO = lunesDe(new Date().toLocaleDateString("sv-SE"));
  const hace17semanas = new Date();
  hace17semanas.setDate(hace17semanas.getDate() - 17 * 7);

  const [
    { data: medidas },
    { prs, progresiones, historial, volumenMuscular },
    { data: logrosPrevios },
    { data: revisiones },
    { data: preguntas },
    { data: respuestasSemana },
    { data: habitos },
    { data: registrosHabitos },
    { data: fechasSesiones },
    { data: rutina },
  ] = await Promise.all([
    supabase
      .from("medidas")
      .select("*")
      .eq("cliente_id", user.id)
      .order("fecha", { ascending: true }),
    resolverProgresoEntreno(supabase, user.id),
    supabase.from("logros_desbloqueados").select("clave").eq("cliente_id", user.id),
    supabase
      .from("revisiones_kcal")
      .select("*")
      .eq("cliente_id", user.id)
      .order("creado_en", { ascending: false }),
    supabase
      .from("preguntas_revision")
      .select("id, texto, orden, activa")
      .eq("activa", true)
      .order("orden"),
    supabase
      .from("respuestas_revision")
      .select("*")
      .eq("cliente_id", user.id)
      .eq("semana", semanaActualISO),
    /* Los hábitos de la semana, que salieron de Inicio: allí solo se
     * marca el de hoy. */
    supabase.from("habitos").select("*").eq("cliente_id", user.id).order("orden"),
    supabase
      .from("habitos_registros")
      .select("*")
      .eq("cliente_id", user.id)
      .gte("fecha", semanaActualISO),
    /* Calendario de constancia: solo fechas, 17 semanas atrás */
    supabase
      .from("sesiones")
      .select("fecha_inicio")
      .eq("cliente_id", user.id)
      .gte("fecha_inicio", hace17semanas.toISOString()),
    supabase
      .from("rutinas")
      .select("semana_actual, rutina_dias ( semana )")
      .eq("cliente_id", user.id)
      .eq("activa", true)
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  /* En hora de Madrid: un entreno a las 00:30 es de ese día, no del
   * anterior (el servidor va en UTC). */
  const enMadrid = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const diasEntrenados = [
    ...new Set((fechasSesiones ?? []).map((s) => enMadrid(new Date(s.fecha_inicio)))),
  ];
  const objetivoSemana = rutina
    ? ((rutina.rutina_dias ?? []) as { semana: number }[]).filter(
        (d) => d.semana === rutina.semana_actual
      ).length
    : 0;

  const semanas = calcularRevisionSemanal(
    (medidas ?? []).map((m) => ({ fecha: m.fecha, peso: m.peso }))
  );
  const semanaActual = semanas[semanas.length - 1] ?? null;

  const entradasFotos = await resolverFotosProgreso(
    supabase,
    (medidas ?? []) as Medida[]
  );

  return (
    <MiProgreso
      clienteId={user.id}
      medidas={(medidas ?? []) as Medida[]}
      prs={prs}
      historial={historial}
      semanaActual={semanaActual}
      progresiones={progresiones}
      entradasFotos={entradasFotos}
      volumenMuscular={volumenMuscular}
      logrosDesbloqueados={(logrosPrevios ?? []).map((l) => l.clave)}
      revisiones={(revisiones ?? []) as RevisionKcal[]}
      preguntas={(preguntas ?? []) as PreguntaRevision[]}
      respuestasSemana={(respuestasSemana ?? []) as RespuestaRevision[]}
      semanaActualISO={semanaActualISO}
      habitos={(habitos ?? []) as Habito[]}
      registrosHabitos={(registrosHabitos ?? []) as HabitoRegistro[]}
      constancia={{ diasEntrenados, hoyISO: enMadrid(new Date()), objetivo: objetivoSemana }}
    />
  );
}
