import { Lock, CheckCircle2, ChevronRight, Zap, Clock } from "lucide-react";
import type { Trilha, UserProgress } from "@/data/trilhasMock";

interface TrilhaCardProps {
  trilha: Trilha;
  progress: UserProgress;
  onClick: () => void;
}

export function TrilhaCard({ trilha, progress, onClick }: TrilhaCardProps) {
  const concluidas = progress.progressoPorTrilha[trilha.id]?.length ?? 0;
  const total = trilha.missoes.length;
  const pct = Math.round((concluidas / total) * 100);
  const completa = concluidas === total;
  const iniciada = concluidas > 0;

  const dificuldadeLabel: Record<string, string> = {
    iniciante: "Iniciante",
    intermediario: "Intermediário",
    avancado: "Avançado",
  };
  const dificuldadeCor: Record<string, string> = {
    iniciante: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
    intermediario: "text-blue-600 bg-blue-500/10 dark:text-amber-400 dark:bg-amber-400/10",
    avancado: "text-rose-600 bg-rose-500/10 dark:text-red-400",
  };

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card dark:border-white/8 dark:bg-white/[0.03] text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 dark:hover:border-white/16 hover:shadow-lg dark:hover:shadow-black/30 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {/* Gradient header */}
      <div className={`relative flex items-center gap-3 bg-gradient-to-br ${trilha.cor} p-5`}>
        {/* Glow overlay */}
        <div className="absolute inset-0 bg-black/20" />

        <span className="relative z-10 text-4xl drop-shadow-lg">{trilha.icone}</span>
        <div className="relative z-10 flex-1 min-w-0">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/70">
            {trilha.categoria}
          </p>
          <h3 className="mt-0.5 truncate text-base font-bold text-white">{trilha.titulo}</h3>
        </div>

        {/* Status badge */}
        <div className="relative z-10 shrink-0">
          {completa ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
              <CheckCircle2 className="h-3 w-3" />
              Concluída
            </span>
          ) : iniciada ? (
            <span className="rounded-full bg-blue-500/20 text-white dark:bg-amber-400/20 dark:text-amber-300 px-2.5 py-1 text-xs font-bold ring-1 ring-white/30 dark:ring-amber-400/30">
              Em andamento
            </span>
          ) : (
            <span className="rounded-full bg-black/20 px-2.5 py-1 text-xs font-bold text-white/90 ring-1 ring-white/30">
              Iniciar
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {trilha.descricao}
        </p>

        {/* Meta info */}
        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-primary dark:text-amber-400" />
            <span className="font-semibold text-primary dark:text-amber-400">{trilha.xpTotal} XP</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {total} missões
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${dificuldadeCor[trilha.dificuldade]}`}>
            {dificuldadeLabel[trilha.dificuldade]}
          </span>
          {trilha.setorRestrito && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 dark:text-blue-300">
              🔒 {trilha.setorRestrito}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className={`font-semibold tabular-nums ${completa ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
              {concluidas}/{total}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-white/8">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completa
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-amber-400 dark:to-orange-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {completa
              ? "✅ Trilha completa!"
              : iniciada
              ? `Continue de onde parou`
              : "Clique para começar"}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
        </div>
      </div>
    </button>
  );
}
