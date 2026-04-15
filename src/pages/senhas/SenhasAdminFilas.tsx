import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import FilasClient from "@/painel/filas/FilasClient";
import { getPainelSupabase } from "@/painel/supabaseClient";
import type { Queue } from "@/painel/types/database";
import type { PainelAdminOutletContext } from "./SenhasAdminShell";

export default function SenhasAdminFilas() {
  const { profile } = useOutletContext<PainelAdminOutletContext>();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getPainelSupabase();
      const { data } = await supabase
        .from("painel_queues")
        .select("*")
        .eq("school_id", profile.school_id)
        .order("priority_order");
      if (cancelled) return;
      setQueues((data as Queue[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.school_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return <FilasClient schoolId={profile.school_id} queues={queues} />;
}
