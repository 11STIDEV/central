import { useEffect, useState, useRef } from "react";
import { getPainelSupabase } from "@/painel/supabaseClient";
import type { Profile, Queue, School, ServiceWindow, Ticket } from "@/painel/types/database";
import { useAuth } from "@/auth/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  SkipForward,
  Star,
  Users,
  Clock,
  MonitorSpeaker,
  Loader2,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isPainelDbOnly } from "@/painel/painelEnv";
import { useChimeSound } from "@/painel/hooks/useChimeSound";
import { PageHero, PageHeroEyebrow } from "@/components/PageHero";

function labelGuiche(w: ServiceWindow) {
  return `${w.name} · Guichê ${w.number}`;
}

interface TicketWithQueue extends Ticket {
  queue: Queue;
}

interface ProfileWithWindow extends Profile {
  service_window: ServiceWindow | null;
}

interface AtendenteClientProps {
  profile: ProfileWithWindow;
  school: School | null;
  queues: Queue[];
  serviceWindows: ServiceWindow[];
  initialWaiting: TicketWithQueue[];
}

const TYPE_BADGE: Record<string, "default" | "destructive"> = {
  normal: "default",
  priority: "destructive",
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  normal: <Users className="w-3 h-3" />,
  priority: <Star className="w-3 h-3" />,
};

const TYPE_LABEL: Record<string, string> = {
  normal: "Normal",
  priority: "Prioritário",
};

const PRIORITY_RATIO = 2;

function isPriority(type: string) {
  return type === "priority";
}

/**
 * Intercalação 2:1 — a cada PRIORITY_RATIO prioritárias chamadas
 * consecutivamente, força 1 normal (se disponível). Dentro de cada
 * grupo, respeita created_at (FIFO).
 */
function pickNextTicket(
  waiting: TicketWithQueue[],
  consecutivePriority: number,
): { ticket: TicketWithQueue; newCounter: number } | null {
  if (waiting.length === 0) return null;

  const priorities = waiting.filter((t) => isPriority(t.type));
  const normals = waiting.filter((t) => !isPriority(t.type));

  const mustCallNormal = consecutivePriority >= PRIORITY_RATIO && normals.length > 0;

  if (mustCallNormal) {
    return { ticket: normals[0], newCounter: 0 };
  }

  if (priorities.length > 0) {
    return { ticket: priorities[0], newCounter: consecutivePriority + 1 };
  }

  return { ticket: normals[0], newCounter: 0 };
}

