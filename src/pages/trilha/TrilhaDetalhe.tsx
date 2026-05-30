import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Clock, CheckCircle2, BookOpen } from "lucide-react";
import { TRILHAS_MOCK, USER_PROGRESS_MOCK, type UserProgress } from "@/data/trilhasMock";
import { MissaoCard } from "@/components/trilha/MissaoCard";
import { XPBar } from "@/components/trilha/XPBar";

export default function TrilhaDetalhe() {
  const { trilhaId } = useParams<{ trilhaId: string }>();
  const navigate = useNavigate();

  const trilha = TRILHAS_MOCK.find((t) => t.id === trilhaId);
  const [progress] = useState<UserProgress>(USER_PROGRESS_MOCK);

  if (!trilha) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <span className="text-5xl">🗺️</span>
        <h2 className="text-xl font-bold text-foreground">Trilha não encontrada</h2>
        <button
          onClick={() => navigate("/trilha-conhecimento")}
          className="text-sm text-amber-400 hover:underline"
        >
          ← Voltar às trilhas
        </button>
      </div>
    );
  }

  const missoesCompletas = progress.progressoPorTrilha[trilha.id] ?? [];
  const totalCompletas = missoesCompletas.length;
  const total = trilha.missoes.length;
  const pct = Math.round((totalCompletas / total) * 100);
  const xpGanho = trilha.missoes
    .filter((m) => missoesCompletas.includes(m.id))
    .reduce((acc, m) => acc + m.xpRecompensa, 0);

  function getMissaoStatus(missaoId: string, ordem: number) {
    if (missoesCompletas.includes(missaoId)) return "completed";
    // Unlock first, or if previous is completed
    if (ordem === 1) return "available";
    const anterior = trilha!.missoes.find((m) => m.ordem === ordem - 1);
    if (anterior && missoesCompletas.includes(anterior.id)) return "available";
    return "locked";
  }

  return (
    <div className="animate-in fade-in duration-300">
      {/* Back button */}
      <div className="border-b border-white/8 bg-[var(--background)]">
        <div className="mx-auto max-w-4xl px-4 py-4 md:px-8">
          <button
            onClick={() => navigate("/trilha-conhecimento")}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar às trilhas
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: Mission list */}
          <div className="lg:col-span-2">
            {/* Trail header */}
            <div className={`mb-8 overflow-hidden rounded-2xl bg-gradient-to-br ${trilha.cor} p-6 shadow-xl`}>
              <div className="relative z-10">
                <span className="text-5xl drop-shadow-lg">{trilha.icone}</span>
                <p className="mt-3 text-xs font-mono font-semibold uppercase tracking-widest text-white/70">
                  {trilha.categoria}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-white">{trilha.titulo}</h1>
                <p className="mt-2 text-sm text-white/80 leading-relaxed">{trilha.descricao}</p>

                <div className="mt-5 flex items-center gap-4 text-sm text-white/80">
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-white" />
                    <span className="font-bold text-white">{trilha.xpTotal} XP</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    {total} missões
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    ~{trilha.missoes.reduce((a, m) => a + m.tempoEstimadoMin, 0)} min
                  </span>
                </div>

                {/* Progress */}
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-xs text-white/70">
                    <span>Progresso</span>
                    <span className="font-bold text-white">{totalCompletas}/{total} missões</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
                    <div
                      className="h-full rounded-full bg-white/80 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Missions */}
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-muted-foreground font-mono">
              Missões
            </h2>
            <div>
              {trilha.missoes.map((missao, idx) => {
                const status = getMissaoStatus(missao.id, missao.ordem);
                return (
                  <MissaoCard
                    key={missao.id}
                    missao={missao}
                    status={status}
                    isFirst={idx === 0}
                    isLast={idx === trilha.missoes.length - 1}
                    onClick={() =>
                      navigate(`/trilha-conhecimento/${trilha.id}/missao/${missao.id}`)
                    }
                  />
                );
              })}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            {/* Your progress */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <h3 className="mb-4 text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                Seu Progresso
              </h3>
              <XPBar xpTotal={progress.xpTotal} />

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/5 p-3 text-center">
                  <p className="text-xl font-bold tabular-nums text-emerald-400">{totalCompletas}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Concluídas</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-center">
                  <p className="text-xl font-bold tabular-nums text-amber-400">{xpGanho}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">XP desta trilha</p>
                </div>
              </div>
            </div>

            {/* Completed missions list */}
            {totalCompletas > 0 && (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <h3 className="mb-3 text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                  Concluídas
                </h3>
                <div className="space-y-2">
                  {trilha.missoes
                    .filter((m) => missoesCompletas.includes(m.id))
                    .map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span className="truncate text-foreground">{m.titulo}</span>
                        <span className="ml-auto shrink-0 font-semibold text-amber-400">
                          +{m.xpRecompensa}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Completion badge */}
            {totalCompletas === total && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-center">
                <div className="text-4xl mb-2">🏆</div>
                <h3 className="font-bold text-amber-400">Trilha Concluída!</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Você completou todos os {total} missões e ganhou {trilha.xpTotal} XP!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
