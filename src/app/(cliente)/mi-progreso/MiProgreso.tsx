"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { fechaCorta, Sparkline } from "@/componentes/ui";
import { aNumero } from "@/lib/rutinas";
import FotosProgreso from "@/componentes/FotosProgreso";
import HistorialProgreso from "@/componentes/HistorialProgreso";
import MapaMuscular from "@/componentes/MapaMuscular";
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
}: {
  clienteId: string;
  medidas: Medida[];
  prs: PR[];
  historial: SesionHistorial[];
  semanaActual: SemanaRevision | null;
  progresiones: Record<string, PuntoProgresion[]>;
  entradasFotos: EntradaFotosProgreso[];
  volumenMuscular: VolumenMuscular[];
}) {
  const router = useRouter();
  const [peso, setPeso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const pesos = medidas.filter((m) => m.peso !== null).map((m) => Number(m.peso));

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
        <section className="tarjeta !border-acento/30">
          <div className="titulo-tarjeta">ESTA SEMANA</div>
          <div className="text-[14px] text-texto-2">
            Media de peso{" "}
            <b className="text-white">{semanaActual.mediaPeso.toFixed(1)} kg</b>
            {" · "}
            <span
              className={
                semanaActual.variacionPct < 0
                  ? "text-acento"
                  : semanaActual.variacionPct > 0
                    ? "text-aviso"
                    : "text-atenuado"
              }
            >
              {semanaActual.variacionPct > 0 ? "+" : ""}
              {semanaActual.variacionPct.toFixed(2)}% respecto a la semana pasada
            </span>
          </div>
        </section>
      )}

      <section className="tarjeta">
        <div className="titulo-tarjeta">PESO</div>
        <Sparkline datos={pesos} />
        {pesos.length >= 1 && (
          <div className="flex justify-between items-center mb-3">
            <span className="text-atenuado text-[13.5px]">
              {pesos.length >= 2 ? `Inicio ${pesos[0]} kg` : ""}
            </span>
            <span className="num-grande">{pesos[pesos.length - 1]} kg</span>
          </div>
        )}
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

      <HistorialProgreso
        prs={prs}
        progresiones={progresiones}
        historial={historial}
        onBorrarSesion={borrarSesion}
      />

      {medidas.length > 0 && (
        <section className="tarjeta">
          <div className="titulo-tarjeta">MEDIDAS</div>
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] text-[11px] text-atenuado uppercase tracking-wider border-b border-borde-2 py-[7px]">
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
                className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] text-[13px] border-b border-borde last:border-0 py-[7px]"
              >
                <span>{fechaCorta(m.fecha)}</span>
                <span className="font-bold text-acento">{m.peso ?? "—"}</span>
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
