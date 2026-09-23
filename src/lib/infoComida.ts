import {
  Apple,
  BedDouble,
  Coffee,
  Cookie,
  Moon,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/** Icono, color y foto según el nombre de la comida (Desayuno → café
 * azul, Cena → luna morada…), mismo criterio de color que el resto de la
 * app. La foto es ambiente, no el plato pautado: se eligió a propósito
 * que fuera genérica y apetecible, no un intento de representar lo que
 * el cliente tiene puesto ese día.
 *
 * Compartida por la vista del cliente y el editor del entrenador: así
 * una comida se reconoce igual desde los dos lados. */
export function infoComida(nombre: string): {
  Icono: LucideIcon;
  color: string;
  foto: string | null;
} {
  const n = nombre.toLowerCase();
  if (n.includes("desayuno"))
    return { Icono: Coffee, color: "var(--color-acento)", foto: "/comidas/desayuno.webp" };
  if (n.includes("media mañana") || n.includes("almuerzo"))
    return { Icono: Apple, color: "var(--color-verde)", foto: "/comidas/almuerzo.webp" };
  if (n.includes("merienda"))
    return { Icono: Cookie, color: "var(--color-naranja)", foto: "/comidas/merienda.webp" };
  if (n.includes("recena"))
    return { Icono: BedDouble, color: "var(--color-turquesa)", foto: "/comidas/recena.webp" };
  if (n.includes("cena"))
    return { Icono: Moon, color: "var(--color-morado)", foto: "/comidas/cena.webp" };
  if (n.includes("comida"))
    return { Icono: UtensilsCrossed, color: "var(--color-dorado)", foto: "/comidas/comida.webp" };
  return { Icono: Utensils, color: "var(--color-atenuado)", foto: null };
}
