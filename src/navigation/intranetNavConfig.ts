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
      { title: "Avisos", url: "/avisos", icon: Megaphone },
      { title: "Publicar aviso", url: "/avisos/publicar", icon: PenLine },
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
      { title: "Trilha de Conhecimento", url: "/trilha-conhecimento", icon: Trophy },
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
        id: "setores-biblioteca",
        label: "Biblioteca",
        items: [
          { title: "Kanban — Biblioteca", url: "/kanban/biblioteca", icon: LayoutDashboard },
        ],
      },
      {
        id: "setores-professores",
        label: "Professores",
        items: [{ title: "Links dos Professores", url: "/setores/professores", icon: GraduationCap }],
      },
      {
        id: "setores-disciplinar",
        label: "Disciplinar",
        items: [
          { title: "Links do Disciplinar", url: "/setores/disciplinar", icon: ClipboardList },
          { title: "Kanban — Disciplinar", url: "/kanban/disciplinar", icon: LayoutDashboard },
        ],
      },
      {
        id: "setores-secretaria",
        label: "Secretaria",
        items: [
          { title: "Links da Secretaria", url: "/setores/secretaria", icon: FileText },
          { title: "Kanban — Secretaria", url: "/kanban/secretaria", icon: LayoutDashboard },
        ],
      },
      {
        id: "setores-servicos-gerais",
        label: "Serviços Gerais",
        items: [
          { title: "Links de Serviços Gerais", url: "/setores/servicos-gerais", icon: Wrench },
          { title: "Kanban — Serviços Gerais", url: "/kanban/servicosgerais", icon: LayoutDashboard },
        ],
      },
      {
        id: "setores-publicidade",
        label: "Publicidade",
        items: [
          { title: "Links da Publicidade", url: "/setores/publicidade", icon: Megaphone },
          { title: "Kanban — Publicidade", url: "/kanban/publicidade", icon: LayoutDashboard },
        ],
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
          { title: "Kanban — DP e Financeiro", url: "/kanban/dp-financeiro", icon: LayoutDashboard },
        ],
      },
      {
        id: "setores-primeiros-socorros",
        label: "Primeiros Socorros",
        items: [
          { title: "Links de Primeiros Socorros", url: "/setores/primeiros-socorros", icon: HeartPulse },
          { title: "Kanban — Primeiros Socorros", url: "/kanban/primeirossocorros", icon: LayoutDashboard },
        ],
      },
      {
        id: "setores-direcao",
        label: "Direção",
        items: [
          { title: "Links da Direção", url: "/setores/direcao", icon: School },
          { title: "Kanban — Direção", url: "/kanban/direcao", icon: LayoutDashboard },
        ],
      },
      {
        id: "setores-clat",
        label: "CLAT",
        items: [
          { title: "Links do CLAT", url: "/setores/clat", icon: ClipboardList },
          { title: "Kanban — CLAT", url: "/kanban/clat", icon: LayoutDashboard },
        ],
      },
      {
        id: "setores-ti",
        label: "TI",
        items: [
          { title: "Área Interna TI", url: "/ti-interno", icon: ShieldCheck },
          { title: "Controle Materiais (TI)", url: "/controle-materiais-ti", icon: Boxes },
          { title: "iScholar", url: "/ti/ischolar", icon: GraduationCap },
          { title: "Kanban — Setape/TI", url: "/kanban/setape", icon: LayoutDashboard },
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
          { title: "Kanban — Almoxarifado", url: "/kanban/almoxarifado", icon: LayoutDashboard },
        ],
      },
      {
        id: "setores-faculdade",
        label: "Faculdade",
        items: [
          { title: "Kanban — Faculdade", url: "/kanban/faculdade", icon: LayoutDashboard },
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
      const sectors = sec.sectors.map((s) => ({
        ...s,
        items: s.items.filter((i) => hasRoleAccessToRoute(papeis, i.url, email)),
      }));
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
