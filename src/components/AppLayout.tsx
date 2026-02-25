import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Home,
  Phone,
  Ticket,
  ClipboardList,
  BookOpen,
  ShieldCheck,
  FileText,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";

const navItems = [
  { title: "Central de Sistemas", url: "/", icon: Home },
  { title: "Ramais", url: "/ramais", icon: Phone },
  { title: "Abrir Chamado", url: "/chamados/novo", icon: Ticket },
  { title: "Gestão de Chamados", url: "/chamados/gestao", icon: ClipboardList },
  { title: "Base de Conhecimento", url: "/base-conhecimento", icon: BookOpen },
  { title: "Área Interna TI", url: "/ti-interno", icon: ShieldCheck },
  { title: "Documentos", url: "/documentos", icon: FileText },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-40 flex h-screen flex-col
          bg-sidebar text-sidebar-foreground
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-[68px]" : "w-64"}
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
            {navItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <li key={item.url}>
                  <NavLink
                    to={item.url}
                    end={item.url === "/"}
                    className={`
                      group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                      transition-all duration-200
                      ${isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }
                    `}
                    activeClassName=""
                  >
                    <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                    {!collapsed && <span className="animate-fade-in truncate">{item.title}</span>}
                    {isActive && (
                      <div className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-primary" />
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-12 items-center justify-center border-t border-sidebar-border text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-300 ${collapsed ? "ml-[68px]" : "ml-64"}`}
      >
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
