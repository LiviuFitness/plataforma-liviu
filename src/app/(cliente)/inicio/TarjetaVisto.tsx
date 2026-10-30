import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cuandoFue } from "@/lib/historialEjercicio";
import ReproductorVoz from "@/componentes/ReproductorVoz";

const EMOJI: Record<string, string> = { fuego: "🔥", fuerza: "💪", aplauso: "👏" };

/**
 * «Liviu ha visto tu entreno»: si el entrenador ha reaccionado o dejado
 * una nota de voz a su último entreno, sale arriba en Inicio hasta que
 * vuelva a entrenar (entonces el último entreno es otro, aún sin ver).
 * Sin la columna vista_en (SQL sin pegar) la consulta falla y no sale.
 */
export default async function TarjetaVisto({ clienteId }: { clienteId: string }) {
  const supabase = await crearClienteServidor();
  const { data: s, error } = await supabase
    .from("sesiones")
    .select("vista_en, reaccion_entrenador, nota_voz, rutina_dias ( nombre )")
    .eq("cliente_id", clienteId)
    .not("fecha_fin", "is", null)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !s?.vista_en || (!s.reaccion_entrenador && !s.nota_voz)) return null;

  const dia = (s.rutina_dias as unknown as { nombre: string } | null)?.nombre ?? "entreno";
  let url: string | null = null;
  if (s.nota_voz) {
    const { data } = await supabase.storage.from("chat").createSignedUrl(s.nota_voz as string, 3600);
    url = data?.signedUrl ?? null;
  }
  const emoji = s.reaccion_entrenador ? EMOJI[s.reaccion_entrenador as string] : null;

  return (
    <section className="tarjeta tarjeta-acento !p-4 !mb-3 flex flex-col gap-3 anim-entrada-1">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <Image
            src="/asistente.webp"
            alt=""
            width={44}
            height={44}
            className="w-11 h-11 rounded-full object-cover border-2 border-acento"
          />
          {emoji && <span className="absolute -right-1.5 -bottom-1.5 text-[17px] leading-none">{emoji}</span>}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-[15px] leading-snug break-words">Liviu ha visto tu {dia}</div>
          <div className="text-atenuado text-[12.5px]">
            {cuandoFue(s.vista_en as string)}
            {s.nota_voz ? " · te ha dejado una nota de voz" : ""}
          </div>
        </div>
      </div>
      {s.nota_voz && <ReproductorVoz url={url} />}
      <Link
        href="/chat"
        className="h-9 rounded-[11px] border border-borde-2 bg-panel text-[13px] font-semibold inline-flex items-center justify-center gap-1.5"
      >
        <MessageCircle size={14} /> Responder
      </Link>
    </section>
  );
}
