import { useState, useEffect, useRef } from "react";
import { getPainelSupabase } from "@/painel/supabaseClient";
import { CciLogoBranca } from "@/painel/components/CciLogoBranca";
import type { Queue, School, Ticket } from "@/painel/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  FileText,
  Info,
  Star,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Users,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getPainelBusinessDateIso } from "@/painel/painelBusinessDate";

const QUEUE_ICONS: Record<string, React.ReactNode> = {
  Matrícula: <GraduationCap className="w-10 h-10" />,
  Documentos: <FileText className="w-10 h-10" />,
  Informações: <Info className="w-10 h-10" />,
};

const QUEUE_COLORS: string[] = [
  "from-blue-600 to-blue-700",
  "from-emerald-600 to-emerald-700",
  "from-violet-600 to-violet-700",
  "from-amber-600 to-amber-700",
  "from-rose-600 to-rose-700",
];

interface TotemClientProps {
  school: School | null;
  queues: Queue[];
}

type Step = "select-queue" | "select-type" | "ticket-issued";

export default function SenhasTotemClient({ school, queues }: TotemClientProps) {
  const [step, setStep] = useState<Step>("select-queue");
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [issuedTicket, setIssuedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = getPainelSupabase();

  async function issueTicket(type: "normal" | "priority") {
    if (!selectedQueue || !school) return;
    setLoading(true);

    try {
      const { data: nextNumber, error: fnError } = await supabase
        .rpc("get_next_ticket_number", { p_queue_id: selectedQueue.id });

      if (fnError) throw fnError;

      const ticketCode = `${selectedQueue.prefix}${String(nextNumber).padStart(3, "0")}`;

      const { data, error } = await supabase
        .from("painel_tickets")
        .insert({
          school_id: school.id,
          queue_id: selectedQueue.id,
          number: nextNumber,
          ticket_code: ticketCode,
          ticket_date: getPainelBusinessDateIso(),
          type,
          status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;

      setIssuedTicket(data);
      setStep("ticket-issued");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[totem] issueTicket", e);
      const msg =
        e && typeof e === "object" && "message" in e && String((e as { message: string }).message).trim() !== ""
          ? String((e as { message: string }).message)
          : "Erro ao gerar senha. Tente novamente.";
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code?: string }).code ?? "")
          : "";
      const hint = import.meta.env.DEV && code ? ` [${code}]` : "";
      const display = msg.length > 220 ? `${msg.slice(0, 220)}…` : msg;
      toast.error(`${display}${hint}`);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("select-queue");
    setSelectedQueue(null);
    setIssuedTicket(null);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-6 select-none">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8 text-center">
        <div className="mb-2 flex justify-center">
          <CciLogoBranca height={44} className="shrink-0 object-center" />
        </div>
        {school?.panel_message ? (
          <p className="text-blue-300 text-sm">{school.panel_message}</p>
        ) : null}
      </div>

      {/* Step: Select Queue */}
      {step === "select-queue" && (
        <div className="w-full max-w-2xl">
          <h2 className="text-white/70 text-center text-lg mb-6 font-medium">
            Toque no tipo de atendimento desejado
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {queues.map((queue, i) => (
              <button
                key={queue.id}
                onClick={() => { setSelectedQueue(queue); setStep("select-type"); }}
                className={`bg-gradient-to-br ${QUEUE_COLORS[i % QUEUE_COLORS.length]} rounded-3xl p-8 text-white text-center shadow-2xl hover:scale-105 active:scale-95 transition-transform duration-150 cursor-pointer`}
              >
                <div className="flex justify-center mb-4">
                  {QUEUE_ICONS[queue.name] ?? <Star className="w-10 h-10" />}
                </div>
                <h3 className="text-2xl font-bold mb-1">{queue.name}</h3>
                {queue.description && (
                  <p className="text-white/70 text-sm">{queue.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Select Priority Type */}
      {step === "select-type" && selectedQueue && (
        <div className="w-full max-w-lg">
          <button
            onClick={() => setStep("select-queue")}
            className="flex items-center gap-2 text-blue-300 hover:text-blue-200 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <h2 className="text-white text-2xl font-bold text-center mb-2">
            {selectedQueue.name}
          </h2>
          <p className="text-blue-300 text-center mb-8">Selecione o tipo de atendimento</p>

          <div className="space-y-4">
            <button
              onClick={() => issueTicket("normal")}
              disabled={loading}
              className="w-full bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-blue-400 rounded-2xl p-6 text-left transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">Atendimento Normal</h3>
                  <p className="text-white/50 text-sm">Fila padrão</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => issueTicket("priority")}
              disabled={loading}
              className="w-full bg-white/10 hover:bg-white/20 border-2 border-amber-400/40 hover:border-amber-400 rounded-2xl p-6 text-left transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-600 rounded-xl flex items-center justify-center">
                  <Star className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">Atendimento Prioritário</h3>
                  <p className="text-white/50 text-sm">Idosos 60+, gestantes, PCD, lactantes e pessoas com criança de colo</p>
                </div>
              </div>
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center mt-6 gap-2 text-blue-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              Gerando sua senha...
            </div>
          )}
        </div>
      )}

      {/* Step: Ticket Issued — auto-volta em 5s */}
      {step === "ticket-issued" && issuedTicket && selectedQueue && (
        <TicketIssuedScreen
          ticket={issuedTicket}
          queue={selectedQueue}
          onReset={reset}
        />
      )}

      <p className="text-white/20 text-xs mt-8 absolute bottom-4">
        {format(new Date(), "HH:mm · EEEE, dd 'de' MMMM", { locale: ptBR })}
      </p>
    </main>
  );
}

function TicketIssuedScreen({
  ticket,
  queue,
  onReset,
}: {
  ticket: Ticket;
  queue: Queue;
  onReset: () => void;
}) {
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onReset]);

  return (
        <div className="w-full max-w-md text-center animate-ticket-pop">
          <div className="bg-white rounded-3xl p-8 shadow-2xl mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <span className="text-emerald-600 font-semibold text-lg">Senha gerada!</span>
            </div>

            <div className="border-4 border-dashed border-slate-200 rounded-2xl p-6 mb-4">
              <p className="text-slate-500 text-sm mb-1">Sua senha</p>
              <p className="text-7xl font-black text-slate-900 tracking-wider">
                {ticket.ticket_code}
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge variant={ticket.type === "priority" ? "destructive" : "default"}>
                  {ticket.type === "priority" ? "Prioritário" : "Normal"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-center gap-2">
                <GraduationCap className="w-4 h-4" />
                <span>{queue.name}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{format(new Date(ticket.created_at), "HH:mm 'de' dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            </div>

            <p className="text-slate-400 text-xs mt-4">
              Aguarde ser chamado. Fique atento ao painel.
            </p>
          </div>

          <Button
            onClick={onReset}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-4 text-lg font-semibold"
          >
            Nova Senha ({countdown}s)
          </Button>
        </div>
  );
}

