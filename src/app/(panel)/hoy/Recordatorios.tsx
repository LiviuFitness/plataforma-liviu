"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Check } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { IconoTarjeta } from "@/componentes/ui";

export interface Recordatorio {
  id: string;
  clienteId: string;
  nombre: string;
  texto: string;
  /** "lo apuntaste el jueves", "hace 2 semanas"… */
  cuando: string;
  atrasado: boolean;
}

/** Notas con fecha que ya toca mirar. La casilla la da por hecha. */
export default function Recordatorios({ items }: { items: Recordatorio[] }) {
  const router = useRouter();
  const [hechas, setHechas] = useState<Set<string>>(new Set());

  async function hecha(id: string) {
    setHechas((prev) => new Set(prev).add(id));
    const supabase = crearClienteNavegador();
    const { error } = await supabase.from("notas_cliente").update({ hecha: true }).eq("id", id);
    if (error) {
      setHechas((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      return;
    }
    router.refresh();
  }

  const visibles = items.filter((i) => !hechas.has(i.id));
  if (visibles.length === 0) return null;

  return (
    <>
      <div className="titulo-seccion">Recordatorios</div>
      <div className="superficie px-4 mb-6">
        {visibles.map((r) => (
          <div key={r.id} className="fila">
            <IconoTarjeta Icono={CalendarClock} color="var(--color-aviso)" tamano={34} />
            <Link href={`/clientes/${r.clienteId}`} className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold leading-tight break-words">{r.texto}</div>
              <div className={`text-[12px] ${r.atrasado ? "text-aviso" : "text-atenuado"}`}>
                {r.nombre} · {r.cuando}
              </div>
            </Link>
            <button
              className="w-[26px] h-[26px] rounded-[8px] border border-borde-2 grid place-items-center shrink-0 cursor-pointer hover:border-acento"
              onClick={() => hecha(r.id)}
              aria-label="Marcar como hecho"
            >
              <Check size={14} className="text-atenuado" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
