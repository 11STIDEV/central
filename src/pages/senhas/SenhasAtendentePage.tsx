import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { getPainelSupabase, isPainelSupabaseConfigured } from "@/painel/supabaseClient";
import { usePainelSupabaseAuth } from "@/painel/PainelSupabaseAuthContext";
import { fetchMyProfile } from "@/painel/fetchMyProfile";
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
  const { usuario, googleIdToken } = useAuth();
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
    setAccessDenied(null);

    (async () => {
      try {
        const supabase = getPainelSupabase();
        const idToken = googleIdToken;
        let baseProfile = await fetchMyProfile();
        if (!baseProfile && idToken) {
          for (let i = 0; i < 5; i++) {
            await requestPainelSync(idToken);
            await new Promise((r) => setTimeout(r, 250));
            baseProfile = await fetchMyProfile();
            if (baseProfile) break;
            await new Promise((r) => setTimeout(r, 400));
          }
        }
        if (!baseProfile) {
          if (!cancelled) {
            const papeis = usuario?.papeis ?? [];
            const pode = podePainelAtendente(papeis);
            const soUsuario =
              papeis.length === 1 && papeis[0] === "usuario";
            setAccessDenied(
              pode
                ? "O perfil do painel ainda não foi criado no Supabase. Confira: (1) API rodando (`npm run dev:server` na raiz do projeto, porta 3001); (2) `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no `server/.env`; (3) em `painel_schools` existe uma escola com o slug igual a `PAINEL_SCHOOL_SLUG` / `VITE_SCHOOL_SLUG`."
                : soUsuario
                  ? "A Central não carregou sua OU nem papéis manuais (só aparece o papel \"usuario\"). Inicie a API em outro terminal: `npm run dev:server`. Se sua OU no Google não for Secretaria/Setape/Direção, em `server/.env` use PAINEL_LOCAL_ALLOW_EMAILS=seu@email.com (e o mesmo e-mail em `VITE_PAINEL_LOCAL_ALLOW_EMAILS` no `.env.local`) para testar."
                  : "Sua conta não tem permissão para o atendente (OU Secretaria ou subpastas, ou Setape/Direção para admin; ou papel manual `painel_atendente` / lista local em `VITE_PAINEL_LOCAL_ALLOW_EMAILS`).",
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
  }, [painelAuth.status, painelAuth.session?.user?.id, googleIdToken, usuario?.email]);

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
