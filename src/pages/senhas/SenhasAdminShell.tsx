import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Link, NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { fetchMyProfile } from "@/painel/fetchMyProfile";
import { getOrCreateLocalPainelAttendantId } from "@/painel/painelLocalIdentity";
import { getSchoolSlug, isPainelDbOnly } from "@/painel/painelEnv";
import { alinharPapelPerfilOu, perfilPainelPorOu } from "@/painel/painelProfileOu";
import { getPainelSupabase, isPainelSupabaseConfigured } from "@/painel/supabaseClient";
import { usePainelSupabaseAuth } from "@/painel/PainelSupabaseAuthContext";
import { podePainelAdmin, podePainelAtendente } from "@/painel/painelWorkspaceAccess";
import type { Profile, School } from "@/painel/types/database";
import { cn } from "@/lib/utils";

export type PainelAdminOutletContext = { profile: Profile; school: School | null };

const ADMIN_NAV_ITEMS = [
  { to: "/senhas/admin", label: "Dashboard", end: true },
  { to: "/senhas/admin/filas", label: "Filas" },
  { to: "/senhas/admin/guiches", label: "Guichês" },
  { to: "/senhas/admin/atendentes", label: "Atendentes" },
  { to: "/senhas/admin/relatorios", label: "Relatórios" },
  { to: "/senhas/admin/configuracoes", label: "Configurações" },
];

export default function SenhasAdminShell() {
  const navigate = useNavigate();
  const { usuario, carregando: authCarregando } = useAuth();
  const painelAuth = usePainelSupabaseAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authCarregando) {
      return;
    }
    if (painelAuth.status !== "ready") {
      return;
    }
    if (!isPainelDbOnly() && !painelAuth.session?.user) {
      return;
    }
    if (!isPainelSupabaseConfigured()) {
      setError("Supabase não configurado.");
      return;
    }

    let cancelled = false;
    setDataLoading(true);
    setError(null);

    (async () => {
      let redirected = false;
      try {
        const supabase = getPainelSupabase();
        const email = usuario?.email ?? painelAuth.session?.user?.email ?? "";
        const papeis = usuario?.papeis ?? [];
        if (!podePainelAdmin(papeis)) {
          if (!cancelled) {
            redirected = true;
            if (podePainelAtendente(papeis)) {
              navigate("/senhas/atendente", { replace: true });
            } else {
              navigate("/senhas", { replace: true });
            }
          }
          return;
        }

        const uid = isPainelDbOnly()
          ? getOrCreateLocalPainelAttendantId()
          : painelAuth.session!.user.id;
        const nome = usuario?.nome ?? "";

        let p = await fetchMyProfile();
        if (!p && email) {
          const { data: schoolBySlug, error: schoolErr } = await supabase
            .from("painel_schools")
            .select("*")
            .eq("slug", getSchoolSlug())
            .maybeSingle();
          if (schoolErr) throw schoolErr;
          if (schoolBySlug) {
            p = perfilPainelPorOu(uid, schoolBySlug as School, nome, email, papeis);
          }
        } else if (p) {
          p = alinharPapelPerfilOu(p, papeis);
        }

        if (!p) {
          if (!cancelled) {
            redirected = true;
            navigate("/senhas", { replace: true });
          }
          return;
        }
        if (p.role !== "admin") {
          if (!cancelled) {
            redirected = true;
            navigate("/senhas/atendente", { replace: true });
          }
          return;
        }
        const { data: sch } = await supabase
          .from("painel_schools")
          .select("*")
          .eq("id", p.school_id)
          .maybeSingle();
        if (cancelled) return;
        setProfile(p);
        setSchool(sch as School | null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar o admin.");
        }
      } finally {
        if (!cancelled && !redirected) setDataLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authCarregando,
    painelAuth.status,
    painelAuth.session,
    navigate,
    usuario?.email,
    usuario?.nome,
    usuario?.papeis,
  ]);

  if (authCarregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (painelAuth.status === "auth_loading" || painelAuth.status === "syncing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (painelAuth.status === "no_config") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local e reinicie o Vite.
        </p>
      </div>
    );
  }

  if (painelAuth.status === "no_token") {
    return <Navigate to="/login" replace />;
  }

  if (painelAuth.status === "ready" && !isPainelDbOnly() && !painelAuth.session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          {painelAuth.syncError ??
            "Não foi possível autenticar no painel com o Google. Confira o provedor Google no Supabase (mesmo Client ID da Central)."}
        </p>
        <Link to="/senhas" className="text-sm font-medium text-blue-600 hover:underline">
          Voltar ao hub do painel
        </Link>
      </div>
    );
  }

  if (dataLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <Link to="/senhas" className="text-sm font-medium text-blue-600 hover:underline">
          Voltar ao hub
        </Link>
      </div>
    );
  }

  const ctx: PainelAdminOutletContext = { profile, school };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto lg:justify-center">
          {ADMIN_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
      <Outlet context={ctx} />
    </div>
  );
}
