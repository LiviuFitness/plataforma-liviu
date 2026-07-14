/** Piezas para pantallas de carga (`loading.tsx`): bloques que pulsan
 * suavemente con la forma aproximada del contenido real, para que cambiar
 * de pestaña se sienta inmediato en vez de congelado. */

export function EsqueletoLinea({ ancho = "60%", alto = 22 }: { ancho?: string; alto?: number }) {
  return (
    <div
      className="animate-pulse rounded-full bg-borde-2"
      style={{ width: ancho, height: alto }}
    />
  );
}

export function EsqueletoTarjeta({
  alto = 90,
  className = "",
}: {
  alto?: number;
  className?: string;
}) {
  return (
    <div
      className={`tarjeta animate-pulse !border-borde ${className}`}
      style={{ height: alto }}
    />
  );
}

export function EsqueletoCabecera() {
  return (
    <div className="mb-4">
      <EsqueletoLinea ancho="55%" alto={28} />
      <div className="mt-2.5">
        <EsqueletoLinea ancho="35%" alto={14} />
      </div>
    </div>
  );
}
