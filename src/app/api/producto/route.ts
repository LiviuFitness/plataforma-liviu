import { obtenerUsuario } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

/**
 * Un producto del súper por su código de barras, en Open Food Facts (la
 * base de datos pública y gratuita de alimentos envasados). Se pregunta
 * desde el servidor para no depender de lo que permita el navegador.
 */
export async function GET(request: Request) {
  if (!(await obtenerUsuario())) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const codigo = new URL(request.url).searchParams.get("codigo")?.replace(/\D/g, "") ?? "";
  if (codigo.length < 6 || codigo.length > 14) return Response.json({ error: "Código no válido" }, { status: 400 });

  try {
    const r = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${codigo}.json?fields=product_name,product_name_es,brands,nutriments,quantity`,
      { headers: { "User-Agent": "LivFit/1.0 (app.livfit.es)" }, signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } }
    );
    if (!r.ok) return Response.json({ encontrado: false });
    const d = (await r.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_es?: string;
        brands?: string;
        quantity?: string;
        nutriments?: Record<string, number | string | undefined>;
      };
    };
    const p = d.product;
    const n = p?.nutriments ?? {};
    const num = (k: string) => {
      const v = Number(n[k]);
      return Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
    };
    const nombre = (p?.product_name_es || p?.product_name || "").trim();
    if (d.status !== 1 || !nombre) return Response.json({ encontrado: false });
    return Response.json({
      encontrado: true,
      producto: {
        nombre,
        marca: (p?.brands ?? "").split(",")[0]?.trim() || null,
        cantidad: p?.quantity ?? null,
        kcal: num("energy-kcal_100g"),
        prot: num("proteins_100g"),
        carb: num("carbohydrates_100g"),
        azucar: num("sugars_100g"),
        gras: num("fat_100g"),
        grasSat: num("saturated-fat_100g"),
        fibra: num("fiber_100g"),
        sal: num("salt_100g"),
      },
    });
  } catch {
    return Response.json({ error: "No se ha podido buscar ahora." }, { status: 502 });
  }
}
