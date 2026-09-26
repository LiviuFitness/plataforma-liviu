"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, type LucideIcon } from "lucide-react";
import { CATALOGO_LOGROS } from "@/lib/logros";
import Confetti from "@/componentes/Confetti";

interface Momento {
  Icono: LucideIcon;
  eyebrow: string;
  titulo: string;
  texto: string;
}

/**
 * Los momentos que se celebran a pantalla completa, una sola vez: un
 * logro recién desbloqueado y la semana de entrenos cumplida. Todo lo
 * demás se queda en su tarjeta; esto es para lo que de verdad merece
 * parar un segundo.
 *
 * La semana cumplida se recuerda en el móvil (una por semana); los
 * logros solo llegan como "nuevos" la visita en que se desbloquean.
 */
export default function Celebracion({
  nuevos,
  semanaCumplida,
}: {
  nuevos: string[];
  /** Lunes (AAAA-MM-DD) de la semana si ya se ha cumplido, o null. */
  semanaCumplida: string | null;
}) {
  const [cola, setCola] = useState<Momento[]>([]);

  useEffect(() => {
    const momentos: Momento[] = CATALOGO_LOGROS.filter((l) => nuevos.includes(l.clave)).map((l) => ({
      Icono: l.Icono,
      eyebrow: "Logro desbloqueado",
      titulo: l.etiqueta,
      texto: l.descripcion,
    }));
    if (semanaCumplida) {
      const clave = `semana-celebrada:${semanaCumplida}`;
      try {
        if (!localStorage.getItem(clave)) {
          localStorage.setItem(clave, "1");
          momentos.unshift({
            Icono: CalendarCheck,
            eyebrow: "Semana cumplida",
            titulo: "Todos tus entrenos",
            texto: "Has hecho todos los entrenos de la semana. Así es como se nota el cambio.",
          });
        }
      } catch {
        /* sin almacenamiento: mejor no celebrar que celebrar cada visita */
      }
    }
    // Lo que se celebra se decide al entrar, tras leer el móvil
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCola(momentos);
    // Solo al montar: son los de esta visita
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Fondo quieto mientras se celebra */
  const abierta = cola.length > 0;
  useEffect(() => {
    if (!abierta) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [abierta]);

  if (!abierta) return null;
  const m = cola[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 anim-fondo-aparece"
      style={{
        background: "radial-gradient(60% 45% at 50% 42%, rgba(226,180,41,.28), rgba(10,12,14,.97) 70%)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${m.eyebrow}: ${m.titulo}`}
    >
      <Confetti key={m.titulo} />
      <div className="text-center max-w-[360px] anim-aparecer" key={m.titulo}>
        <div className="relative w-36 h-36 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full celebracion-brillo" />
          <div
            className="absolute inset-3 rounded-full grid place-items-center border-2 border-dorado/70 anim-pop"
            style={{ background: "radial-gradient(circle at 35% 30%, #3a3113, #15130a)" }}
          >
            <m.Icono size={58} className="text-dorado" strokeWidth={1.6} />
          </div>
        </div>
        <div className="text-dorado text-[12px] font-bold tracking-[0.2em] uppercase mb-1">{m.eyebrow}</div>
        <div className="cifra-record text-[40px] leading-none mb-2 uppercase break-words">{m.titulo}</div>
        <div className="text-texto-2 text-[14px] mb-7 leading-relaxed">{m.texto}</div>
        <button className="cta !px-10 !w-auto inline-block" onClick={() => setCola(cola.slice(1))}>
          {cola.length > 1 ? "Siguiente" : "¡Vamos! 💪"}
        </button>
      </div>
    </div>
  );
}
