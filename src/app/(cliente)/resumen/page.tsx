import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { calcularResumenMes, mesAnterior, type SesionMes } from "@/lib/resumenMes";
import HistoriasMes from "./HistoriasMes";

export const dynamic = "force-dynamic";

/** Tu mes en LivFit: el mes que se acaba de cerrar (o ?mes=AAAA-MM). */
export default async function PaginaResumen({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const { mes: pedido } = await searchParams;
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const mes = pedido && /^\d{4}-\d{2}$/.test(pedido) && pedido < hoy.slice(0, 7) ? pedido : mesAnterior(hoy.slice(0, 7));

  /* Del mes y de los 3 anteriores: los récords se miden contra antes */
  const [a, m] = mes.split("-").map(Number);
  const desde = new Date(Date.UTC(a, m - 4, 1)).toISOString();
  const hasta = new Date(Date.UTC(a, m, 2)).toISOString();

  const [{ data: perfil }, { data: sesiones }, { data: medidas }, { data: rutina }] = await Promise.all([
    supabase.from("profiles").select("nombre").eq("id", user.id).maybeSingle(),
    supabase
      .from("sesiones")
      .select(
        `fecha_inicio, fecha_fin,
         series_realizadas ( kg, reps, reps_extra, completada, tipo, ejercicio_sustituto_id,
           rutina_ejercicios ( ejercicios ( nombre ) ) )`
      )
      .eq("cliente_id", user.id)
      .gte("fecha_inicio", desde)
      .lt("fecha_inicio", hasta),
    supabase
      .from("medidas")
      .select("fecha, peso")
      .eq("cliente_id", user.id)
      .gte("fecha", `${mes}-01`)
      .not("peso", "is", null),
    supabase
      .from("rutinas")
      .select("semana_actual, rutina_dias ( semana )")
      .eq("cliente_id", user.id)
      .eq("activa", true)
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const objetivo = rutina
    ? ((rutina.rutina_dias ?? []) as { semana: number }[]).filter((d) => d.semana === rutina.semana_actual).length
    : 0;
  const resumen = calcularResumenMes({
    mes,
    sesiones: (sesiones ?? []) as unknown as SesionMes[],
    medidas: (medidas ?? []).map((x) => ({ fecha: x.fecha as string, peso: x.peso === null ? null : Number(x.peso) })),
    objetivo,
  });

  return <HistoriasMes r={resumen} pila={String(perfil?.nombre ?? "").split(" ")[0]} />;
}
