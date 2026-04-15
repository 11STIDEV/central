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
import { BrandLogo } from "@/painel/components/BrandLogo";
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
    <aside className="w-64 bg-slate-900 min-h-screen flex flex-col shrink-0">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <BrandLogo height={32} className="shrink-0" />
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm truncate">
              {schoolDisplayName(school?.name) ?? "—"}
            </p>
            <p className="text-white/40 text-xs">Painel Admin</p>
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
                active ? "bg-blue-600 text-white" : "text-white/60 hover:text-white hover:bg-white/10",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-1">
        <Link
          to="/senhas/totem"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          <Ticket className="w-4 h-4" />
          Abrir Totem
        </Link>
        <Link
          to="/senhas/painel"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          <GraduationCap className="w-4 h-4" />
          Abrir Painel TV
        </Link>
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-white text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-white/40 text-xs">Administrador</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white/80 transition-colors p-1"
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
