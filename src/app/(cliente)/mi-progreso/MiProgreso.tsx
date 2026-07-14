"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { fechaCorta, IconoTarjeta, Sparkline } from "@/componentes/ui";
import { aNumero } from "@/lib/rutinas";
import { useCountUp } from "@/lib/useCountUp";
import FotosProgreso from "@/componentes/FotosProgreso";
import HistorialProgreso from "@/componentes/HistorialProgreso";
import MapaMuscular from "@/componentes/MapaMuscular";
import GridLogros from "@/componentes/GridLogros";
import type { SemanaRevision } from "@/lib/revision";
import type { PR, PuntoProgresion, SesionHistorial } from "@/lib/progresoEntreno";
import type { VolumenMuscular } from "@/lib/musculos";
import type { EntradaFotosProgreso, Medida } from "@/lib/tipos";

/** Progreso del cliente: registra su peso, ve PRs e historial. */
export default function MiProgreso({
  clienteId,
  medidas,
  prs,
  historial,
  semanaActual,
  progresiones,
  entradasFotos,
  volumenMuscular,
  logrosDesbloqueados,
}: {
  clienteId: string;
  medidas: Medida[];
  prs: PR[];
  historial: SesionHistorial[];
  semanaActual: SemanaRevision | null;
  progresiones: Record<string, PuntoProgresion[]>;
  entradasFotos: EntradaFotosProgreso[];
  volumenMuscular: VolumenMuscular[];
  logrosDesbloqueados: string[];
}) {
  const router = useRouter();
  const [peso, setPeso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const pesos = medidas.filter((m) => m.peso !== null).map((m) => Number(m.peso));
  const pesoAnimado = useCountUp(pesos[pesos.length - 1] ?? 0, 1);

  async function guardarPeso() {
    const valor = aNumero(peso);
    if (!valor || valor < 25 || valor > 350) {
      setError("Escribe un peso válido en kg (por ejemplo 78,4).");
      return;
    }
    setGuardando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { error } = await supabase
      .from("medidas")
      .insert({ cliente_id: clienteId, peso: valor });
    setGuardando(false);
    if (error) {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      return;
    }
    setPeso("");
    router.refresh();
  }

  async function borrarSesion(id: string) {
    if (
      !confirm(
        "¿Borrar esta sesión? Desaparecerá de tu historial, racha y récords — útil si la empezaste por error."
      )
    )
      return;
    const supabase = crearClienteNavegador();
    await supabase.from("sesiones").delete().eq("id", id);
    router.refresh();
  }

  return (
    <>
      <h1 className="h1">Mi progreso</h1>
      <div className="sub mb-4">cada semana cuenta —</div>

      {semanaActual && semanaActual.variacionPct !== null && (
        <section
          className={`tarjeta ${semanaActual.variacionPct < 0 ? "tarjeta-turquesa" : semanaActual.variacionPct > 0 ? "tarjeta-dorado" : ""}`}
        >
          <div className="titulo-tarjeta">ESTA SEMANA</div>
          <div className="text-[14px] text-texto-2">
            Media de peso{" "}
            <b className="text-white">{semanaActual.mediaPeso.toFixed(1)} kg</b>
            {" · "}
            <span
              className={
                semanaActual.variacionPct < 0
                  ? "text-turquesa"
                  : semanaActual.variacionPct > 0
                    ? "text-dorado"
                    : "text-atenuado"
              }
            >
              {semanaActual.variacionPct > 0 ? "+" : ""}
              {semanaActual.variacionPct.toFixed(2)}% respecto a la semana pasada
            </span>
          </div>
        </section>
      )}

      <section className="tarjeta tarjeta-turquesa">
        <div className="flex items-center gap-3.5 mb-1">
          <IconoTarjeta Icono={Scale} color="var(--color-turquesa)" />
          <div className="flex-1 min-w-0">
            <div className="titulo-tarjeta !mb-0.5">PESO</div>
            {pesos.length >= 1 ? (
              <div className="flex items-baseline gap-1.5">
                <span
                  className="num-grande !text-[26px]"
                  style={{ color: "var(--color-turquesa)" }}
                >
                  {pesoAnimado.toFixed(1)}
                </span>
                <span className="text-atenuado text-[13px]">kg</span>
              </div>
            ) : (
              <div className="text-atenuado text-[13.5px]">Sin registrar todavía</div>
            )}
          </div>
          {pesos.length >= 2 && (
            <span className="texto-secundario shrink-0">Inicio {pesos[0]} kg</span>
          )}
        </div>
        <div className="mt-2 mb-3">
          <Sparkline datos={pesos} color="var(--color-turquesa)" />
        </div>
        <div className="flex gap-2">
          <input
            className="input !mb-0 flex-1"
            inputMode="decimal"
            placeholder="Tu peso de hoy (kg)"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
          />
          <button
            className="cta cta-mini !mb-0"
            onClick={guardarPeso}
            disabled={guardando || peso.trim() === ""}
          >
            {guardando ? "…" : "Guardar"}
          </button>
        </div>
        {error && (
          <div className="text-peligro text-[13.5px] mt-2">— {error}</div>
        )}
        <p className="text-atenuado text-[12px] mt-2">
          Pésate siempre en las mismas condiciones (por la mañana, en ayunas).
        </p>
      </section>

      <FotosProgreso clienteId={clienteId} entradasIniciales={entradasFotos} />

      <MapaMuscular volumen={volumenMuscular} />

      <GridLogros desbloqueados={logrosDesbloqueados} />

      <HistorialProgreso
        prs={prs}
        progresiones={progresiones}
        historial={historial}
        onBorrarSesion={borrarSesion}
      />

      {medidas.length > 0 && (
        <section className="tarjeta">
          <div className="titulo-tarjeta">MEDIDAS</div>
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] text-[10.5px] text-atenuado font-semibold uppercase tracking-[0.6px] border-b border-borde-2 py-2">
            <span>Fecha</span>
            <span>Peso</span>
            <span>Cintura</span>
            <span>Pecho</span>
            <span>Brazo</span>
          </div>
          {medidas
            .slice()
            .reverse()
            .map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] text-[13px] border-b border-borde last:border-0 py-2.5"
              >
                <span className="text-texto-2">{fechaCorta(m.fecha)}</span>
                <span className="font-bold" style={{ color: "var(--color-turquesa)" }}>
                  {m.peso ?? "—"}
                </span>
                <span>{m.cintura ?? "—"}</span>
                <span>{m.pecho ?? "—"}</span>
                <span>{m.brazo ?? "—"}</span>
              </div>
            ))}
        </section>
      )}
    </>
  );
}
