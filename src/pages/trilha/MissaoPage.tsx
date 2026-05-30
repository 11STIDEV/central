import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Zap,
  Clock,
  ExternalLink,
  ChevronRight,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { TRILHAS_MOCK, USER_PROGRESS_MOCK, type UserProgress } from "@/data/trilhasMock";
import { QuizModal } from "@/components/trilha/QuizModal";

export default function MissaoPage() {
  const { trilhaId, missaoId } = useParams<{ trilhaId: string; missaoId: string }>();
  const navigate = useNavigate();

  const trilha = TRILHAS_MOCK.find((t) => t.id === trilhaId);
  const missao = trilha?.missoes.find((m) => m.id === missaoId);

  const [progress, setProgress] = useState<UserProgress>(USER_PROGRESS_MOCK);
  const [quizAberto, setQuizAberto] = useState(false);
  const [missaoConcluida, setMissaoConcluida] = useState(
    () =>
      USER_PROGRESS_MOCK.progressoPorTrilha[trilhaId ?? ""]?.includes(missaoId ?? "") ?? false
  );
  const [xpGanhoAnim, setXpGanhoAnim] = useState<number | null>(null);

  if (!trilha || !missao) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <span className="text-5xl">🗺️</span>
        <h2 className="text-xl font-bold text-foreground">Missão não encontrada</h2>
        <button
          onClick={() => navigate(`/trilha-conhecimento/${trilhaId}`)}
          className="text-sm text-amber-400 hover:underline"
        >
          ← Voltar à trilha
        </button>
      </div>
    );
  }

  // Próxima missão
  const proximaMissao = trilha.missoes.find((m) => m.ordem === missao.ordem + 1);

  function handleConcluirQuiz(acertos: number, total: number) {
    const xpGanho = Math.round(
      missao!.xpRecompensa * (acertos / total) +
        (acertos === total ? missao!.xpRecompensa * 0.2 : 0)
    );

    setProgress((prev) => {
      const trilhaProgress = prev.progressoPorTrilha[trilhaId!] ?? [];
      const jaConcluida = trilhaProgress.includes(missaoId!);
      return {
        ...prev,
        xpTotal: jaConcluida ? prev.xpTotal : prev.xpTotal + xpGanho,
        missoesCompletas: jaConcluida ? prev.missoesCompletas : prev.missoesCompletas + 1,
        progressoPorTrilha: {
          ...prev.progressoPorTrilha,
          [trilhaId!]: jaConcluida
            ? trilhaProgress
            : [...trilhaProgress, missaoId!],
        },
      };
    });

    setMissaoConcluida(true);
    setXpGanhoAnim(xpGanho);
    setQuizAberto(false);

    // Clear animation after delay
    setTimeout(() => setXpGanhoAnim(null), 3000);
  }

  return (
    <div className="animate-in fade-in duration-300">
      {/* Back */}
      <div className="border-b border-white/8">
        <div className="mx-auto max-w-3xl px-4 py-4 md:px-8">
          <button
            onClick={() => navigate(`/trilha-conhecimento/${trilhaId}`)}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {trilha.titulo}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        {/* Mission header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${trilha.cor} px-3 py-1 text-xs font-bold text-white`}>
              {trilha.icone} {trilha.categoria}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Missão {missao.ordem} de {trilha.missoes.length}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
            {missao.titulo}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{missao.descricao}</p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />~{missao.tempoEstimadoMin} min
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {missao.quiz.length} perguntas
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-amber-400">
              <Zap className="h-4 w-4" />
              {missao.xpRecompensa} XP
            </span>
            {missaoConcluida && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Concluída
              </span>
            )}
          </div>
        </div>

        {/* XP gained animation */}
        {xpGanhoAnim !== null && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-500 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-5 py-4 flex items-center gap-4">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-bold text-amber-400 text-lg">+{xpGanhoAnim} XP conquistados!</p>
              <p className="text-xs text-muted-foreground">Missão "{missao.titulo}" concluída com sucesso!</p>
            </div>
          </div>
        )}

        {/* Content card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03]">
          {/* Content header */}
          <div className="flex items-center gap-2 border-b border-white/8 px-6 py-4">
            <BookOpen className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-foreground">Conteúdo da Missão</span>
          </div>

          {/* Markdown-like content */}
          <div className="prose prose-sm prose-invert max-w-none px-6 py-6">
            <div
              className="space-y-4 text-sm leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(missao.conteudo),
              }}
            />
          </div>

          {/* External link */}
          {missao.linkExterno && (
            <div className="border-t border-white/8 px-6 py-4">
              <a
                href={missao.linkExterno}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-amber-400 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Acessar material complementar
              </a>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-8 space-y-4">
          {!missaoConcluida ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Leu o conteúdo? Responda o quiz para ganhar{" "}
                <span className="font-bold text-amber-400">{missao.xpRecompensa} XP</span>!
              </p>
              <button
                onClick={() => setQuizAberto(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-amber-900/20 transition-all duration-150 hover:brightness-110 active:scale-95"
              >
                <Zap className="h-4 w-4" />
                Fazer Quiz
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-400">Missão concluída!</p>
                  <p className="text-xs text-muted-foreground">
                    Você pode refazer o quiz quando quiser
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setQuizAberto(true)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
                >
                  Refazer Quiz
                </button>
                {proximaMissao && (
                  <button
                    onClick={() =>
                      navigate(
                        `/trilha-conhecimento/${trilhaId}/missao/${proximaMissao.id}`
                      )
                    }
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110"
                  >
                    Próxima Missão
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                {!proximaMissao && (
                  <button
                    onClick={() => navigate(`/trilha-conhecimento/${trilhaId}`)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110"
                  >
                    🏆 Ver Trilha Completa
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {quizAberto && (
        <QuizModal
          missaoTitulo={missao.titulo}
          perguntas={missao.quiz}
          xpRecompensa={missao.xpRecompensa}
          onConcluir={handleConcluirQuiz}
          onFechar={() => setQuizAberto(false)}
        />
      )}
    </div>
  );
}

// ── Simple markdown renderer ───────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    // H2
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-foreground mt-6 mb-3 flex items-center gap-2">$1</h2>')
    // H3
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-foreground/90 mt-5 mb-2 uppercase tracking-wide">$1</h3>')
    // H4
    .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold text-amber-400 mt-4 mb-1.5">$1</h4>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Tables (basic)
    .replace(/^\|(.+)\|$/gm, (line) => {
      const cells = line.split("|").filter(Boolean);
      const isHeader = false; // simplification
      return `<div class="flex gap-2 text-xs border-b border-white/5 py-1.5">${cells.map(c => `<span class="flex-1">${c.trim()}</span>`).join("")}</div>`;
    })
    // Bullet list items
    .replace(/^- (.+)$/gm, '<li class="flex items-start gap-2 text-sm text-foreground/80"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/60"></span><span>$1</span></li>')
    // Numbered list items
    .replace(/^(\d+)\. (.+)$/gm, '<li class="flex items-start gap-2 text-sm text-foreground/80"><span class="shrink-0 font-mono font-bold text-amber-400/80">$1.</span><span>$2</span></li>')
    // Wrap consecutive li in ul
    .replace(/((<li.+<\/li>\n?)+)/g, '<ul class="space-y-1.5 my-3 pl-1">$1</ul>')
    // Checkmark ✅ and ❌ emphasis
    .replace(/^✅ (.+)$/gm, '<p class="text-emerald-400 font-medium text-sm">✅ $1</p>')
    .replace(/^❌ (.+)$/gm, '<p class="text-red-400 font-medium text-sm">❌ $1</p>')
    // 💡 tip
    .replace(/^### Dica de Ouro (.+)$/gm, '<div class="rounded-xl bg-amber-400/8 border border-amber-400/20 px-4 py-3 text-sm text-amber-300 mt-4"><strong>💡 Dica de Ouro</strong> $1</div>')
    // Regular paragraphs (non-empty lines not already converted)
    .replace(/^(?!<|✅|❌|\|)(.{2,})$/gm, '<p class="text-sm text-foreground/80 leading-relaxed">$1</p>')
    // Clean up double newlines
    .replace(/\n{3,}/g, '\n\n');
}
