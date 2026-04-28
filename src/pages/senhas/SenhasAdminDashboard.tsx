import { useEffect, useState } from "react";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOutletContext } from "react-router-dom";
import { Loader2, Ticket, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPainelSupabase } from "@/painel/supabaseClient";
import type { Queue } from "@/painel/types/database";
import type { PainelAdminOutletContext } from "./SenhasAdminShell";

export default function SenhasAdminDashboard() {
  const { profile } = useOutletContext<PainelAdminOutletContext>();
  const [loading, setLoading] = useState(true);
  const [totalToday, setTotalToday] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [queuesWithCount, setQueuesWithCount] = useState<
    (Queue & { tickets: { count: number }[] })[]
  >([]);
  const [recentCalls, setRecentCalls] = useState<
    {
      id: string;
      called_at: string;
      ticket: { ticket_code: string; type: string; queue: { name: string } };
      service_window: { name: string; number: number };
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getPainelSupabase();
      const today = startOfDay(new Date()).toISOString();

      const [
        { count: t1 },
        { count: t2 },
        { count: t3 },
        { data: queuesRaw },
        { data: recentCallsRaw },
      ] = await Promise.all([
        supabase
          .from("painel_tickets")
          .select("*", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .gte("created_at", today),
        supabase
          .from("painel_tickets")
          .select("*", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .eq("status", "waiting"),
        supabase
          .from("painel_tickets")
          .select("*", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .eq("status", "done")
          .gte("created_at", today),
        supabase
          .from("painel_queues")
          .select(`*, tickets:painel_tickets(count)`)
          .eq("school_id", profile.school_id)
          .eq("is_active", true),
        supabase
          .from("painel_calls")
          .select(
            `*, ticket:painel_tickets(ticket_code, type, queue:painel_queues(name)), service_window:painel_service_windows(name, number)`,
          )
          .eq("school_id", profile.school_id)
          .order("called_at", { ascending: false })
          .limit(10),
      ]);

      if (cancelled) return;
      setTotalToday(t1 ?? 0);
      setWaitingCount(t2 ?? 0);
      setDoneCount(t3 ?? 0);
      setQueuesWithCount((queuesRaw as (Queue & { tickets: { count: number }[] })[]) ?? []);
      setRecentCalls(
        (recentCallsRaw as {
          id: string;
          called_at: string;
          ticket: { ticket_code: string; type: string; queue: { name: string } };
          service_window: { name: string; number: number };
        }[]) ?? [],
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.school_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Ticket className="w-8 h-8 text-blue-600" />
              <Badge variant="secondary">Hoje</Badge>
            </div>
            <p className="text-3xl font-black text-foreground">{totalToday}</p>
            <p className="text-muted-foreground text-sm mt-1">Senhas geradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-amber-500" />
              <Badge variant="secondary">Agora</Badge>
            </div>
            <p className="text-3xl font-black text-foreground">{waitingCount}</p>
            <p className="text-muted-foreground text-sm mt-1">Aguardando</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <Badge variant="secondary">Hoje</Badge>
            </div>
            <p className="text-3xl font-black text-foreground">{doneCount}</p>
            <p className="text-muted-foreground text-sm mt-1">Atendidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-violet-500" />
            </div>
            <p className="text-3xl font-black text-foreground">
              {totalToday && doneCount ? Math.round((doneCount / totalToday) * 100) : 0}%
            </p>
            <p className="text-muted-foreground text-sm mt-1">Taxa de atendimento</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filas por serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {queuesWithCount?.map((queue) => {
                const count = queue.tickets?.[0]?.count ?? 0;
                return (
                  <div key={queue.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">{queue.prefix}</span>
                      </div>
                      <span className="text-foreground font-medium">{queue.name}</span>
                    </div>
                    <Badge variant="secondary">{count} em espera</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas chamadas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!recentCalls?.length ? (
              <div className="flex items-center gap-2 p-6 text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Nenhuma chamada hoje.</span>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentCalls.map((call) => (
                  <div key={call.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-foreground">{call.ticket.ticket_code}</span>
                      <span className="text-muted-foreground text-sm">{call.ticket.queue.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground/90 text-sm">{call.service_window.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(call.called_at), "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
