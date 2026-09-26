import { SELECT_DIETA_COMPLETA, itemsDeOpcion, tieneOpcionB, type Alimento, type ComidaEstructurada } from "@/lib/dietas";
import { cargarContextoCliente } from "@/lib/contextoIA";
import { ERROR_IA, pedirIA, soloEntrenador } from "@/lib/ia";
import type { BorradorComidaIA, BorradorDietaIA } from "@/lib/iaTipos";
import type { Dieta } from "@/lib/tipos";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Crear dieta con IA: con el catálogo de Liviu (numerado, para que la IA
 * elija alimentos que existen), sus objetivos de macros y lo que Liviu
 * cuente del cliente. Después se corrigen los gramos para que el total
 * cuadre con el objetivo, y el borrador va al editor, donde Liviu lo
 * revisa y lo guarda él.
 */

interface ItemIA {
  n: number;
  g: number;
}
interface ComidaIA {
  nombre: string;
  alimentos: ItemIA[];
  nombre_b: string;
  alimentos_b: ItemIA[];
}

const ITEM = {
  type: "object",
  properties: {
    n: { type: "integer", description: "Número del alimento en el catálogo" },
    g: { type: "integer", description: "Gramos (en crudo/seco, como en el catálogo)" },
  },
  required: ["n", "g"],
  additionalProperties: false,
} as const;

const FORMATO = {
  type: "object",
  properties: {
    comidas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          alimentos: { type: "array", items: ITEM },
          nombre_b: { type: "string", description: 'Nombre corto de la opción B ("Tostadas"), o "" si no lleva' },
          alimentos_b: { type: "array", items: ITEM },
        },
        required: ["nombre", "alimentos", "nombre_b", "alimentos_b"],
        additionalProperties: false,
      },
    },
    explicacion: { type: "string", description: "Para Liviu: en 1 o 2 frases, cómo la has planteado." },
  },
  required: ["comidas", "explicacion"],
  additionalProperties: false,
} as const;

const INSTRUCCIONES = `Eres el ayudante de Liviu, entrenador personal y nutricionista deportivo de LivFit. Le preparas el borrador de la dieta de un cliente, que él revisará y retocará en su editor. Tiene que parecer hecha por él: sus alimentos, su forma de montar las comidas y cantidades fáciles de pesar.

Reglas:
- Usa SOLO alimentos del catálogo, por su número. Nunca los que el cliente no come.
- Gramos en crudo o en seco, como vienen en el catálogo. Redondea a múltiplos de 5 (los aceites y grasas pequeñas pueden ir de 5 en 5 desde 5 g).
- El total del día (solo la opción A de cada comida) tiene que acercarse todo lo posible al objetivo de kcal, proteína, hidratos y grasa. Calcula con los valores por 100 g del catálogo.
- Reparte la proteína en todas las comidas. Pon más hidratos alrededor del entreno si sabes cuándo entrena.
- Comidas reales y apetecibles, de las que se hacen en España: combinaciones que tengan sentido (nada de pollo con cereales de desayuno), fáciles de preparar y variadas entre comida y cena.
- Si se pide opción B, cada comida lleva una alternativa con alimentos distintos y macros parecidos a la opción A, y un nombre corto que la describa. Si no, deja nombre_b vacío y alimentos_b sin elementos.
- Nombres de las comidas como los de Liviu: Desayuno, Media mañana, Comida, Merienda, Cena, Recena (según cuántas sean).
- Ten en cuenta todo lo que Liviu cuente del cliente (horarios, gustos, lo que no le sienta bien).`;

const macros = (a: Alimento, g: number) => ({
  prot: (Number(a.prot_100) * g) / 100,
  carb: (Number(a.carb_100) * g) / 100,
  gras: (Number(a.gras_100) * g) / 100,
});
const redondear = (g: number) => (g < 12 ? Math.max(5, Math.round(g / 5) * 5) : Math.round(g / 5) * 5);

/**
 * Ajusta los gramos para acercar el total a los objetivos: cada macro se
 * corrige escalando los alimentos en los que ese macro es el principal
 * (el arroz para los hidratos, el pollo para la proteína, el aceite para
 * la grasa). Unas pocas pasadas bastan; nunca más de ±40 % por alimento.
 */
