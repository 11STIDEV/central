import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Link, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { fetchMyProfile } from "@/painel/fetchMyProfile";
import { getSchoolSlug } from "@/painel/painelEnv";
import { alinharPapelPerfilOu, perfilPainelPorOu } from "@/painel/painelProfileOu";
import { getPainelSupabase, isPainelSupabaseConfigured } from "@/painel/supabaseClient";
import { usePainelSupabaseAuth } from "@/painel/PainelSupabaseAuthContext";
import { podePainelAdmin, podePainelAtendente } from "@/painel/painelWorkspaceAccess";
import type { Profile, School } from "@/painel/types/database";

export type PainelAdminOutletContext = { profile: Profile; school: School | null };

export default function SenhasAdminShell() {
  const navigate = useNavigate();
  const { usuario, carregando: authCarregando } = useAuth();
  const painelAuth = usePainelSupabaseAuth();
  const painelSessionUserId =
    painelAuth.status === "ready" ? painelAuth.session?.user?.id : undefined;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authCarregando) {
      return;
    }
    if (painelAuth.status !== "ready" || !painelAuth.session?.user) {
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

        const uid = painelAuth.session.user.id;
        const email = usuario?.email ?? painelAuth.session.user.email ?? "";
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
    painelSessionUserId,
    navigate,
    usuario?.email,
    usuario?.nome,
    usuario?.papeis,
  ]);

  if (authCarregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (painelAuth.status === "auth_loading" || painelAuth.status === "syncing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (painelAuth.status === "no_config") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
        <p className="max-w-md text-sm text-slate-700">
          Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local e reinicie o Vite.
        </p>
      </div>
    );
  }

  if (painelAuth.status === "no_token") {
    return <Navigate to="/login" replace />;
  }

  if (painelAuth.status === "ready" && !painelAuth.session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <p className="max-w-md text-sm text-slate-700">
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
        <p className="max-w-md text-sm text-slate-700">{error}</p>
        <Link to="/senhas" className="text-sm font-medium text-blue-600 hover:underline">
          Voltar ao hub
        </Link>
      </div>
    );
  }

  const ctx: PainelAdminOutletContext = { profile, school };

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <Outlet context={ctx} />
    </div>
  );
}
