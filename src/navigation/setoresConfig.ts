import {
  Boxes,
  Briefcase,
  ClipboardList,
  FileText,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  Megaphone,
  PenLine,
  School,
  ShieldCheck,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Papel } from "@/auth/AuthProvider";
import { hasRoleAccessToRoute } from "@/auth/routeAccess";
import type { NavLeaf, NavSector } from "@/navigation/intranetNavConfig";

const PAPEIS_PROFESSORES: Papel[] = ["professorfac", "professortecs", "professorregular"];

export type SetorConfig = {
  id: string;
  slug: string;
  kanbanSlug: string;
  label: string;
  /** Papéis que identificam pertencimento ao setor (não inclui admin). */
  papeis: Papel[];
  hubUrl?: string;
  temLinks: boolean;
  temKanban: boolean;
  /** Ferramentas extras além de links/kanban (ex.: TI). */
  extras?: NavLeaf[];
  /** Descrição curta para a página /meu-setor. */
  descricao?: string;
};

export const SETORES_CONFIG: SetorConfig[] = [
  {
    id: "setores-biblioteca",
    slug: "biblioteca",
    kanbanSlug: "biblioteca",
    label: "Biblioteca",
    papeis: ["biblioteca", "gerente_biblioteca"],
    temLinks: false,
    temKanban: true,
    descricao: "Acervo, empréstimos e apoio pedagógico.",
  },
  {
    id: "setores-professores",
    slug: "professores",
    kanbanSlug: "professores",
    label: "Professores",
    papeis: PAPEIS_PROFESSORES,
    hubUrl: "/setores/professores",
    temLinks: true,
    temKanban: false,
    descricao: "Ferramentas e links do corpo docente.",
  },
  {
    id: "setores-disciplinar",
    slug: "disciplinar",
    kanbanSlug: "disciplinar",
    label: "Disciplinar",
    papeis: ["disciplinar", "gerente_disciplinar"],
    temLinks: true,
    temKanban: true,
    descricao: "Conduta, frequência e convivência escolar.",
  },
  {
    id: "setores-secretaria",
    slug: "secretaria",
    kanbanSlug: "secretaria",
    label: "Secretaria",
    papeis: ["secretaria", "gerente_secretaria"],
    temLinks: true,
    temKanban: true,
    descricao: "Atendimento, registros e sistemas acadêmicos.",
  },
  {
    id: "setores-servicos-gerais",
    slug: "servicos-gerais",
    kanbanSlug: "servicosgerais",
    label: "Serviços Gerais",
    papeis: ["servicosgerais", "gerente_servicosgerais"],
    temLinks: true,
    temKanban: true,
    descricao: "Manutenção, limpeza e apoio logístico.",
  },
  {
    id: "setores-publicidade",
    slug: "publicidade",
    kanbanSlug: "publicidade",
    label: "Publicidade",
    papeis: ["publicidade", "gerente_publicidade"],
    temLinks: true,
    temKanban: true,
    descricao: "Comunicação institucional e redes sociais.",
  },
  {
    id: "setores-dp-financeiro",
    slug: "dp-financeiro",
    kanbanSlug: "dp-financeiro",
    label: "DP e Financeiro",
    papeis: ["dp", "financeiro", "gerente_dp", "gerente_financeiro"],
    temLinks: true,
    temKanban: true,
    descricao: "RH, folha e rotinas financeiras.",
  },
  {
    id: "setores-primeiros-socorros",
    slug: "primeiros-socorros",
    kanbanSlug: "primeirossocorros",
    label: "Primeiros Socorros",
    papeis: ["primeirossocorros", "gerente_primeirossocorros"],
    temLinks: true,
    temKanban: true,
    descricao: "Atendimento ambulatorial e primeiros socorros.",
  },
  {
    id: "setores-direcao",
    slug: "direcao",
    kanbanSlug: "direcao",
    label: "Direção",
    papeis: ["direcao", "gerente_direcao"],
    temLinks: true,
    temKanban: true,
    descricao: "Planejamento estratégico e liderança institucional.",
  },
  {
    id: "setores-clat",
    slug: "clat",
    kanbanSlug: "clat",
    label: "CLAT",
    papeis: ["clat", "gerente_clat"],
    temLinks: true,
    temKanban: true,
    descricao: "Laboratórios de ciências e experimentos.",
  },
  {
    id: "setores-ti",
    slug: "ti",
    kanbanSlug: "setape",
    label: "TI",
    papeis: ["setape", "gerente_setape"],
    temLinks: false,
    temKanban: true,
    descricao: "Suporte técnico, redes e sistemas.",
    extras: [
      { title: "Área Interna TI", url: "/ti-interno", icon: ShieldCheck },
      { title: "Controle Materiais (TI)", url: "/controle-materiais-ti", icon: Boxes },
      { title: "iScholar", url: "/ti/ischolar", icon: GraduationCap },
      { title: "Publicar aviso", url: "/avisos/publicar", icon: PenLine },
    ],
  },
  {
    id: "setores-almoxarifado",
    slug: "almoxarifado",
    kanbanSlug: "almoxarifado",
    label: "Almoxarifado",
    papeis: ["almoxarifado", "gerente_almoxarifado"],
    temLinks: false,
    temKanban: true,
    descricao: "Estoque e distribuição de materiais.",
    extras: [
      {
        title: "Almoxarifado (Entrada/Saída)",
        url: "/controle-materiais-almoxarifado",
        icon: Warehouse,
      },
    ],
  },
  {
    id: "setores-faculdade",
    slug: "faculdade",
    kanbanSlug: "faculdade",
    label: "Faculdade",
    papeis: ["faculdade", "gerente_faculdade"],
    temLinks: false,
    temKanban: true,
    descricao: "Coordenação dos cursos de graduação e pós.",
  },
];

