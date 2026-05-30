import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Zap, Trophy, Star, Target, BookOpen, ChevronRight } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import {
  TRILHAS_MOCK,
  BADGES_MOCK,
  RANKING_MOCK,
  USER_PROGRESS_MOCK,
  getNivelInfo,
  type UserProgress,
} from "@/data/trilhasMock";
import { TrilhaCard } from "@/components/trilha/TrilhaCard";
import { XPBar } from "@/components/trilha/XPBar";
import { BadgeShowcase } from "@/components/trilha/BadgeShowcase";
import { RankingPanel } from "@/components/trilha/RankingPanel";

export default function TrilhaConhecimento() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [progress] = useState<UserProgress>(USER_PROGRESS_MOCK);

  const { atual } = getNivelInfo(progress.xpTotal);

  // Find next recommended mission
  const proximaMissao = (() => {
    for (const trilha of TRILHAS_MOCK) {
      const concluidas = progress.progressoPorTrilha[trilha.id] ?? [];
      const proxima = trilha.missoes.find((m) => !concluidas.includes(m.id));
      if (proxima) return { trilha, missao: proxima };
    }
    return null;
  })();

  const totalMissoesDisponiveis = TRILHAS_MOCK.reduce(
    (acc, t) => acc + t.missoes.length,
    0
  );
  const totalXPDisponivel = TRILHAS_MOCK.reduce((acc, t) => acc + t.xpTotal, 0);

  const primeiroNome = usuario?.nome.split(" ")[0] ?? "Colaborador";

  return (
    <div className="min-h-screen">
      {/* ── Hero Header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/8">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/40 via-transparent to-indigo-950/30 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.08),transparent_60%)] pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-4 py-10 md:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            {/* Left: greeting + XP */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                {/* Avatar */}
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl font-bold text-white shadow-lg shadow-amber-900/30">
                  {primeiroNome[0]?.toUpperCase() ?? "U"}
                  {/* Level badge */}
                  <div className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-[10px] font-black text-white ring-2 ring-[var(--background)]">
                    {atual.nivel}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bem-vindo de volta,</p>
                  <h1 className="text-xl font-bold text-foreground">{primeiroNome}! {atual.icone}</h1>
                </div>
              </div>

              <div className="max-w-xs">
                <XPBar xpTotal={progress.xpTotal} />
              </div>
            </div>

            {/* Right: Stats bar */}
            <div className="flex flex-wrap gap-3 md:gap-4">
              <StatChip
                icon={<Flame className="h-4 w-4 text-orange-400" />}
                label="Streak"
                value={`${progress.streakDias}d`}
                glow="orange"
              />
              <StatChip
                icon={<Zap className="h-4 w-4 text-amber-400" />}
                label="XP Total"
                value={progress.xpTotal.toLocaleString("pt-BR")}
                glow="amber"
              />
              <StatChip
                icon={<Star className="h-4 w-4 text-violet-400" />}
                label="Missões"
                value={String(progress.missoesCompletas)}
                glow="violet"
              />
              <StatChip
                icon={<Trophy className="h-4 w-4 text-emerald-400" />}
                label="Trilhas"
                value={String(progress.trilhasCompletas)}
                glow="emerald"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left + Center (2 cols) */}
          <div className="lg:col-span-2 space-y-8">

            {/* Next mission CTA */}
            {proximaMissao && (
              <div
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-950/40 to-orange-950/20 p-6 transition-all duration-200 hover:border-amber-400/40 hover:shadow-xl hover:shadow-amber-900/20"
                onClick={() =>
                  navigate(
                    `/trilha-conhecimento/${proximaMissao.trilha.id}/missao/${proximaMissao.missao.id}`
                  )
                }
              >
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-amber-400/5 blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-mono font-semibold uppercase tracking-widest text-amber-400">
                      Próxima Missão Recomendada
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {proximaMissao.trilha.icone} {proximaMissao.trilha.titulo}
                      </p>
                      <h2 className="text-xl font-bold text-foreground group-hover:text-amber-400 transition-colors">
                        {proximaMissao.missao.titulo}
                      </h2>
                      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                        {proximaMissao.missao.descricao}
                      </p>
                      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-bold text-amber-400">
                          <Zap className="h-3 w-3" />
                          {proximaMissao.missao.xpRecompensa} XP
                        </span>
                        <span>~{proximaMissao.missao.tempoEstimadoMin} min</span>
                        <span>{proximaMissao.missao.quiz.length} perguntas</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 ring-1 ring-amber-400/20 transition-all group-hover:bg-amber-400/20">
                      <ChevronRight className="h-5 w-5 text-amber-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overview stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <OverviewStat label="Trilhas" value={TRILHAS_MOCK.length} icon="🗺️" />
              <OverviewStat label="Missões" value={totalMissoesDisponiveis} icon="🎯" />
              <OverviewStat label="XP disponível" value={totalXPDisponivel} icon="⚡" />
              <OverviewStat
                label="Concluídas"
                value={progress.missoesCompletas}
                icon="✅"
                highlight
              />
            </div>

            {/* Trails grid */}
            <div>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                  Trilhas de Conhecimento
                </h2>
                <span className="text-xs text-muted-foreground">
                  {TRILHAS_MOCK.filter(
                    (t) =>
                      (progress.progressoPorTrilha[t.id]?.length ?? 0) === t.missoes.length
                  ).length}{" "}
                  de {TRILHAS_MOCK.length} concluídas
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {TRILHAS_MOCK.map((trilha) => (
                  <TrilhaCard
                    key={trilha.id}
                    trilha={trilha}
                    progress={progress}
                    onClick={() => navigate(`/trilha-conhecimento/${trilha.id}`)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Badges */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <BadgeShowcase badges={BADGES_MOCK} maxVisible={8} />
            </div>

            {/* Ranking */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <RankingPanel entries={RANKING_MOCK} meuNome={usuario?.nome} />
            </div>

            {/* Tip of the day */}
            <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/5 p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">💡</span>
                <div>
                  <p className="text-xs font-semibold text-indigo-400 mb-1">Dica do dia</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Faça pelo menos <strong className="text-foreground">uma missão por dia</strong> para
                    manter seu streak ativo e multiplicar seu XP semanal!
                  </p>
                </div>
              </div>
            </div>

            {/* Progress to next level */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 space-y-3">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                Seu Progresso Global
              </h3>
              <XPBar xpTotal={progress.xpTotal} />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <MiniStat label="Streak" value={`🔥 ${progress.streakDias} dias`} />
                <MiniStat label="Missões" value={`✅ ${progress.missoesCompletas}`} />
                <MiniStat
                  label="Badges"
                  value={`🏅 ${BADGES_MOCK.filter((b) => b.desbloqueadoEm).length}`}
                />
                <MiniStat label="Nível" value={`${atual.icone} ${atual.nivel}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function StatChip({
  icon,
  label,
  value,
  glow,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  glow: "amber" | "orange" | "violet" | "emerald";
}) {
  const glowMap = {
    amber: "bg-amber-400/8 border-amber-400/15",
    orange: "bg-orange-400/8 border-orange-400/15",
    violet: "bg-violet-400/8 border-violet-400/15",
    emerald: "bg-emerald-400/8 border-emerald-400/15",
  };
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 ${glowMap[glow]}`}>
      {icon}
      <div>
        <p className="text-xs text-muted-foreground leading-none">{label}</p>
        <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function OverviewStat({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-center ${
        highlight
          ? "border-emerald-400/20 bg-emerald-400/5"
          : "border-white/8 bg-white/[0.03]"
      }`}
    >
      <p className="text-2xl mb-1">{icon}</p>
      <p
        className={`text-xl font-bold tabular-nums ${
          highlight ? "text-emerald-400" : "text-foreground"
        }`}
      >
        {value.toLocaleString("pt-BR")}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <p className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}
