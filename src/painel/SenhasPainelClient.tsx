import { useCallback, useEffect, useRef, useState } from "react";
import { getPainelSupabase } from "@/painel/supabaseClient";
import { getOverlayDurationMs, getYoutubePlaylistId } from "@/painel/painelEnv";
import { CciLogoBranca } from "@/painel/components/CciLogoBranca";
import type { CallWithDetails, School } from "@/painel/types/database";
import { GraduationCap, Volume2, VolumeX } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useYoutubePainelPlayer } from "@/painel/hooks/useYoutubePainelPlayer";

interface PainelClientProps {
  school: School | null;
  initialCalls: CallWithDetails[];
}

const TYPE_BADGE: Record<string, string> = {
  normal: "bg-blue-600/20 text-blue-300 border border-blue-500/30",
  priority: "bg-amber-600/20 text-amber-300 border border-amber-500/30",
};

const TYPE_LABEL: Record<string, string> = {
  normal: "Normal",
  priority: "Prioritário",
};

const YOUTUBE_EMBED_ID = "painel-youtube-embed";

function CallHighlight({
  call,
  isAnimating,
}: {
  call: CallWithDetails;
  isAnimating: boolean;
}) {
  return (
    <div className={`text-center ${isAnimating ? "animate-number-call" : ""}`}>
      <p className="mb-4 text-lg font-medium uppercase tracking-widest text-muted-foreground">
        Senha chamada
      </p>

      <div className="animate-pulse-glow rounded-3xl bg-blue-900/30 border border-blue-500/30 px-8 sm:px-16 py-8 sm:py-10 mb-6">
        <p className="text-4xl font-black tabular-nums tracking-wider text-foreground sm:text-7xl md:text-[8rem] lg:text-[10rem] leading-none">
          {call.ticket.ticket_code}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${TYPE_BADGE[call.ticket.type]}`}>
          {TYPE_LABEL[call.ticket.type]}
        </span>
        <span className="text-sm text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground">{call.ticket.queue.name}</span>
      </div>

      <div className="inline-block rounded-2xl border border-border bg-card/50 px-8 py-4">
        <p className="mb-1 text-sm uppercase tracking-widest text-muted-foreground">Guichê</p>
        <p className="text-4xl font-black text-foreground sm:text-5xl">{call.service_window.number}</p>
        <p className="mt-1 text-sm text-muted-foreground">{call.service_window.name}</p>
      </div>
    </div>
  );
}

export default function SenhasPainelClient({ school, initialCalls }: PainelClientProps) {
  const playlistId = getYoutubePlaylistId();
  const overlayDurationMs = getOverlayDurationMs();

  const [calls, setCalls] = useState<CallWithDetails[]>(initialCalls);
  const [latestCall, setLatestCall] = useState<CallWithDetails | null>(initialCalls[0] ?? null);
  const [overlayCall, setOverlayCall] = useState<CallWithDetails | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedVideoTimeRef = useRef(0);

  const supabase = getPainelSupabase();
  const { pauseAndGetTime, resumeAt } = useYoutubePainelPlayer(playlistId, YOUTUBE_EMBED_ID);

  const scheduleOverlayEnd = useCallback(() => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => {
      setOverlayCall(null);
      if (playlistId) {
        resumeAt(savedVideoTimeRef.current);
      }
      overlayTimerRef.current = null;
    }, overlayDurationMs);
  }, [overlayDurationMs, playlistId, resumeAt]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("painel-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "painel_calls",
          filter: `school_id=eq.${school?.id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("painel_calls")
            .select(`
              *,
              ticket:painel_tickets(*, queue:painel_queues(*)),
              service_window:painel_service_windows(*)
            `)
            .eq("id", payload.new.id)
            .single();

          if (!data) return;

          const newCall = data as unknown as CallWithDetails;

          setCalls((prev) => [newCall, ...prev].slice(0, 6));
          setLatestCall(newCall);
          setIsAnimating(false);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setIsAnimating(true));
          });

          if (playlistId) {
            setOverlayCall((prev) => {
              if (prev === null) {
                savedVideoTimeRef.current = pauseAndGetTime();
              }
              return newCall;
            });
            scheduleOverlayEnd();
          }

          if (!muted) {
            playCallSound(newCall.ticket.ticket_code, newCall.service_window.number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase client is stable via useMemo
  }, [school?.id, muted, playlistId, pauseAndGetTime, scheduleOverlayEnd]);

  function playCallSound(ticketCode: string, windowNumber: number) {
    const utterance = new SpeechSynthesisUtterance(
      `Senha ${ticketCode.split("").join(" ")}, favor comparecer ao ${windowNumber === 1 ? "primeiro" : windowNumber === 2 ? "segundo" : windowNumber === 3 ? "terceiro" : `guichê ${windowNumber}`} guichê.`
    );
    utterance.lang = "pt-BR";
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  const historyItems = calls.slice(0, 5);

  const heroHasVideo = Boolean(playlistId);

  return (
    <main className="dark flex min-h-screen w-full flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card/90 px-8 py-4 backdrop-blur-sm">
        <div className="flex items-center min-w-0">
          <CciLogoBranca height={40} className="shrink-0" />
        </div>

        <div className="flex items-center gap-6">
          <p className="hidden max-w-xl truncate text-sm text-muted-foreground md:block">
            {school?.panel_message}
          </p>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-foreground">
              {format(currentTime, "HH:mm:ss")}
            </p>
            <p className="text-xs capitalize text-muted-foreground">
              {format(currentTime, "EEEE, dd/MM", { locale: ptBR })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            title={muted ? "Ativar voz" : "Silenciar"}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 min-h-0">
        <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">
          {heroHasVideo ? (
            <>
              <div
                id={YOUTUBE_EMBED_ID}
                key={playlistId}
                className="absolute inset-0 w-full h-full [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full"
              />
              {overlayCall && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center border border-border bg-background/95 p-6 sm:p-6">
                  <CallHighlight call={overlayCall} isAnimating={isAnimating} />
                </div>
              )}
            </>
          ) : latestCall ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 overflow-auto">
              <CallHighlight call={latestCall} isAnimating={isAnimating} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="h-16 w-16 text-muted-foreground/30" />
              </div>
              <p className="text-2xl font-medium text-muted-foreground">Aguardando chamadas...</p>
              <p className="mt-2 text-sm text-muted-foreground/80">{school?.panel_message}</p>
            </div>
          )}
        </div>

        {historyItems.length > 0 && (
          <div className="shrink-0 overflow-y-auto border-t border-border bg-muted/30 p-6 lg:w-80 lg:border-l lg:border-t-0">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Últimas chamadas
            </h2>
            <div className="space-y-3">
              {historyItems.map((call, i) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between bg-white/5 rounded-xl p-4"
                  style={{ opacity: 1 - i * 0.15 }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-16 shrink-0 text-2xl font-black tabular-nums text-foreground/80">
                      {call.ticket.ticket_code}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-muted-foreground">{call.ticket.queue.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[call.ticket.type]}`}>
                        {TYPE_LABEL[call.ticket.type]}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Guichê</p>
                    <p className="font-bold text-foreground/80">{call.service_window.number}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-600/20 border-t border-blue-500/20 px-8 py-3 shrink-0">
        <p className="text-blue-300 text-sm text-center">
          {school?.panel_message ?? "Bem-vindo! Retire sua senha e aguarde ser chamado."}
        </p>
      </div>
    </main>
  );
}
