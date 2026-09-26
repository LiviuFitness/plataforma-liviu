"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Check } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { Avatar } from "@/componentes/ui";
import type { ListoParaSubir } from "@/lib/listosSubir";

const kg = (n: number) => String(n).replace(".", ",");

/**
 * Ejercicios en los que alguien ya domina el rango. "Subir" suma el
 * salto a las series efectivas de ese ejercicio en su rutina (esta
 * semana y las siguientes, cada una sobre su propio peso). Si no lo
 * subes, deja de salir cuando deje de cumplirse.
 */
export default function ListosSubir({
  items,
  fotos = {},
}: {
  items: ListoParaSubir[];
  /** Foto de perfil de cada cliente por id */
  fotos?: Record<string, string | null>;
}) {
  const router = useRouter();
  const [subidos, setSubidos] = useState<Set<string>>(new Set());
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function subir(it: ListoParaSubir) {
    setTrabajando(it.clave);
    setError("");
    const supabase = crearClienteNavegador();
    const delta = it.kgNuevo - it.kgActual;
    const { data: series, error: e1 } = await supabase
      .from("series_prescritas")
      .select("id, kg")
      .in("rutina_ejercicio_id", it.rutinaEjercicioIds)
      .neq("tipo", "calentamiento")
      .not("kg", "is", null);
    if (e1 || !series) {
      setTrabajando(null);
      setError("No se pudo subir. Inténtalo de nuevo.");
      return;
    }
    const resultados = await Promise.all(
      series.map((s) =>
        supabase
          .from("series_prescritas")
          .update({ kg: Math.round((Number(s.kg) + delta) * 100) / 100 })
          .eq("id", s.id)
      )
    );
    setTrabajando(null);
    if (resultados.some((r) => r.error)) {
      setError(`Se subió solo en parte: revisa la rutina de ${it.nombre.split(" ")[0]}.`);
    }
    setSubidos((prev) => new Set(prev).add(it.clave));
    router.refresh();
  }

  return (
    <>
      <div className="superficie px-4 mb-2">
        {items.map((it) => {
          const hecho = subidos.has(it.clave);
          return (
            <div key={it.clave} className="fila">
              <Link href={`/clientes/${it.clienteId}?vista=entreno`} className="shrink-0">
                <Avatar nombre={it.nombre} tamano={34} foto={fotos[it.clienteId]} />
              </Link>
              <Link href={`/clientes/${it.clienteId}?vista=entreno`} className="flex-1 min-w-0">
                <div className="text-[13px] leading-tight break-words">
                  <b className="text-[14px]">{it.nombre.split(" ")[0]}</b>
                  <span className="text-texto-2"> · {it.ejercicio}</span>
                </div>
                <div className="text-[13px] mt-0.5">
                  <span className="text-atenuado">{kg(it.kgActual)} → </span>
                  <b className="text-acento">{kg(it.kgNuevo)} kg</b>
                </div>
                <div className="text-atenuado text-[11.5px]">{it.detalle}</div>
              </Link>
              {hecho ? (
                <span className="text-acento text-[13px] font-semibold flex items-center gap-1 shrink-0">
                  <Check size={14} strokeWidth={3} /> Subido
                </span>
              ) : (
                <button
                  className="chip !text-acento !border-acento/40 flex items-center gap-1 shrink-0"
                  onClick={() => subir(it)}
                  disabled={trabajando !== null}
                >
                  <ArrowUp size={13} /> {trabajando === it.clave ? "…" : "Subir"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {error && <div className="text-peligro text-[12.5px] mb-2">— {error}</div>}
      <div className="text-atenuado text-[12px] mb-6 leading-snug">
        «Subir» suma el salto a sus series efectivas de ese ejercicio, esta semana y las siguientes.
      </div>
    </>
  );
}