function cuadrarMacros(items: { a: Alimento; g: number }[], obj: { prot: number; carb: number; gras: number }) {
  const principal = (a: Alimento): "prot" | "carb" | "gras" => {
    const k = { prot: Number(a.prot_100) * 4, carb: Number(a.carb_100) * 4, gras: Number(a.gras_100) * 9 };
    return (Object.keys(k) as ("prot" | "carb" | "gras")[]).sort((x, y) => k[y] - k[x])[0];
  };
  const originales = items.map((i) => i.g);
  for (let pasada = 0; pasada < 4; pasada++) {
    for (const m of ["prot", "carb", "gras"] as const) {
      const total = items.reduce((s, i) => s + macros(i.a, i.g)[m], 0);
      const suyos = items.filter((i) => principal(i.a) === m);
      const deSuyos = suyos.reduce((s, i) => s + macros(i.a, i.g)[m], 0);
      if (deSuyos <= 0 || obj[m] <= 0) continue;
      const factor = Math.min(1.25, Math.max(0.8, 1 + (obj[m] - total) / deSuyos));
      for (const i of suyos) i.g *= factor;
    }
  }
  items.forEach((i, k) => {
    i.g = redondear(Math.min(originales[k] * 1.4, Math.max(originales[k] * 0.6, i.g)));
  });
}

