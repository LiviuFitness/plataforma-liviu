import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { CATALOGO_LOGROS } from "@/lib/logros";
import { AnilloAdherencia } from "@/componentes/ui";

export const dynamic = "force-dynamic";

const ETIQUETA_LOGRO = new Map(CATALOGO_LOGROS.map((l) => [l.clave, l]));

function haceCuanto(fechaISO: string): string {
  const dias = Math.floor((Date.now() - new Date(fechaISO).getTime()) / 86400000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

/** Comunidad: tus logros + lo que consiguen otros clientes que se han
 * hecho visibles + un ranking de constancia entre ellos. */
export default async function PaginaComunidad() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const [{ data: perfil }, { data: misLogros }, { data: feed }, { data: ranking }] =
    await Promise.all([
      supabase.from("profiles").select("visible_en_comunidad").eq("id", user.id).maybeSingle(),
      supabase.from("logros_desbloqueados").select("clave").eq("cliente_id", user.id),
      supabase.from("v_comunidad_logros").select("*"),
      supabase.from("v_comunidad_ranking").select("*"),
    ]);

  const misClaves = new Set((misLogros ?? []).map((l) => l.clave));

  return (
    <>
      <h1 className="h1 mb-1">Comunidad</h1>
      <div className="sub mb-4">tus logros y los de otros clientes</div>

      {perfil?.visible_en_comunidad === false && (
        <div className="tarjeta !border-aviso/40 text-[13.5px] text-texto-2">
          No apareces en la comunidad ahora mismo.{" "}
          <Link href="/perfil" className="text-acento underline underline-offset-2">
            Cambiar en tu perfil
          </Link>
          .
        </div>
      )}

      <section className="tarjeta">
        <div className="titulo-tarjeta">TUS LOGROS — {misClaves.size} de {CATALOGO_LOGROS.length}</div>
        <div className="grid grid-cols-3 gap-2.5">
          {CATALOGO_LOGROS.map((l) => {
            const conseguido = misClaves.has(l.clave);
            return (
              <div
                key={l.clave}
                className={`flex flex-col items-center text-center gap-1.5 p-2.5 rounded-[12px] border ${
                  conseguido ? "border-acento/40 bg-acento/10" : "border-borde-2 opacity-50"
                }`}
                title={l.descripcion}
              >
                <l.Icono size={22} className={conseguido ? "text-acento" : "text-atenuado"} />
                <span className="text-[11.5px] font-semibold leading-tight">{l.etiqueta}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="tarjeta">
        <div className="titulo-tarjeta">RANKING DE CONSTANCIA — 4 semanas</div>
        {ranking && ranking.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {ranking.map((r, i) => (
              <div key={r.cliente_id} className="flex items-center gap-3">
                <span className="text-atenuado text-[13px] w-4 shrink-0">{i + 1}</span>
                <span className="flex-1 text-[14px] font-semibold truncate">
                  {r.cliente_id === user.id ? "Tú" : r.nombre}
                </span>
                <AnilloAdherencia valor={r.adherencia} tamano={32} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-atenuado text-[13.5px]">Todavía no hay datos suficientes.</div>
        )}
      </section>

      <section className="tarjeta">
        <div className="titulo-tarjeta">ÚLTIMOS LOGROS DE LA COMUNIDAD</div>
        {feed && feed.length > 0 ? (
          <div className="flex flex-col">
            {feed.map((f) => {
              const info = ETIQUETA_LOGRO.get(f.clave);
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-2.5 py-2 border-b border-borde last:border-0"
                >
                  {info && <info.Icono size={17} className="text-acento shrink-0" />}
                  <div className="flex-1 min-w-0 text-[13.5px]">
                    <b>{f.nombre}</b> consiguió: {info?.etiqueta ?? f.clave}
                  </div>
                  <span className="text-atenuado text-[11.5px] shrink-0">
                    {haceCuanto(f.creado_en)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-atenuado text-[13.5px]">
            Todavía no hay logros compartidos en la comunidad.
          </div>
        )}
      </section>
    </>
  );
}
