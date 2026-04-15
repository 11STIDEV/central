import { useEffect, useState } from "react";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, BarChart3, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPainelSupabase } from "@/painel/supabaseClient";
import { fetchMyProfile } from "@/painel/fetchMyProfile";

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [queueMap, setQueueMap] = useState<
    Record<string, { name: string; prefix: string; total: number; done: number; waiting: number }>
  >({});
  const [typeMap, setTypeMap] = useState<Record<string, { total: number; done: number }>>({
    normal: { total: 0, done: 0 },
    priority: { total: 0, done: 0 },
  });
  const [dayEntries, setDayEntries] = useState<[string, { total: number; done: number }][]>([]);
  const [maxDayTotal, setMaxDayTotal] = useState(1);
  const [recentSkipped, setRecentSkipped] = useState<
    { ticket_code: string; created_at: string; queue: { name: string } | null }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getPainelSupabase();
      const profile = await fetchMyProfile();
      if (!profile) {
        setLoading(false);
        return;
      }
      const sid = profile.school_id;
      setSchoolId(sid);
      const today = startOfDay(new Date()).toISOString();
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const [
        { data: ticketsByQueue },
        { data: ticketsByType },
        { data: ticketsByDay },
        { data: skippedRaw },
      ] = await Promise.all([
        supabase
          .from("painel_tickets")
          .select("queue_id, status, queue:painel_queues(name, prefix)")
          .eq("school_id", sid)
          .gte("created_at", today),
        supabase
          .from("painel_tickets")
          .select("type, status")
          .eq("school_id", sid)
          .gte("created_at", sevenDaysAgo),
        supabase
          .from("painel_tickets")
          .select("created_at, status")
          .eq("school_id", sid)
          .gte("created_at", sevenDaysAgo)
          .order("created_at"),
        supabase
          .from("painel_tickets")
          .select("ticket_code, queue:painel_queues(name), created_at")
          .eq("school_id", sid)
          .eq("status", "skipped")
          .gte("created_at", today)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (cancelled) return;

      const qMap: Record<string, { name: string; prefix: string; total: number; done: number; waiting: number }> =
        {};
      ticketsByQueue?.forEach((t: { queue_id: string; status: string; queue: unknown }) => {
        const queue = t.queue as { name: string; prefix: string } | null;
        if (!queue) return;
        if (!qMap[t.queue_id]) {
          qMap[t.queue_id] = { name: queue.name, prefix: queue.prefix, total: 0, done: 0, waiting: 0 };
        }
        qMap[t.queue_id].total++;
        if (t.status === "done") qMap[t.queue_id].done++;
        if (t.status === "waiting") qMap[t.queue_id].waiting++;
      });
      setQueueMap(qMap);

      const tyMap: Record<string, { total: number; done: number }> = {
        normal: { total: 0, done: 0 },
        priority: { total: 0, done: 0 },
      };
      ticketsByType?.forEach((t: { type: string; status: string }) => {
        if (!tyMap[t.type]) return;
        tyMap[t.type].total++;
        if (t.status === "done") tyMap[t.type].done++;
      });
      setTypeMap(tyMap);

      const dayMap: Record<string, { total: number; done: number }> = {};
      ticketsByDay?.forEach((t: { created_at: string; status: string }) => {
        const day = format(new Date(t.created_at), "dd/MM", { locale: ptBR });
        if (!dayMap[day]) dayMap[day] = { total: 0, done: 0 };
        dayMap[day].total++;
        if (t.status === "done") dayMap[day].done++;
      });
      const entries = Object.entries(dayMap).slice(-7);
      setDayEntries(entries);
      setMaxDayTotal(Math.max(...entries.map(([, v]) => v.total), 1));

      setRecentSkipped(
        (skippedRaw as { ticket_code: string; created_at: string; queue: { name: string } | null }[]) ?? [],
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const TYPE_LABELS: Record<string, string> = {
    normal: "Normal",
    priority: "Prioritário",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="p-8 text-slate-600">
        <p>Não foi possível carregar o perfil do painel. Confirme se você está vinculado a uma escola.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Relatórios
        </h1>
        <p className="text-slate-500 text-sm mt-1">Dados de hoje e dos últimos 7 dias</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Volume por dia (últimos 7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dayEntries.length === 0 ? (
            <p className="text-slate-400 text-sm">Sem dados ainda.</p>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {dayEntries.map(([day, val]) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-slate-600 text-xs font-bold">{val.total}</span>
                  <div className="w-full relative flex flex-col justify-end" style={{ height: "100px" }}>
                    <div
                      className="w-full bg-blue-500 rounded-t-md transition-all"
                      style={{ height: `${(val.total / maxDayTotal) * 100}%`, minHeight: "4px" }}
                    />
                  </div>
                  <span className="text-slate-400 text-xs">{day}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por fila (hoje)</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(queueMap).length === 0 ? (
              <p className="text-slate-400 text-sm">Sem senhas geradas hoje.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(queueMap).map(([, q]) => (
                  <div key={q.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                          <span className="text-blue-700 font-bold text-xs">{q.prefix}</span>
                        </div>
                        <span className="text-slate-700 font-medium text-sm">{q.name}</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="secondary">{q.total} total</Badge>
                        <Badge variant="default">{q.done} atendidos</Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${q.total > 0 ? (q.done / q.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por tipo (últimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(typeMap).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        type === "normal" ? "bg-blue-500" : type === "priority" ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                    <span className="text-slate-700 text-sm">{TYPE_LABELS[type]}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-slate-500 text-sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      {data.done}
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-sm">
                      <Clock className="w-3 h-3 text-amber-500" />
                      {data.total - data.done}
                    </div>
                    <Badge variant="secondary">{data.total}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="w-4 h-4 text-amber-500" />
            Senhas não atendidas hoje (ausentes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recentSkipped?.length ? (
            <p className="text-slate-400 text-sm">Nenhuma senha marcada como ausente hoje.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recentSkipped.map((t) => {
                const queue = t.queue as { name: string } | null;
                return (
                  <div
                    key={String(t.ticket_code)}
                    className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                  >
                    <span className="font-bold text-amber-700">{t.ticket_code}</span>
                    <span className="text-amber-600 text-xs">{queue?.name}</span>
                    <span className="text-amber-400 text-xs">
                      {format(new Date(t.created_at), "HH:mm")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