export async function POST(request: Request) {
  const acceso = await soloEntrenador();
  if ("error" in acceso) return acceso.error;
  const { supabase } = acceso;

  const cuerpo = (await request.json().catch(() => ({}))) as {
    clienteId?: string;
    tipo?: "entreno" | "descanso";
    objetivos?: { kcal: number; prot: number; carb: number; gras: number };
    comidas?: number;
    opcionB?: boolean;
    notas?: string;
  };
  const o = cuerpo.objetivos;
  if (!cuerpo.clienteId || !o || !(o.kcal > 0)) return Response.json({ error: "Faltan datos" }, { status: 400 });
  const nComidas = Math.min(6, Math.max(2, Math.round(cuerpo.comidas ?? 4)));
  const tipo = cuerpo.tipo === "descanso" ? "descanso" : "entreno";

  const [ctx, { data: plantillas }] = await Promise.all([
    cargarContextoCliente(supabase, cuerpo.clienteId),
    supabase.from("dietas").select(SELECT_DIETA_COMPLETA).eq("es_plantilla", true).order("creada_en", { ascending: false }).limit(2),
  ]);
  if (!ctx) return Response.json({ error: "Cliente no encontrado" }, { status: 404 });

  /* Catálogo numerado sin lo que no come */
  const excluidos = new Set(ctx.excluidosIds);
  const lista = ctx.catalogo.filter((a) => !excluidos.has(a.id));
  const catalogo = lista
    .map((a, k) => `${k + 1}. ${a.nombre} ${Math.round(Number(a.prot_100))}/${Math.round(Number(a.carb_100))}/${Math.round(Number(a.gras_100))}`)
    .join("\n");

  /* Cómo monta Liviu sus dietas: sus plantillas como ejemplo de estilo */
  const textoDieta = (d: Dieta) =>
    ((d.dieta_comidas ?? []) as unknown as ComidaEstructurada[])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((c) => {
        const txt = (op: 0 | 1) =>
          itemsDeOpcion(c, op)
            .filter((i) => i.alimentos)
            .map((i) => `${i.alimentos!.nombre} ${Math.round(Number(i.gramos))} g`)
            .join(", ");
        return `- ${c.nombre}: ${txt(0)}${tieneOpcionB(c) ? ` | Opción B${c.nombre_b ? ` (${c.nombre_b})` : ""}: ${txt(1)}` : ""}`;
      })
      .join("\n");
  const ejemplos = ((plantillas ?? []) as unknown as Dieta[]).map((d) => `${d.nombre ?? "Plantilla"}:\n${textoDieta(d)}`);
  const otra = tipo === "descanso" ? ctx.entreno : ctx.descanso;

  const peticion = [
    `DIETA QUE HAY QUE CREAR: la del día de ${tipo}.`,
    `Objetivo diario: ${Math.round(o.kcal)} kcal · proteína ${Math.round(o.prot)} g · hidratos ${Math.round(o.carb)} g · grasa ${Math.round(o.gras)} g.`,
    `Número de comidas: ${nComidas}. ${cuerpo.opcionB ? "Con opción B en cada comida." : "Sin opción B."}`,
    ctx.ultimoPeso ? `Último peso: ${String(ctx.ultimoPeso).replace(".", ",")} kg.` : "",
    cuerpo.notas?.trim() ? `LO QUE CUENTA LIVIU DEL CLIENTE: ${cuerpo.notas.trim().slice(0, 1500)}` : "",
    otra ? `Su dieta del día de ${tipo === "descanso" ? "entreno" : "descanso"}, para que sea coherente con ella:\n${textoDieta(otra.dieta)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const r = await pedirIA<{ comidas: ComidaIA[]; explicacion: string }>({
    etiqueta: "dieta",
    effort: "medium",
    maxTokens: 16000,
    timeoutMs: 110_000,
    schema: FORMATO,
    system: [
      { type: "text", text: INSTRUCCIONES },
      { type: "text", text: `CATÁLOGO (número. nombre proteína/hidratos/grasa por 100 g)\n${catalogo}` },
      ...(ejemplos.length ? [{ type: "text" as const, text: `ASÍ MONTA LIVIU SUS DIETAS (plantillas suyas, como ejemplo de estilo)\n\n${ejemplos.join("\n\n")}` }] : []),
      { type: "text", text: ctx.estable },
    ],
    messages: [{ role: "user", content: peticion }],
  });
  if (!r.ok || !Array.isArray(r.datos.comidas) || r.datos.comidas.length === 0) {
    return Response.json({ error: ERROR_IA }, { status: 502 });
  }

  const aItems = (l: ItemIA[]) =>
    (l ?? [])
      .map((x) => ({ a: lista[x.n - 1], g: Number(x.g) }))
      .filter((x): x is { a: Alimento; g: number } => !!x.a && x.g > 0);
  const comidasA = r.datos.comidas.map((c) => aItems(c.alimentos));

  /* Los gramos de la opción A se ajustan al objetivo del día */
  const todos = comidasA.flat();
  cuadrarMacros(todos, { prot: o.prot, carb: o.carb, gras: o.gras });

  const comidas: BorradorComidaIA[] = r.datos.comidas.map((c, k) => {
    const itemsA = comidasA[k];
    let itemsB = cuerpo.opcionB ? aItems(c.alimentos_b) : [];
    /* La opción B, a las mismas kcal que la A de esa comida */
    if (itemsB.length > 0) {
      const kcal = (l: { a: Alimento; g: number }[]) => l.reduce((s, i) => s + (Number(i.a.kcal_100) * i.g) / 100, 0);
      const f = kcal(itemsB) > 0 ? Math.min(1.3, Math.max(0.7, kcal(itemsA) / kcal(itemsB))) : 1;
      itemsB = itemsB.map((i) => ({ a: i.a, g: redondear(i.g * f) }));
    }
    return {
      nombre: String(c.nombre || `Comida ${k + 1}`).slice(0, 40),
      items: itemsA.map((i) => ({ alimentoId: i.a.id, gramos: i.g })),
      nombreB: itemsB.length > 0 ? String(c.nombre_b || "").slice(0, 40) : "",
      itemsB: itemsB.length > 0 ? itemsB.map((i) => ({ alimentoId: i.a.id, gramos: i.g })) : null,
    };
  });

  const total = todos.reduce(
    (s, i) => ({
      kcal: s.kcal + (Number(i.a.kcal_100) * i.g) / 100,
      prot: s.prot + macros(i.a, i.g).prot,
      carb: s.carb + macros(i.a, i.g).carb,
      gras: s.gras + macros(i.a, i.g).gras,
    }),
    { kcal: 0, prot: 0, carb: 0, gras: 0 }
  );
  const borrador: BorradorDietaIA = {
    comidas,
    explicacion: String(r.datos.explicacion ?? "").trim(),
    totales: {
      kcal: Math.round(total.kcal),
      prot: Math.round(total.prot),
      carb: Math.round(total.carb),
      gras: Math.round(total.gras),
    },
  };
  return Response.json(borrador);
}
