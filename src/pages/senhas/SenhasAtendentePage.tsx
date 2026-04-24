import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { getPainelSupabase, isPainelSupabaseConfigured } from "@/painel/supabaseClient";
import { usePainelSupabaseAuth } from "@/painel/PainelSupabaseAuthContext";
import { fetchMyProfile } from "@/painel/fetchMyProfile";
import { getOrCreateLocalPainelAttendantId } from "@/painel/painelLocalIdentity";
import { getSchoolSlug, isPainelDbOnly } from "@/painel/painelEnv";
import { perfilPainelPorOu } from "@/painel/painelProfileOu";
import { podePainelAtendente } from "@/painel/painelWorkspaceAccess";
import type { Profile, Queue, School, ServiceWindow } from "@/painel/types/database";
import SenhasAtendenteClient from "@/painel/SenhasAtendenteClient";

type ProfileWithSw = Profile & { service_window: ServiceWindow | null };

async function requestPainelSync(idToken: string) {
  const res = await fetch("/api/painel/sync-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    synced?: boolean;
    reason?: string;
    error?: string;
    slug?: string;
  };
}

export default function SenhasAtendentePage() {
  const { usuario, googleIdToken, organizacaoErro } = useAuth();
  const painelAuth = usePainelSupabaseAuth();
  const [state, setState] = useState<{
    profile: ProfileWithSw | null;
    school: School | null;
    queues: Queue[];
    serviceWindows: ServiceWindow[];
    initialWaiting: unknown[];
  } | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);

  useEffect(() => {
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
    setAccessDenied(null);

    (async () => {
      try {
        const supabase = getPainelSupabase();
        const idToken = googleIdToken;
        let baseProfile = await fetchMyProfile();
        if (!isPainelDbOnly() && !baseProfile && idToken) {
          for (let i = 0; i < 5; i++) {
            await requestPainelSync(idToken);
            await new Promise((r) => setTimeout(r, 250));
            baseProfile = await fetchMyProfile();
            if (baseProfile) break;
            await new Promise((r) => setTimeout(r, 400));
          }
        }
        const email = usuario?.email ?? painelAuth.session?.user?.email ?? "";
        const papeis = usuario?.papeis ?? [];
        const pode = podePainelAtendente(papeis);
        const uid = isPainelDbOnly()
          ? getOrCreateLocalPainelAttendantId()
          : painelAuth.session!.user.id;
        const nome = usuario?.nome ?? "";

        if (!baseProfile && pode && email) {
          const slug = getSchoolSlug();
          const { data: schoolBySlug, error: schoolErr } = await supabase
            .from("painel_schools")
            .select("*")
            .eq("slug", slug)
            .maybeSingle();
          if (!cancelled && schoolErr) {
            setError(schoolErr.message);
            return;
          }
          if (schoolBySlug) {
            baseProfile = perfilPainelPorOu(uid, schoolBySlug as School, nome, email, papeis);
          }
        }

        if (!baseProfile) {
          if (!cancelled) {
            const soUsuario =
              papeis.length === 1 && papeis[0] === "usuario";
            setAccessDenied(
              pode
                ? `Não foi possível montar o perfil. Confira se existe em painel_schools o slug "${getSchoolSlug()}" (igual a VITE_SCHOOL_SLUG) e o RLS no Supabase.`
                : soUsuario
                  ? organizacaoErro
                    ? `Não foi possível obter a OU no Google. Detalhe: ${organizacaoErro} — Veja server/README.md (GOOGLE_SERVICE_ACCOUNT_PATH ou GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_ADMIN_IMPERSONATE, mesmo VITE_GOOGLE_CLIENT_ID no server/.env).`
                    : "A Central ainda não tem a unidade organizacional (OU) do Google: a API precisa responder em http://127.0.0.1:3001 e o Google Admin SDK deve estar configurado em `server/.env` conforme `server/README.md`. Sem a OU, não dá para aplicar as regras por secretaria / Setape / Direção."
                  : "Sem permissão para o atendente do painel: no Google Admin, o seu utilizador tem de estar numa OU coberta pelas regras (ex.: Secretaria e subfilas para atendente; Setape ou Direção para admin do painel). Ver `PREFIXOS_PAINEL_*` em `src/auth/AuthProvider.tsx`.",
            );
          }
          return;
        }

        let serviceWindow: ServiceWindow | null = null;
        if (baseProfile.service_window_id) {
          const { data: sw } = await supabase
            .from("painel_service_windows")
            .select("*")
            .eq("id", baseProfile.service_window_id)
            .maybeSingle();
          serviceWindow = sw as ServiceWindow | null;
        }

        const profile: ProfileWithSw = { ...baseProfile, service_window: serviceWindow };

        const { data: school } = await supabase
          .from("painel_schools")
          .select("*")
          .eq("id", profile.school_id)
          .maybeSingle();

        const { data: queues } = await supabase
          .from("painel_queues")
          .select("*")
          .eq("school_id", profile.school_id)
          .eq("is_active", true)
          .order("priority_order");

        let swQuery = supabase
          .from("painel_service_windows")
          .select("*")
          .eq("school_id", profile.school_id);

        if (profile.service_window_id) {
          swQuery = swQuery.or(`is_active.eq.true,id.eq.${profile.service_window_id}`);
        } else {
          swQuery = swQuery.eq("is_active", true);
        }

        const { data: serviceWindows } = await swQuery.order("number");

        const { data: waitingTickets } = await supabase
          .from("painel_tickets")
          .select("*, queue:painel_queues(*)")
          .eq("school_id", profile.school_id)
          .eq("status", "waiting")
          .order("type", { ascending: false })
          .order("created_at");

        if (cancelled) return;
        setState({
          profile,
          school: school as School | null,
          queues: (queues as Queue[]) ?? [],
          serviceWindows: (serviceWindows as ServiceWindow[]) ?? [],
          initialWaiting: waitingTickets ?? [],
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar o atendente.");
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    painelAuth.status,
    painelAuth.session,
    googleIdToken,
    organizacaoErro,
    usuario?.email,
    usuario?.nome,
    usuario?.papeis,
  ]);

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

  if (painelAuth.status === "ready" && !isPainelDbOnly() && !painelAuth.session?.user) {
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

  if (dataLoading || (!state && !accessDenied)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <p className="max-w-lg text-sm text-slate-700">{accessDenied}</p>
        <Link to="/senhas" className="text-sm font-medium text-blue-600 hover:underline">
          Voltar ao hub do painel
        </Link>
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

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <SenhasAtendenteClient
      profile={state.profile}
      school={state.school}
      queues={state.queues}
      serviceWindows={state.serviceWindows}
      initialWaiting={state.initialWaiting as never}
    />
  );
}
