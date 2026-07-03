import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { aRutinaUI, SELECT_RUTINA_COMPLETA, type FilaRutina } from "@/lib/rutinas";

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

/** Inicio del cliente: racha, semana y próximo entreno. */
export default async function PaginaInicio() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hace60dias = new Date(Date.now() - 60 * 86400000).toISOString();

  const [{ data: perfil }, { data: rutinaFila }, { data: sesiones }, { data: dieta }] =
    await Promise.all([
      supabase.from("profiles").select("nombre").eq("id", user.id).maybeSingle(),
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
        .select("fecha_inicio, dia_id")
        .eq("cliente_id", user.id)
        .gte("fecha_inicio", hace60dias)
        .order("fecha_inicio", { ascending: false }),
      supabase
        .from("dietas")
        .select("kcal_obj, prot_obj, carb_obj, gras_obj")
        .eq("cliente_id", user.id)
        .eq("activa", true)
        .limit(1)
        .maybeSingle(),
    ]);

  const rutina = rutinaFila
    ? aRutinaUI(rutinaFila as unknown as FilaRutina)
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

  const nombrePila = perfil?.nombre?.split(" ")[0] ?? "";

  return (
    <>
      <h1 className="h1">Hola{nombrePila ? `, ${nombrePila}` : ""}</h1>
      <div className="sub">a por el día de hoy —</div>

      {/* Racha y semana */}
      <div className="grid grid-cols-2 gap-2.5 my-[18px]">
        <div className="tarjeta !mb-0 text-center !p-4">
          <div className="text-[28px] leading-none mb-1">🔥</div>
          <div className="num-grande">{racha}</div>
          <div className="text-[11px] text-atenuado mt-0.5">
            {racha === 1 ? "día de racha" : "días de racha"}
          </div>
        </div>
        <div className="tarjeta !mb-0 text-center !p-4">
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

      {/* Próximo entreno */}
      {proximoDia ? (
        <section className="tarjeta !border-acento/30">
          <div className="titulo-tarjeta">TU PRÓXIMO ENTRENO</div>
          <div className="font-bold text-[18px] mb-0.5">{proximoDia.nombre}</div>
          <div className="text-atenuado text-[13px] mb-4">
            {proximoDia.ejercicios.length} ejercicios ·{" "}
            {proximoDia.ejercicios.reduce(
              (a, e) =>
                a + e.series.filter((s) => s.tipo !== "calentamiento").length,
              0
            )}{" "}
            series efectivas
          </div>
          <Link
            href={`/sesion/${proximoDia.id}`}
            className="cta !mb-0 block text-center"
          >
            Empezar sesión
          </Link>
        </section>
      ) : (
        <section className="tarjeta">
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

      {/* Acceso rápido a la dieta */}
      {dieta && (
        <Link href="/mi-dieta" className="tarjeta !mb-2.5 flex items-center gap-3.5 w-full">
          <div className="flex-1">
            <div className="titulo-tarjeta !mb-1">TU DIETA DE HOY</div>
            <div className="text-[14px]">
              <b className="text-acento">{dieta.kcal_obj}</b> kcal · P
              {dieta.prot_obj} / C{dieta.carb_obj} / G{dieta.gras_obj}
            </div>
          </div>
          <span className="text-acento text-[13.5px]">Ver →</span>
        </Link>
      )}
    </>
  );
}
