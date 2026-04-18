import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Hash,
  Home,
  LayoutDashboard,
  ListOrdered,
  MonitorSpeaker,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import type { Papel } from "@/auth/AuthProvider";
import { canAccessRoute } from "@/auth/routeAccess";
import { podePainelAdmin } from "@/painel/painelWorkspaceAccess";

/** Item de menu que aponta para uma rota da intranet. */
export type NavLeaf = {
  title: string;
  url: string;
  icon: LucideIcon;
};

/** Subgrupo dentro de uma seção `nested` (Setores, Suporte, Agenda, etc.). */
export type NavSector = {
  id: string;
  label: string;
  /** Ícone ao lado do rótulo do setor (ex.: Administração). */
  icon?: LucideIcon;
  items: NavLeaf[];
  /** Se true, mantém a ordem do array (sem ordenar por título). */
  preserveOrder?: boolean;
};

export type NavSectionFlat = {
  id: string;
  label: string;
  type: "flat";
  items: NavLeaf[];
  /** Se true, mantém a ordem dos itens (sem ordenar por título). */
  preserveOrder?: boolean;
};

export type NavSectionNested = {
  id: string;
  label: string;
  type: "nested";
  /** Título da seção também leva à visão geral (ex.: `/senhas`). */
  sectionHref?: string;
  sectionIcon?: LucideIcon;
  /** Itens logo abaixo do título, antes dos setores colapsáveis (ex.: Atendente). */
  topLevelItems?: NavLeaf[];
  sectors: NavSector[];
};

export type NavSection = NavSectionFlat | NavSectionNested;

/**
 * Branch produção: apenas início, painel de senhas e admin de papéis manuais (mapeamento OU / extras).
 */
export const INTRANET_NAV_SECTIONS: NavSection[] = [
  {
    id: "portal",
    label: "Portal",
    type: "flat",
    items: [{ title: "Início", url: "/", icon: Home }],
  },
  {
    id: "painel-senhas",
    label: "Painel de senhas",
    type: "nested",
    sectionHref: "/senhas",
    sectionIcon: Hash,
    topLevelItems: [{ title: "Atendente", url: "/senhas/atendente", icon: MonitorSpeaker }],
    sectors: [
      {
        id: "painel-admin",
        label: "Administração",
        icon: LayoutDashboard,
        preserveOrder: true,
        items: [
          { title: "Dashboard", url: "/senhas/admin", icon: LayoutDashboard },
          { title: "Filas", url: "/senhas/admin/filas", icon: ListOrdered },
          { title: "Guichês", url: "/senhas/admin/guiches", icon: MonitorSpeaker },
          { title: "Atendentes", url: "/senhas/admin/atendentes", icon: Users },
          { title: "Relatórios", url: "/senhas/admin/relatorios", icon: BarChart3 },
          { title: "Configurações", url: "/senhas/admin/configuracoes", icon: Settings },
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

/** Link extra associado a um setor (futuro: linhas em Supabase). */
export type NavExtraLink = NavLeaf & { sectorId: string };

export function isNavActive(pathname: string, itemUrl: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  const u = itemUrl.replace(/\/+$/, "") || "/";
  if (u === "/senhas") {
    return p === "/senhas";
  }
  if (u === "/senhas/admin") {
    return p === "/senhas/admin";
  }
  return p === u || p.startsWith(`${u}/`);
}

/** Retorna true se algum item do setor está ativo. */
export function sectorHasActiveRoute(pathname: string, sector: NavSector): boolean {
  return sector.items.some((i) => isNavActive(pathname, i.url));
}

/** Retorna true se algum link da seção aninhada contém a rota atual. */
export function nestedSectionHasActiveRoute(pathname: string, section: NavSectionNested): boolean {
  if (section.sectionHref) {
    const p = pathname.replace(/\/+$/, "") || "/";
    const h = section.sectionHref.replace(/\/+$/, "") || "/";
    if (p === h || p.startsWith(`${h}/`)) return true;
  }
  const top = section.topLevelItems ?? [];
  if (top.some((i) => isNavActive(pathname, i.url))) return true;
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

/** Remove itens/setores/seções que o usuário não pode ver (mesma regra que o menu plano anterior). */
export function filterNavByAccess(papeis: Papel[], sections: NavSection[]): NavSection[] {
  const out: NavSection[] = [];
  for (const sec of sections) {
    if (sec.type === "flat") {
      const items = sec.items.filter((i) => canAccessRoute(papeis, i.url));
      if (items.length) out.push({ ...sec, items });
    } else {
      const topLevelItems = (sec.topLevelItems ?? []).filter((i) => canAccessRoute(papeis, i.url));
      const sectors = sec.sectors
        .map((s) => ({
          ...s,
          items: s.items.filter((i) => canAccessRoute(papeis, i.url)),
        }))
        .filter((s) => s.items.length > 0);
      if (topLevelItems.length || sectors.length) {
        out.push({ ...sec, topLevelItems, sectors });
      }
    }
  }
  return out;
}

/**
 * Remove o setor de admin do painel (`painel-admin`) para quem não tem permissão de admin do painel.
 * Deve ser aplicado depois de `filterNavByAccess`.
 */
export function filterPainelSenhasAdminSector(papeis: Papel[], sections: NavSection[]): NavSection[] {
  if (podePainelAdmin(papeis)) return sections;
  return sections.map((sec) => {
    if (sec.type !== "nested" || sec.id !== "painel-senhas") return sec;
    return {
      ...sec,
      sectors: sec.sectors.filter((s) => s.id !== "painel-admin"),
    };
  });
}
