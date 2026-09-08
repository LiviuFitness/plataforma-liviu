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

/** Pestañas de la app del cliente — compartidas entre la barra inferior
 * (móvil) y el lateral (escritorio) para que no se desincronicen. */
export const PESTANAS_CLIENTE: PestanaCliente[] = [
  { ruta: "/inicio", etiqueta: "Inicio", Icono: Home },
  { ruta: "/mi-rutina", etiqueta: "Rutina", Icono: IconoMancuerna },
  { ruta: "/mi-progreso", etiqueta: "Progreso", Icono: TrendingUp },
  { ruta: "/mi-dieta", etiqueta: "Dieta", Icono: UtensilsCrossed },
  { ruta: "/chat", etiqueta: "Chat", Icono: MessageCircle },
  { ruta: "/perfil", etiqueta: "Perfil", Icono: CircleUserRound },
];
