import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Phone,
  Ticket,
  ClipboardList,
  BookOpen,
  ShieldCheck,
  FileText,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
  Building2,
  CalendarDays,
  Boxes,
  Warehouse,
  Wallet,
  Shield,
  UserCog,
  Hash,
  MapPin,
  Menu,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { canAccessRoute } from "@/auth/routeAccess";

type NavGroup = "portal" | "suporte" | "agenda" | "operacoes" | "admin";

type NavItem = {
  title: string;
  url: string;
  icon: typeof Home;
  group: NavGroup;
};

const GROUP_LABELS: Record<NavGroup, string> = {
  portal: "Portal",
  suporte: "Suporte & conhecimento",
  agenda: "Agenda & espaços",
  operacoes: "Operações & materiais",
  admin: "Administração",
};

const GROUP_ORDER: NavGroup[] = ["portal", "suporte", "agenda", "operacoes", "admin"];

/** Todas as rotas (visibilidade conforme `canAccessRoute`). */
const navItems: NavItem[] = [
  { title: "Central de Informações", url: "/", icon: Home, group: "portal" },
  { title: "Abrir Chamado", url: "/chamados/novo", icon: Ticket, group: "suporte" },
  { title: "Gestão de Chamados", url: "/chamados/gestao", icon: ClipboardList, group: "suporte" },
  { title: "Base de Conhecimento", url: "/base-conhecimento", icon: BookOpen, group: "suporte" },
  { title: "Área Interna TI", url: "/ti-interno", icon: ShieldCheck, group: "suporte" },
  { title: "Agenda CCI", url: "/agenda-cci", icon: CalendarDays, group: "agenda" },
  {
    title: "Reserva de Equipamentos e Espaços",
    url: "/reserva-espacos-equipamentos",
    icon: MapPin,
    group: "agenda",
  },
  { title: "Agenda CCI — Admin", url: "/agenda-cci/admin", icon: Shield, group: "agenda" },
  { title: "Ramais", url: "/ramais", icon: Phone, group: "operacoes" },
  { title: "Documentos", url: "/documentos", icon: FileText, group: "operacoes" },
  { title: "Controle Materiais (TI)", url: "/controle-materiais-ti", icon: Boxes, group: "operacoes" },
  { title: "Almoxarifado (Entrada/Saída)", url: "/controle-materiais-almoxarifado", icon: Warehouse, group: "operacoes" },
  { title: "Vale Adiantamento", url: "/vale-adiantamento", icon: Wallet, group: "operacoes" },
  { title: "Financeiro — Vales", url: "/financeiro/vales-adiantamento", icon: CircleDollarSign, group: "admin" },
  { title: "Admin — Papéis manuais", url: "/admin/papeis-manuais", icon: UserCog, group: "admin" },
  { title: "Painel de senhas", url: "/senhas", icon: Hash, group: "admin" },
];

function isNavActive(pathname: string, itemUrl: string): boolean {
  if (itemUrl === "/senhas") return pathname.startsWith("/senhas");
  return pathname === itemUrl;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (location.pathname === "/login") {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  if (
    location.pathname === "/senhas/totem" ||
    location.pathname === "/senhas/painel"
  ) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  const papeis = usuario?.papeis ?? [];
  const permitidos = navItems.filter((item) => canAccessRoute(papeis, item.url));

  const sidebarW = collapsed ? "w-[68px]" : "w-[280px]";
  const sidebarWClass = collapsed ? "lg:ml-[68px]" : "lg:ml-[280px]";

  const renderNavLink = (item: NavItem) => {
    const active = isNavActive(location.pathname, item.url);
    return (
      <li key={item.url}>
        <NavLink
          to={item.url}
          end={item.url === "/"}
          title={collapsed ? item.title : undefined}
          className={`
            group relative flex items-start gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-200
            ${active
              ? "bg-white/[0.08] text-white shadow-[inset_2px_0_0_0] shadow-amber-400/90"
              : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
            }
          `}
          activeClassName=""
        >
          <item.icon
            className={`mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 ${active ? "text-amber-300/95" : "text-slate-500 group-hover:text-slate-300"}`}
            strokeWidth={1.75}
          />
          {!collapsed && (
            <span className="min-w-0 flex-1 leading-snug">{item.title}</span>
          )}
        </NavLink>
      </li>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile top bar */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-white/5 bg-slate-950/90 px-4 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20">
            <Building2 className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">Central CCI</p>
            <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">Intranet</p>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/[0.06] bg-slate-950 text-slate-200
          transition-transform duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full max-lg:shadow-2xl"}
          lg:translate-x-0
          ${sidebarW}
        `}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.06] px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25">
            <Building2 className="h-5 w-5" strokeWidth={2} />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 animate-fade-in">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <Sparkles className="h-3 w-3 text-amber-400/90" aria-hidden />
                Intranet
              </p>
              <h1 className="truncate text-sm font-bold tracking-tight text-white">Grupo CCI</h1>
            </div>
          )}
        </div>

        <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
          {GROUP_ORDER.map((group) => {
            const items = permitidos
              .filter((i) => i.group === group)
              .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-6 last:mb-2">
                {!collapsed && (
                  <p className="mb-2 px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {GROUP_LABELS[group]}
                  </p>
                )}
                {collapsed && group !== "portal" && (
                  <div className="mx-2 mb-2 h-px bg-white/[0.06]" aria-hidden />
                )}
                <ul className="space-y-0.5">{items.map((item) => renderNavLink(item))}</ul>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/[0.06] p-2">
          {usuario ? (
            <div
              className={`mb-2 rounded-xl bg-white/[0.03] p-2 ${collapsed ? "px-1" : ""}`}
            >
              {!collapsed ? (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">{usuario.nome}</p>
                    <p className="truncate text-[10px] text-slate-500">{usuario.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-amber-300/90 hover:bg-white/10"
                  >
                    <LogOut className="h-3 w-3" />
                    Sair
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  title="Sair"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="flex w-full items-center justify-center rounded-lg py-2 text-slate-400 hover:bg-white/10 hover:text-amber-300"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mb-2 w-full rounded-lg py-2 text-center text-xs font-medium text-amber-300/90 hover:bg-white/10"
            >
              Entrar
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden h-10 w-full items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-200 lg:flex"
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
