import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Home,
  Layers,
  Lock,
  ShieldCheck,
  Trophy,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import {
  type NavLeaf,
  type NavSection,
  type NavSectionFlat,
  type NavSectionNested,
  type NavSector,
  isNavActive,
  navItemIsActive,
  nestedSectionHasActiveRoute,
  flatSectionHasActiveRoute,
  sectorHasActiveRoute,
  sectorHubIsActive,
  sectorTemVisaoGeral,
  getSectorHubUrl,
} from "@/navigation/intranetNavConfig";

const STORAGE_PREFIX = "cci-intranet-nav";

/** Ícone da seção no menu recolhido ou flyout. */
const SECTION_ICONS: Record<string, LucideIcon> = {
  inicio: Home,
  agenda: CalendarDays,
  "cci-pay": CircleDollarSign,
  ti: ShieldCheck,
  "operacao-interna": Trophy,
  admin: UserCog,
  setores: Layers,
  "setores-todos": Layers,
  "meu-setor": Layers,
};

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    if (v === null) return fallback;
    return v === "1" || v === "true";
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${key}`, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function buildInitialOuterOpen(pathname: string, nestedList: NavSectionNested[]): Record<string, boolean> {
  const init: Record<string, boolean> = {};
  for (const s of nestedList) {
    init[s.id] = nestedSectionHasActiveRoute(pathname, s) || readBool(`${s.id}-open`, false);
  }
  return init;
}

function buildInitialSectorOpen(
  pathname: string,
  sectors: { id: string }[],
  nestedList: NavSectionNested[],
): Record<string, boolean> {
  const init: Record<string, boolean> = {};
  for (const sec of sectors) {
    const holder = nestedList.find((s) => s.sectors.some((x) => x.id === sec.id));
    const sector = holder?.sectors.find((x) => x.id === sec.id);
    const active = sector ? sectorHasActiveRoute(pathname, sector) : false;
    init[sec.id] = active || readBool(`sector-${sec.id}`, false);
  }
  return init;
}

function supportsHoverMenu(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

type AppSidebarNavProps = {
  sections: NavSection[];
  collapsed: boolean;
};

function getSectorSlugFromId(id: string): string {
  return id.replace("setores-", "");
}

function sectionTriggerClass(active: boolean) {
  return cn(
    "flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors hover:bg-sidebar-accent/80 lg:min-h-0",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-sidebar-muted hover:text-sidebar-foreground",
  );
}

function NavSectionFlyout({
  label,
  sectionActive,
  children,
}: {
  label: string;
  sectionActive: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <HoverCard openDelay={80} closeDelay={160}>
        <HoverCardTrigger asChild>
          <button type="button" className={sectionTriggerClass(sectionActive)}>
            <span>{label}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="start"
          sideOffset={10}
          className="max-h-[min(70vh,28rem)] w-64 overflow-y-auto p-2"
        >
          <p className="mb-2 px-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          {children}
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

export function AppSidebarNav({ sections, collapsed }: AppSidebarNavProps) {
  const { pathname } = useLocation();
  const [hoverMenu] = useState(supportsHoverMenu);
  const useFlyoutNav = hoverMenu && !collapsed;

  const nestedList = useMemo(
    () => sections.filter((s): s is NavSectionNested => s.type === "nested"),
    [sections],
  );

  const allSectors = useMemo(() => nestedList.flatMap((s) => s.sectors), [nestedList]);

  const [outerOpen, setOuterOpen] = useState<Record<string, boolean>>(() =>
    buildInitialOuterOpen(pathname, nestedList),
  );

  const [sectorOpen, setSectorOpen] = useState<Record<string, boolean>>(() =>
    buildInitialSectorOpen(pathname, allSectors, nestedList),
  );

  useEffect(() => {
    if (useFlyoutNav) return;
    setOuterOpen((prev) => {
      const next = { ...prev };
      for (const s of nestedList) {
        if (nestedSectionHasActiveRoute(pathname, s)) next[s.id] = true;
        if (next[s.id] === undefined) next[s.id] = readBool(`${s.id}-open`, false);
      }
      return next;
    });
  }, [pathname, nestedList, useFlyoutNav]);

  useEffect(() => {
    if (useFlyoutNav) return;
    setSectorOpen((prev) => {
      const next = { ...prev };
      for (const sector of allSectors) {
        const holder = nestedList.find((s) => s.sectors.some((x) => x.id === sector.id));
        const sec = holder?.sectors.find((x) => x.id === sector.id);
        if (sec && sectorHasActiveRoute(pathname, sec)) next[sector.id] = true;
        if (next[sector.id] === undefined) next[sector.id] = readBool(`sector-${sector.id}`, false);
      }
      return next;
    });
  }, [pathname, nestedList, allSectors, useFlyoutNav]);

  const linkClass = (active: boolean) => `
    group relative flex min-h-[44px] items-start gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-200 lg:min-h-0
    ${active
      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0] shadow-amber-400/90 dark:bg-white/[0.08] dark:text-white dark:shadow-amber-400/90"
      : "text-sidebar-muted hover:bg-sidebar-accent/80 hover:text-sidebar-foreground dark:hover:bg-white/[0.04]"
    }
  `;

  const iconClass = (active: boolean) =>
    `mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 ${active ? "text-amber-500 dark:text-amber-300/95" : "text-sidebar-muted group-hover:text-sidebar-foreground"}`;

  function flyoutLinkClass(active: boolean) {
    return cn(
      "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
      active && "bg-accent font-medium text-accent-foreground",
    );
  }

  function renderFlyoutLeaf(item: NavLeaf) {
    const locked = Boolean(item.locked);
    const active = !locked && navItemIsActive(pathname, item);

    if (locked) {
      return (
        <div
          key={item.url}
          title="Em breve — funcionalidade em revisão"
          className="flex cursor-not-allowed items-center justify-between gap-2 rounded-md px-2 py-2 text-sm opacity-60"
        >
          <span className="flex min-w-0 items-center gap-2">
            <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{item.title}</span>
          </span>
          <Lock className="h-3.5 w-3.5 shrink-0" />
        </div>
      );
    }

    return (
      <Link key={item.url} to={item.url} className={flyoutLinkClass(active)}>
        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span className="truncate">{item.title}</span>
      </Link>
    );
  }

  function renderFlyoutSectorGroup(sector: NavSector, opts?: { showHeading?: boolean }) {
    const slug = getSectorSlugFromId(sector.id);
    const hasItems = sector.items.length > 0;
    const temVisao = sectorTemVisaoGeral(sector.id);
    const showHeading = opts?.showHeading ?? sector.items.length > 1;

    if (!hasItems && temVisao) {
      const active = pathname === `/setores/${slug}/visao-geral`;
      return (
        <Link
          key={sector.id}
          to={`/setores/${slug}/visao-geral`}
          className={flyoutLinkClass(active)}
        >
          <Layers className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">{sector.label}</span>
        </Link>
      );
    }

    if (!hasItems) return null;

    if (sector.items.length === 1 && !temVisao) {
      const item = sector.items[0];
      const active = !item.locked && navItemIsActive(pathname, item);
      if (item.locked) return <div key={sector.id}>{renderFlyoutLeaf(item)}</div>;
      return (
        <Link key={sector.id} to={item.url} className={flyoutLinkClass(active)}>
          <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">{sector.label}</span>
        </Link>
      );
    }

    return (
      <div key={sector.id} className="py-1">
        {showHeading ? (
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {sector.label}
          </p>
        ) : null}
        <div className="space-y-0.5">{sector.items.map((item) => renderFlyoutLeaf(item))}</div>
      </div>
    );
  }

  function renderNestedFlyoutPanel(section: NavSectionNested) {
    const groups = section.sectors
      .map((sector, index) => {
        const content = renderFlyoutSectorGroup(sector);
        if (!content) return null;
        const needsSeparator = index > 0;
        return (
          <div key={sector.id}>
            {needsSeparator ? <div className="my-1.5 h-px bg-border" aria-hidden /> : null}
            {content}
          </div>
        );
      })
      .filter(Boolean);

    return <div className="space-y-0.5">{groups}</div>;
  }

  function renderSetoresFlyoutPanel(section: NavSectionNested) {
    return (
      <div className="space-y-0.5">
        {section.sectors.map((sector) => {
          const hubUrl = getSectorHubUrl(sector);
          const active = sectorHubIsActive(pathname, sector);
          const SectorIcon = sector.items[0]?.icon ?? Layers;
          return (
            <Link key={sector.id} to={hubUrl} className={flyoutLinkClass(active)}>
              <SectorIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{sector.label}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  function renderLeaf(item: NavLeaf, opts: { collapsed: boolean }) {
    const locked = Boolean(item.locked);
    const active = !locked && navItemIsActive(pathname, item);
    if (locked) {
      return (
        <li key={item.url}>
          <button
            type="button"
            aria-disabled="true"
            title={
              opts.collapsed ? `${item.title} (bloqueado)` : "Em breve — funcionalidade em revisão"
            }
            className={`${linkClass(false)} w-full cursor-not-allowed justify-start text-left opacity-60 hover:opacity-100`}
          >
            <item.icon className={iconClass(false)} strokeWidth={1.75} />
            {!opts.collapsed && (
              <>
                <span className="min-w-0 flex-1 leading-snug">{item.title}</span>
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70 group-hover:text-amber-400" />
              </>
            )}
          </button>
        </li>
      );
    }
    return (
      <li key={item.url}>
        <NavLink
          to={item.url}
          end={item.url === "/"}
          title={opts.collapsed ? item.title : undefined}
          className={linkClass(active)}
          activeClassName=""
        >
          <item.icon className={iconClass(active)} strokeWidth={1.75} />
          {!opts.collapsed && <span className="min-w-0 flex-1 leading-snug">{item.title}</span>}
        </NavLink>
      </li>
    );
  }

  function renderFlatFlyoutPanel(section: NavSectionFlat) {
    return (
      <div className="space-y-0.5">
        {section.items.map((item) => renderFlyoutLeaf(item))}
      </div>
    );
  }

  function renderCollapsedFlatDropdown(section: NavSectionFlat) {
    const SectionIcon = SECTION_ICONS[section.id] ?? Layers;
    const anyActive = flatSectionHasActiveRoute(pathname, section);

    return (
      <div key={section.id} className="mb-2 last:mb-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`h-11 w-full rounded-xl lg:h-10 ${anyActive ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
              aria-label={section.label}
              title={section.label}
            >
              <SectionIcon className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 overflow-y-auto" align="start" side="right" sideOffset={8}>
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {section.label}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {section.items.map((item) => {
              const active = navItemIsActive(pathname, item);
              if (item.locked) {
                return (
                  <DropdownMenuItem
                    key={item.url}
                    disabled
                    title="Em breve — funcionalidade em revisão"
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{item.title}</span>
                    <Lock className="h-3.5 w-3.5" />
                  </DropdownMenuItem>
                );
              }
              return (
                <DropdownMenuItem key={item.url} asChild>
                  <Link to={item.url} className={active ? "bg-accent font-medium" : undefined}>
                    {item.title}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  function renderPinnedSection(section: NavSectionFlat) {
    if (section.items.length === 0) return null;

    return (
      <div key={section.id} className="mb-4 border-b border-sidebar-border pb-4">
        <ul className="space-y-0.5">
          {section.items.map((item) => renderLeaf(item, { collapsed }))}
        </ul>
      </div>
    );
  }

  function renderFlatSection(section: NavSectionFlat) {
    if (section.items.length === 0) return null;

    if (section.pinned) return renderPinnedSection(section);

    if (collapsed) return renderCollapsedFlatDropdown(section);

    const sectionActive = flatSectionHasActiveRoute(pathname, section);

    if (useFlyoutNav) {
      return (
        <NavSectionFlyout key={section.id} label={section.label} sectionActive={sectionActive}>
          {renderFlatFlyoutPanel(section)}
        </NavSectionFlyout>
      );
    }

    return (
      <div key={section.id} className="mb-6 last:mb-2">
        <p className="mb-2 px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-muted">
          {section.label}
        </p>
        <ul className="space-y-0.5">{section.items.map((item) => renderLeaf(item, { collapsed: false }))}</ul>
      </div>
    );
  }

  function renderSetorHubLeaf(sector: NavSectionNested["sectors"][number]) {
    const hubUrl = getSectorHubUrl(sector);
    const active = sectorHubIsActive(pathname, sector);
    const SectorIcon = sector.items[0]?.icon ?? Layers;
    return (
      <li key={sector.id}>
        <NavLink
          to={hubUrl}
          title={collapsed ? sector.label : undefined}
          className={linkClass(active)}
          activeClassName=""
        >
          <SectorIcon className={iconClass(active)} strokeWidth={1.75} />
          {!collapsed && <span className="min-w-0 flex-1 leading-snug">{sector.label}</span>}
        </NavLink>
      </li>
    );
  }

  function renderCollapsedNestedDropdown(section: NavSectionNested) {
    const SectionIcon = SECTION_ICONS[section.id] ?? Layers;
    const anyActive = nestedSectionHasActiveRoute(pathname, section);
    const isSetoresHub = section.id === "setores" || section.id === "setores-todos";

    return (
      <div key={section.id} className="mb-2 last:mb-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`h-11 w-full rounded-xl lg:h-10 ${anyActive ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
              aria-label={section.label}
              title={section.label}
            >
              <SectionIcon className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn("overflow-y-auto", isSetoresHub ? "max-h-[min(70vh,24rem)] w-56" : "w-64")}
            align="start"
            side="right"
            sideOffset={8}
          >
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {section.label}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isSetoresHub
              ? section.sectors.map((sector) => {
                  const hubUrl = getSectorHubUrl(sector);
                  const active = sectorHubIsActive(pathname, sector);
                  return (
                    <DropdownMenuItem key={sector.id} asChild>
                      <Link to={hubUrl} className={active ? "bg-accent font-medium" : undefined}>
                        {sector.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })
              : section.sectors.map((sector, index) => {
                  const slug = getSectorSlugFromId(sector.id);
                  const hasItems = sector.items.length > 0;
                  const temVisao = sectorTemVisaoGeral(sector.id);

                  if (!hasItems && temVisao) {
                    return (
                      <DropdownMenuItem key={sector.id} asChild>
                        <Link to={`/setores/${slug}/visao-geral`}>{sector.label}</Link>
                      </DropdownMenuItem>
                    );
                  }

                  if (!hasItems) return null;

                  if (sector.items.length === 1 && !temVisao) {
                    const item = sector.items[0];
                    const active = isNavActive(pathname, item.url);
                    if (item.locked) {
                      return (
                        <DropdownMenuItem key={sector.id} disabled className="justify-between gap-2">
                          <span>{sector.label}</span>
                          <Lock className="h-3.5 w-3.5" />
                        </DropdownMenuItem>
                      );
                    }
                    return (
                      <DropdownMenuItem key={sector.id} asChild>
                        <Link to={item.url} className={active ? "bg-accent font-medium" : undefined}>
                          {sector.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  }

                  return (
                    <div key={sector.id}>
                      {index > 0 ? <DropdownMenuSeparator /> : null}
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {sector.label}
                      </DropdownMenuLabel>
                      {sector.items.map((item) => {
                        const active = isNavActive(pathname, item.url);
                        if (item.locked) {
                          return (
                            <DropdownMenuItem
                              key={item.url}
                              disabled
                              title="Em breve — funcionalidade em revisão"
                              className="flex items-center justify-between gap-2"
                            >
                              <span>{item.title}</span>
                              <Lock className="h-3.5 w-3.5" />
                            </DropdownMenuItem>
                          );
                        }
                        return (
                          <DropdownMenuItem key={item.url} asChild>
                            <Link to={item.url} className={active ? "bg-accent font-medium" : undefined}>
                              {item.title}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  );
                })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  function renderSetoresHubSection(section: NavSectionNested) {
    if (section.sectors.length === 0) return null;

    if (collapsed) return renderCollapsedNestedDropdown(section);

    const sectionActive = nestedSectionHasActiveRoute(pathname, section);

    if (useFlyoutNav) {
      return (
        <NavSectionFlyout key={section.id} label={section.label} sectionActive={sectionActive}>
          {renderSetoresFlyoutPanel(section)}
        </NavSectionFlyout>
      );
    }

    const outer = outerOpen[section.id] ?? false;

    return (
      <div key={section.id} className="mb-2 last:mb-0">
        <Collapsible
          open={outer}
          onOpenChange={(open) => {
            setOuterOpen((p) => ({ ...p, [section.id]: open }));
            writeBool(`${section.id}-open`, open);
          }}
        >
          <CollapsibleTrigger className={sectionTriggerClass(sectionActive)} type="button">
            <span>{section.label}</span>
            {outer ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-0.5 pl-0">
            <ul className="space-y-0.5">{section.sectors.map((sector) => renderSetorHubLeaf(sector))}</ul>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  function renderNestedSection(section: NavSectionNested) {
    if (section.id === "setores" || section.id === "setores-todos") return renderSetoresHubSection(section);
    if (section.sectors.length === 0) return null;

    if (collapsed) return renderCollapsedNestedDropdown(section);

    const sectionActive = nestedSectionHasActiveRoute(pathname, section);

    if (useFlyoutNav) {
      return (
        <NavSectionFlyout key={section.id} label={section.label} sectionActive={sectionActive}>
          {renderNestedFlyoutPanel(section)}
        </NavSectionFlyout>
      );
    }

    const outer = outerOpen[section.id] ?? false;

    return (
      <div key={section.id} className="mb-2 last:mb-0">
        <Collapsible
          open={outer}
          onOpenChange={(open) => {
            setOuterOpen((p) => ({ ...p, [section.id]: open }));
            writeBool(`${section.id}-open`, open);
          }}
        >
          <CollapsibleTrigger className={sectionTriggerClass(sectionActive)} type="button">
            <span>{section.label}</span>
            {outer ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-1 pl-0">
            {section.sectors.map((sector) => {
              const slug = getSectorSlugFromId(sector.id);
              const hasItems = sector.items.length > 0;
              const temVisao = sectorTemVisaoGeral(sector.id);
              const isOverviewActive = temVisao && pathname === `/setores/${slug}/visao-geral`;
              const isOpen = sectorOpen[sector.id] ?? false;

              if (hasItems && sector.items.length === 1 && !temVisao) {
                const item = sector.items[0];
                const active = !item.locked && navItemIsActive(pathname, item);
                return (
                  <div key={sector.id} className="pl-1">
                    {item.locked ? (
                      renderLeaf(item, { collapsed: false })
                    ) : (
                      <NavLink
                        to={item.url}
                        className={`flex w-full min-h-[44px] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-sidebar-accent/60 lg:min-h-0 ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/90"}`}
                        activeClassName=""
                      >
                        <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-amber-500" : "text-sidebar-muted"}`} strokeWidth={1.75} />
                        <span className="truncate">{sector.label}</span>
                      </NavLink>
                    )}
                  </div>
                );
              }

              return (
                <Collapsible
                  key={sector.id}
                  open={isOpen}
                  onOpenChange={(open) => {
                    setSectorOpen((p) => ({ ...p, [sector.id]: open }));
                    writeBool(`sector-${sector.id}`, open);
                  }}
                >
                  <div
                    className={`flex w-full min-h-[44px] items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-xs font-semibold transition-colors hover:bg-sidebar-accent/60 lg:min-h-0 ${isOverviewActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/90"}`}
                  >
                    {temVisao ? (
                      <Link
                        to={`/setores/${slug}/visao-geral`}
                        className="flex-1 truncate py-1 hover:underline"
                      >
                        {sector.label}
                      </Link>
                    ) : (
                      <span className="flex-1 truncate py-1">{sector.label}</span>
                    )}
                    {hasItems ? (
                      <CollapsibleTrigger
                        type="button"
                        className="rounded p-1 text-sidebar-muted hover:bg-sidebar-accent/80 hover:text-sidebar-foreground"
                        title={isOpen ? "Recolher" : "Expandir"}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                        )}
                      </CollapsibleTrigger>
                    ) : null}
                  </div>
                  <CollapsibleContent>
                    <ul className="space-y-0.5 pb-2 pl-1 pt-1">
                      {sector.items.map((item) => renderLeaf(item, { collapsed: false }))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className={cn(useFlyoutNav && !collapsed && "space-y-1")}>
      {sections.map((section) => {
        if (section.type === "flat") return renderFlatSection(section);
        return renderNestedSection(section);
      })}
    </div>
  );
}
