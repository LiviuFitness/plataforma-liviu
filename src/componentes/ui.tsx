/* ============================================================
   Piezas visuales compartidas (portadas de los prototipos v1/v2)
   ============================================================ */

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import type { NivelEstado } from "@/lib/estadoCliente";

const CIAN = "var(--color-acento)";

/** Icono circular consistente (mismo grosor/tamaño en toda la app):
 * fondo tintado al 14% del color + icono del color sólido. `tamano`
 * es el diámetro del círculo; el icono ocupa la mitad. */
export function IconoTarjeta({
  Icono,
  color,
  tamano = 40,
  className = "",
  titulo,
}: {
  Icono: LucideIcon;
  color: string;
  tamano?: number;
  className?: string;
  titulo?: string;
}) {
  return (
    <span
      className={`icono-tarjeta ${className}`}
      style={{ "--tc": color, width: tamano, height: tamano } as React.CSSProperties}
      title={titulo}
    >
      <Icono size={Math.round(tamano * 0.5)} strokeWidth={1.75} />
    </span>
  );
}

/** Círculo de iniciales — identidad neutra para listas largas (panel de
 * entrenador), sin depender de una foto ni de un anillo de progreso. */
export function Avatar({
  nombre,
  tamano = 36,
}: {
  nombre: string;
  tamano?: number;
}) {
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className="rounded-full bg-campo border border-borde-2 text-atenuado font-bold flex items-center justify-center shrink-0"
      style={{ width: tamano, height: tamano, fontSize: tamano * 0.38 }}
    >
      {iniciales || "?"}
    </span>
  );
}

/** Punto de estado único del panel de entrenador — ver `lib/estadoCliente.ts`.
 * Un solo lenguaje de color para "cómo va el cliente" en toda la app. */
export function PuntoEstado({
  nivel,
  titulo,
}: {
  nivel: NivelEstado;
  titulo?: string;
}) {
  const clase =
    nivel === "riesgo"
      ? "punto-estado-riesgo"
      : nivel === "atencion"
        ? "punto-estado-atencion"
        : "punto-estado-neutro";
  return <span className={`punto-estado ${clase}`} title={titulo} />;
}

/** Logo oficial LivFit (wordmark recortado con fondo transparente). */
export function Logo({ tamano = 32 }: { tamano?: number }) {
  return (
    <Image
      src="/logo-livfit.png"
      alt="LivFit"
      width={847}
      height={296}
      priority
      style={{ height: tamano, width: "auto", display: "inline-block" }}
    />
  );
}

/** Anillo de adherencia: verde-cian ≥80, aviso ≥60, peligro <60. */
export function AnilloAdherencia({
  valor,
  tamano = 44,
}: {
  valor: number;
  tamano?: number;
}) {
  const r = (tamano - 6) / 2;
  const c = 2 * Math.PI * r;
  const desfase = c * (1 - Math.min(100, Math.max(0, valor)) / 100);
  const color = valor >= 80 ? CIAN : valor >= 60 ? "#E2B429" : "#E25529";
  return (
    <svg width={tamano} height={tamano} className="shrink-0">
      <circle
        cx={tamano / 2}
        cy={tamano / 2}
        r={r}
        fill="none"
        stroke="#1E252B"
        strokeWidth="4"
      />
      <circle
        cx={tamano / 2}
        cy={tamano / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={c}
        strokeDashoffset={desfase}
        strokeLinecap="round"
        transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`}
      />
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fill: "#fff",
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "var(--font-display)",
        }}
      >
        {valor}
      </text>
    </svg>
  );
}

/** Gráfico de área de evolución (peso, cargas): línea con relleno en
 * degradado, puntos marcados y el último destacado. */
export function Sparkline({ datos, color = CIAN }: { datos: number[]; color?: string }) {
  if (datos.length < 2) {
    return (
      <div className="text-atenuado text-[13.5px] py-4">
        Aún no hay suficientes registros para dibujar la evolución.
      </div>
    );
  }
  const w = 280,
    h = 72,
    margen = 8;
  const min = Math.min(...datos),
    max = Math.max(...datos);
  const rango = max - min || 1;
  const punto = (v: number, i: number) => {
    const x = margen + (i * (w - margen * 2)) / (datos.length - 1);
    const y = h - margen - ((v - min) / rango) * (h - margen * 2);
    return { x, y };
  };
  const coords = datos.map((v, i) => punto(v, i));
  const linea = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${margen},${h - margen} ${linea} ${w - margen},${h - margen}`;
  const ultimo = coords[coords.length - 1];
  // id único por instancia para que los degradados no se pisen entre gráficos
  const idGrad = `grad-${Math.round(min * 10)}-${Math.round(max * 10)}-${datos.length}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 72 }}>
      <defs>
        <linearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${idGrad})`} />
      <polyline
        points={linea}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.length <= 20 &&
        coords.slice(0, -1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#0E1215" stroke={color} strokeWidth="1.5" />
        ))}
      <circle cx={ultimo.x} cy={ultimo.y} r="4.5" fill={color} />
      <circle cx={ultimo.x} cy={ultimo.y} r="8" fill={color} opacity="0.25" />
    </svg>
  );
}

/** Fecha corta en español: "03 jun". */
export function fechaCorta(fechaISO: string) {
  return new Date(fechaISO + "T00:00:00")
    .toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
    .replace(".", "");
}

/** Humaniza cuánto hace de una fecha: "Hoy", "Ayer", "Hace N días". */
export function haceCuanto(fechaISO: string | null): string {
  if (!fechaISO) return "Sin actividad";
  const dias = Math.floor(
    (Date.now() - new Date(fechaISO).getTime()) / 86400000
  );
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  return `Hace ${dias} días`;
}
