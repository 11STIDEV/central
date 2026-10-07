import { useState } from "react";
import { CheckCircle2, XCircle, ChevronRight, Zap, X, Trophy } from "lucide-react";
import type { PerguntaQuiz } from "@/data/trilhasMock";

interface QuizModalProps {
  missaoTitulo: string;
  perguntas: PerguntaQuiz[];
  xpGanho?: number;
  trilhaTitulo?: string;
  isConclusaoTrilha?: boolean;
  xpTrilha?: number;
  onConcluir: (acertos: number, total: number) => void;
  onFechar: () => void;
}

type EstadoResposta = "aguardando" | "correto" | "errado";

export function QuizModal({
  missaoTitulo,
  perguntas,
  xpGanho = 0,
  trilhaTitulo,
  isConclusaoTrilha = false,
  xpTrilha,
  onConcluir,
  onFechar,
}: QuizModalProps) {
  const [etapa, setEtapa] = useState<"quiz" | "resultado">("quiz");
  const [perguntaIdx, setPerguntaIdx] = useState(0);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [estado, setEstado] = useState<EstadoResposta>("aguardando");
  const [acertos, setAcertos] = useState(0);

  const pergunta = perguntas[perguntaIdx];
  const totalPerguntas = perguntas.length;
  const progresso = Math.round(((perguntaIdx) / totalPerguntas) * 100);

  function handleSelecionar(idx: number) {
    if (estado !== "aguardando") return;
    setSelecionado(idx);
    const acertou = idx === pergunta.respostaCorreta;
    setEstado(acertou ? "correto" : "errado");
    if (acertou) setAcertos((a) => a + 1);
  }

  function handleProximo() {
    if (perguntaIdx + 1 < totalPerguntas) {
      setPerguntaIdx((i) => i + 1);
      setSelecionado(null);
      setEstado("aguardando");
    } else {
      setEtapa("resultado");
    }
  }

  const percentual = Math.round((acertos / totalPerguntas) * 100);

  // ── Resultado ──────────────────────────────────────────────
  if (etapa === "resultado") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card dark:border-white/10 dark:bg-slate-900 shadow-2xl">
          {/* Celebration header */}
          <div className={`relative flex flex-col items-center py-10 ${
            isConclusaoTrilha
              ? "bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent dark:from-amber-500/20 dark:via-orange-500/10"
              : percentual >= 60
              ? "bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent"
              : "bg-gradient-to-br from-red-500/10 to-transparent"
          }`}>
            <div className="text-6xl mb-3 animate-bounce">
              {isConclusaoTrilha ? "🏆" : percentual === 100 ? "🌟" : percentual >= 60 ? "🎉" : "📚"}
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {isConclusaoTrilha
                ? "Trilha Concluída!"
                : percentual === 100
                ? "Perfeito!"
                : percentual >= 60
                ? "Missão Concluída!"
                : "Continue tentando!"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground text-center px-4">
              {isConclusaoTrilha && trilhaTitulo
                ? `Você finalizou a trilha "${trilhaTitulo}"!`
                : missaoTitulo}
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Score */}
            <div className="flex items-center justify-center gap-8 rounded-xl bg-muted/40 border border-border/60 dark:border-transparent dark:bg-white/5 py-5">
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums text-foreground">{acertos}/{totalPerguntas}</p>
                <p className="text-xs text-muted-foreground mt-1">Acertos</p>
              </div>
              <div className="h-10 w-px bg-border dark:bg-white/10" />
              <div className="text-center">
                {xpGanho > 0 ? (
                  <>
                    <p className="text-3xl font-bold tabular-nums text-primary dark:text-amber-400">+{xpGanho}</p>
                    <p className="text-xs text-muted-foreground mt-1">XP da Trilha</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">✓</p>
                    <p className="text-xs text-muted-foreground mt-1">Missão Feita</p>
                  </>
                )}
              </div>
              <div className="h-10 w-px bg-border dark:bg-white/10" />
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums text-foreground">{percentual}%</p>
                <p className="text-xs text-muted-foreground mt-1">Aproveitamento</p>
              </div>
            </div>

            {xpGanho === 0 && xpTrilha && (
              <p className="text-center text-xs text-primary dark:text-amber-400/90 bg-primary/10 dark:bg-amber-400/10 rounded-lg py-2 px-3 font-medium">
                💡 Conclua todas as missões para ganhar os <strong>{xpTrilha} XP</strong> da trilha!
              </p>
            )}

            <button
              onClick={() => onConcluir(acertos, totalPerguntas)}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-amber-400 dark:to-orange-500 py-3 text-sm font-bold text-white shadow-md transition-all duration-150 hover:brightness-110 active:scale-95"
            >
              {isConclusaoTrilha
                ? "Finalizar Trilha 🏆"
                : percentual >= 60
                ? "Continuar →"
                : "Ver próxima missão →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card dark:border-white/10 dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border dark:border-white/8 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide">Quiz</span>
            <span className="text-xs font-bold text-foreground">
              {perguntaIdx + 1}/{totalPerguntas}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {xpTrilha && (
              <span className="flex items-center gap-1 text-xs font-semibold text-primary dark:text-amber-400">
                <Zap className="h-3 w-3" />
                {xpTrilha} XP na trilha
              </span>
            )}
            <button
              onClick={onFechar}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted dark:hover:bg-white/8 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-muted dark:bg-white/8">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-amber-400 dark:to-orange-500 transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>

        <div className="p-6 space-y-5">
          {/* Question */}
          <p className="text-base font-semibold leading-snug text-foreground">
            {pergunta.texto}
          </p>

          {/* Options */}
          <div className="space-y-2.5">
            {pergunta.opcoes.map((opcao, idx) => {
              const isSelected = selecionado === idx;
              const isCorrect = idx === pergunta.respostaCorreta;
              const showResult = estado !== "aguardando";

              let cls =
                "w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200 shadow-xs ";

              if (!showResult) {
                cls += isSelected
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border bg-background hover:bg-muted/50 hover:border-border/80 text-foreground dark:border-white/8 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]";
              } else if (isCorrect) {
                cls += "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
              } else if (isSelected && !isCorrect) {
                cls += "border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-300";
              } else {
                cls += "border-border/50 bg-muted/20 text-muted-foreground opacity-60 dark:border-white/5 dark:bg-white/[0.02]";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelecionar(idx)}
                  disabled={showResult}
                  className={cls}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        showResult && isCorrect
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : showResult && isSelected && !isCorrect
                          ? "bg-red-500/20 text-red-600 dark:text-red-400"
                          : "bg-muted text-muted-foreground border border-border/50 dark:border-transparent dark:bg-white/8"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opcao}
                    </span>
                    {showResult && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {estado !== "aguardando" && (
            <div className={`rounded-xl border px-4 py-3 text-sm shadow-xs ${
              estado === "correto"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300"
            }`}>
              <p className="font-semibold mb-0.5">
                {estado === "correto" ? "✅ Correto!" : "❌ Não exatamente..."}
              </p>
              <p className="text-xs opacity-90 leading-relaxed">{pergunta.explicacao}</p>
            </div>
          )}

          {/* Next button */}
          {estado !== "aguardando" && (
            <button
              onClick={handleProximo}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-amber-400 dark:to-orange-500 py-3 text-sm font-bold text-white shadow-md transition-all duration-150 hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
            >
              {perguntaIdx + 1 < totalPerguntas ? "Próxima pergunta" : "Ver resultado"}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
