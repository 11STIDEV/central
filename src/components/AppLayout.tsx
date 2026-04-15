import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { canAccessRoute } from "@/auth/routeAccess";

type NavItem = {
  title: string;
  url: string;
  icon: typeof Home;
};

/** Todas as rotas da aplicação (visibilidade conforme `canAccessRoute` em `routeAccess.ts`). */
const navItems: NavItem[] = [
  { title: "Central de Sistemas", url: "/", icon: Home },
  { title: "Ramais", url: "/ramais", icon: Phone },
  { title: "Abrir Chamado", url: "/chamados/novo", icon: Ticket },
  { title: "Gestão de Chamados", url: "/chamados/gestao", icon: ClipboardList },
  { title: "Base de Conhecimento", url: "/base-conhecimento", icon: BookOpen },
  { title: "Área Interna TI", url: "/ti-interno", icon: ShieldCheck },
  { title: "Documentos", url: "/documentos", icon: FileText },
  { title: "Agenda CCI", url: "/agenda-cci", icon: CalendarDays },
  {
    title: "Reserva de Equipamentos e Espaços",
    url: "/reserva-espacos-equipamentos",
    icon: MapPin,
  },
  { title: "Agenda CCI — Admin", url: "/agenda-cci/admin", icon: Shield },
  { title: "Controle Materiais (TI)", url: "/controle-materiais-ti", icon: Boxes },
  { title: "Almoxarifado (Entrada/Saída)", url: "/controle-materiais-almoxarifado", icon: Warehouse },
  { title: "Vale Adiantamento", url: "/vale-adiantamento", icon: Wallet },
  { title: "Financeiro — Vales", url: "/financeiro/vales-adiantamento", icon: CircleDollarSign },
  { title: "Admin — Papéis manuais", url: "/admin/papeis-manuais", icon: UserCog },
  { title: "Painel de senhas", url: "/senhas", icon: Hash },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  if (location.pathname === "/login") {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  /** Totem e painel TV ficam em tela cheia (quiosque / TV); demais rotas /senhas usam o menu Extranet. */
  if (
    location.pathname === "/senhas/totem" ||
    location.pathname === "/senhas/painel"
  ) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-40 flex h-screen flex-col
          bg-sidebar text-sidebar-foreground
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-[68px]" : "w-72"}
        `}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-accent">
            <Building2 className="h-5 w-5 text-accent-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <h1 className="text-sm font-bold text-sidebar-foreground">Extranet</h1>
              <p className="text-xs text-sidebar-muted">Portal Corporativo</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems
              .filter((item) =>
                canAccessRoute(usuario?.papeis ?? [], item.url),
              )
              .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
              .map((item) => {
              const isActive =
                item.url === "/senhas"
                  ? location.pathname.startsWith("/senhas")
                  : location.pathname === item.url;
              return (
                <li key={item.url}>
                  <NavLink
                    to={item.url}
                    end={item.url === "/"}
                    className={`
                      group flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                      transition-all duration-200
                      ${isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }
                    `}
                    activeClassName=""
                  >
                    <item.icon className={`mt-0.5 h-5 w-5 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                    {!collapsed && (
                      <div className="animate-fade-in flex min-w-0 flex-1 items-start justify-between gap-2">
                        <span className="min-w-0 flex-1 leading-snug">{item.title}</span>
                        {isActive && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-primary" aria-hidden />
                        )}
                      </div>
                    )}
                  </NavLink>
                </li>
              );
              })}
          </ul>
        </nav>

        {/* User & Collapse */}
        <div className="border-t border-sidebar-border px-3 py-2 text-xs text-sidebar-muted">
          {usuario ? (
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="max-w-[140px] truncate font-medium text-sidebar-foreground">
                  {usuario.nome}
                </span>
                <span className="max-w-[160px] truncate text-[11px]">
                  {usuario.email}
                </span>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="text-[11px] font-medium text-sidebar-primary hover:underline"
              >
                Sair
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="mb-2 text-[11px] font-medium text-sidebar-primary hover:underline"
            >
              Entrar
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-10 w-full items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-300 ${collapsed ? "ml-[68px]" : "ml-72"}`}
      >
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
