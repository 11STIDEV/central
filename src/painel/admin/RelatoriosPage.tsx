import { useEffect, useMemo, useState } from "react";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, BarChart3, TrendingUp, Clock, CheckCircle2, XCircle, UserRound, Download, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPainelSupabase } from "@/painel/supabaseClient";

interface RelatoriosPageProps {
  schoolId: string;
}

type RangePreset = "today" | "7d" | "30d" | "custom";

type RawAttendantCallRow = {
  attendant_id: string | null;
  service_window_id: string | null;
  ticket_id: string;
  called_at: string;
  attendant_name_snapshot?: string | null;
  attendant_email_snapshot?: string | null;
};

type AttendantCallRow = {
  attendant_id: string | null;
  service_window_id: string | null;
  called_at: string;
  attendant_name_snapshot: string | null;
  attendant_email_snapshot: string | null;
  attendant: { full_name: string | null; email: string | null } | null;
  ticket: {
    id: string;
    ticket_code: string;
    created_at: string;
    called_at: string | null;
    done_at: string | null;
    status: string;
  } | null;
  service_window: { name: string | null; number: number | null } | null;
};

type AttendantSummary = {
  attendantId: string;
  name: string;
  email: string;
  calledCount: number;
  completedCount: number;
  skippedCount: number;
  avgWaitMinutes: number | null;
  avgServiceMinutes: number | null;
  completionRate: number;
};

