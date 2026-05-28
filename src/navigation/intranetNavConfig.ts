import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Boxes,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  FileText,
  GraduationCap,
  Hash,
  HeartPulse,
  Home,
  MapPin,
  Megaphone,
  Phone,
  School,
  Shield,
  ShieldCheck,
  Search,
  Ticket,
  UserCog,
  UserRoundCheck,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { Papel } from "@/auth/AuthProvider";
import { hasRoleAccessToRoute, podePainelSenhasAdministracao } from "@/auth/routeAccess";
import { isRotaBloqueadaParaUsuario } from "@/auth/routesTemporarilyBlocked";

/** Item de menu que aponta para uma rota da intranet. */
export type NavLeaf = {
  title: string;
  url: string;
  icon: LucideIcon;
  locked?: boolean;
};

/** Subgrupo dentro de uma seção `nested` (Setores, Suporte, Agenda, etc.). */
export type NavSector = {
  /** Chave estável para merge com extras vindos do banco (ex.: Supabase). */
  id: string;
  label: string;
  items: NavLeaf[];
};

export type NavSectionFlat = {
  id: string;
  label: string;
  type: "flat";
  items: NavLeaf[];
};

export type NavSectionNested = {
  id: string;
  label: string;
  type: "nested";
  sectors: NavSector[];
};

export type NavSection = NavSectionFlat | NavSectionNested;

/**
 * Árvore estática do menu. Ordem = ordem de exibição.
 * Itens extras por setor podem ser mesclados via `mergeNavExtras` (ex.: tabela futura no Supabase).
 */
