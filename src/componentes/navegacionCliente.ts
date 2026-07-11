import {
  CircleUserRound,
  Home,
  MessageCircle,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export interface PestanaCliente {
  ruta: string;
  etiqueta: string;
  Icono: LucideIcon;
}

/** Pestañas de la app del cliente — compartidas entre la barra inferior
 * (móvil) y el lateral (escritorio) para que no se desincronicen. */
export const PESTANAS_CLIENTE: PestanaCliente[] = [
  { ruta: "/inicio", etiqueta: "Inicio", Icono: Home },
  { ruta: "/mi-progreso", etiqueta: "Progreso", Icono: TrendingUp },
  { ruta: "/mi-dieta", etiqueta: "Dieta", Icono: UtensilsCrossed },
  { ruta: "/chat", etiqueta: "Chat", Icono: MessageCircle },
  { ruta: "/perfil", etiqueta: "Perfil", Icono: CircleUserRound },
];
