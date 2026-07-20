import { notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { aRutinaUI, SELECT_RUTINA_COMPLETA, type FilaRutina } from "@/lib/rutinas";
import { SELECT_DIETA_COMPLETA, type Alimento } from "@/lib/dietas";
import { resolverFotosProgreso } from "@/lib/fotosProgreso";
import { resolverProgresoEntreno } from "@/lib/progresoEntreno";
import FichaCliente from "./FichaCliente";
import type {
  Alerta,
  Dieta,
  Ejercicio,
  Habito,
  HabitoRegistro,
  Medida,
  Mensaje,
  Perfil,
  RespuestaRevisionConPregunta,
  RevisionKcal,
} from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Ficha de cliente: carga todos los datos y los pasa al componente de pestañas. */
export default async function PaginaFichaCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const inicioSemana = new Date();
  // Semana de lunes a domingo
  const diaSemana = (inicioSemana.getDay() + 6) % 7;
  inicioSemana.setDate(inicioSemana.getDate() - diaSemana);
  inicioSemana.setHours(0, 0, 0, 0);

  const hace28dias = new Date();
  hace28dias.setDate(hace28dias.getDate() - 28);

  const [
    { data: perfil },
    { data: medidas },
    { data: alertas },
    { data: adherencia },
    { data: sesionesSemana },
    { data: rutina },
    { data: dieta },
    { data: dietaDescanso },
    { data: biblioteca },
    { data: alimentos },
    { data: exclusiones },
    { data: exclusionesEjercicio },
    { data: habitos },
    { data: registrosHabitos },
    { data: mensajes },
    { data: revisiones },
    { data: respuestasCuestionario },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("medidas")
      .select("*")
      .eq("cliente_id", id)
      .order("fecha", { ascending: true }),
    supabase.from("v_alertas").select("*").eq("cliente_id", id),
    supabase
      .from("v_adherencia")
      .select("adherencia")
      .eq("cliente_id", id)
      .maybeSingle(),
    supabase
      .from("sesiones")
      .select("fecha_inicio")
      .eq("cliente_id", id)
      .gte("fecha_inicio", inicioSemana.toISOString()),
    supabase
      .from("rutinas")
      .select(SELECT_RUTINA_COMPLETA)
      .eq("cliente_id", id)
      .eq("activa", true)
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("dietas")
      .select(SELECT_DIETA_COMPLETA)
      .eq("cliente_id", id)
      .eq("activa", true)
      .eq("tipo", "entreno")
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("dietas")
      .select(SELECT_DIETA_COMPLETA)
      .eq("cliente_id", id)
      .eq("activa", true)
      .eq("tipo", "descanso")
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("ejercicios").select("*").order("nombre"),
    supabase
      .from("alimentos")
      .select("id, nombre, kcal_100, prot_100, carb_100, gras_100, fibra_100, categoria")
      .order("nombre"),
    supabase.from("alimentos_excluidos").select("alimento_id").eq("cliente_id", id),
    supabase.from("ejercicios_excluidos").select("ejercicio_id").eq("cliente_id", id),
    supabase.from("habitos").select("*").eq("cliente_id", id).order("orden"),
    supabase
      .from("habitos_registros")
      .select("*")
      .eq("cliente_id", id)
      .gte("fecha", hace28dias.toLocaleDateString("sv-SE")),
    supabase
      .from("mensajes")
      .select("*")
      .eq("cliente_id", id)
      .order("creado_en", { ascending: true }),
    supabase
      .from("revisiones_kcal")
      .select("*")
      .eq("cliente_id", id)
      .order("creado_en", { ascending: false }),
    supabase
      .from("respuestas_revision")
      .select("id, semana, respuesta, creado_en, preguntas_revision ( texto )")
      .eq("cliente_id", id)
      .order("semana", { ascending: false }),
  ]);

  if (!perfil) notFound();

  // Días de la semana (L-D) con sesión registrada
  const diasEntrenados = [false, false, false, false, false, false, false];
  for (const s of sesionesSemana ?? []) {
    const d = (new Date(s.fecha_inicio).getDay() + 6) % 7;
    diasEntrenados[d] = true;
  }

  const [entradasFotos, progresoEntreno] = await Promise.all([
    resolverFotosProgreso(supabase, (medidas ?? []) as Medida[]),
    resolverProgresoEntreno(supabase, id),
  ]);

  return (
    <FichaCliente
      perfil={perfil as Perfil}
      medidas={(medidas ?? []) as Medida[]}
      alertas={(alertas ?? []) as Alerta[]}
      adherencia={adherencia?.adherencia ?? 0}
      diasEntrenados={diasEntrenados}
      rutina={rutina ? aRutinaUI(rutina as unknown as FilaRutina) : null}
      dieta={(dieta as Dieta | null) ?? null}
      dietaDescanso={(dietaDescanso as Dieta | null) ?? null}
      biblioteca={(biblioteca ?? []) as Ejercicio[]}
      alimentos={(alimentos ?? []) as Alimento[]}
      excluidos={(exclusiones ?? []).map((e) => e.alimento_id)}
      ejerciciosExcluidos={(exclusionesEjercicio ?? []).map((e) => e.ejercicio_id)}
      entradasFotos={entradasFotos}
      progresoEntreno={progresoEntreno}
      habitos={(habitos ?? []) as Habito[]}
      registrosHabitos={(registrosHabitos ?? []) as HabitoRegistro[]}
      mensajes={(mensajes ?? []) as Mensaje[]}
      revisiones={(revisiones ?? []) as RevisionKcal[]}
      respuestasCuestionario={
        (respuestasCuestionario ?? []) as unknown as RespuestaRevisionConPregunta[]
      }
    />
  );
}
