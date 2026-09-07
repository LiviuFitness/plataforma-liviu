"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, Phone, QrCode } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import EstadoVacio from "@/componentes/EstadoVacio";
import {
  ESTADOS_LEAD,
  NOMBRE_PLAN,
  type EstadoLead,
  type Lead,
} from "@/lib/planes";

/** Los números que deja la gente vienen sin prefijo casi siempre. */
function enlaceWhatsapp(telefono: string) {
  const digitos = telefono.replace(/\D/g, "");
  return `https://wa.me/${digitos.length === 9 ? "34" + digitos : digitos}`;
}

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Bandeja de leads. No es un CRM: solo lo justo para saber a quién
 * falta escribir y apuntar en qué quedó la conversación.
 */
export default function Leads({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<EstadoLead | "todos">("todos");
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  const cuentas = useMemo(() => {
    const c: Record<string, number> = { todos: leads.length };
    for (const l of leads) c[l.estado] = (c[l.estado] ?? 0) + 1;
    return c;
  }, [leads]);

  const visibles = filtro === "todos" ? leads : leads.filter((l) => l.estado === filtro);

  async function cambiarEstado(id: string, estado: EstadoLead) {
    const supabase = crearClienteNavegador();
    await supabase.from("leads").update({ estado }).eq("id", id);
    router.refresh();
  }

  async function guardarNota(lead: Lead) {
    const texto = notas[lead.id];
    if (texto === undefined || texto === (lead.notas ?? "")) return;
    setGuardando(lead.id);
    const supabase = crearClienteNavegador();
    await supabase.from("leads").update({ notas: texto.trim() || null }).eq("id", lead.id);
    setGuardando(null);
    router.refresh();
  }

  return (
    <>
      <h1 className="h1">Leads</h1>
      <div className="sub mb-4">quien ha dejado sus datos en /planes —</div>

      {leads.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            className={`chip shrink-0 ${filtro === "todos" ? "chip-activo" : ""}`}
            onClick={() => setFiltro("todos")}
          >
            Todos {cuentas.todos}
          </button>
          {ESTADOS_LEAD.map((e) => (
            <button
              key={e.clave}
              className={`chip shrink-0 ${filtro === e.clave ? "chip-activo" : ""}`}
              onClick={() => setFiltro(e.clave)}
            >
              {e.etiqueta} {cuentas[e.clave] ?? 0}
            </button>
          ))}
        </div>
      )}

      {leads.length === 0 && (
        <EstadoVacio
          Icono={QrCode}
          titulo="Todavía no hay leads"
          descripcion="Cuando alguien escanee el QR y deje sus datos en la página de planes, aparecerá aquí. El QR lo generas desde Ajustes."
        />
      )}

      {leads.length > 0 && visibles.length === 0 && (
        <div className="text-atenuado text-[13.5px]">Ninguno en este estado.</div>
      )}

      {visibles.map((lead) => (
        <section key={lead.id} className="tarjeta !p-5 mb-2.5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="font-bold text-[16px] text-white">{lead.nombre}</div>
            <div className="text-atenuado text-[12px] shrink-0 mt-0.5">
              {fechaCorta(lead.creado_en)}
            </div>
          </div>

          <div className="text-atenuado text-[12.5px] mb-3">
            {lead.plan ? `Le interesa: ${NOMBRE_PLAN[lead.plan]}` : "Sin plan concreto"}
            {lead.origen ? ` · vino de ${lead.origen}` : ""}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <a href={`mailto:${lead.email}`} className="chip !gap-1.5 flex items-center">
              <Mail size={14} /> {lead.email}
            </a>
            {lead.telefono && (
              <>
                <a href={`tel:${lead.telefono}`} className="chip !gap-1.5 flex items-center">
                  <Phone size={14} /> {lead.telefono}
                </a>
                <a
                  href={enlaceWhatsapp(lead.telefono)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip !gap-1.5 flex items-center"
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              </>
            )}
          </div>

          {lead.mensaje && (
            <p className="text-texto-2 text-[13.5px] leading-relaxed border-l-2 border-borde-2 pl-3 mb-3">
              {lead.mensaje}
            </p>
          )}

          <div className="flex gap-1.5 flex-wrap mb-3">
            {ESTADOS_LEAD.map((e) => (
              <button
                key={e.clave}
                onClick={() => cambiarEstado(lead.id, e.clave)}
                className={`chip !text-[12px] ${
                  lead.estado === e.clave ? "chip-activo" : ""
                }`}
              >
                {e.etiqueta}
              </button>
            ))}
          </div>

          <textarea
            className="w-full bg-campo border border-borde-2 rounded-[10px] text-white p-2.5 px-3 text-[13.5px] resize-y font-cuerpo"
            rows={2}
            placeholder="Tus apuntes: en qué quedasteis, cuándo volver a escribir…"
            value={notas[lead.id] ?? lead.notas ?? ""}
            onChange={(e) => setNotas({ ...notas, [lead.id]: e.target.value })}
            onBlur={() => guardarNota(lead)}
          />
          {guardando === lead.id && (
            <div className="text-atenuado text-[12px] mt-1">Guardando…</div>
          )}
        </section>
      ))}
    </>
  );
}
