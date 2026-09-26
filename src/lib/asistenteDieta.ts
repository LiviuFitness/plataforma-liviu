import {
  itemsDeOpcion,
  tieneOpcionB,
  type Alimento,
  type Alternativa,
  type ComidaEstructurada,
} from "@/lib/dietas";
import type { Dieta, RutinaUI } from "@/lib/tipos";

/**
 * Asistente LivFit: lo que sabe (la dieta del cliente, sus equivalencias,
 * lo que no come y el catálogo de alimentos) y cómo debe responder.
 */

export const LIMITE_DIARIO = 15;

export interface AlternativaAsistente {
  nombre: string;
  cantidad: string;
}

export interface MensajeAsistente {
  id: string;
  rol: "cliente" | "asistente";
  texto: string;
  alternativas: AlternativaAsistente[] | null;
  derivado: boolean;
  creado_en: string;
}

export const PREGUNTAS_EJEMPLO = [
  "No tengo pollo, ¿qué pongo?",
  "¿Puedo cambiar el arroz por pasta?",
  "Hoy como fuera, ¿qué pido?",
  "¿Qué como antes de entrenar?",
];

/** Medianoche de hoy en Madrid, como instante (para contar las preguntas del día) */
export function inicioDiaMadrid(ahora = new Date()): Date {
  const enMadrid = new Date(ahora.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const desfase = enMadrid.getTime() - ahora.getTime();
  const medianoche = new Date(enMadrid);
  medianoche.setHours(0, 0, 0, 0);
  return new Date(medianoche.getTime() - desfase);
}

/** La respuesta que se le pide al modelo (salida estructurada) */
export const FORMATO_RESPUESTA = {
  type: "object",
  properties: {
    respuesta: {
      type: "string",
      description: "Lo que ve el cliente. Breve, en español de España, tuteando.",
    },
    alternativas: {
      type: "array",
      description:
        "Cambios concretos propuestos, cada uno con su cantidad. Vacío si la pregunta no va de cambiar un alimento.",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          cantidad: { type: "string", description: 'Ej.: "150 g", "2 latas (160 g)"' },
        },
        required: ["nombre", "cantidad"],
        additionalProperties: false,
      },
    },
    derivar: {
      type: "boolean",
      description: "true si la pregunta la debe responder el entrenador en persona.",
    },
  },
  required: ["respuesta", "alternativas", "derivar"],
  additionalProperties: false,
} as const;

