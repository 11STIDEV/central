import type { Badge } from "@/data/trilhasMock";

interface BadgeShowcaseProps {
  badges: Badge[];
  maxVisible?: number;
}

export function BadgeShowcase({ badges, maxVisible = 8 }: BadgeShowcaseProps) {
  const conquistados = badges.filter((b) => b.desbloqueadoEm);
  const bloqueados = badges.filter((b) => !b.desbloqueadoEm);

  const visiveis = [...conquistados, ...bloqueados].slice(0, maxVisible);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          Conquistas
        </h3>
        <span className="text-xs text-muted-foreground">
          <span className="font-bold text-amber-400">{conquistados.length}</span>/{badges.length}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {visiveis.map((badge) => {
          const desbloqueado = !!badge.desbloqueadoEm;
          return (
            <div
              key={badge.id}
              title={desbloqueado ? `${badge.nome}: ${badge.descricao}` : `🔒 ${badge.nome} (ainda não conquistado)`}
              className={`group relative flex flex-col items-center gap-1.5 rounded-xl p-2.5 transition-all duration-200 ${
                desbloqueado
                  ? "bg-white/[0.05] hover:bg-white/[0.08]"
                  : "bg-white/[0.02] opacity-40 grayscale"
              }`}
            >
              {/* Badge icon */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition-transform duration-200 ${
                  desbloqueado
                    ? `bg-gradient-to-br ${badge.cor} shadow-sm group-hover:scale-110`
                    : "bg-white/8"
                }`}
              >
                {desbloqueado ? badge.icone : "?"}
              </div>

              {/* Name */}
              <p className={`text-center text-[9px] font-medium leading-tight ${
                desbloqueado ? "text-foreground" : "text-muted-foreground"
              }`}>
                {badge.nome}
              </p>

              {/* Glow effect on hover for unlocked */}
              {desbloqueado && (
                <div className={`absolute inset-0 rounded-xl opacity-0 ring-1 ring-inset ring-amber-400/30 transition-opacity group-hover:opacity-100`} />
              )}
            </div>
          );
        })}
      </div>

      {conquistados.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-2">
          Complete missões para desbloquear conquistas! 🎯
        </p>
      )}
    </div>
  );
}
