import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Dieta } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Dieta del cliente: sus objetivos y comidas del día (solo lectura). */
export default async function PaginaMiDieta() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("dietas")
    .select("*, dieta_comidas ( id, orden, nombre, descripcion_libre )")
    .eq("cliente_id", user.id)
    .eq("activa", true)
    .order("creada_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dieta = data as Dieta | null;
  const comidas = (dieta?.dieta_comidas ?? [])
    .slice()
    .sort((a, b) => a.orden - b.orden);

  return (
    <>
      <h1 className="h1">Mi dieta</h1>
      <div className="sub mb-4">tu plan de hoy —</div>

      {!dieta ? (
        <section className="tarjeta">
          <div className="text-atenuado text-[14px]">
            Tu dieta está en el horno 🔥 En cuanto tu entrenador te asigne el
            plan, aparecerá aquí.
          </div>
        </section>
      ) : (
        <>
          <section className="tarjeta">
            <div className="titulo-tarjeta">OBJETIVO DIARIO</div>
            <div className="mb-3">
              <span className="num-grande !text-[30px]">{dieta.kcal_obj}</span>
              <span className="text-atenuado text-[14px]"> kcal</span>
            </div>
            {(
              [
                ["Proteína", dieta.prot_obj, "#fff"],
                ["Carbohidratos", dieta.carb_obj, "#29ABE2"],
                ["Grasas", dieta.gras_obj, "#8A949C"],
              ] as const
            ).map(([etiqueta, valor, color]) => (
              <div
                key={etiqueta}
                className="flex justify-between items-center py-2 border-b border-borde last:border-0"
              >
                <span className="text-[14px]">{etiqueta}</span>
                <span className="font-bold text-[14.5px]" style={{ color }}>
                  {valor} g
                </span>
              </div>
            ))}
          </section>

          <section className="tarjeta">
            <div className="titulo-tarjeta">COMIDAS</div>
            {comidas.length === 0 && (
              <div className="text-atenuado text-[13.5px]">
                Sin comidas definidas todavía.
              </div>
            )}
            {comidas.map((c) => (
              <div
                key={c.id}
                className="py-2.5 border-b border-borde last:border-0"
              >
                <div className="font-bold text-[14.5px]">{c.nombre}</div>
                {c.descripcion_libre && (
                  <div className="text-texto-2 text-[13.5px] mt-0.5">
                    {c.descripcion_libre}
                  </div>
                )}
              </div>
            ))}
          </section>

          <p className="text-atenuado text-[12.5px]">
            ¿Dudas con alguna comida? Escríbeselo a tu entrenador en la nota de
            tu próxima sesión.
          </p>
        </>
      )}
    </>
  );
}