export const INSTRUCCIONES = `Eres el Asistente LivFit, el asistente de la app de entrenamiento personal de Liviu (LivFit). Hablas con clientes de Liviu que siguen el plan de dieta y la rutina que él les ha hecho. Tu trabajo es resolverles al momento las dudas del día a día, sobre todo de su dieta (qué poner cuando no tienen un alimento o no les apetece, cómo encajar una comida fuera, qué les queda por comer hoy), para que no tengan que esperar a Liviu por cosas sencillas. Tienes delante su dieta, su rutina, sus últimos entrenos, sus pesajes y lo que ha marcado como comido hoy: úsalo para que cada respuesta sea suya, no genérica.

Cómo respondes:
- En español de España, tuteando, cercano y motivador, como un buen entrenador. Frases cortas. Normalmente de una a cuatro frases: lo leen en el móvil, a veces con el táper en la mano.
- Habla como lo haría Liviu en persona: natural y al grano. Contesta a lo que te ha dicho, con sus palabras (si dice "arroz", es su crema de arroz: no le corrijas). Si te explica algo de su situación ("no me gustan las alternativas que tengo", "estoy fuera", "no tengo hambre"), demuestra en media frase que lo has entendido antes de dar la solución.
- No le expliques cómo funciona su plan por dentro (día de entreno o de descanso, opción A o B, objetivos de macros) salvo que lo pregunte o sea imprescindible para entender la respuesta: dale la cantidad concreta y ya ("en vez de tus 100 g de crema de arroz").
- Di "hidratos", no "carbos"; y en general evita jerga de fitness que un cliente normal no usaría.
- Te basas en su plan real, que tienes más abajo. Cuando proponga un cambio de alimento, da cantidades concretas en gramos (en crudo o en seco, igual que en su plan) que mantengan los macros de lo que sustituye, sobre todo el macro principal de ese alimento (proteína, hidrato o grasa). Usa primero las equivalencias que ha marcado Liviu; si no hay, calcula con los valores por 100 g del catálogo. Redondea a cantidades fáciles de pesar (múltiplos de 5 o 10 g, o unidades: 1 huevo, 1 lata).
- Pon esos cambios en "alternativas" (de uno a tres, del más parecido al menos), y en "respuesta" di en una frase qué sustituyen. No repitas la lista dentro del texto.
- Si dice que no le gustan o no le apetecen las alternativas que ya tiene, no repitas ninguna de las equivalencias de Liviu para ese alimento: busca otras distintas en el catálogo, que encajen en esa comida (lo que se come a esa hora con el resto de alimentos de la comida).
- Nunca propongas alimentos que el cliente ha marcado que no come.
- Si pregunta por algo que no está en su plan (comer fuera, un capricho, una bebida), oriéntale con sentido común para que encaje en su día sin agobiarle: qué elegir, qué cantidad aproximada y cómo compensar en las otras comidas si hace falta. Un capricho de vez en cuando no rompe nada: transmite eso, sin culpa.
- Si te manda una foto (la carta de un restaurante, un plato, la etiqueta de un producto, su nevera), analízala con su plan delante: qué pedir o cómo encajarlo, con cantidades aproximadas. Si la foto no se ve bien, díselo.
- También puedes resolver dudas generales de nutrición deportiva (qué comer antes o después de entrenar, hidratación, cafeína, cómo repartir las comidas si entrena a otra hora) y de su entreno de forma general (qué le toca, cuánto descansar entre series, cómo se hace un ejercicio en líneas generales). Siempre respetando lo que Liviu le ha pautado.
- No cambias su plan: solo orientas. Si quiere cambiar algo de forma permanente (quitar una comida, cambiar el horario de todo, subir o bajar calorías), dile que se lo comente a Liviu y pon "derivar" a true.
- Nada de markdown, ni asteriscos, ni listas con guiones en "respuesta": es texto plano. Puedes usar algún emoji, sin pasarte.

Cuándo derivar a Liviu ("derivar": true, y en "respuesta" le dices amablemente que eso mejor lo hable con Liviu, sin dar la respuesta tú):
- Cualquier tema de salud: enfermedades (diabetes, tiroides, hipertensión, colesterol, problemas digestivos…), medicación, embarazo o lactancia, alergias o reacciones a alimentos, dolor, lesiones, análisis de sangre.
- Suplementos, fármacos o sustancias para adelgazar o para rendir.
- Si pide dietas muy restrictivas, ayunos largos, bajar peso muy rápido, o notas señales de mala relación con la comida (culpa, atracones, vomitar, saltarse comidas a propósito). En este caso, además de derivar, responde con mucho cariño y sin juzgar.
- Si quiere cambiar su rutina (quitar o cambiar ejercicios, días, series), o cosas del servicio (pagos, citas, cambios de plan).
- Si no estás seguro de algo que pueda afectar a su salud.

Si la pregunta no tiene nada que ver con la dieta, el entrenamiento o la vida sana, dile con simpatía que solo le puedes ayudar con eso.`;

const n0 = (x: number) => Math.round(Number(x));
const n1 = (x: number) => String(Math.round(Number(x) * 10) / 10).replace(".", ",");

/** El catálogo de alimentos en texto compacto (igual para todos los clientes: se cachea) */
export function textoCatalogo(catalogo: Alimento[]): string {
  /* Formato mínimo: es lo que más ocupa de todo lo que se le manda.
   * Las kcal no hacen falta (salen de los macros: 4/4/9). */
  const lineas = catalogo.map((a) => `${a.nombre} ${n0(a.prot_100)}/${n0(a.carb_100)}/${n0(a.gras_100)}`);
  return `CATÁLOGO DE ALIMENTOS DE LIVFIT (gramos de proteína/hidratos/grasa por 100 g)\n${lineas.join("\n")}`;
}

interface Plan {
  dieta: Dieta;
  comidas: ComidaEstructurada[];
}

function textoItems(c: ComidaEstructurada, opcion: 0 | 1): string {
  return itemsDeOpcion(c, opcion)
    .filter((i) => i.alimentos)
    .map((i) => `${i.alimentos!.nombre} ${n0(i.gramos)} g`)
    .join(", ");
}

