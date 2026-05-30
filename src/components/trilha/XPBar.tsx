import { getNivelInfo, NIVEIS } from "@/data/trilhasMock";

interface XPBarProps {
  xpTotal: number;
  className?: string;
}

export function XPBar({ xpTotal, className = "" }: XPBarProps) {
  const { atual, proximo } = getNivelInfo(xpTotal);
  const xpNoNivel = xpTotal - atual.xpMin;
  const xpNecessario = proximo ? proximo.xpMin - atual.xpMin : 1;
  const pct = proximo ? Math.min(100, Math.round((xpNoNivel / xpNecessario) * 100)) : 100;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-amber-400">
          <span className="text-base leading-none">{atual.icone}</span>
          <span>Nível {atual.nivel} — {atual.nome}</span>
        </span>
        <span className="text-muted-foreground tabular-nums">
          {xpTotal.toLocaleString("pt-BR")} XP
          {proximo && (
            <span className="opacity-60"> / {proximo.xpMin.toLocaleString("pt-BR")}</span>
          )}
        </span>
      </div>

      {/* Track */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
        {/* Shine */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-white/30 to-transparent transition-all duration-700 ease-out"
          style={{ width: `${pct * 0.6}%` }}
        />
      </div>

      {/* Next level hint */}
      {proximo && (
        <p className="text-[10px] text-muted-foreground">
          Faltam{" "}
          <span className="font-semibold text-amber-400/80">
            {(proximo.xpMin - xpTotal).toLocaleString("pt-BR")} XP
          </span>{" "}
          para {proximo.icone} {proximo.nome}
        </p>
      )}
      {!proximo && (
        <p className="text-[10px] font-semibold text-amber-400">
          🏆 Nível máximo atingido!
        </p>
      )}

      {/* Milestone pips */}
      <div className="flex gap-1 pt-0.5">
        {NIVEIS.map((n) => (
          <div
            key={n.nivel}
            title={`${n.icone} ${n.nome} (${n.xpMin} XP)`}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              xpTotal >= n.xpMin
                ? "bg-amber-400/80"
                : "bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
