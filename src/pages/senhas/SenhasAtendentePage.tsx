import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getPainelSupabase, isPainelSupabaseConfigured } from "@/painel/supabaseClient";
import { usePainelSupabaseAuth } from "@/painel/PainelSupabaseAuthContext";
import { fetchMyProfile } from "@/painel/fetchMyProfile";
import type { Profile, Queue, School, ServiceWindow } from "@/painel/types/database";
import SenhasAtendenteClient from "@/painel/SenhasAtendenteClient";

type ProfileWithSw = Profile & { service_window: ServiceWindow | null };

export default function SenhasAtendentePage() {
  const navigate = useNavigate();
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

    (async () => {
      let redirected = false;
      try {
        const supabase = getPainelSupabase();
        const baseProfile = await fetchMyProfile();
        if (!baseProfile) {
          if (!cancelled) {
            redirected = true;
            navigate("/senhas", { replace: true });
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
        if (!cancelled && !redirected) setDataLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [painelAuth.status, painelAuth.session?.user?.id, navigate]);

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

  if (dataLoading || !state) {
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
