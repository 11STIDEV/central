import { CheckCircle2, Lock, Zap, Clock, ChevronRight, PlayCircle } from "lucide-react";
import type { Missao } from "@/data/trilhasMock";

type MissaoStatus = "locked" | "available" | "completed";

interface MissaoCardProps {
  missao: Missao;
  status: MissaoStatus;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
}

export function MissaoCard({ missao, status, isFirst, isLast, onClick }: MissaoCardProps) {
  const isLocked = status === "locked";
  const isDone = status === "completed";
  const isAvailable = status === "available";

  return (
    <div className="relative flex gap-4">
      {/* Connector line */}
      <div className="relative flex flex-col items-center">
        {/* Node */}
        <div
          className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
            isDone
              ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/20"
              : isAvailable
              ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/30"
              : "bg-white/8 ring-1 ring-white/10"
          }`}
        >
          {isDone ? (
            <CheckCircle2 className="h-5 w-5 text-white" />
          ) : isLocked ? (
            <Lock className="h-4 w-4 text-white/40" />
          ) : (
            <PlayCircle className="h-5 w-5 text-white" />
          )}
        </div>
        {/* Vertical line */}
        {!isLast && (
          <div
            className={`mt-1 w-0.5 flex-1 rounded-full transition-colors duration-300 ${
              isDone ? "bg-emerald-400/30" : "bg-white/8"
            }`}
            style={{ minHeight: "2rem" }}
          />
        )}
      </div>

      {/* Card */}
      <button
        onClick={onClick}
        disabled={isLocked}
        className={`group mb-4 flex w-full flex-col rounded-xl border p-4 text-left transition-all duration-200 ${
          isLocked
            ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50"
            : isDone
            ? "border-emerald-400/20 bg-emerald-400/[0.04] hover:bg-emerald-400/[0.07]"
            : "border-amber-400/20 bg-amber-400/[0.04] hover:border-amber-400/30 hover:bg-amber-400/[0.07] hover:shadow-lg hover:shadow-amber-900/20"
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                Missão {missao.ordem}
              </span>
              {isDone && (
                <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  ✓ Concluída
                </span>
              )}
              {isAvailable && (
                <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 animate-pulse">
                  Disponível
                </span>
              )}
            </div>
            <h4 className={`mt-1 text-sm font-semibold leading-snug ${
              isLocked ? "text-muted-foreground" : "text-foreground"
            }`}>
              {missao.titulo}
            </h4>
            {!isLocked && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                {missao.descricao}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
              <Zap className="h-3 w-3" />
              {missao.xpRecompensa}
            </span>
            {!isLocked && (
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            )}
          </div>
        </div>

        {!isLocked && (
          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~{missao.tempoEstimadoMin} min
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              {missao.quiz.length} perguntas
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
