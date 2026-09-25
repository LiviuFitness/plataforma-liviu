import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  calcularRevisionSemanal,
  lunesDe,
  ritmoPorDefecto,
  sugerenciaAjusteKcal,
} from "@/lib/revision";
import RondaRevision, { type FichaRonda } from "./RondaRevision";

export const dynamic = "force-dynamic";

const DIA = 86400000;

/**
 * Ronda de revisión: todos los clientes activos, uno detrás de otro, con
 * lo que hace falta para decidir el ajuste de la semana. Primero los que
 * aún no tienen ajuste esta semana.
 */
export default async function PaginaRevision() {
  const supabase = await crearClienteServidor();
  const hoyISO = new Date().toLocaleDateString("sv-SE");
  const lunes = lunesDe(hoyISO);
  const lunesPasado = new Date(new Date(lunes + "T00:00:00").getTime() - 7 * DIA)
    .toISOString()
    .slice(0, 10);
  const hace6semanas = new Date(new Date().setDate(new Date().getDate() - 42)).toLocaleDateString("sv-SE");
  const hace14dias = new Date(new Date().setDate(new Date().getDate() - 14)).toISOString();

  const [
    { data: clientes },
    { data: medidas },
    { data: sesiones },
    { data: rutinas },
    { data: dietas },
    { data: preguntas },
    { data: respuestas },
    { data: ajustes },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nombre, objetivo, objetivo_ritmo_semanal_pct")
      .eq("rol", "cliente")
      .eq("estado", "activo")
      .order("nombre"),
    supabase
      .from("medidas")
      .select("cliente_id, fecha, peso, foto_frontal_url")
      .gte("fecha", hace6semanas)
      .order("fecha"),
    supabase.from("sesiones").select("cliente_id, fecha_inicio, sensacion").gte("fecha_inicio", hace14dias),
    supabase
      .from("rutinas")
      .select("cliente_id, semana_actual, rutina_dias ( semana )")
      .eq("activa", true)
      .not("cliente_id", "is", null),
    supabase
      .from("dietas")
      .select("id, cliente_id, kcal_obj")
      .eq("activa", true)
      .eq("tipo", "entreno")
      .not("cliente_id", "is", null),
    supabase.from("preguntas_revision").select("id, texto, orden").eq("activa", true).order("orden"),
    supabase
      .from("respuestas_revision")
      .select("cliente_id, pregunta_id, semana, respuesta")
      .in("semana", [lunes, lunesPasado]),
    supabase.from("revisiones_kcal").select("cliente_id, delta").gte("creado_en", lunes),
  ]);

  const textoPregunta = new Map((preguntas ?? []).map((p) => [p.id as string, p.texto as string]));
  const ordenPregunta = new Map((preguntas ?? []).map((p) => [p.id as string, p.orden as number]));

  /* La foto más reciente de frente de las últimas 6 semanas */
  const ultimaFoto = new Map<string, { ruta: string; fecha: string }>();
  for (const m of medidas ?? []) {
    if (m.foto_frontal_url) ultimaFoto.set(m.cliente_id, { ruta: m.foto_frontal_url, fecha: m.fecha });
  }
  const rutas = [...ultimaFoto.values()].map((f) => f.ruta);
  const firmadas = new Map<string, string>();
  if (rutas.length > 0) {
    const { data } = await supabase.storage.from("progreso").createSignedUrls(rutas, 3600);
    (data ?? []).forEach((u, i) => u.signedUrl && firmadas.set(rutas[i], u.signedUrl));
  }

  const lunesMs = new Date(lunes + "T00:00:00").getTime();
  const lunesPasadoMs = lunesMs - 7 * DIA;

  const fichas: FichaRonda[] = (clientes ?? []).map((c) => {
    const pesos = (medidas ?? [])
      .filter((m) => m.cliente_id === c.id)
      .map((m) => ({ fecha: m.fecha as string, peso: m.peso === null ? null : Number(m.peso) }));
    /* Semanas cerradas: la en curso aún no dice nada */
    const semanas = calcularRevisionSemanal(pesos).filter((s) => s.inicioSemana < lunes);
    const ultima = semanas[semanas.length - 1] ?? null;
    const ritmo = (c.objetivo_ritmo_semanal_pct as number | null) ?? ritmoPorDefecto(c.objetivo);
    const sugerencia = ultima ? sugerenciaAjusteKcal(ultima.variacionPct, ritmo) : null;

    const suyas = (sesiones ?? []).filter((s) => s.cliente_id === c.id);
    const pasada = suyas.filter((s) => {
      const t = new Date(s.fecha_inicio).getTime();
      return t >= lunesPasadoMs && t < lunesMs;
    });
    const diasPasada = new Set(pasada.map((s) => new Date(s.fecha_inicio).toLocaleDateString("sv-SE"))).size;
    const sens = pasada.map((s) => s.sensacion).filter((v): v is number => v !== null);
    const rutina = (rutinas ?? []).find((r) => r.cliente_id === c.id);
    const objetivo = rutina
      ? ((rutina.rutina_dias ?? []) as { semana: number }[]).filter((d) => d.semana === rutina.semana_actual).length
      : 0;
    const dieta = (dietas ?? []).find((d) => d.cliente_id === c.id) ?? null;

    /* Sus respuestas: las de esta semana si ya contestó, si no las de la pasada */
    const suyasResp = (respuestas ?? []).filter((r) => r.cliente_id === c.id);
    const semanaResp = suyasResp.some((r) => r.semana === lunes) ? lunes : lunesPasado;
    const cuestionario = suyasResp
      .filter((r) => r.semana === semanaResp && textoPregunta.has(r.pregunta_id))
      .sort((a, b) => (ordenPregunta.get(a.pregunta_id) ?? 0) - (ordenPregunta.get(b.pregunta_id) ?? 0))
      .map((r) => ({ pregunta: textoPregunta.get(r.pregunta_id)!, respuesta: r.respuesta as string }));

    const foto = ultimaFoto.get(c.id);
    const ajuste = (ajustes ?? []).find((a) => a.cliente_id === c.id);

    return {
      id: c.id as string,
      nombre: c.nombre as string,
      objetivo: (c.objetivo as string | null) ?? null,
      pesoMedio: ultima?.mediaPeso ?? null,
      variacionPct: ultima?.variacionPct ?? null,
      ritmo,
      entrenos: diasPasada,
      objetivoEntrenos: objetivo,
      sensacion: sens.length ? sens.reduce((a, b) => a + b, 0) / sens.length : null,
      cuestionario,
      foto: foto && firmadas.has(foto.ruta) ? { url: firmadas.get(foto.ruta)!, fecha: foto.fecha } : null,
      dieta: dieta ? { id: dieta.id as string, kcal: Number(dieta.kcal_obj) } : null,
      sugerencia,
      ajustadoEstaSemana: ajuste ? Number(ajuste.delta) : null,
    };
  });

  /* Primero lo pendiente */
  fichas.sort((a, b) => Number(a.ajustadoEstaSemana !== null) - Number(b.ajustadoEstaSemana !== null));

  return <RondaRevision fichas={fichas} />;
}
