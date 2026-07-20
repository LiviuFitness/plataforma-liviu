import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { calcularRevisionSemanal, lunesDe } from "@/lib/revision";
import { resolverFotosProgreso } from "@/lib/fotosProgreso";
import { resolverProgresoEntreno } from "@/lib/progresoEntreno";
import MiProgreso from "./MiProgreso";
import type { Medida, PreguntaRevision, RespuestaRevision, RevisionKcal } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Progreso del cliente: peso propio, récords personales e historial. */
export default async function PaginaMiProgreso() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const semanaActualISO = lunesDe(new Date().toLocaleDateString("sv-SE"));

  const [
    { data: medidas },
    { prs, progresiones, historial, volumenMuscular },
    { data: logrosPrevios },
    { data: revisiones },
    { data: preguntas },
    { data: respuestasSemana },
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
  ]);

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
    />
  );
}
