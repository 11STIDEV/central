import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  FileText,
  HeartPulse,
  Home,
  MapPin,
  Megaphone,
  Phone,
  School,
  Settings2,
  Shield,
  Ticket,
  Trophy,
  UserCog,
  UserRoundCheck,
  Users,
  Wallet,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { Papel } from "@/auth/AuthProvider";
import { hasRoleAccessToRoute } from "@/auth/routeAccess";
import { isRotaBloqueadaParaUsuario } from "@/auth/routesTemporarilyBlocked";
import { buildSetoresNavSectors } from "@/navigation/setoresConfig";

/** Item de menu que aponta para uma rota da intranet. */
export type NavLeaf = {
  title: string;
  url: string;
  icon: LucideIcon;
  locked?: boolean;
  /** Prefixos de rota que mantêm o item destacado (ex.: catálogo de setores). */
  activePrefixes?: string[];
};

/** Subgrupo dentro de uma seção `nested` (Setores, Suporte, Agenda, etc.). */
export type NavSector = {
  /** Chave estável para merge com extras vindos do banco (ex.: Supabase). */
  id: string;
  label: string;
  items: NavLeaf[];
  /** Página hub do setor (padrão: `/setores/:slug/visao-geral`). */
  hubUrl?: string;
};

export type NavSectionFlat = {
  id: string;
  label: string;
  type: "flat";
  items: NavLeaf[];
  /** Links fixos no topo da sidebar (Início, Avisos) — sem flyout. */
  pinned?: boolean;
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
    id: "inicio",
    label: "Portal",
    type: "flat",
    pinned: true,
    items: [
      { title: "Central de Informações", url: "/", icon: Home },
      { title: "Avisos", url: "/avisos", icon: Megaphone },
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    type: "flat",
    items: [
      {
        title: "Agenda CCI",
        url: "/agenda-cci",
        icon: CalendarDays,
        activePrefixes: ["/agenda-cci"],
      },
      {
        title: "Reserva de Espaços e Equipamentos",
        url: "/reserva-espacos-equipamentos",
        icon: MapPin,
        activePrefixes: ["/reserva-espacos-equipamentos"],
      },
      {
        title: "Minhas Reservas",
        url: "/minhas-reservas",
        icon: UserRoundCheck,
        activePrefixes: ["/minhas-reservas"],
      },
    ],
  },
  {
    id: "trilha-conhecimento",
    label: "Trilha de Conhecimento",
    type: "flat",
    items: [
      { title: "Trilha de Conhecimento", url: "/trilha-conhecimento", icon: Trophy },
      { title: "Gerenciar Trilhas", url: "/trilha-conhecimento/admin", icon: Settings2, papeis: ["admin"] as Papel[] },
    ],
  },
  {
    id: "documentos",
    label: "Documentos",
    type: "flat",
    items: [{ title: "Documentos", url: "/documentos", icon: FileText }],
  },
  {
    id: "ramais",
    label: "Ramais",
    type: "flat",
    items: [{ title: "Ramais", url: "/ramais", icon: Phone }],
  },
  {
    id: "setores",
    label: "Setores",
    type: "nested",
    sectors: buildSetoresNavSectors(),
  },
  {
    id: "cci-pay",
    label: "Advance-CCI",
    type: "nested",
    sectors: [
      {
        id: "ccipay-colaborador",
        label: "Meu Advance-CCI",
        items: [
          { title: "Início / Extrato", url: "/cci-pay", icon: Wallet },
          { title: "Solicitar vale", url: "/vale-adiantamento", icon: CircleDollarSign },
          { title: "Loja", url: "/cci-pay/loja", icon: MapPin },
          { title: "Meus pedidos", url: "/cci-pay/meus-pedidos", icon: ClipboardList },
        ],
      },
      {
        id: "ccipay-operacao",
        label: "Operação",
        items: [
          { title: "Aprovar vales", url: "/cci-pay/financeiro", icon: Briefcase },
          { title: "Lançamentos", url: "/cci-pay/lancamentos", icon: FileText },
          { title: "Relatório DP", url: "/cci-pay/relatorios/dp", icon: FileText },
          { title: "Relatório loja", url: "/cci-pay/relatorios/loja", icon: FileText },
        ],
      },
      {
        id: "ccipay-admin",
        label: "Administração",
        items: [
          { title: "Funcionários", url: "/cci-pay/admin/funcionarios", icon: UserCog },
          { title: "Lojas", url: "/cci-pay/admin/lojas", icon: Warehouse },
          { title: "Lançadores", url: "/cci-pay/admin/lancadores", icon: Shield },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Administração",
    type: "flat",
    items: [{ title: "Admin — Papéis manuais", url: "/admin/papeis-manuais", icon: UserCog },
      { title: "Gestão de Chamados — Todos", url: "/chamados/gestao", icon: ClipboardList }],
  },
];

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

/** Destaque do item considerando `activePrefixes` opcional. */
export function navItemIsActive(pathname: string, item: NavLeaf): boolean {
  if (item.activePrefixes?.length) {
    return item.activePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }
  return isNavActive(pathname, item.url);
}

/** Retorna true se algum item do setor está ativo. */
export function sectorHasActiveRoute(pathname: string, sector: NavSector): boolean {
  return sectorHubIsActive(pathname, sector);
}

/** Retorna true se algum link da seção plana contém a rota atual. */
export function flatSectionHasActiveRoute(pathname: string, section: NavSectionFlat): boolean {
  return section.items.some((item) => navItemIsActive(pathname, item));
}

/** Retorna true se algum link da seção aninhada contém a rota atual. */
export function nestedSectionHasActiveRoute(pathname: string, section: NavSectionNested): boolean {
  return section.sectors.some((s) => sectorHasActiveRoute(pathname, s));
}

/**
 * Mescla links extras nos setores correspondentes (`sectorId`).
 * Itens extras são acrescentados após os estáticos.
 */
/** Setores com página de visão geral em `/setores/:slug/visao-geral`. */
export function sectorTemVisaoGeral(sectorId: string): boolean {
  return sectorId.startsWith("setores-");
}

export function getSectorSlugFromNavId(sectorId: string): string {
  return sectorId.replace("setores-", "");
}

/** URL hub do setor no menu (visão geral ou override). */
export function getSectorHubUrl(sector: NavSector): string {
  if (sector.hubUrl) return sector.hubUrl;
  if (sectorTemVisaoGeral(sector.id)) {
    return `/setores/${getSectorSlugFromNavId(sector.id)}/visao-geral`;
  }
  return sector.items[0]?.url ?? "/";
}

/** Itens de navegação estáticos de um setor (para a página hub). Reexportado de setoresConfig. */
export { getSetorNavItemsBySlug } from "@/navigation/setoresConfig";

/** Setor ativo quando o usuário está no hub ou em qualquer ferramenta do setor. */
export function sectorHubIsActive(pathname: string, sector: NavSector): boolean {
  const hub = getSectorHubUrl(sector);
  if (pathname === hub) return true;
  if (hub !== "/" && pathname.startsWith(`${hub}/`)) return true;
  return sector.items.some((item) => isNavActive(pathname, item.url));
}

export type NavSearchEntry = {
  title: string;
  url: string;
  group: string;
  locked?: boolean;
};

/** Lista plana para busca global (Cmd+K). */
export function flattenNavForSearch(sections: NavSection[]): NavSearchEntry[] {
  const out: NavSearchEntry[] = [];
  for (const sec of sections) {
    if (sec.type === "flat") {
      for (const item of sec.items) {
        out.push({ title: item.title, url: item.url, group: sec.label, locked: item.locked });
      }
    } else {
      for (const sector of sec.sectors) {
        for (const item of sector.items) {
          out.push({
            title: item.title,
            url: item.url,
            group: `${sec.label} · ${sector.label}`,
            locked: item.locked,
          });
        }
      }
    }
  }
  return out;
}

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
