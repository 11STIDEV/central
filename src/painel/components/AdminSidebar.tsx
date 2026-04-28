import { Link, useLocation, useNavigate } from "react-router-dom";
import { getPainelSupabase } from "@/painel/supabaseClient";
import { schoolDisplayName } from "@/painel/schoolDisplayName";
import type { Profile, School } from "@/painel/types/database";
import {
  LayoutDashboard,
  ListOrdered,
  MonitorSpeaker,
  Users,
  BarChart3,
  GraduationCap,
  LogOut,
  Settings,
  Ticket,
} from "lucide-react";
import { SidebarBrandLogo } from "@/components/SidebarBrandLogo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV_ITEMS = [
  { href: "/senhas/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/senhas/admin/filas", label: "Filas", icon: ListOrdered },
  { href: "/senhas/admin/guiches", label: "Guichês", icon: MonitorSpeaker },
  { href: "/senhas/admin/atendentes", label: "Atendentes", icon: Users },
  { href: "/senhas/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/senhas/admin/configuracoes", label: "Configurações", icon: Settings },
];

interface AdminSidebarProps {
  school: School | null;
  profile: Profile;
}

export default function AdminSidebar({ school, profile }: AdminSidebarProps) {
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const supabase = getPainelSupabase();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sessão do painel encerrada.");
    navigate("/senhas");
  }

  return (
    <aside className="w-64 min-h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <SidebarBrandLogo compact className="shrink-0" />
          <div className="overflow-hidden">
            <p className="text-sidebar-foreground font-bold text-sm truncate">
              {schoolDisplayName(school?.name) ?? "—"}
            </p>
            <p className="text-sidebar-muted text-xs">Painel Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href || pathname === `${href}/`
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-1">
        <Link
          to="/senhas/totem"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Ticket className="w-4 h-4" />
          Abrir Totem
        </Link>
        <Link
          to="/senhas/painel"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <GraduationCap className="w-4 h-4" />
          Abrir Painel TV
        </Link>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-sidebar-foreground text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-sidebar-muted text-xs">Administrador</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 text-sidebar-muted hover:text-sidebar-foreground transition-colors"
            title="Sair do painel"
            type="button"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