export default function SenhasAtendenteClient({
  profile,
  school,
  serviceWindows,
  initialWaiting,
}: AtendenteClientProps) {
  const [waiting, setWaiting] = useState<TicketWithQueue[]>(initialWaiting);
  const [currentTicket, setCurrentTicket] = useState<TicketWithQueue | null>(null);
  const [selectedWindowId, setSelectedWindowId] = useState<string>(
    profile.service_window_id ?? serviceWindows[0]?.id ?? ""
  );
  const [calling, setCalling] = useState(false);
  const [showAllQueue, setShowAllQueue] = useState(false);
  const consecutivePriorityRef = useRef(0);
  const supabase = getPainelSupabase();
  const { playChime } = useChimeSound();
  const { usuario } = useAuth();

  const selectedWindow = serviceWindows.find((w) => w.id === selectedWindowId);

  useEffect(() => {
    if (serviceWindows.length === 0) return;
    if (!serviceWindows.some((w) => w.id === selectedWindowId)) {
      setSelectedWindowId(serviceWindows[0].id);
    }
  }, [serviceWindows, selectedWindowId]);

  // Realtime subscription for new tickets
  useEffect(() => {
    const channel = supabase
      .channel("atendente-tickets")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "painel_tickets",
          filter: `school_id=eq.${profile.school_id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("painel_tickets")
            .select("*, queue:painel_queues(*)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            const newTicket = data as unknown as TicketWithQueue;
            setWaiting((prev) => {
              const updated = [...prev, newTicket].sort((a, b) => {
                const typeOrder = { priority: 0, normal: 1 };
                const typeA = typeOrder[a.type as keyof typeof typeOrder] ?? 1;
                const typeB = typeOrder[b.type as keyof typeof typeOrder] ?? 1;
                if (typeA !== typeB) return typeA - typeB;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              });
              return updated;
            });

            playChime();
            toast.info(`Nova senha: ${newTicket.ticket_code} — ${newTicket.queue.name}`);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "painel_tickets",
          filter: `school_id=eq.${profile.school_id}`,
        },
        (payload) => {
          if (payload.new.status !== "waiting") {
            setWaiting((prev) => prev.filter((t) => t.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.school_id]);

  const nextPick = pickNextTicket(waiting, consecutivePriorityRef.current);

  async function insertCallRecord(ticketId: string, windowId: string) {
    const payloadWithSnapshot = {
      school_id: profile.school_id,
      ticket_id: ticketId,
      service_window_id: windowId,
      /** Sem sessão `auth.users` no Supabase (VITE_PAINEL_DB_ONLY), FK de atendente fica nulo. */
      attendant_id: isPainelDbOnly() ? null : profile.id,
      attendant_name_snapshot: usuario?.nome ?? profile.full_name ?? null,
      attendant_email_snapshot: usuario?.email ?? null,
    };

    const withSnapshot = await supabase.from("painel_calls").insert(payloadWithSnapshot);
    if (!withSnapshot.error) return;

    // Compatibilidade: banco ainda sem colunas snapshot.
    const fallback = await supabase.from("painel_calls").insert({
      school_id: profile.school_id,
      ticket_id: ticketId,
      service_window_id: windowId,
      attendant_id: isPainelDbOnly() ? null : profile.id,
    });
    if (fallback.error) throw fallback.error;
  }

  async function callNext() {
    if (!selectedWindowId || !nextPick) return;
    setCalling(true);

    const { ticket: next, newCounter } = nextPick;

    try {
      const { error: ticketError } = await supabase
        .from("painel_tickets")
        .update({ status: "called", called_at: new Date().toISOString() })
        .eq("id", next.id);

      if (ticketError) throw ticketError;

      await insertCallRecord(next.id, selectedWindowId);

      consecutivePriorityRef.current = newCounter;
      setCurrentTicket(next);
      setWaiting((prev) => prev.filter((t) => t.id !== next.id));
      toast.success(`Senha ${next.ticket_code} chamada para ${selectedWindow?.name}`);
    } catch {
      toast.error("Erro ao chamar próxima senha.");
    } finally {
      setCalling(false);
    }
  }

  async function recallCurrent() {
    if (!currentTicket || !selectedWindowId) return;

    await insertCallRecord(currentTicket.id, selectedWindowId);

    toast.info(`Senha ${currentTicket.ticket_code} rechamada.`);
  }

  async function finishCurrent() {
    if (!currentTicket) return;

    await supabase
      .from("painel_tickets")
      .update({ status: "done", done_at: new Date().toISOString() })
      .eq("id", currentTicket.id);

    toast.success("Atendimento finalizado.");
    setCurrentTicket(null);
  }

  async function skipCurrent() {
    if (!currentTicket) return;

    await supabase
      .from("painel_tickets")
      .update({ status: "skipped" })
      .eq("id", currentTicket.id);

    toast.warning(`Senha ${currentTicket.ticket_code} marcada como ausente.`);
    setCurrentTicket(null);
  }

  return (
    <div className="animate-fade-in">
      <PageHero>
        <>
          <PageHeroEyebrow />
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-primary/5 dark:border-transparent dark:bg-white/10 dark:ring-1 dark:ring-white/15">
              <MonitorSpeaker
                className="h-5 w-5 text-amber-600 dark:text-amber-300"
                strokeWidth={1.75}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-hero-foreground md:text-3xl lg:text-4xl">
                Painel do Atendente
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-hero-muted md:text-lg">
                Chame senhas e gerencie o atendimento no seu guichê.
              </p>
            </div>
          </div>
        </>
      </PageHero>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Window selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <MonitorSpeaker className="w-4 h-4" />
                Meu Guichê
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedWindowId} onValueChange={(v) => setSelectedWindowId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um guichê">
                    {selectedWindow
                      ? labelGuiche(selectedWindow)
                      : serviceWindows.length === 0
                        ? "Nenhum guichê cadastrado"
                        : "Selecione um guichê"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {serviceWindows.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {labelGuiche(w)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Current ticket */}
          <Card className={currentTicket ? "border-blue-200 bg-blue-50" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Atendimento Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentTicket ? (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-blue-600 rounded-2xl px-6 py-4 text-center">
                      <p className="text-4xl font-black text-white">{currentTicket.ticket_code}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={TYPE_BADGE[currentTicket.type]}>
                          {TYPE_ICON[currentTicket.type]}
                          <span className="ml-1">{TYPE_LABEL[currentTicket.type]}</span>
                        </Badge>
                      </div>
                      <p className="text-slate-700 font-medium">{currentTicket.queue.name}</p>
                      <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        Aguardando há {formatDistanceToNow(new Date(currentTicket.created_at), { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={recallCurrent}
                      className="flex items-center gap-1"
                    >
                      <Bell className="w-3 h-3" />
                      Rechamar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={skipCurrent}
                      className="flex items-center gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                      <SkipForward className="w-3 h-3" />
                      Ausente
                    </Button>
                    <Button
                      size="sm"
                      onClick={finishCurrent}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Finalizar Atendimento
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Nenhuma senha em atendimento.</p>
              )}
            </CardContent>
          </Card>

          {/* Call next button + indicator */}
          <div className="space-y-2">
            {nextPick && waiting.length > 0 && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <span>Próxima:</span>
                <Badge variant={TYPE_BADGE[nextPick.ticket.type]} className="text-xs gap-1">
                  {TYPE_ICON[nextPick.ticket.type]}
                  {TYPE_LABEL[nextPick.ticket.type]}
                </Badge>
                <span className="font-bold text-slate-700">{nextPick.ticket.ticket_code}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-400">{nextPick.ticket.queue.name}</span>
              </div>
            )}
            <Button
              onClick={callNext}
              disabled={calling || !nextPick || !selectedWindowId}
              className="w-full h-16 text-lg font-bold bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg"
            >
              {calling ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Chamando...</>
              ) : (
                <><ChevronRight className="w-5 h-5 mr-2" /> Chamar Próxima Senha</>
              )}
            </Button>
          </div>
        </div>

        {/* Right column: Queue */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Fila de Espera
                </span>
                <Badge variant="secondary">{waiting.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {waiting.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">
                  Fila vazia
                </p>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {waiting.slice(0, 5).map((ticket, i) => (
                      <div key={ticket.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                          <span className="font-bold text-slate-900">{ticket.ticket_code}</span>
                          <Badge variant={TYPE_BADGE[ticket.type]} className="text-xs">
                            {TYPE_ICON[ticket.type]}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-500 text-xs">{ticket.queue.name}</p>
                          <p className="text-slate-400 text-xs">
                            {formatDistanceToNow(new Date(ticket.created_at), { locale: ptBR, addSuffix: false })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {waiting.length > 5 && (
                    <div className="border-t border-slate-100 p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAllQueue(true)}
                        className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <List className="w-3.5 h-3.5 mr-2" />
                        Ver toda a fila ({waiting.length} senhas)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Modal: fila completa */}
          <Dialog open={showAllQueue} onOpenChange={setShowAllQueue}>
            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Fila de Espera
                  <Badge variant="secondary" className="ml-1">{waiting.length} senhas</Badge>
                </DialogTitle>
              </DialogHeader>

              {/* Resumo por tipo */}
              <div className="flex gap-2 flex-wrap">
                {(["priority", "normal"] as const).map((type) => {
                  const count = waiting.filter((t) => t.type === type).length;
                  if (count === 0) return null;
                  return (
                    <Badge key={type} variant={TYPE_BADGE[type]} className="text-xs gap-1">
                      {TYPE_ICON[type]}
                      {TYPE_LABEL[type]}: {count}
                    </Badge>
                  );
                })}
              </div>

              <Separator />

              {/* Lista com scroll */}
              <div className="overflow-y-auto flex-1 -mx-1 pr-1 divide-y divide-slate-100">
                {waiting.map((ticket, i) => (
                  <div key={ticket.id} className="flex items-center justify-between py-2.5 px-1">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{ticket.ticket_code}</span>
                        <span className="text-slate-400 text-xs ml-2">{ticket.queue.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={TYPE_BADGE[ticket.type]} className="text-[10px]">
                        {TYPE_LABEL[ticket.type]}
                      </Badge>
                      <span className="text-slate-400 text-[10px] whitespace-nowrap">
                        {formatDistanceToNow(new Date(ticket.created_at), { locale: ptBR, addSuffix: false })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </div>
    </div>
  );
}