const LINKS_ICONS: Record<string, LucideIcon> = {
  biblioteca: FileText,
  professores: GraduationCap,
  disciplinar: ClipboardList,
  secretaria: FileText,
  "servicos-gerais": Wrench,
  publicidade: Megaphone,
  "dp-financeiro": Briefcase,
  "primeiros-socorros": HeartPulse,
  direcao: School,
  clat: ClipboardList,
};

export function getSetorHubUrl(setor: SetorConfig): string {
  if (setor.hubUrl) return setor.hubUrl;
  return `/setores/${setor.slug}/visao-geral`;
}

/** Setores aos quais o usuário pertence (papéis de OU, não admin genérico). */
export function getSetoresDoUsuario(papeis: Papel[]): SetorConfig[] {
  return SETORES_CONFIG.filter((s) => s.papeis.some((p) => papeis.includes(p)));
}

export function findSetorBySlug(slug: string): SetorConfig | undefined {
  return SETORES_CONFIG.find((s) => s.slug === slug);
}

export function findSetorByNavId(id: string): SetorConfig | undefined {
  return SETORES_CONFIG.find((s) => s.id === id);
}

/** Itens de navegação completos de um setor (menu Todos os setores / hub). */
export function buildNavItemsForSetor(setor: SetorConfig): NavLeaf[] {
  const items: NavLeaf[] = [];
  if (setor.temLinks) {
    items.push({
      title: `Links ${setor.label === "Professores" ? "dos Professores" : `do ${setor.label}`}`.replace(
        "do DP e Financeiro",
        "DP e Financeiro",
      ),
      url: `/setores/${setor.slug}`,
      icon: LINKS_ICONS[setor.slug] ?? FileText,
    });
    if (setor.slug === "professores") {
      items[0] = { title: "Links dos Professores", url: "/setores/professores", icon: GraduationCap };
    } else if (setor.slug === "secretaria") {
      items[0] = { title: "Links da Secretaria", url: "/setores/secretaria", icon: FileText };
    } else if (setor.slug === "disciplinar") {
      items[0] = { title: "Links do Disciplinar", url: "/setores/disciplinar", icon: ClipboardList };
    } else if (setor.slug === "servicos-gerais") {
      items[0] = { title: "Links de Serviços Gerais", url: "/setores/servicos-gerais", icon: Wrench };
    } else if (setor.slug === "publicidade") {
      items[0] = { title: "Links da Publicidade", url: "/setores/publicidade", icon: Megaphone };
    } else if (setor.slug === "dp-financeiro") {
      items[0] = { title: "Links DP e Financeiro", url: "/setores/dp-financeiro", icon: Briefcase };
    } else if (setor.slug === "primeiros-socorros") {
      items[0] = { title: "Links de Primeiros Socorros", url: "/setores/primeiros-socorros", icon: HeartPulse };
    } else if (setor.slug === "direcao") {
      items[0] = { title: "Links da Direção", url: "/setores/direcao", icon: School };
    } else if (setor.slug === "clat") {
      items[0] = { title: "Links do CLAT", url: "/setores/clat", icon: ClipboardList };
    }
  }
  if (setor.temKanban) {
    const kanbanTitle =
      setor.slug === "ti"
        ? "Kanban — Setape/TI"
        : setor.slug === "servicos-gerais"
          ? "Kanban — Serviços Gerais"
          : setor.slug === "primeiros-socorros"
            ? "Kanban — Primeiros Socorros"
            : setor.slug === "dp-financeiro"
              ? "Kanban — DP e Financeiro"
              : `Kanban — ${setor.label}`;
    items.push({
      title: kanbanTitle,
      url: `/kanban/${setor.kanbanSlug}`,
      icon: LayoutDashboard,
    });
  }
  if (setor.extras?.length) {
    items.push(...setor.extras);
  }
  return items;
}