function textoPlan(titulo: string, p: Plan): string {
  const d = p.dieta;
  const lineas = [
    `${titulo} (objetivo del día: ${n0(d.kcal_obj)} kcal, proteína ${n0(d.prot_obj)} g, hidratos ${n0(d.carb_obj)} g, grasa ${n0(d.gras_obj)} g)`,
  ];
  for (const c of p.comidas) {
    let l = `- ${c.nombre}: ${textoItems(c, 0) || "sin alimentos pautados"}`;
    if (tieneOpcionB(c)) l += ` | Opción B${c.nombre_b ? ` (${c.nombre_b})` : ""}: ${textoItems(c, 1)}`;
    if (c.descripcion_libre?.trim()) l += ` | Nota de Liviu: ${c.descripcion_libre.trim()}`;
    lineas.push(l);
  }
  return lineas.join("\n");
}

/** Lo que el asistente sabe de este cliente en concreto */
export function textoCliente(d: {
  nombre: string;
  objetivo: string | null;
  sexo: string | null;
  entreno: Plan | null;
  descanso: Plan | null;
  equivalencias: (Alternativa & { alimento: string })[];
  excluidos: string[];
  rutina: RutinaUI | null;
}): string {
  const partes = [
    `DATOS DEL CLIENTE\nNombre: ${d.nombre.split(" ")[0] || "cliente"}${d.sexo ? ` · ${d.sexo}` : ""}${d.objetivo ? ` · Objetivo: ${d.objetivo}` : ""}`,
  ];
  if (d.entreno) partes.push(textoPlan(d.descanso ? "DIETA DEL DÍA DE ENTRENO" : "SU DIETA", d.entreno));
  if (d.descanso) partes.push(textoPlan(d.entreno ? "DIETA DEL DÍA DE DESCANSO" : "SU DIETA", d.descanso));
  if (!d.entreno && !d.descanso) partes.push("Todavía no tiene dieta asignada: oriéntale en general y dile que Liviu se la pondrá pronto.");
  if (d.equivalencias.length > 0) {
    partes.push(
      `EQUIVALENCIAS QUE HA MARCADO LIVIU (100 g del alimento ≈ estos gramos de la alternativa)\n${d.equivalencias
        .map((e) => `${e.alimento} 100 g ≈ ${e.nombre} ${n0(e.gramos)} g`)
        .join("\n")}`
    );
  }
  partes.push(
    d.excluidos.length > 0
      ? `ALIMENTOS QUE NO COME (no los propongas nunca): ${d.excluidos.join(", ")}`
      : "No ha marcado alimentos que no coma."
  );
  partes.push(textoRutina(d.rutina));
  return partes.join("\n\n");
}

/** Su rutina de esta semana, en corto */
function textoRutina(r: RutinaUI | null): string {
  if (!r) return "Todavía no tiene rutina asignada.";
  const lineas = r.dias
    .filter((d) => d.semana === r.semana_actual)
    .map((d) => {
      const ej = d.ejercicios
        .map((e) => {
          const efectivas = e.series.filter((x) => x.tipo !== "calentamiento");
          const reps = [...new Set(efectivas.map((x) => x.reps).filter(Boolean))].join("/");
          return `${e.nombre} ${efectivas.length}x${reps || "?"}`;
        })
        .join(", ");
      return `- ${d.nombre}: ${ej || "sin ejercicios"}`;
    });
  const notas = r.notas?.trim() ? `\nNotas de Liviu: ${r.notas.trim()}` : "";
  return `SU RUTINA (semana ${r.semana_actual})\n${lineas.join("\n")}${notas}`;
}

/** Lo que cambia a lo largo del día: va aparte para no romper la caché */
export function textoHoy(d: {
  hoy: string;
  hora: string;
  comidasHechas: string[];
  entrenos: { fecha: string; dia: string }[];
  pesos: { fecha: string; peso: number }[];
  diasEntrenos?: number;
}): string {
  const n = d.diasEntrenos ?? 7;
  const partes = [`HOY: ${d.hoy}, son las ${d.hora} (hora de España).`];
  partes.push(
    d.comidasHechas.length > 0
      ? `Comidas que ha marcado como hechas hoy: ${d.comidasHechas.join(", ")}.`
      : "Hoy todavía no ha marcado ninguna comida como hecha (puede que simplemente no las marque)."
  );
  partes.push(
    d.entrenos.length > 0
      ? `Sus entrenos de los últimos ${n} días: ${d.entrenos.map((e) => `${e.fecha} (${e.dia})`).join(", ")}.`
      : `No ha registrado entrenos en los últimos ${n} días.`
  );
  if (d.pesos.length > 0) {
    partes.push(`Sus últimos pesajes: ${d.pesos.map((p) => `${p.fecha}: ${n1(p.peso)} kg`).join(", ")}.`);
  }
  return partes.join("\n");
}
