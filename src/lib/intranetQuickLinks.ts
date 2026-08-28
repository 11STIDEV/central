import {
  CalendarDays,
  MapPin,
  Megaphone,
  Ticket,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
export type IntranetQuickLink = {
  name: string;
  url: string;
  icon: LucideIcon;
  description: string;
};

/** Atalhos internos mais usados — ordem intencional (não alfabética). */
export const INTRANET_QUICK_LINKS: IntranetQuickLink[] = [
  {
    name: "Comunicados Intersetoriais",
    url: "/comunicados-intersetoriais",
    icon: Megaphone,
    description: "Compartilhamento de informações entre setores",
  },
  {
    name: "Abrir Chamado",
    url: "/chamados/novo",
    icon: Ticket,
    description: "Solicitar suporte de TI",
  },
  {
    name: "Reserva de Espaços e Equipamentos",
    url: "/reserva-espacos-equipamentos",
    icon: MapPin,
    description: "Chromebooks, equipamentos e espaços",
  },
  {
    name: "Agenda CCI",
    url: "/agenda-cci",
    icon: CalendarDays,
    description: "Eventos e calendário institucional",
  },
  {
    name: "Minhas Reservas",
    url: "/minhas-reservas",
    icon: UserRoundCheck,
    description: "Acompanhe suas reservas",
  },
];
