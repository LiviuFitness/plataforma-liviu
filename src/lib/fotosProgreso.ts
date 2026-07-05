import type { crearClienteServidor } from "./supabase/servidor";
import type { EntradaFotosProgreso, Medida } from "./tipos";

/** Firma las URLs de las fotos de progreso (bucket privado) y agrupa
 * por medida, más reciente primero. */
export async function resolverFotosProgreso(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  medidas: Medida[]
): Promise<EntradaFotosProgreso[]> {
  const conFotos = medidas.filter(
    (m) => m.foto_frontal_url || m.foto_lateral_url || m.foto_espalda_url
  );
  const rutas = conFotos.flatMap((m) =>
    [m.foto_frontal_url, m.foto_lateral_url, m.foto_espalda_url].filter(
      (p): p is string => !!p
    )
  );

  const firmadas = new Map<string, string>();
  if (rutas.length > 0) {
    const { data } = await supabase.storage
      .from("progreso")
      .createSignedUrls(rutas, 3600);
    (data ?? []).forEach((u, i) => {
      if (u.signedUrl) firmadas.set(rutas[i], u.signedUrl);
    });
  }

  const foto = (ruta: string | null) =>
    ruta && firmadas.has(ruta) ? { path: ruta, url: firmadas.get(ruta)! } : null;

  return conFotos
    .slice()
    .reverse()
    .map((m) => ({
      id: m.id,
      fecha: m.fecha,
      frontal: foto(m.foto_frontal_url),
      lateral: foto(m.foto_lateral_url),
      espalda: foto(m.foto_espalda_url),
    }));
}
