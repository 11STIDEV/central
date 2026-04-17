import type { LucideIcon } from "lucide-react";
import { Hash, Home, UserCog } from "lucide-react";
import type { Papel } from "@/auth/AuthProvider";
import { canAccessRoute } from "@/auth/routeAccess";

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
 * Branch produção: apenas início, painel de senhas e admin de papéis manuais (mapeamento OU / extras).
 */
export const INTRANET_NAV_SECTIONS: NavSection[] = [
  {
    id: "portal",
    label: "Portal",
    type: "flat",
    items: [
      { title: "Início", url: "/", icon: Home },
      { title: "Painel de senhas", url: "/senhas", icon: Hash },
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
  if (itemUrl === "/senhas") return pathname.startsWith("/senhas");
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

/** Remove itens/setores/seções que o usuário não pode ver (mesma regra que o menu plano anterior). */
export function filterNavByAccess(papeis: Papel[], sections: NavSection[]): NavSection[] {
  const out: NavSection[] = [];
  for (const sec of sections) {
    if (sec.type === "flat") {
      const items = sec.items.filter((i) => canAccessRoute(papeis, i.url));
      if (items.length) out.push({ ...sec, items });
    } else {
      const sectors = sec.sectors
        .map((s) => ({
          ...s,
          items: s.items.filter((i) => canAccessRoute(papeis, i.url)),
        }))
        .filter((s) => s.items.length > 0);
      if (sectors.length) out.push({ ...sec, sectors });
    }
  }
  return out;
}
