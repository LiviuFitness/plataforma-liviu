import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { haceCuanto } from "@/componentes/ui";
import type { Alerta } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Pantalla "Hoy": estado del estudio de un vistazo. */
export default async function PaginaHoy() {
  const supabase = await crearClienteServidor();

  const [
    { data: clientes },
    { data: adherencias },
    { data: alertas },
    { data: sesiones },
    { data: medidas },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nombre")
      .eq("rol", "cliente")
      .eq("estado", "activo")
      .order("nombre"),
    supabase.from("v_adherencia").select("cliente_id, adherencia"),
    supabase.from("v_alertas").select("cliente_id, nombre, tipo, mensaje"),
    supabase
      .from("sesiones")
      .select("cliente_id, fecha_inicio")
      .order("fecha_inicio", { ascending: false })
      .limit(300),
    supabase
      .from("medidas")
      .select("cliente_id, fecha")
      .order("fecha", { ascending: false })
      .limit(300),
  ]);

  const listaClientes = clientes ?? [];
  const listaAlertas = (alertas ?? []) as Alerta[];

  // Adherencia media de los clientes activos
  const mapaAdh = new Map(
    (adherencias ?? []).map((a) => [a.cliente_id, a.adherencia as number])
  );
  const media =
    listaClientes.length > 0
      ? Math.round(
          listaClientes.reduce((s, c) => s + (mapaAdh.get(c.id) ?? 0), 0) /
            listaClientes.length
        )
      : 0;

  // Última actividad por cliente (sesión o medida, lo más reciente)
  const ultimaActividad = new Map<string, string>();
  for (const s of sesiones ?? []) {
    if (!ultimaActividad.has(s.cliente_id))
      ultimaActividad.set(s.cliente_id, s.fecha_inicio);
  }
  for (const m of medidas ?? []) {
    const previa = ultimaActividad.get(m.cliente_id);
    if (!previa || new Date(m.fecha) > new Date(previa))
      ultimaActividad.set(m.cliente_id, m.fecha);
  }

  // Alertas agrupadas por cliente
  const alertasPorCliente = new Map<string, Alerta[]>();
  for (const a of listaAlertas) {
    const lista = alertasPorCliente.get(a.cliente_id) ?? [];
    lista.push(a);
    alertasPorCliente.set(a.cliente_id, lista);
  }

  const fecha = new Date().toLocaleDateString("es-ES", { weekday: "long" });

  return (
    <>
      <h1 className="h1">Hoy</h1>
      <div className="sub serifa">{fecha} — así va tu estudio</div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2.5 my-[18px] mb-[22px]">
        <div className="tarjeta !mb-0 text-center !p-3.5">
          <div className="font-display italic text-[26px]">
            {listaClientes.length}
          </div>
          <div className="text-[10.5px] text-atenuado mt-1">
            clientes activos
          </div>
        </div>
        <div className="tarjeta !mb-0 text-center !p-3.5">
          <div className="font-display italic text-[26px] text-acento">
            {media}%
          </div>
          <div className="text-[10.5px] text-atenuado mt-1">
            adherencia media
          </div>
        </div>
        <div className="tarjeta !mb-0 text-center !p-3.5">
          <div
            className={`font-display italic text-[26px] ${
              listaAlertas.length ? "text-peligro" : ""
            }`}
          >
            {listaAlertas.length}
          </div>
          <div className="text-[10.5px] text-atenuado mt-1">alertas</div>
        </div>
      </div>

      {/* Necesitan atención — raíl cian, firma visual */}
      <div className="flex gap-3.5 mb-5">
        <div className="rail" />
        <div className="flex-1">
          <div className="titulo-tarjeta !mb-2.5">NECESITAN ATENCIÓN</div>
          {alertasPorCliente.size === 0 && (
            <div className="text-atenuado text-[13.5px]">
              Todo en orden — nadie necesita atención hoy.
            </div>
          )}
          {[...alertasPorCliente.entries()].map(([clienteId, lista]) => (
            <Link
              key={clienteId}
              href={`/clientes/${clienteId}`}
              className="flex gap-3 w-full tarjeta !mb-2.5 !p-3.5 !rounded-xl"
            >
              <div className="rail-punto" />
              <div>
                <div className="font-bold text-[15px]">{lista[0].nombre}</div>
                {lista.map((a, i) => (
                  <div key={i} className="text-texto-2 text-[13px] mt-0.5">
                    — {a.mensaje}
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Actividad reciente */}
      <section className="tarjeta">
        <div className="titulo-tarjeta">ACTIVIDAD RECIENTE</div>
        {listaClientes.length === 0 && (
          <div className="text-atenuado text-[13.5px]">
            Sin clientes todavía. Crea la primera invitación desde «Clientes».
          </div>
        )}
        {listaClientes
          .slice()
          .sort((a, b) => {
            const fa = ultimaActividad.get(a.id);
            const fb = ultimaActividad.get(b.id);
            if (!fa && !fb) return 0;
            if (!fa) return 1;
            if (!fb) return -1;
            return new Date(fb).getTime() - new Date(fa).getTime();
          })
          .map((c) => {
            const cuando = haceCuanto(ultimaActividad.get(c.id) ?? null);
            return (
              <Link
                key={c.id}
                href={`/clientes/${c.id}`}
                className="flex justify-between w-full border-b border-borde last:border-0 py-[11px] px-0.5 text-[14.5px]"
              >
                <span>{c.nombre}</span>
                <span
                  className={cuando === "Hoy" ? "text-acento" : "text-atenuado"}
                >
                  {cuando}
                </span>
              </Link>
            );
          })}
      </section>
    </>
  );
}
