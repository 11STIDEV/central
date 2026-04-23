import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { AppSidebarNav } from "@/components/AppSidebarNav";
import { SidebarBrandLogo } from "@/components/SidebarBrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  INTRANET_NAV_SECTIONS,
  filterNavByAccess,
  filterPainelSenhasAdminSector,
  mergeNavExtras,
} from "@/navigation/intranetNavConfig";
import { useNavExtras } from "@/navigation/useNavExtras";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const papeis = usuario?.papeis ?? [];
  const extras = useNavExtras();
  const navSections = useMemo(
    () =>
      filterPainelSenhasAdminSector(
        papeis,
        filterNavByAccess(papeis, mergeNavExtras(INTRANET_NAV_SECTIONS, extras)),
      ),
    [papeis, extras],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (location.pathname === "/login") {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  if (
    location.pathname === "/senhas" ||
    location.pathname === "/senhas/totem" ||
    location.pathname === "/senhas/painel"
  ) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  const sidebarW = collapsed ? "w-[68px]" : "w-[280px]";
  const sidebarWClass = collapsed ? "lg:ml-[68px]" : "lg:ml-[280px]";

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile top bar */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-sidebar-border bg-sidebar/95 px-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <SidebarBrandLogo compact className="justify-start" />
        </div>
        <ThemeToggle className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent" />
      </header>

      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm dark:bg-background/60 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground
          transition-transform duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full max-lg:shadow-2xl"}
          lg:translate-x-0
          ${sidebarW}
        `}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-3">
          <SidebarBrandLogo
            collapsed={collapsed}
            className={collapsed ? "w-full justify-center" : "min-w-0 flex-1 animate-fade-in"}
          />
        </div>

        <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
          <AppSidebarNav sections={navSections} collapsed={collapsed} />
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-2">
          {usuario ? (
            <div
              className={`mb-2 rounded-xl bg-sidebar-accent/60 p-2 dark:bg-white/[0.03] ${collapsed ? "px-1" : ""}`}
            >
              {!collapsed ? (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-sidebar-foreground">{usuario.nome}</p>
                    <p className="truncate text-[10px] text-sidebar-muted">{usuario.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <ThemeToggle className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent" />
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate("/login");
                      }}
                      className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-amber-600 hover:bg-sidebar-accent dark:text-amber-300/90 dark:hover:bg-white/10"
                    >
                      <LogOut className="h-3 w-3" />
                      Sair
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <ThemeToggle className="mx-auto h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent" />
                  <button
                    type="button"
                    title="Sair"
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="flex w-full items-center justify-center rounded-lg py-2 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground dark:hover:text-amber-300"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-sidebar-accent/60 px-2 py-1.5 dark:bg-white/[0.03]">
              <ThemeToggle className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent" />
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex-1 rounded-lg py-2 text-center text-xs font-medium text-amber-600 hover:bg-sidebar-accent dark:text-amber-300/90 dark:hover:bg-white/10"
              >
                Entrar
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden h-10 w-full items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <main
        className={`min-h-screen flex-1 app-shell-bg transition-[margin] duration-300 ${sidebarWClass} pt-14 lg:pt-0`}
      >
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
