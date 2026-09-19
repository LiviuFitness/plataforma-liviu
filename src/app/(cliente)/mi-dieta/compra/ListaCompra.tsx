"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ShoppingCart } from "lucide-react";
import {
  PASILLOS,
  formatoCantidad,
  lunesDeEstaSemana,
  type ArticuloCompra,
} from "@/lib/compra";

/**
 * La lista se marca dentro del supermercado, con una mano ocupada: toda
 * la fila es el objetivo táctil, no solo la casilla.
 *
 * Lo marcado se guarda en el navegador y la clave lleva el lunes de la
 * semana, así que la lista se olvida sola cada semana en vez de arrastrar
 * lo tachado de la anterior.
 */
export default function ListaCompra({
  articulos,
  diasEntreno,
  hayDescanso,
  clienteId,
}: {
  articulos: ArticuloCompra[];
  diasEntreno: number;
  hayDescanso: boolean;
  clienteId: string;
}) {
  const clave = `lista-compra:${clienteId}:${lunesDeEstaSemana()}`;
  const [hechos, setHechos] = useState<Set<string>>(new Set());
  const [hidratado, setHidratado] = useState(false);

  /* El servidor no puede leer localStorage, así que recuperar lo marcado
   * solo puede pasar aquí, tras el primer render en el navegador. Es el
   * mismo caso que el autoguardado de la sesión de entreno. */
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const guardado = localStorage.getItem(clave);
      if (guardado) setHechos(new Set(JSON.parse(guardado) as string[]));
    } catch {
      /* navegador sin almacenamiento: la lista funciona igual, sin memoria */
    }
    setHidratado(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [clave]);

  useEffect(() => {
    if (!hidratado) return;
    try {
      localStorage.setItem(clave, JSON.stringify([...hechos]));
    } catch {
      /* idem */
    }
  }, [hechos, clave, hidratado]);

  const alternar = (id: string) =>
    setHechos((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

  const total = articulos.length;
  const puestos = articulos.filter((a) => hechos.has(a.alimentoId)).length;

  return (
    <>
      <Link href="/mi-dieta" className="ghost mb-3 inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Mi dieta
      </Link>

      <h1 className="h1">Lista de la compra</h1>
      <div className="sub mb-4">tu semana, sumada —</div>

      {/* De dónde salen las cantidades: sin esto son números mágicos */}
      <div className="tarjeta !p-4 flex items-center gap-3">
        <ShoppingCart size={20} className="text-acento shrink-0" />
        <div className="flex-1 min-w-0 text-[13.5px] leading-relaxed">
          {hayDescanso ? (
            <>
              Sale de tu dieta:{" "}
              <b>
                {diasEntreno} {diasEntreno === 1 ? "día" : "días"} de entreno y{" "}
                {7 - diasEntreno} de descanso
              </b>
              .
            </>
          ) : (
            <>
              Sale de tu dieta, para <b>los siete días</b>.
            </>
          )}{" "}
          Redondea al alza al comprar.
        </div>
      </div>

      <div className="superficie px-4 py-3 mb-5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold">
            {puestos} de {total} en el carro
          </div>
          <div className="h-1.5 rounded bg-borde-2 overflow-hidden mt-2">
            <div
              className="h-full bg-acento transition-[width] duration-300"
              style={{ width: `${total > 0 ? (puestos / total) * 100 : 0}%` }}
            />
          </div>
        </div>
        {puestos > 0 && (
          <button className="ghost shrink-0" onClick={() => setHechos(new Set())}>
            Reiniciar
          </button>
        )}
      </div>

      {PASILLOS.map((p) => {
        const items = articulos.filter((a) => a.pasillo === p.clave);
        if (items.length === 0) return null;
        return (
          <div key={p.clave} className="mb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: p.color }}
              />
              <div className="titulo-seccion !mb-0">{p.nombre}</div>
              <span className="text-atenuado text-[12px]">{items.length}</span>
            </div>
            <div className="superficie px-4">
              {items.map((a) => {
                const hecho = hechos.has(a.alimentoId);
                return (
                  <button
                    key={a.alimentoId}
                    className="fila w-full text-left cursor-pointer anim-pulsable"
                    onClick={() => alternar(a.alimentoId)}
                    aria-pressed={hecho}
                  >
                    <span
                      className="w-[22px] h-[22px] rounded-[7px] border flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        background: hecho ? "var(--color-acento)" : "transparent",
                        borderColor: hecho
                          ? "var(--color-acento)"
                          : "var(--color-borde-2)",
                      }}
                    >
                      {hecho && <Check size={14} strokeWidth={3} className="text-fondo" />}
                    </span>
                    <span
                      className={`num-grande !text-[15px] w-[70px] shrink-0 text-right tabular-nums ${
                        hecho ? "text-atenuado" : ""
                      }`}
                    >
                      {formatoCantidad(a.gramos)}
                    </span>
                    <span
                      className={`flex-1 min-w-0 text-[14px] leading-tight break-words ${
                        hecho ? "text-atenuado line-through" : ""
                      }`}
                    >
                      {a.nombre}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="text-atenuado text-[12px] leading-relaxed mb-6">
        Las cantidades son en crudo y para los siete días. Lo que marques se
        guarda en este móvil y se reinicia solo cada lunes.
      </p>
    </>
  );
}
