"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, X } from "lucide-react";
import { OBJETIVOS, type Plan } from "@/lib/tipos";

/**
 * Añadir un cliente sin que se registre él: queda creado al momento (para
 * montarle rutina y dieta y entrenarle en presencial). Con correo, además
 * le llega el email para crear su contraseña; sin él, se le da acceso
 * cuando quieras desde su ficha.
 */
export default function HojaAnadirCliente({ onCerrar }: { onCerrar: () => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState<string>(OBJETIVOS[0]);
  const [plan, setPlan] = useState<Plan>("mensual");
  const [email, setEmail] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCreando(true);
    setError("");
    try {
      const r = await fetch("/api/clientes/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, objetivo, plan, email }),
      });
      const d = (await r.json()) as { id?: string; error?: string };
      if (!r.ok || !d.id) throw new Error(d.error);
      router.push(`/clientes/${d.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "No se ha podido crear. Inténtalo de nuevo.");
      setCreando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-end justify-center anim-fondo-aparece"
      onClick={() => !creando && onCerrar()}
    >
      <form
        className="w-full max-w-[480px] max-h-[90dvh] overflow-y-auto bg-[#0E1215] border border-borde rounded-t-[20px] p-[18px] anim-hoja-sube"
        onClick={(e) => e.stopPropagation()}
        onSubmit={crear}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[16px]">Añadir cliente</div>
            <div className="text-atenuado text-[12.5px] leading-snug">
              Lo das de alta tú. Le puedes montar rutina y dieta y entrenarle en presencial ya.
            </div>
          </div>
          <button type="button" className="ghost shrink-0 !px-2" onClick={onCerrar} disabled={creando} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <label className="block text-[12.5px] text-atenuado mb-1">Nombre y apellidos</label>
        <input
          className="input"
          value={nombre}
          maxLength={80}
          autoComplete="off"
          required
          onChange={(e) => setNombre(e.target.value)}
          disabled={creando}
        />

        <label className="block text-[12.5px] text-atenuado mb-1">Objetivo</label>
        <select className="input" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} disabled={creando}>
          {OBJETIVOS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <label className="block text-[12.5px] text-atenuado mb-1">Plan</label>
        <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as Plan)} disabled={creando}>
          <option value="mensual">Mensual</option>
          <option value="trimestral">Trimestral</option>
        </select>

        <label className="block text-[12.5px] text-atenuado mb-1">Correo (opcional)</label>
        <input
          className="input !mb-1"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="Su correo, si ya quieres que entre"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={creando}
        />
        <div className="text-atenuado text-[12px] mb-3 leading-snug">
          Sin correo: lo llevas tú desde tu panel y le das acceso cuando quieras. Con correo: le llega un email para crear su
          contraseña y entrar a la app.
        </div>

        {error && (
          <div className="text-peligro text-[13px] mb-2 flex items-start gap-1.5">
            <AlertCircle size={14} className="shrink-0 mt-[3px]" />
            <span className="min-w-0">{error}</span>
          </div>
        )}
        <button className="cta !mb-0" type="submit" disabled={creando || !nombre.trim()}>
          {creando ? "Creando…" : "Añadir cliente"}
        </button>
      </form>
    </div>
  );
}
