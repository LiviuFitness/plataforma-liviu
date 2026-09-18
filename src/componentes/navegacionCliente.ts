import {
  CircleUserRound,
  Home,
  MessageCircle,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import IconoMancuerna from "./IconoMancuerna";
import type { IconoApp } from "./ui";

export interface PestanaCliente {
  ruta: string;
  etiqueta: string;
  /* IconoApp y no LucideIcon: la mancuerna es propia (la de lucide se
   * lee como un aspa a este tamaño), pero imita su misma firma. */
  Icono: IconoApp;
}

/** Lo que se hace a diario: entrenar, comer y hablar con el entrenador.
 * Son las que van en la barra inferior del móvil, donde seis pestañas se
 * leían como un muro de iconos. */
export const PESTANAS_CLIENTE: PestanaCliente[] = [
  { ruta: "/inicio", etiqueta: "Inicio", Icono: Home },
  { ruta: "/mi-rutina", etiqueta: "Entreno", Icono: IconoMancuerna },
  { ruta: "/mi-dieta", etiqueta: "Dieta", Icono: UtensilsCrossed },
  { ruta: "/chat", etiqueta: "Chat", Icono: MessageCircle },
];

/** Progreso y Perfil: se consultan de vez en cuando, no cada día. En el
 * móvil se llega desde Inicio (Progreso) y desde la cabecera (Perfil);
 * en escritorio sobra sitio, así que siguen en el lateral. */
export const PESTANAS_SECUNDARIAS: PestanaCliente[] = [
  { ruta: "/mi-progreso", etiqueta: "Progreso", Icono: TrendingUp },
  { ruta: "/perfil", etiqueta: "Perfil", Icono: CircleUserRound },
];
