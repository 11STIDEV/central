import { useCallback, useEffect, useRef, useState } from "react";
import { getPainelSupabase } from "@/painel/supabaseClient";
import { getOverlayDurationMs, getYoutubePlaylistId } from "@/painel/painelEnv";
import { CciLogoBranca } from "@/painel/components/CciLogoBranca";
import type { CallWithDetails, School } from "@/painel/types/database";
import { Volume2, VolumeX } from "lucide-react";
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
      <p className="text-white/40 text-lg font-medium uppercase tracking-widest mb-4">
        Senha chamada
      </p>

      <div className="animate-pulse-glow rounded-3xl bg-blue-900/30 border border-blue-500/30 px-8 sm:px-16 py-8 sm:py-10 mb-6">
        <p className="text-4xl sm:text-7xl md:text-[8rem] lg:text-[10rem] leading-none font-black text-white tracking-wider tabular-nums">
          {call.ticket.ticket_code}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${TYPE_BADGE[call.ticket.type]}`}>
          {TYPE_LABEL[call.ticket.type]}
        </span>
        <span className="text-white/40 text-sm">·</span>
        <span className="text-white/60 text-sm">{call.ticket.queue.name}</span>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-4 inline-block">
        <p className="text-white/50 text-sm uppercase tracking-widest mb-1">Guichê</p>
        <p className="text-white text-4xl sm:text-5xl font-black">{call.service_window.number}</p>
        <p className="text-white/50 text-sm mt-1">{call.service_window.name}</p>
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
    <main className="min-h-screen w-full bg-slate-950 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-8 py-4 bg-slate-900/80 border-b border-white/5 shrink-0">
        <div className="flex items-center min-w-0">
          <CciLogoBranca height={40} className="shrink-0" />
        </div>

        <div className="flex items-center gap-6">
          <p className="text-white/40 text-sm hidden md:block max-w-xl truncate">
            {school?.panel_message}
          </p>
          <div className="text-right">
            <p className="text-white text-2xl font-mono font-bold">
              {format(currentTime, "HH:mm:ss")}
            </p>
            <p className="text-white/40 text-xs capitalize">
              {format(currentTime, "EEEE, dd/MM", { locale: ptBR })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="text-white/40 hover:text-white/80 transition-colors"
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
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 sm:p-6 bg-slate-950/95 border border-white/5">
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
                <GraduationCap className="w-16 h-16 text-white/20" />
              </div>
              <p className="text-white/30 text-2xl font-medium">Aguardando chamadas...</p>
              <p className="text-white/20 text-sm mt-2">{school?.panel_message}</p>
            </div>
          )}
        </div>

        {historyItems.length > 0 && (
          <div className="lg:w-80 shrink-0 bg-slate-900/50 border-t lg:border-t-0 lg:border-l border-white/5 p-6 overflow-y-auto">
            <h2 className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4">
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
                    <span className="text-2xl font-black text-white/70 tabular-nums shrink-0 w-16">
                      {call.ticket.ticket_code}
                    </span>
                    <div className="min-w-0">
                      <p className="text-white/50 text-xs truncate">{call.ticket.queue.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[call.ticket.type]}`}>
                        {TYPE_LABEL[call.ticket.type]}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white/30 text-xs">Guichê</p>
                    <p className="text-white/60 font-bold">{call.service_window.number}</p>
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