export function setorConfigToNavSector(setor: SetorConfig): NavSector {
  return {
    id: setor.id,
    label: setor.label,
    hubUrl: setor.hubUrl,
    items: buildNavItemsForSetor(setor),
  };
}

/** Seção nested "Setores" gerada a partir do config (fonte única). */
export function buildSetoresNavSectors(): NavSector[] {
  return SETORES_CONFIG.map(setorConfigToNavSector);
}

/** Itens do menu "Meu setor" — atalhos diretos filtrados por ACL. */
export function buildMeuSetorNavItems(
  setores: SetorConfig[],
  papeis: Papel[],
  email?: string | null,
): NavLeaf[] {
  const multi = setores.length > 1;
  const items: NavLeaf[] = [];

  for (const setor of setores) {
    const prefix = multi ? `${setor.label} — ` : "";
    const hub = getSetorHubUrl(setor);
    const seen = new Set<string>();

    if (hasRoleAccessToRoute(papeis, hub, email)) {
      items.push({
        title: `${prefix}Início`,
        url: hub,
        icon: LINKS_ICONS[setor.slug] ?? LayoutDashboard,
      });
      seen.add(hub);
    }

    const ferramentas = buildNavItemsForSetor(setor);
    for (const f of ferramentas) {
      if (seen.has(f.url)) continue;
      if (!hasRoleAccessToRoute(papeis, f.url, email)) continue;
      seen.add(f.url);
      items.push({
        ...f,
        title: multi ? `${setor.label} — ${shortToolLabel(f.title)}` : shortToolLabel(f.title),
      });
    }
  }

  return items;
}

function shortToolLabel(fullTitle: string): string {
  if (fullTitle.startsWith("Links")) return "Links";
  if (fullTitle.startsWith("Kanban")) return "Kanban";
  if (fullTitle.includes("Área Interna")) return "Área TI";
  if (fullTitle.includes("Controle Materiais (TI)")) return "Materiais TI";
  if (fullTitle.includes("Almoxarifado (Entrada")) return "Entrada/Saída";
  if (fullTitle === "iScholar") return "iScholar";
  return fullTitle;
}

/** Setores cujo hub ou alguma ferramenta é acessível ao usuário. */
export function getSetoresAcessiveis(papeis: Papel[], email?: string | null): SetorConfig[] {
  return SETORES_CONFIG.filter((setor) => {
    const hub = getSetorHubUrl(setor);
    if (hasRoleAccessToRoute(papeis, hub, email)) return true;
    return buildNavItemsForSetor(setor).some((item) =>
      hasRoleAccessToRoute(papeis, item.url, email),
    );
  });
}

/** Prefixos de rota para destacar menu enquanto navega nos setores listados. */
export function buildSetorActivePrefixes(setores: SetorConfig[], extra: string[] = []): string[] {
  const prefixes = new Set<string>(extra);
  for (const setor of setores) {
    prefixes.add(getSetorHubUrl(setor));
    for (const item of buildNavItemsForSetor(setor)) {
      prefixes.add(item.url);
    }
  }
  return [...prefixes];
}

/** Itens de navegação de um setor por slug (página hub). */
export function getSetorNavItemsBySlug(slug: string): NavLeaf[] {
  const setor = findSetorBySlug(slug);
  if (!setor) return [];
  return buildNavItemsForSetor(setor);
}
