/* ============================================================
   Piezas visuales compartidas (portadas de los prototipos v1/v2)
   ============================================================ */

const CIAN = "#29ABE2";

/** Logo de marca: "LIVI" blanco + "U" cian, Anton itálica. */
export function Logo({ tamano = 20 }: { tamano?: number }) {
  return (
    <span
      className="font-display italic text-white"
      style={{ fontSize: tamano, letterSpacing: 1 }}
    >
      LIVI<span style={{ color: CIAN }}>U</span>
    </span>
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
          fontFamily: "Barlow, sans-serif",
        }}
      >
        {valor}
      </text>
    </svg>
  );
}

/** Línea de evolución (peso). Marca el último punto con un círculo. */
export function Sparkline({ datos }: { datos: number[] }) {
  if (datos.length < 2) {
    return (
      <div className="text-atenuado text-[13.5px] py-4">
        Aún no hay suficientes registros para dibujar la evolución.
      </div>
    );
  }
  const w = 280,
    h = 64,
    margen = 6;
  const min = Math.min(...datos),
    max = Math.max(...datos);
  const rango = max - min || 1;
  const punto = (v: number, i: number) => {
    const x = margen + (i * (w - margen * 2)) / (datos.length - 1);
    const y = h - margen - ((v - min) / rango) * (h - margen * 2);
    return { x, y };
  };
  const puntos = datos.map((v, i) => {
    const { x, y } = punto(v, i);
    return `${x},${y}`;
  });
  const ultimo = punto(datos[datos.length - 1], datos.length - 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 64 }}>
      <polyline
        points={puntos.join(" ")}
        fill="none"
        stroke={CIAN}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={ultimo.x} cy={ultimo.y} r="4" fill={CIAN} />
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
