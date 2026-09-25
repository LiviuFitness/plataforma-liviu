import type { crearClienteNavegador } from "@/lib/supabase/cliente";

/**
 * Informe de progreso de un cliente desde que empezó: lo que se le
 * manda antes de renovar. Se carga desde el móvil del entrenador (RLS
 * de entrenador) al abrir el informe, no en cada visita a Hoy.
 */

export interface RecordInforme {
  nombre: string;
  antes: number;
  ahora: number;
}

export interface DatosInforme {
  nombre: string;
  desde: string; // AAAA-MM-DD (alta)
  hasta: string; // AAAA-MM-DD (hoy)
  meses: number;
  pesoInicio: number | null;
  pesoAhora: number | null;
  cinturaInicio: number | null;
  cinturaAhora: number | null;
  entrenos: number;
  records: RecordInforme[];
  totalRecords: number;
  fotoAntes: { url: string; fecha: string } | null;
  fotoAhora: { url: string; fecha: string } | null;
}

interface FilaMedida {
  fecha: string;
  peso: number | null;
  cintura: number | null;
  foto_frontal_url: string | null;
}

interface FilaSerie {
  kg: number | null;
  completada: boolean;
  tipo: string;
  ejercicio_sustituto_id: string | null;
  rutina_ejercicios: { ejercicios: { nombre: string } | null } | null;
}

function mesesEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  let meses = (a2 - a1) * 12 + (m2 - m1);
  if (d2 < d1) meses--;
  return Math.max(0, meses);
}

export async function cargarInforme(
  supabase: ReturnType<typeof crearClienteNavegador>,
  clienteId: string
): Promise<DatosInforme | null> {
  const [{ data: perfil }, { data: medidas }, { count: entrenos }, { data: sesiones }] =
    await Promise.all([
      supabase.from("profiles").select("nombre, fecha_alta").eq("id", clienteId).maybeSingle(),
      supabase
        .from("medidas")
        .select("fecha, peso, cintura, foto_frontal_url")
        .eq("cliente_id", clienteId)
        .order("fecha", { ascending: true }),
      supabase.from("sesiones").select("id", { count: "exact", head: true }).eq("cliente_id", clienteId),
      supabase
        .from("sesiones")
        .select(
          `fecha_inicio,
           series_realizadas ( kg, completada, tipo, ejercicio_sustituto_id,
             rutina_ejercicios ( ejercicios ( nombre ) ) )`
        )
        .eq("cliente_id", clienteId)
        .order("fecha_inicio", { ascending: true })
        .limit(200),
    ]);
  if (!perfil) return null;

  const hasta = new Date().toLocaleDateString("sv-SE");
  const desde = String(perfil.fecha_alta).slice(0, 10);
  const lista = (medidas ?? []) as FilaMedida[];
  const primero = <K extends keyof FilaMedida>(k: K) => lista.find((m) => m[k] !== null)?.[k] ?? null;
  const ultimo = <K extends keyof FilaMedida>(k: K) =>
    [...lista].reverse().find((m) => m[k] !== null)?.[k] ?? null;

  /* Récords: la mejor marca de su primera sesión con ese ejercicio frente
   * a la mejor de siempre. Se enseñan los que más han subido. */
  const primeraMarca = new Map<string, number>();
  const mejorMarca = new Map<string, number>();
  for (const s of (sesiones ?? []) as unknown as { series_realizadas: FilaSerie[] }[]) {
    const enSesion = new Map<string, number>();
    for (const x of s.series_realizadas ?? []) {
      const nombre = x.rutina_ejercicios?.ejercicios?.nombre;
      if (!nombre || !x.completada || x.tipo === "calentamiento" || x.kg === null) continue;
      if (x.ejercicio_sustituto_id) continue;
      enSesion.set(nombre, Math.max(enSesion.get(nombre) ?? 0, Number(x.kg)));
    }
    for (const [nombre, kg] of enSesion) {
      if (!primeraMarca.has(nombre)) primeraMarca.set(nombre, kg);
      mejorMarca.set(nombre, Math.max(mejorMarca.get(nombre) ?? 0, kg));
    }
  }
  const subidas = [...mejorMarca.entries()]
    .map(([nombre, ahora]) => ({ nombre, antes: primeraMarca.get(nombre)!, ahora }))
    .filter((r) => r.antes > 0 && r.ahora > r.antes)
    .sort((a, b) => b.ahora / b.antes - a.ahora / a.antes);

  /* Fotos: la primera y la última frontal, si son de días distintos */
  const conFoto = lista.filter((m) => m.foto_frontal_url);
  let fotoAntes: DatosInforme["fotoAntes"] = null;
  let fotoAhora: DatosInforme["fotoAhora"] = null;
  if (conFoto.length >= 2) {
    const a = conFoto[0];
    const b = conFoto[conFoto.length - 1];
    const { data } = await supabase.storage
      .from("progreso")
      .createSignedUrls([a.foto_frontal_url!, b.foto_frontal_url!], 600);
    if (data?.[0]?.signedUrl && data?.[1]?.signedUrl) {
      fotoAntes = { url: data[0].signedUrl, fecha: a.fecha };
      fotoAhora = { url: data[1].signedUrl, fecha: b.fecha };
    }
  }

  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    nombre: perfil.nombre as string,
    desde,
    hasta,
    meses: mesesEntre(desde, hasta),
    pesoInicio: num(primero("peso")),
    pesoAhora: num(ultimo("peso")),
    cinturaInicio: num(primero("cintura")),
    cinturaAhora: num(ultimo("cintura")),
    entrenos: entrenos ?? 0,
    records: subidas.slice(0, 3),
    totalRecords: subidas.length,
    fotoAntes,
    fotoAhora,
  };
}