export default function RelatoriosPage({ schoolId }: RelatoriosPageProps) {
  const [loading, setLoading] = useState(true);
  const [rangePreset, setRangePreset] = useState<RangePreset>("7d");
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
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
  const [attendantCalls, setAttendantCalls] = useState<AttendantCallRow[]>([]);

  const period = useMemo(() => {
    const now = new Date();
    if (rangePreset === "today") {
      const start = startOfDay(now).toISOString();
      return { start, end: null as string | null, label: "Hoje" };
    }
    if (rangePreset === "30d") {
      const start = startOfDay(subDays(now, 30)).toISOString();
      return { start, end: null as string | null, label: "Últimos 30 dias" };
    }
    if (rangePreset === "custom") {
      const safeStart = customStartDate || format(now, "yyyy-MM-dd");
      const safeEnd = customEndDate || safeStart;
      const start = new Date(`${safeStart}T00:00:00`).toISOString();
      const endIso = new Date(`${safeEnd}T23:59:59.999`).toISOString();
      return { start, end: endIso, label: `${safeStart} a ${safeEnd}` };
    }
    const start = startOfDay(subDays(now, 7)).toISOString();
    return { start, end: null as string | null, label: "Últimos 7 dias" };
  }, [customEndDate, customStartDate, rangePreset]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getPainelSupabase();
      setLoading(true);

      const ticketsByQueueQuery = supabase
        .from("painel_tickets")
        .select("queue_id, status, queue:painel_queues(name, prefix)")
        .eq("school_id", schoolId)
        .gte("created_at", period.start);
      if (period.end) ticketsByQueueQuery.lte("created_at", period.end);

      const ticketsByTypeQuery = supabase
        .from("painel_tickets")
        .select("type, status")
        .eq("school_id", schoolId)
        .gte("created_at", period.start);
      if (period.end) ticketsByTypeQuery.lte("created_at", period.end);

      const ticketsByDayQuery = supabase
        .from("painel_tickets")
        .select("created_at, status")
        .eq("school_id", schoolId)
        .gte("created_at", period.start)
        .order("created_at");
      if (period.end) ticketsByDayQuery.lte("created_at", period.end);

      const skippedQuery = supabase
        .from("painel_tickets")
        .select("ticket_code, queue:painel_queues(name), created_at")
        .eq("school_id", schoolId)
        .eq("status", "skipped")
        .gte("created_at", period.start)
        .order("created_at", { ascending: false })
        .limit(10);
      if (period.end) skippedQuery.lte("created_at", period.end);

      const callsQueryNew = supabase
        .from("painel_calls")
        .select(
          "attendant_id, service_window_id, ticket_id, called_at, attendant_name_snapshot, attendant_email_snapshot",
        )
        .eq("school_id", schoolId)
        .gte("called_at", period.start)
        .order("called_at", { ascending: false });
      if (period.end) callsQueryNew.lte("called_at", period.end);

      const [
        { data: ticketsByQueue },
        { data: ticketsByType },
        { data: ticketsByDay },
        { data: skippedRaw },
        callsRespNew,
      ] = await Promise.all([
        ticketsByQueueQuery,
        ticketsByTypeQuery,
        ticketsByDayQuery,
        skippedQuery,
        callsQueryNew,
      ]);

      let callsRaw = (callsRespNew as { data?: RawAttendantCallRow[]; error?: unknown }).data ?? null;
      if ((callsRespNew as { error?: unknown }).error) {
        // Compatibilidade: banco ainda sem colunas snapshot.
        const callsQueryLegacy = supabase
          .from("painel_calls")
          .select("attendant_id, service_window_id, ticket_id, called_at")
          .eq("school_id", schoolId)
          .gte("called_at", period.start)
          .order("called_at", { ascending: false });
        if (period.end) callsQueryLegacy.lte("called_at", period.end);
        const { data: legacyCallsRaw } = await callsQueryLegacy;
        callsRaw = ((legacyCallsRaw ?? []) as RawAttendantCallRow[]).map((row) => ({
          ...row,
          attendant_name_snapshot: null,
          attendant_email_snapshot: null,
        }));
      }

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
      const entries = Object.entries(dayMap);
      setDayEntries(entries);
      setMaxDayTotal(Math.max(...entries.map(([, v]) => v.total), 1));

      const normalizedSkipped =
        ((skippedRaw ?? []) as { ticket_code: string; created_at: string; queue: { name: string }[] | { name: string } | null }[])
          .map((row) => ({
            ...row,
            queue: Array.isArray(row.queue) ? row.queue[0] ?? null : row.queue,
          }));
      setRecentSkipped(normalizedSkipped);

      const callsBase = (callsRaw as RawAttendantCallRow[] | null) ?? [];
      const attendantIds = Array.from(new Set(callsBase.map((c) => c.attendant_id).filter(Boolean))) as string[];
      const serviceWindowIds = Array.from(new Set(callsBase.map((c) => c.service_window_id).filter(Boolean))) as string[];
      const ticketIds = Array.from(new Set(callsBase.map((c) => c.ticket_id).filter(Boolean))) as string[];

      const [profilesRes, windowsRes, ticketsRes] = await Promise.all([
        attendantIds.length
          ? supabase
              .from("painel_profiles")
              .select("id, full_name, email")
              .in("id", attendantIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
        serviceWindowIds.length
          ? supabase
              .from("painel_service_windows")
              .select("id, name, number")
              .in("id", serviceWindowIds)
          : Promise.resolve({ data: [] as { id: string; name: string | null; number: number | null }[] }),
        ticketIds.length
          ? supabase
              .from("painel_tickets")
              .select("id, ticket_code, created_at, called_at, done_at, status")
              .in("id", ticketIds)
          : Promise.resolve({
              data: [] as {
                id: string;
                ticket_code: string;
                created_at: string;
                called_at: string | null;
                done_at: string | null;
                status: string;
              }[],
            }),
      ]);

      const profileMap = new Map(
        (((profilesRes as { data?: { id: string; full_name: string | null; email: string | null }[] }).data ?? []).map((p) => [
          p.id,
          { full_name: p.full_name, email: p.email },
        ])),
      );
      const windowMap = new Map(
        (((windowsRes as { data?: { id: string; name: string | null; number: number | null }[] }).data ?? []).map((w) => [
          w.id,
          { name: w.name, number: w.number },
        ])),
      );
      const ticketMap = new Map(
        (((ticketsRes as {
          data?: {
            id: string;
            ticket_code: string;
            created_at: string;
            called_at: string | null;
            done_at: string | null;
            status: string;
          }[];
        }).data ?? []).map((t) => [
          t.id,
          {
            id: t.id,
            ticket_code: t.ticket_code,
            created_at: t.created_at,
            called_at: t.called_at,
            done_at: t.done_at,
            status: t.status,
          },
        ])),
      );

      const normalizedCalls: AttendantCallRow[] = callsBase.map((row) => ({
        attendant_id: row.attendant_id,
        service_window_id: row.service_window_id,
        called_at: row.called_at,
        attendant_name_snapshot: row.attendant_name_snapshot ?? null,
        attendant_email_snapshot: row.attendant_email_snapshot ?? null,
        attendant: row.attendant_id ? (profileMap.get(row.attendant_id) ?? null) : null,
        service_window: row.service_window_id ? (windowMap.get(row.service_window_id) ?? null) : null,
        ticket: ticketMap.get(row.ticket_id) ?? null,
      }));
      setAttendantCalls(normalizedCalls);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [period.end, period.start, schoolId]);

  const TYPE_LABELS: Record<string, string> = {
    normal: "Normal",
    priority: "Prioritário",
  };

  const attendantSummary = useMemo<AttendantSummary[]>(() => {
    const ticketLatestCall = new Map<string, AttendantCallRow>();

    for (const call of attendantCalls) {
      if (!call.ticket?.id) continue;
      const existing = ticketLatestCall.get(call.ticket.id);
      if (!existing || new Date(call.called_at).getTime() > new Date(existing.called_at).getTime()) {
        ticketLatestCall.set(call.ticket.id, call);
      }
    }

    const byAttendant = new Map<string, AttendantSummary>();

    for (const call of ticketLatestCall.values()) {
      if (!call.ticket) continue;
      const fallbackKey = call.service_window_id ? `window:${call.service_window_id}` : "unassigned";
      const attendantKey = call.attendant_id ?? fallbackKey;
      const windowName = call.service_window?.name?.trim();
      const windowNumber = call.service_window?.number;
      const windowLabel =
        windowName && windowNumber
          ? `${windowName} (${windowNumber})`
          : windowName
            ? windowName
            : windowNumber
              ? `Guichê ${windowNumber}`
              : "guichê não identificado";
      const name =
        call.attendant?.full_name?.trim() ||
        call.attendant_name_snapshot?.trim() ||
        `Sem atendente vinculado (${windowLabel})`;
      const email = call.attendant?.email?.trim() || call.attendant_email_snapshot?.trim() || "-";

      if (!byAttendant.has(attendantKey)) {
        byAttendant.set(attendantKey, {
          attendantId: attendantKey,
          name,
          email,
          calledCount: 0,
          completedCount: 0,
          skippedCount: 0,
          avgWaitMinutes: null,
          avgServiceMinutes: null,
          completionRate: 0,
        });
      }

      const row = byAttendant.get(attendantKey)!;
      row.calledCount += 1;

      const ticket = call.ticket;
      if (ticket.status === "done") row.completedCount += 1;
      if (ticket.status === "skipped") row.skippedCount += 1;
    }

    // Aggregate times in a second pass to keep code simple.
    for (const [attendantKey, row] of byAttendant) {
      const related = Array.from(ticketLatestCall.values()).filter(
        (call) => (call.attendant_id ?? (call.service_window_id ? `window:${call.service_window_id}` : "unassigned")) === attendantKey && call.ticket,
      );

      let waitSumMs = 0;
      let waitCount = 0;
      let serviceSumMs = 0;
      let serviceCount = 0;

      for (const call of related) {
        const ticket = call.ticket!;
        const createdMs = Date.parse(ticket.created_at);
        const calledMs = Date.parse(ticket.called_at ?? call.called_at);
        if (Number.isFinite(createdMs) && Number.isFinite(calledMs) && calledMs >= createdMs) {
          waitSumMs += calledMs - createdMs;
          waitCount += 1;
        }

        const doneMs = ticket.done_at ? Date.parse(ticket.done_at) : Number.NaN;
        if (Number.isFinite(doneMs) && Number.isFinite(calledMs) && doneMs >= calledMs) {
          serviceSumMs += doneMs - calledMs;
          serviceCount += 1;
        }
      }

      row.avgWaitMinutes = waitCount ? waitSumMs / waitCount / 60000 : null;
      row.avgServiceMinutes = serviceCount ? serviceSumMs / serviceCount / 60000 : null;
      row.completionRate = row.calledCount ? (row.completedCount / row.calledCount) * 100 : 0;
    }

    return Array.from(byAttendant.values()).sort((a, b) => {
      if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
      return b.calledCount - a.calledCount;
    });
  }, [attendantCalls]);

  const totalsByAttendant = useMemo(() => {
    const called = attendantSummary.reduce((sum, item) => sum + item.calledCount, 0);
    const completed = attendantSummary.reduce((sum, item) => sum + item.completedCount, 0);
    return { called, completed };
  }, [attendantSummary]);

  function exportAttendantsCsv() {
    if (!attendantSummary.length) return;
    const csvRows = [
      [
        "Atendente",
        "Email",
        "Chamadas",
        "Concluidas",
        "Ausentes",
        "Tempo medio espera (min)",
        "Tempo medio atendimento (min)",
        "Taxa conclusao (%)",
      ],
      ...attendantSummary.map((item) => [
        item.name,
        item.email,
        String(item.calledCount),
        String(item.completedCount),
        String(item.skippedCount),
        item.avgWaitMinutes == null ? "" : item.avgWaitMinutes.toFixed(2),
        item.avgServiceMinutes == null ? "" : item.avgServiceMinutes.toFixed(2),
        item.completionRate.toFixed(2),
      ]),
    ];
    const csvContent = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-atendentes-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

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
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Relatórios
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Período selecionado: {period.label}</p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <label className="text-sm text-muted-foreground">
                Período
                <select
                  value={rangePreset}
                  onChange={(event) => setRangePreset(event.target.value as RangePreset)}
                  className="mt-1 block h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="today">Hoje</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="custom">Personalizado</option>
                </select>
              </label>
              {rangePreset === "custom" ? (
                <>
                  <label className="text-sm text-muted-foreground">
                    Início
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(event) => setCustomStartDate(event.target.value)}
                      className="mt-1 block h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </label>
                  <label className="text-sm text-muted-foreground">
                    Fim
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(event) => setCustomEndDate(event.target.value)}
                      className="mt-1 block h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </label>
                </>
              ) : null}
            </div>
            <button
              type="button"
              onClick={exportAttendantsCsv}
              disabled={!attendantSummary.length}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Exportar CSV dos atendentes
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Volume por dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dayEntries.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem dados ainda.</p>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {dayEntries.map(([day, val]) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-muted-foreground text-xs font-bold">{val.total}</span>
                  <div className="w-full relative flex flex-col justify-end" style={{ height: "100px" }}>
                    <div
                      className="w-full bg-primary rounded-t-md transition-all"
                      style={{ height: `${(val.total / maxDayTotal) * 100}%`, minHeight: "4px" }}
                    />
                  </div>
                  <span className="text-muted-foreground text-xs">{day}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por fila (período)</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(queueMap).length === 0 ? (
              <p className="text-muted-foreground text-sm">Sem senhas geradas no período.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(queueMap).map(([, q]) => (
                  <div key={q.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary/15 rounded-md flex items-center justify-center">
                          <span className="text-primary font-bold text-xs">{q.prefix}</span>
                        </div>
                        <span className="text-foreground font-medium text-sm">{q.name}</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="secondary">{q.total} total</Badge>
                        <Badge variant="default">{q.done} atendidos</Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
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
            <CardTitle className="text-base">Por tipo (período)</CardTitle>
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
                    <span className="text-foreground text-sm">{TYPE_LABELS[type]}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      {data.done}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
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
            <UserRound className="w-4 h-4" />
            Produtividade por atendente (últimos 7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendantSummary.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ainda não há chamadas vinculadas a atendentes neste período.
            </p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{attendantSummary.length} atendente(s)</Badge>
                <Badge variant="secondary">{totalsByAttendant.called} chamadas</Badge>
                <Badge variant="default">{totalsByAttendant.completed} concluídas</Badge>
              </div>
              <div className="mb-5 rounded-lg border border-border bg-muted/40 p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Ranking por atendimentos concluídos
                </p>
                <div className="flex flex-wrap gap-2">
                  {attendantSummary.slice(0, 5).map((item, index) => (
                    <Badge key={item.attendantId} variant={index === 0 ? "default" : "secondary"}>
                      #{index + 1} {item.name} - {item.completedCount}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Atendente</th>
                      <th className="px-2 py-2 font-medium">Email</th>
                      <th className="px-2 py-2 font-medium">Chamadas</th>
                      <th className="px-2 py-2 font-medium">Concluídas</th>
                      <th className="px-2 py-2 font-medium">Ausentes</th>
                      <th className="px-2 py-2 font-medium">Tempo médio de espera</th>
                      <th className="px-2 py-2 font-medium">Tempo médio de atendimento</th>
                      <th className="px-2 py-2 font-medium">Taxa de conclusão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendantSummary.map((item) => (
                      <tr key={item.attendantId} className="border-b last:border-0">
                        <td className="px-2 py-2 font-medium text-foreground">{item.name}</td>
                        <td className="px-2 py-2 text-muted-foreground">{item.email}</td>
                        <td className="px-2 py-2">{item.calledCount}</td>
                        <td className="px-2 py-2 text-emerald-700">{item.completedCount}</td>
                        <td className="px-2 py-2 text-amber-700">{item.skippedCount}</td>
                        <td className="px-2 py-2">
                          {item.avgWaitMinutes == null ? "-" : `${item.avgWaitMinutes.toFixed(1)} min`}
                        </td>
                        <td className="px-2 py-2">
                          {item.avgServiceMinutes == null ? "-" : `${item.avgServiceMinutes.toFixed(1)} min`}
                        </td>
                        <td className="px-2 py-2">{item.completionRate.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="w-4 h-4 text-amber-500" />
            Senhas não atendidas no período (ausentes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recentSkipped?.length ? (
            <p className="text-muted-foreground text-sm">Nenhuma senha marcada como ausente no período.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recentSkipped.map((t) => {
                return (
                  <div
                    key={String(t.ticket_code)}
                    className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2"
                  >
                    <span className="font-bold text-amber-700">{t.ticket_code}</span>
                    <span className="text-amber-600 text-xs">{t.queue?.name}</span>
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
