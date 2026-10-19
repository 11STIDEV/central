import { CheckCircle2, Lock, Clock, ChevronRight, PlayCircle } from "lucide-react";
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
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20 text-white"
              : isAvailable
              ? "bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-amber-400 dark:to-orange-500 shadow-md shadow-blue-500/20 dark:shadow-amber-500/20 ring-2 ring-primary/30 dark:ring-amber-400/30 text-white"
              : "bg-muted ring-1 ring-border dark:bg-white/8 dark:ring-white/10 text-muted-foreground"
          }`}
        >
          {isDone ? (
            <CheckCircle2 className="h-5 w-5 text-white" />
          ) : isLocked ? (
            <Lock className="h-4 w-4 opacity-40" />
          ) : (
            <PlayCircle className="h-5 w-5 text-white" />
          )}
        </div>
        {/* Vertical line */}
        {!isLast && (
          <div
            className={`mt-1 w-0.5 flex-1 rounded-full transition-colors duration-300 ${
              isDone ? "bg-emerald-500/30" : "bg-border dark:bg-white/8"
            }`}
            style={{ minHeight: "2rem" }}
          />
        )}
      </div>

      {/* Card */}
      <button
        onClick={onClick}
        disabled={isLocked}
        className={`group mb-4 flex w-full flex-col rounded-xl border p-4 text-left transition-all duration-200 shadow-xs ${
          isLocked
            ? "cursor-not-allowed border-border/60 bg-muted/20 dark:border-white/5 dark:bg-white/[0.02] opacity-50"
            : isDone
            ? "border-emerald-500/30 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]"
            : "border-primary/30 bg-primary/[0.04] hover:border-primary/50 hover:bg-primary/[0.07] hover:shadow-md dark:border-amber-400/20 dark:bg-amber-400/[0.04] dark:hover:border-amber-400/30 dark:hover:bg-amber-400/[0.07] dark:hover:shadow-amber-900/20"
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                Missão {missao.ordem}
              </span>
              {isDone && (
                <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ Concluída
                </span>
              )}
              {isAvailable && (
                <span className="rounded-full bg-blue-500/15 text-blue-700 dark:bg-amber-400/15 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-semibold animate-pulse">
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

          <div className="flex shrink-0 items-center justify-center">
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
