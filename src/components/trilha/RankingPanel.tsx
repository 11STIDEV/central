import { Crown, Medal, Award } from "lucide-react";
import type { RankingEntry } from "@/data/trilhasMock";
import { getNivelInfo } from "@/data/trilhasMock";

interface RankingPanelProps {
  entries: RankingEntry[];
  meuNome?: string;
}

const podiumIcon = [
  <Crown className="h-3.5 w-3.5 text-amber-400" />,
  <Medal className="h-3.5 w-3.5 text-slate-300" />,
  <Award className="h-3.5 w-3.5 text-orange-400" />,
];

export function RankingPanel({ entries, meuNome }: RankingPanelProps) {
  const maxXP = Math.max(...entries.map((e) => e.xpSemana), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          Ranking Semanal
        </h3>
        <span className="text-[10px] text-muted-foreground">Esta semana</span>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => {
          const { atual } = getNivelInfo(entry.xpSemana * 3); // rough estimate for display
          const isMe = meuNome && entry.nome === meuNome;
          const barPct = Math.round((entry.xpSemana / maxXP) * 100);

          return (
            <div
              key={entry.posicao}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                isMe
                  ? "bg-amber-400/8 ring-1 ring-amber-400/20"
                  : "bg-white/[0.03] hover:bg-white/[0.05]"
              }`}
            >
              {/* Position */}
              <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                {entry.posicao <= 3 ? (
                  podiumIcon[entry.posicao - 1]
                ) : (
                  <span className="text-xs font-bold text-muted-foreground tabular-nums">
                    {entry.posicao}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${entry.cor}`}
              >
                {entry.iniciais}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-xs font-semibold ${isMe ? "text-amber-400" : "text-foreground"}`}>
                    {entry.nome} {isMe && "(você)"}
                  </p>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-amber-400">
                    {entry.xpSemana} XP
                  </span>
                </div>
                {/* Mini progress bar */}
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      entry.posicao === 1
                        ? "bg-gradient-to-r from-amber-400 to-orange-500"
                        : "bg-gradient-to-r from-slate-400 to-slate-500"
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-muted-foreground pt-1">
        🔄 Atualizado semanalmente
      </p>
    </div>
  );
}
