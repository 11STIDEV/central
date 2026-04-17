import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarDays, ChevronDown, ChevronRight, Headphones, Layers, type LucideIcon } from "lucide-react";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type NavLeaf,
  type NavSection,
  type NavSectionFlat,
  type NavSectionNested,
  isNavActive,
  nestedSectionHasActiveRoute,
  sectorHasActiveRoute,
} from "@/navigation/intranetNavConfig";

const STORAGE_PREFIX = "cci-intranet-nav";

/** Ícone no menu quando a sidebar está recolhida (uma seção `nested`). */
const NESTED_SECTION_ICONS: Record<string, LucideIcon> = {
  suporte: Headphones,
  agenda: CalendarDays,
  setores: Layers,
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

function buildInitialOuterOpen(
  pathname: string,
  nestedList: NavSectionNested[],
): Record<string, boolean> {
  const init: Record<string, boolean> = {};
  for (const s of nestedList) {
    init[s.id] = nestedSectionHasActiveRoute(pathname, s) || readBool(`${s.id}-open`, false);
  }
  return init;
}

function buildInitialSectorOpen(pathname: string, sectors: { id: string }[]): Record<string, boolean> {
  const init: Record<string, boolean> = {};
  for (const sec of sectors) {
    init[sec.id] = readBool(`sector-${sec.id}`, false);
  }
  return init;
}

type AppSidebarNavProps = {
  sections: NavSection[];
  collapsed: boolean;
};

export function AppSidebarNav({ sections, collapsed }: AppSidebarNavProps) {
  const { pathname } = useLocation();

  const nestedList = useMemo(
    () => sections.filter((s): s is NavSectionNested => s.type === "nested"),
    [sections],
  );

  const allSectors = useMemo(() => nestedList.flatMap((s) => s.sectors), [nestedList]);

  const [outerOpen, setOuterOpen] = useState<Record<string, boolean>>(() =>
    buildInitialOuterOpen(pathname, nestedList),
  );

  const [sectorOpen, setSectorOpen] = useState<Record<string, boolean>>(() => {
    const init = buildInitialSectorOpen(pathname, allSectors);
    for (const sector of allSectors) {
      const nested = nestedList.find((s) => s.sectors.some((x) => x.id === sector.id));
      if (!nested) continue;
      const s = nested.sectors.find((x) => x.id === sector.id);
      if (s && sectorHasActiveRoute(pathname, s)) init[sector.id] = true;
    }
    return init;
  });

  useEffect(() => {
    setOuterOpen((prev) => {
      const next = { ...prev };
      for (const s of nestedList) {
        if (nestedSectionHasActiveRoute(pathname, s)) next[s.id] = true;
        if (next[s.id] === undefined) next[s.id] = readBool(`${s.id}-open`, false);
      }
      return next;
    });
  }, [pathname, nestedList]);

  useEffect(() => {
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
  }, [pathname, nestedList, allSectors]);

  const linkClass = (active: boolean) => `
    group relative flex min-h-[44px] items-start gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-200 lg:min-h-0
    ${active
      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0] shadow-amber-400/90 dark:bg-white/[0.08] dark:text-white dark:shadow-amber-400/90"
      : "text-sidebar-muted hover:bg-sidebar-accent/80 hover:text-sidebar-foreground dark:hover:bg-white/[0.04]"
    }
  `;

  const iconClass = (active: boolean) =>
    `mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 ${active ? "text-amber-500 dark:text-amber-300/95" : "text-sidebar-muted group-hover:text-sidebar-foreground"}`;

  function renderLeaf(item: NavLeaf, opts: { collapsed: boolean }) {
    const active = isNavActive(pathname, item.url);
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

  function renderFlatSection(section: NavSectionFlat) {
    const items = [...section.items].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    if (items.length === 0) return null;
    return (
      <div key={section.id} className="mb-6 last:mb-2">
        {!collapsed && (
          <p className="mb-2 px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-muted">
            {section.label}
          </p>
        )}
        {collapsed && section.id !== "portal" && <div className="mx-2 mb-2 h-px bg-sidebar-border" aria-hidden />}
        <ul className="space-y-0.5">{items.map((item) => renderLeaf(item, { collapsed }))}</ul>
      </div>
    );
  }

  function renderNestedSection(section: NavSectionNested) {
    if (section.sectors.length === 0) return null;

    const SectionIcon = NESTED_SECTION_ICONS[section.id] ?? Layers;
    const outer = outerOpen[section.id] ?? false;

    if (collapsed) {
      const anyActive = nestedSectionHasActiveRoute(pathname, section);
      return (
        <div key={section.id} className="mb-6 last:mb-2">
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
            <DropdownMenuContent className="w-56" align="start" side="right" sideOffset={8}>
              <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {section.label}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {section.sectors.map((sector) => (
                <DropdownMenuSub key={sector.id}>
                  <DropdownMenuSubTrigger className="text-sm">{sector.label}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-52">
                    {sector.items.map((item) => {
                      const active = isNavActive(pathname, item.url);
                      return (
                        <DropdownMenuItem key={item.url} asChild>
                          <Link to={item.url} className={active ? "bg-accent font-medium" : undefined}>
                            {item.title}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    return (
      <div key={section.id} className="mb-6 last:mb-2">
        <Collapsible
          open={outer}
          onOpenChange={(open) => {
            setOuterOpen((p) => ({ ...p, [section.id]: open }));
            writeBool(`${section.id}-open`, open);
          }}
        >
          <CollapsibleTrigger
            className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-muted transition-colors hover:bg-sidebar-accent/80 hover:text-sidebar-foreground lg:min-h-0"
            type="button"
          >
            <span>{section.label}</span>
            {outer ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-1 pl-0">
            {section.sectors.map((sector) => (
              <Collapsible
                key={sector.id}
                open={sectorOpen[sector.id] ?? false}
                onOpenChange={(open) => {
                  setSectorOpen((p) => ({ ...p, [sector.id]: open }));
                  writeBool(`sector-${sector.id}`, open);
                }}
              >
                <CollapsibleTrigger
                  className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent/60 lg:min-h-0"
                  type="button"
                >
                  <span className="leading-snug">{sector.label}</span>
                  {(sectorOpen[sector.id] ?? false) ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="space-y-0.5 pb-2 pl-1 pt-1">
                    {[...sector.items]
                      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
                      .map((item) => renderLeaf(item, { collapsed: false }))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  return (
    <>
      {sections.map((section) => {
        if (section.type === "flat") return renderFlatSection(section);
        return renderNestedSection(section);
      })}
    </>
  );
}
