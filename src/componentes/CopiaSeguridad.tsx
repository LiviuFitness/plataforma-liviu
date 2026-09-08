"use client";

import { useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

/**
 * Copia de seguridad completa del estudio, en un JSON que se descarga al
 * ordenador de Liviu.
 *
 * El plan gratuito de Supabase no tiene recuperación a un punto en el
 * tiempo: si algo se borra por error (y borrar un cliente arrastra en
 * cascada su historial entero), no hay a dónde volver. Esto es la red:
 * un fichero fuera de Supabase, en un disco que es suyo.
 *
 * Se descarga en el navegador con su propia sesión, así que sale
 * exactamente lo que el RLS le deja ver como entrenador — no hace falta
 * ninguna clave de servicio en ningún sitio.
 */

/* Tablas a guardar. El orden es el de dependencia (primero lo que otros
 * apuntan) por si algún día hay que reimportar a mano. */
const TABLAS: { tabla: string; select: string; orden?: string }[] = [
  { tabla: "profiles", select: "*", orden: "fecha_alta" },
  { tabla: "ajustes", select: "*" },
  { tabla: "ejercicios", select: "*", orden: "nombre" },
  { tabla: "alimentos", select: "*", orden: "nombre" },
  { tabla: "alimento_alternativas", select: "*" },
  { tabla: "rutinas", select: "*", orden: "creada_en" },
  { tabla: "rutina_dias", select: "*" },
  { tabla: "rutina_ejercicios", select: "*" },
  { tabla: "series_prescritas", select: "*" },
  { tabla: "dietas", select: "*", orden: "creada_en" },
  { tabla: "dieta_comidas", select: "*" },
  { tabla: "dieta_comida_alimentos", select: "*" },
  { tabla: "sesiones", select: "*", orden: "fecha_inicio" },
  { tabla: "series_realizadas", select: "*" },
  { tabla: "medidas", select: "*", orden: "fecha" },
  { tabla: "habitos", select: "*" },
  { tabla: "habitos_registros", select: "*" },
  { tabla: "mensajes", select: "*", orden: "creado_en" },
  { tabla: "preguntas_revision", select: "*" },
  { tabla: "respuestas_revision", select: "*" },
  { tabla: "preguntas_alta", select: "*" },
  { tabla: "respuestas_alta", select: "*" },
  { tabla: "logros_desbloqueados", select: "*" },
  { tabla: "leads", select: "*", orden: "creado_en" },
];

const PAGINA = 1000;

export default function CopiaSeguridad() {
  const [estado, setEstado] = useState<"quieto" | "trabajando">("quieto");
  const [progreso, setProgreso] = useState("");
  const [resumen, setResumen] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function descargar() {
    setEstado("trabajando");
    setError("");
    setResumen(null);
    const supabase = crearClienteNavegador();
    const datos: Record<string, unknown[]> = {};
    const fallos: string[] = [];

    for (const { tabla, select, orden } of TABLAS) {
      setProgreso(tabla);
      const filas: unknown[] = [];
      /* Por páginas: PostgREST corta a 1000 filas por petición y una
       * copia de seguridad truncada en silencio es peor que no tenerla. */
      for (let desde = 0; ; desde += PAGINA) {
        let consulta = supabase.from(tabla).select(select).range(desde, desde + PAGINA - 1);
        if (orden) consulta = consulta.order(orden);
        const { data, error: e } = await consulta;
        if (e) {
          fallos.push(`${tabla}: ${e.message}`);
          break;
        }
        filas.push(...(data ?? []));
        if (!data || data.length < PAGINA) break;
      }
      datos[tabla] = filas;
    }

    if (fallos.length === TABLAS.length) {
      setEstado("quieto");
      setError("No se pudo leer ninguna tabla. Comprueba la conexión.");
      return;
    }

    const contenido = {
      generado_en: new Date().toISOString(),
      aviso:
        "Copia de la base de datos de LivFit. NO incluye los ficheros de Storage (fotos de progreso, avatares y gifs de ejercicios), que se guardan aparte en Supabase.",
      tablas_con_error: fallos,
      datos,
    };

    const blob = new Blob([JSON.stringify(contenido, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `copia-livfit-${new Date().toLocaleDateString("sv-SE")}.json`;
    enlace.click();
    URL.revokeObjectURL(url);

    const total = Object.values(datos).reduce((a, f) => a + f.length, 0);
    const conDatos = Object.entries(datos)
      .filter(([, f]) => f.length > 0)
      .map(([t, f]) => `${t} ${f.length}`)
      .join(" · ");
    setResumen(
      `${total} filas de ${Object.keys(datos).length} tablas · ${(blob.size / 1024).toFixed(0)} KB\n${conDatos}` +
        (fallos.length ? `\nSin poder leer: ${fallos.join(", ")}` : "")
    );
    setProgreso("");
    setEstado("quieto");
  }

  return (
    <div className="fila-ajuste">
      <div className="titulo-tarjeta">Copia de seguridad</div>
      <p className="text-texto-2 text-[13px] leading-relaxed mb-3">
        Descarga todo lo que hay en la base de datos —clientes, rutinas, dietas,
        entrenos, medidas, hábitos, mensajes y leads— en un solo fichero. El plan
        gratuito de Supabase no permite volver atrás en el tiempo, así que esta es
        la única forma de recuperar algo si se borra por error. Guárdalo donde
        guardes tus cosas importantes y hazlo de vez en cuando.
      </p>

      <button className="cta !mb-0" onClick={descargar} disabled={estado === "trabajando"}>
        {estado === "trabajando" ? (
          `Leyendo ${progreso}…`
        ) : (
          <>
            <Download size={15} className="inline mr-1.5 -mt-0.5" />
            Descargar copia de seguridad
          </>
        )}
      </button>

      {error && <div className="text-peligro text-[13.5px] mt-2">— {error}</div>}

      {resumen && (
        <div className="mt-3 flex gap-2 text-[12.5px] text-atenuado leading-relaxed">
          <ShieldCheck size={15} className="text-verde shrink-0 mt-0.5" />
          <span className="whitespace-pre-line">{resumen}</span>
        </div>
      )}

      <p className="text-atenuado text-[12px] mt-3">
        No incluye las fotos de progreso, los avatares ni los gifs de ejercicios:
        son ficheros y viven aparte, en el almacenamiento de Supabase.
      </p>
    </div>
  );
}
