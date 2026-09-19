import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { SELECT_DIETA_COMPLETA, type ComidaEstructurada } from "@/lib/dietas";
import type { Dieta } from "@/lib/tipos";
import { ShoppingCart } from "lucide-react";
import EstadoVacio from "@/componentes/EstadoVacio";
import { listaCompra } from "@/lib/compra";
import ListaCompra from "./ListaCompra";

export const dynamic = "force-dynamic";

function comidasDe(fila: unknown): ComidaEstructurada[] {
  const dieta = fila as Dieta | null;
  if (!dieta) return [];
  return ((dieta.dieta_comidas ?? []) as unknown as ComidaEstructurada[])
    .slice()
    .sort((a, b) => a.orden - b.orden);
}

/** Lista de la compra de la semana, calculada de la dieta pautada. */
export default async function PaginaCompra() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const [{ data: filaEntreno }, { data: filaDescanso }, { data: rutina }] =
    await Promise.all([
      supabase
        .from("dietas")
        .select(SELECT_DIETA_COMPLETA)
        .eq("cliente_id", user.id)
        .eq("activa", true)
        .eq("tipo", "entreno")
        .order("creada_en", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("dietas")
        .select(SELECT_DIETA_COMPLETA)
        .eq("cliente_id", user.id)
        .eq("activa", true)
        .eq("tipo", "descanso")
        .order("creada_en", { ascending: false })
        .limit(1)
        .maybeSingle(),
      /* Cuántos días entrena a la semana sale de su rutina activa, no de
       * una suposición: es lo que decide cuántos días llevan la dieta de
       * entreno y cuántos la de descanso. */
      supabase
        .from("rutinas")
        .select("semana_actual, rutina_dias ( semana )")
        .eq("cliente_id", user.id)
        .eq("activa", true)
        .order("creada_en", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const comidasEntreno = comidasDe(filaEntreno);
  const comidasDescanso = comidasDe(filaDescanso);

  const semanaActual = (rutina?.semana_actual as number | undefined) ?? 1;
  const diasEntreno = (
    (rutina?.rutina_dias ?? []) as { semana: number }[]
  ).filter((d) => d.semana === semanaActual).length;

  const articulos = listaCompra(comidasEntreno, comidasDescanso, diasEntreno);

  if (articulos.length === 0) {
    return (
      <>
        <h1 className="h1">Lista de la compra</h1>
        <div className="sub mb-4">tu semana, sumada —</div>
        <section className="tarjeta">
          <EstadoVacio
            Icono={ShoppingCart}
            color="var(--color-verde)"
            titulo="Todavía no hay nada que comprar"
            descripcion="En cuanto tu entrenador te asigne la dieta, aquí tendrás la lista de la semana entera, sumada y ordenada por pasillos del súper."
          />
        </section>
      </>
    );
  }

  return (
    <ListaCompra
      articulos={articulos}
      diasEntreno={diasEntreno}
      hayDescanso={comidasDescanso.length > 0}
      clienteId={user.id}
    />
  );
}
