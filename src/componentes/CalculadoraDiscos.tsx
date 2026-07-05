"use client";

import { useMemo, useState } from "react";
import { calcularCarga, PESOS_BARRA, type Disco } from "@/lib/discos";

/**
 * Calculadora de discos: modal que muestra qué poner en cada lado
 * de la barra para llegar a un peso objetivo.
 */
export default function CalculadoraDiscos({
  pesoInicial,
  onCerrar,
}: {
  pesoInicial: string;
  onCerrar: () => void;
}) {
  const [objetivo, setObjetivo] = useState(pesoInicial || "");
  const [pesoBarra, setPesoBarra] = useState(20);

  const resultado = useMemo(() => {
    const num = Number(objetivo.replace(",", "."));
    if (!Number.isFinite(num) || num <= 0) return null;
    return calcularCarga(num, pesoBarra);
  }, [objetivo, pesoBarra]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-[480px] bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="titulo-tarjeta !m-0">⚖ CALCULADORA DE DISCOS</div>
          <button className="ghost" onClick={onCerrar}>
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-1">
          <div>
            <label className="text-[13px] text-texto-2 block mb-1">
              Peso objetivo (kg)
            </label>
            <input
              className="input !mb-0"
              inputMode="decimal"
              placeholder="100"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-[13px] text-texto-2 block mb-1">Barra</label>
            <select
              className="input !mb-0"
              value={pesoBarra}
              onChange={(e) => setPesoBarra(Number(e.target.value))}
            >
              {PESOS_BARRA.map((b) => (
                <option key={b.valor} value={b.valor}>
                  {b.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>

        {resultado && (
          <div className="tarjeta !mt-4 !mb-0">
            {/* Dibujo simple de la barra cargada */}
            <div className="flex items-center justify-center gap-1 py-4 overflow-x-auto scroll-sin-barra">
              <div className="w-10 h-1.5 bg-borde-2 rounded-l-full shrink-0" />
              {resultado.porLado.length === 0 ? (
                <span className="text-atenuado text-[12px] px-2">— sin discos —</span>
              ) : (
                resultado.porLado
                  .slice()
                  .reverse()
                  .map((d, i) => <DiscoVisual key={i} disco={d} />)
              )}
              <div className="w-3 h-14 bg-borde-2 rounded-sm shrink-0" />
            </div>

            <div className="text-center mb-3">
              <span className="text-atenuado text-[12.5px]">Por cada lado: </span>
              {resultado.porLado.length === 0 ? (
                <span className="text-atenuado text-[14px]">ningún disco</span>
              ) : (
                <span className="font-bold text-[15px]">
                  {resultado.porLado.map((d) => d.kg).join(" + ")} kg
                </span>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-borde">
              <span className="text-atenuado text-[13px]">Peso total conseguido</span>
              <span
                className={`num-grande !text-[20px] ${resultado.exacto ? "text-acento" : "text-aviso"}`}
              >
                {resultado.pesoTotal} kg
              </span>
            </div>
            {!resultado.exacto && (
              <p className="text-aviso text-[12px] mt-1">
                No se puede llegar exacto con los discos estándar — es lo más
                cercano posible.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DiscoVisual({ disco }: { disco: Disco }) {
  // Discos más pesados, más altos y anchos — proporción visual simple
  const alto = 30 + Math.min(disco.kg, 25) * 1.8;
  const ancho = disco.kg >= 10 ? 14 : 9;
  const claro = disco.kg === 5; // el disco blanco necesita texto oscuro
  return (
    <div
      className="rounded-[3px] shrink-0 flex items-center justify-center"
      style={{ backgroundColor: disco.color, height: alto, width: ancho }}
      title={`${disco.kg} kg`}
    >
      <span
        className="text-[8.5px] font-bold rotate-90"
        style={{ color: claro ? "#0A0C0E" : "#fff" }}
      >
        {disco.kg}
      </span>
    </div>
  );
}
