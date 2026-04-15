import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import GuichesClient from "@/painel/guiches/GuichesClient";
import { getPainelSupabase } from "@/painel/supabaseClient";
import type { ServiceWindow } from "@/painel/types/database";
import type { PainelAdminOutletContext } from "./SenhasAdminShell";

export default function SenhasAdminGuiches() {
  const { profile } = useOutletContext<PainelAdminOutletContext>();
  const [windows, setWindows] = useState<ServiceWindow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getPainelSupabase();
      const { data } = await supabase
        .from("painel_service_windows")
        .select("*")
        .eq("school_id", profile.school_id)
        .order("number");
      if (cancelled) return;
      setWindows((data as ServiceWindow[]) ?? []);
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

  return <GuichesClient schoolId={profile.school_id} serviceWindows={windows} />;
}
