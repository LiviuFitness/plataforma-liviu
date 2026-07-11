import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { calcularRevisionSemanal } from "@/lib/revision";
import { resolverFotosProgreso } from "@/lib/fotosProgreso";
import { resolverProgresoEntreno } from "@/lib/progresoEntreno";
import MiProgreso from "./MiProgreso";
import type { Medida } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Progreso del cliente: peso propio, récords personales e historial. */
export default async function PaginaMiProgreso() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const [{ data: medidas }, { prs, progresiones, historial }] = await Promise.all([
    supabase
      .from("medidas")
      .select("*")
      .eq("cliente_id", user.id)
      .order("fecha", { ascending: true }),
    resolverProgresoEntreno(supabase, user.id),
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
    />
  );
}
