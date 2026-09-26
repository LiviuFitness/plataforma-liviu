import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Avatar } from "@/componentes/ui";

export const dynamic = "force-dynamic";

const euros = (n: number) => `${Math.round(n).toLocaleString("es-ES")} €`;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Meses completos entre dos fechas AAAA-MM-DD. */
function mesesEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.slice(0, 10).split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  let meses = (a2 - a1) * 12 + (m2 - m1);
  if (d2 < d1) meses--;
  return Math.max(0, meses);
}

/**
 * Cómo va el estudio: ingresos (de los pagos que marcas en Hoy), altas,
 * cuánto se quedan los clientes y quién cumple aniversario.
 */
export default async function PaginaEstadisticas() {
  const supabase = await crearClienteServidor();
  const [{ data: clientes }, { data: pagos }] = await Promise.all([
    supabase.from("profiles").select("id, nombre, fecha_alta, estado, avatar_url").eq("rol", "cliente"),
    supabase.from("pagos").select("importe, fecha"),
  ]);

  const hoy = new Date();
  const hoyISO = hoy.toLocaleDateString("sv-SE");
  const clave = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
  /* Los últimos 6 meses, del más antiguo al actual */
  const ultimos = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1);
    return { clave: clave(d.getFullYear(), d.getMonth()), etiqueta: MESES[d.getMonth()] };
  });

  const listaPagos = (pagos ?? []).map((p) => ({ importe: Number(p.importe), mes: String(p.fecha).slice(0, 7) }));
  const ingresos = ultimos.map((m) => ({
    ...m,
    total: listaPagos.filter((p) => p.mes === m.clave).reduce((a, p) => a + p.importe, 0),
  }));
  const esteMes = ingresos[5].total;
  const anterior = ingresos[4].total;
  const variacion = anterior > 0 ? Math.round(((esteMes - anterior) / anterior) * 100) : null;
  const maxIngreso = Math.max(1, ...ingresos.map((m) => m.total));

  const todos = clientes ?? [];
  const activos = todos.filter((c) => c.estado === "activo");
  const altas = ultimos.map((m) => ({
    ...m,
    n: todos.filter((c) => String(c.fecha_alta).slice(0, 7) === m.clave).length,
  }));
  const maxAltas = Math.max(1, ...altas.map((a) => a.n));
  const antiguedad =
    activos.length > 0
      ? activos.reduce((a, c) => a + mesesEntre(String(c.fecha_alta), hoyISO), 0) / activos.length
      : 0;
  /* Ingreso medio al mes por cliente activo, con 3 meses para que los
   * trimestrales no lo deformen */
  const ultimos3 = ingresos.slice(3).reduce((a, m) => a + m.total, 0);
  const mediaCliente = activos.length > 0 ? ultimos3 / 3 / activos.length : 0;

  /* Aniversarios redondos este mes: 3, 6, 12, 18, 24… meses */
  const aniversarios = activos
    .map((c) => {
      const alta = String(c.fecha_alta).slice(0, 10);
      const [a, m] = alta.split("-").map(Number);
      const meses = (hoy.getFullYear() - a) * 12 + (hoy.getMonth() + 1 - m);
      return {
        id: c.id as string,
        nombre: c.nombre as string,
        foto: (c.avatar_url as string | null) ?? null,
        meses,
        dia: Number(alta.slice(8)),
      };
    })
    .filter((x) => x.meses === 3 || x.meses === 6 || (x.meses >= 12 && x.meses % 6 === 0))
    .sort((a, b) => a.dia - b.dia);
  const textoAniversario = (m: number) =>
    m < 12 ? `${m} meses` : m % 12 === 0 ? `${m / 12} ${m === 12 ? "año" : "años"} 🎉` : `${Math.floor(m / 12)} año y medio`;

  const inactivos = todos.length - activos.length;
  const nombreMes = hoy.toLocaleDateString("es-ES", { month: "long" });

  return (
    <>
      <Link href="/hoy" className="text-atenuado text-[13.5px] inline-flex items-center gap-1 mb-2">
        <ArrowLeft size={14} /> Hoy
      </Link>
      <h1 className="h1 !mb-0">Tu negocio</h1>
      <div className="sub mb-4">cómo va el estudio —</div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="tarjeta !mb-0 !p-3.5 min-w-0">
          <div className="num-grande !text-[22px]">{activos.length}</div>
          <div className="text-atenuado text-[12px]">clientes activos</div>
          <div className="text-verde text-[11.5px] font-semibold">
            {altas[5].n > 0 ? `+${altas[5].n} este mes` : inactivos > 0 ? `${inactivos} pausados o de baja` : " "}
          </div>
        </div>
        <div className="tarjeta !mb-0 !p-3.5 min-w-0">
          <div className="num-grande !text-[22px]">{euros(esteMes)}</div>
          <div className="text-atenuado text-[12px]">cobrado en {nombreMes}</div>
          <div className={`text-[11.5px] font-semibold ${variacion !== null && variacion < 0 ? "text-aviso" : "text-verde"}`}>
            {variacion !== null ? `${variacion > 0 ? "+" : ""}${variacion} % vs ${MESES[(hoy.getMonth() + 11) % 12]}` : " "}
          </div>
        </div>
        <div className="tarjeta !mb-0 !p-3.5 min-w-0">
          <div className="num-grande !text-[22px]">{euros(mediaCliente)}</div>
          <div className="text-atenuado text-[12px]">al mes por cliente</div>
          <div className="text-atenuado text-[11.5px]">media de 3 meses</div>
        </div>
        <div className="tarjeta !mb-0 !p-3.5 min-w-0">
          <div className="num-grande !text-[22px]">
            {antiguedad.toFixed(1).replace(".", ",").replace(",0", "")} meses
          </div>
          <div className="text-atenuado text-[12px]">llevan contigo de media</div>
          <div className="text-atenuado text-[11.5px]">los activos</div>
        </div>
      </div>

      <section className="tarjeta">
        <div className="titulo-tarjeta">INGRESOS · 6 MESES</div>
        {listaPagos.length === 0 ? (
          <div className="text-atenuado text-[13px]">
            Aparecerán según marques cobros en Hoy › Renuevan esta semana.
          </div>
        ) : (
          <div className="flex items-end gap-2 h-[130px]" role="img" aria-label="Ingresos de los últimos seis meses">
            {ingresos.map((m, i) => (
              <div key={m.clave} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1 h-full">
                <span className="text-[10px] text-atenuado tabular-nums">{m.total > 0 ? Math.round(m.total) : ""}</span>
                <div
                  className="w-full rounded-t-[6px]"
                  style={{
                    height: `${Math.max(2, (m.total / maxIngreso) * 92)}px`,
                    background: i === 5 ? "var(--color-verde)" : "var(--color-borde-2)",
                  }}
                />
                <span className="text-[10.5px] text-atenuado">{m.etiqueta}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="tarjeta">
        <div className="titulo-tarjeta">ALTAS · 6 MESES</div>
        <div className="flex items-end gap-2 h-[70px]" role="img" aria-label="Altas de clientes por mes">
          {altas.map((m, i) => (
            <div key={m.clave} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1 h-full">
              <span className="text-[10.5px] font-semibold tabular-nums">{m.n > 0 ? m.n : ""}</span>
              <div
                className="w-full rounded-t-[5px]"
                style={{
                  height: `${Math.max(2, (m.n / maxAltas) * 36)}px`,
                  background: i === 5 ? "var(--color-acento)" : "var(--color-borde-2)",
                }}
              />
              <span className="text-[10.5px] text-atenuado">{m.etiqueta}</span>
            </div>
          ))}
        </div>
      </section>

      {aniversarios.length > 0 && (
        <>
          <div className="titulo-seccion">Cumplen aniversario en {nombreMes}</div>
          <div className="superficie px-4 mb-6">
            {aniversarios.map((a) => (
              <Link key={a.id} href={`/clientes/${a.id}`} className="fila">
                <Avatar nombre={a.nombre} tamano={30} foto={a.foto} />
                <span className="flex-1 min-w-0 text-[14px] break-words">
                  {a.nombre}
                  <span className="text-atenuado text-[12px]"> · el {a.dia}</span>
                </span>
                <span className="text-dorado text-[12.5px] font-semibold shrink-0">{textoAniversario(a.meses)}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