export const INTRANET_NAV_SECTIONS: NavSection[] = [
  {
    id: "portal",
    label: "Portal",
    type: "flat",
    items: [
      { title: "Central de Informações", url: "/", icon: Home },
      { title: "Portal do Funcionário", url: "/portal-do-funcionario", icon: Users },
    ],
  },
  {
    id: "atendimento",
    label: "Atendimento",
    type: "nested",
    sectors: [
      {
        id: "atendimento-chamados",
        label: "Chamados",
        items: [
          { title: "Abrir Chamado", url: "/chamados/novo", icon: Ticket },
          { title: "Gestão de Chamados", url: "/chamados/gestao", icon: ClipboardList },
        ],
      },
      {
        id: "atendimento-senhas",
        label: "Painel de senhas",
        items: [{ title: "Painel de senhas", url: "/senhas", icon: Hash }],
      },
      {
        id: "atendimento-achados-perdidos",
        label: "Achados e Perdidos",
        items: [
          { title: "Achados e Perdidos — Hub", url: "/achados-e-perdidos", icon: Search },
        ],
      },
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    type: "flat",
    items: [
      { title: "Agenda CCI", url: "/agenda-cci", icon: CalendarDays },
      {
        title: "Reserva de Equipamentos e Espaços",
        url: "/reserva-espacos-equipamentos",
        icon: MapPin,
      },
      { title: "Minhas Reservas", url: "/minhas-reservas", icon: UserRoundCheck },
      { title: "Agenda CCI — Admin", url: "/agenda-cci/admin", icon: Shield },
    ],
  },
  {
    id: "operacao-interna",
    label: "Operação interna",
    type: "flat",
    items: [
      { title: "Base de Conhecimento", url: "/base-conhecimento", icon: BookOpen },
      { title: "Documentos", url: "/documentos", icon: FileText },
      { title: "Ramais", url: "/ramais", icon: Phone },
    ],
  },
  {
    id: "setores",
    label: "Setores",
    type: "nested",
    sectors: [
      {
        id: "setores-professores",
        label: "Professores",
        items: [{ title: "Links dos Professores", url: "/setores/professores", icon: GraduationCap }],
      },
      {
        id: "setores-disciplinar",
        label: "Disciplinar",
        items: [{ title: "Links do Disciplinar", url: "/setores/disciplinar", icon: ClipboardList }],
      },
      {
        id: "setores-secretaria",
        label: "Secretaria",
        items: [{ title: "Links da Secretaria", url: "/setores/secretaria", icon: FileText }],
      },
      {
        id: "setores-servicos-gerais",
        label: "Serviços Gerais",
        items: [{ title: "Links de Serviços Gerais", url: "/setores/servicos-gerais", icon: Wrench }],
      },
      {
        id: "setores-publicidade",
        label: "Publicidade",
        items: [{ title: "Links da Publicidade", url: "/setores/publicidade", icon: Megaphone }],
      },
      {
        id: "setores-dp-financeiro",
        label: "DP e Financeiro",
        items: [
          { title: "Links DP e Financeiro", url: "/setores/dp-financeiro", icon: Briefcase },
          {
            title: "Financeiro — Vales",
            url: "/financeiro/vales-adiantamento",
            icon: CircleDollarSign,
          },
        ],
      },
      {
        id: "setores-primeiros-socorros",
        label: "Primeiros Socorros",
        items: [
          { title: "Links de Primeiros Socorros", url: "/setores/primeiros-socorros", icon: HeartPulse },
        ],
      },
      {
        id: "setores-direcao",
        label: "Direção",
        items: [{ title: "Links da Direção", url: "/setores/direcao", icon: School }],
      },
      {
        id: "setores-clat",
        label: "CLAT",
        items: [{ title: "Links do CLAT", url: "/setores/clat", icon: ClipboardList }],
      },
      {
        id: "setores-ti",
        label: "TI",
        items: [
          { title: "Área Interna TI", url: "/ti-interno", icon: ShieldCheck },
          { title: "Controle Materiais (TI)", url: "/controle-materiais-ti", icon: Boxes },
        ],
      },
      {
        id: "setores-almoxarifado",
        label: "Almoxarifado",
        items: [
          {
            title: "Almoxarifado (Entrada/Saída)",
            url: "/controle-materiais-almoxarifado",
            icon: Warehouse,
          },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Administração",
    type: "flat",
    items: [{ title: "Admin — Papéis manuais", url: "/admin/papeis-manuais", icon: UserCog }],
  },
];

/** Quem só tem atendente do painel (sem admin do painel) vê o link direto para `/senhas/atendente`. */
export function adjustNavSenhasLeafUrls(
  papeis: Papel[],
  email: string | null | undefined,
  sections: NavSection[],
): NavSection[] {
  const adminPainel = podePainelSenhasAdministracao(papeis, email);
  const onlyAttendant =
    (papeis.includes("painel_atendente") || papeis.includes("secretaria")) && !adminPainel;

  return sections.map((sec) => {
    if (sec.type !== "flat") return sec;
    const items = sec.items.map((item) => {
      if (item.url !== "/senhas" || !onlyAttendant) return item;
      return { ...item, title: "Painel de senhas — Atendente", url: "/senhas/atendente" };
    });
    return { ...sec, items };
  });
}

/** Remove itens/setores/seções que o utilizador não pode ver. */
export function filterNavByAccess(
  papeis: Papel[],
  sections: NavSection[],
  email?: string | null,
): NavSection[] {
  const out: NavSection[] = [];
  for (const sec of sections) {
    if (sec.type === "flat") {
      const items = sec.items.filter((i) => hasRoleAccessToRoute(papeis, i.url, email));
      if (items.length) out.push({ ...sec, items });
    } else {
      const sectors = sec.sectors
        .map((s) => ({
          ...s,
          items: s.items.filter((i) => hasRoleAccessToRoute(papeis, i.url, email)),
        }))
        .filter((s) => s.items.length > 0);
      if (sectors.length) out.push({ ...sec, sectors });
    }
  }
  return out;
}

/** Marca itens em revisão com cadeado (exceto setape e painel_admin). */
export function markNavTemporaryBlocks(papeis: Papel[], sections: NavSection[]): NavSection[] {
  const lockItem = (item: NavLeaf): NavLeaf =>
    isRotaBloqueadaParaUsuario(papeis, item.url) ? { ...item, locked: true } : item;

  return sections.map((sec) => {
    if (sec.type === "flat") {
      return { ...sec, items: sec.items.map(lockItem) };
    }
    return {
      ...sec,
      sectors: sec.sectors.map((sector) => ({
        ...sector,
        items: sector.items.map(lockItem),
      })),
    };
  });
}

export type NavExtraLink = NavLeaf & { sectorId: string };

export function isNavActive(pathname: string, itemUrl: string): boolean {
  if (itemUrl.startsWith("/senhas")) {
    return pathname === itemUrl || pathname.startsWith(`${itemUrl}/`);
  }
  return pathname === itemUrl;
}

/** Retorna true se algum item do setor está ativo. */
export function sectorHasActiveRoute(pathname: string, sector: NavSector): boolean {
  return sector.items.some((i) => isNavActive(pathname, i.url));
}

/** Retorna true se algum link da seção aninhada contém a rota atual. */
export function nestedSectionHasActiveRoute(pathname: string, section: NavSectionNested): boolean {
  return section.sectors.some((s) => sectorHasActiveRoute(pathname, s));
}

/**
 * Mescla links extras nos setores correspondentes (`sectorId`).
 * Itens extras são acrescentados após os estáticos.
 */
export function mergeNavExtras(sections: NavSection[], extras: NavExtraLink[]): NavSection[] {
  if (!extras.length) return sections;
  return sections.map((sec) => {
    if (sec.type !== "nested") return sec;
    const sectors = sec.sectors.map((sector) => {
      const more = extras
        .filter((e) => e.sectorId === sector.id)
        .map(({ sectorId: _sid, ...leaf }) => leaf);
      if (more.length === 0) return sector;
      return { ...sector, items: [...sector.items, ...more] };
    });
    return { ...sec, sectors };
  });
}
