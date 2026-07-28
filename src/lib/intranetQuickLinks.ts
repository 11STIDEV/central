import {
  CalendarDays,
  CircleDollarSign,
  FileText,
  MapPin,
  Ticket,
  UserRoundCheck,
  Users,
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
    name: "Portal do Funcionário",
    url: "/portal-do-funcionario",
    icon: Users,
    description: "Formulários e serviços ao colaborador",
  },
  {
    name: "Abrir Chamado",
    url: "/chamados/novo",
    icon: Ticket,
    description: "Solicitar suporte de TI",
  },
  {
    name: "CCI Pay",
    url: "/cci-pay",
    icon: CircleDollarSign,
    description: "Vale, loja e extrato",
  },
  {
    name: "Reserva de Equipamentos",
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
  {
    name: "Documentos",
    url: "/documentos",
    icon: FileText,
    description: "Arquivos e materiais internos",
  },
];
