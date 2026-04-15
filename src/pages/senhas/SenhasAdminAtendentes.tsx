import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import AtendentesClient from "@/painel/atendentes/AtendentesClient";
import { getPainelSupabase } from "@/painel/supabaseClient";
import type { Profile, ServiceWindow } from "@/painel/types/database";
import type { PainelAdminOutletContext } from "./SenhasAdminShell";

type ProfileWithWindow = Profile & {
  service_window: { name: string; number: number } | null;
};

export default function SenhasAdminAtendentes() {
  const { profile: adminProfile } = useOutletContext<PainelAdminOutletContext>();
  const [attendants, setAttendants] = useState<ProfileWithWindow[]>([]);
  const [serviceWindows, setServiceWindows] = useState<ServiceWindow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getPainelSupabase();
      const { data: profilesRaw } = await supabase
        .from("painel_profiles")
        .select("*")
        .eq("school_id", adminProfile.school_id)
        .order("full_name");

      const { data: swRaw } = await supabase
        .from("painel_service_windows")
        .select("*")
        .eq("school_id", adminProfile.school_id)
        .order("number");

      const swList = (swRaw as ServiceWindow[]) ?? [];
      const swMap = new Map(swList.map((w) => [w.id, w]));

      const withWindow: ProfileWithWindow[] =
        (profilesRaw as Profile[] | null)?.map((p) => {
          const w = p.service_window_id ? swMap.get(p.service_window_id) : undefined;
          return {
            ...p,
            service_window: w ? { name: w.name, number: w.number } : null,
          };
        }) ?? [];

      if (cancelled) return;
      setAttendants(withWindow);
      setServiceWindows(swList);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [adminProfile.school_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <AtendentesClient
      schoolId={adminProfile.school_id}
      attendants={attendants}
      serviceWindows={serviceWindows}
    />
  );
}
