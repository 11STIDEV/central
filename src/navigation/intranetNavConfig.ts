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
  LayoutDashboard,
  MapPin,
  Megaphone,
  PenLine,
  Phone,
  School,
  Shield,
  ShieldCheck,
  Search,
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
import { hasRoleAccessToRoute, podePainelSenhasAdministracao } from "@/auth/routeAccess";
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
      { title: "Portal do Funcionário", url: "/portal-do-funcionario", icon: Users },
      { title: "Avisos", url: "/avisos", icon: Megaphone },
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
    id: "cci-pay",
    label: "CCI Pay",
    type: "nested",
    sectors: [
      {
        id: "ccipay-colaborador",
        label: "Meu CCI Pay",
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
          { title: "Lançamentos", url: "/cci-pay/lancamentos", icon: PenLine },
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
    id: "ti",
    label: "TI",
    type: "flat",
    items: [
      { title: "Área Interna TI", url: "/ti-interno", icon: ShieldCheck },
      { title: "Controle Materiais (TI)", url: "/controle-materiais-ti", icon: Boxes },
      { title: "iScholar", url: "/ti/ischolar", icon: GraduationCap },
      { title: "Kanban — Setape/TI", url: "/kanban/setape", icon: LayoutDashboard },
      { title: "Publicar aviso", url: "/avisos/publicar", icon: PenLine },
    ],
  },
  {
    id: "operacao-interna",
    label: "Operação interna",
    type: "flat",
    items: [
      { title: "Trilha de Conhecimento", url: "/trilha-conhecimento", icon: Trophy },
      { title: "Documentos", url: "/documentos", icon: FileText },
      { title: "Ramais", url: "/ramais", icon: Phone },
    ],
  },
  {
    id: "setores",
    label: "Setores",
    type: "nested",
    sectors: buildSetoresNavSectors(),
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
