import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getPainelSupabase, isPainelSupabaseConfigured } from "@/painel/supabaseClient";
import { getSchoolSlug } from "@/painel/painelEnv";
import type { Queue, School } from "@/painel/types/database";
import SenhasTotemClient from "@/painel/SenhasTotemClient";

export default function SenhasTotemPage() {
  const [school, setSchool] = useState<School | null>(null);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isPainelSupabaseConfigured()) {
          setError(
            "Supabase do painel não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local e reinicie o Vite (npm run dev).",
          );
          return;
        }
        const supabase = getPainelSupabase();
        const slug = getSchoolSlug();
        const { data: sch, error: e1 } = await supabase
          .from("painel_schools")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (cancelled) return;
        if (e1 || !sch) {
          setError("Escola não encontrada para este slug.");
          return;
        }
        const { data: q, error: e2 } = await supabase
          .from("painel_queues")
          .select("*")
          .eq("school_id", sch.id)
          .eq("is_active", true)
          .order("priority_order");
        if (cancelled) return;
        if (e2) setError(e2.message);
        setSchool(sch as School);
        setQueues((q as Queue[]) ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar o totem.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-white/60" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-white">
        <p className="max-w-md text-sm text-white/90">{error}</p>
      </div>
    );
  }

  return <SenhasTotemClient school={school} queues={queues} />;
}
