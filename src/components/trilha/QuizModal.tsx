import { useState } from "react";
import { CheckCircle2, XCircle, ChevronRight, Zap, X, Trophy } from "lucide-react";
import type { PerguntaQuiz } from "@/data/trilhasMock";

interface QuizModalProps {
  missaoTitulo: string;
  perguntas: PerguntaQuiz[];
  xpRecompensa: number;
  onConcluir: (acertos: number, total: number) => void;
  onFechar: () => void;
}

type EstadoResposta = "aguardando" | "correto" | "errado";

export function QuizModal({
  missaoTitulo,
  perguntas,
  xpRecompensa,
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

  const xpGanho = Math.round(xpRecompensa * (acertos / totalPerguntas) + (acertos === totalPerguntas ? xpRecompensa * 0.2 : 0));
  const percentual = Math.round((acertos / totalPerguntas) * 100);

  // ── Resultado ──────────────────────────────────────────────
  if (etapa === "resultado") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl">
          {/* Celebration header */}
          <div className={`relative flex flex-col items-center py-10 ${
            percentual === 100
              ? "bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent"
              : percentual >= 60
              ? "bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent"
              : "bg-gradient-to-br from-red-500/10 to-transparent"
          }`}>
            <div className="text-6xl mb-3 animate-bounce">
              {percentual === 100 ? "🏆" : percentual >= 60 ? "🎉" : "📚"}
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {percentual === 100
                ? "Perfeito!"
                : percentual >= 60
                ? "Muito bem!"
                : "Continue tentando!"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{missaoTitulo}</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Score */}
            <div className="flex items-center justify-center gap-8 rounded-xl bg-white/5 py-5">
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums text-foreground">{acertos}/{totalPerguntas}</p>
                <p className="text-xs text-muted-foreground mt-1">Acertos</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums text-amber-400">+{xpGanho}</p>
                <p className="text-xs text-muted-foreground mt-1">XP ganhos</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums text-foreground">{percentual}%</p>
                <p className="text-xs text-muted-foreground mt-1">Aproveitamento</p>
              </div>
            </div>

            {percentual === 100 && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-400 ring-1 ring-amber-400/20">
                <Trophy className="h-4 w-4 shrink-0" />
                <span><strong>Bônus de 20% XP</strong> por acertar tudo!</span>
              </div>
            )}

            <button
              onClick={() => onConcluir(acertos, totalPerguntas)}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-amber-900/20 transition-all duration-150 hover:brightness-110 active:scale-95"
            >
              {percentual >= 60 ? "Continuar →" : "Ver próxima missão →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">Quiz</span>
            <span className="text-xs font-bold text-foreground">
              {perguntaIdx + 1}/{totalPerguntas}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
              <Zap className="h-3 w-3" />
              {xpRecompensa} XP
            </span>
            <button
              onClick={onFechar}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/8 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-white/8">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
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
                "w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200 ";

              if (!showResult) {
                cls += isSelected
                  ? "border-amber-400/50 bg-amber-400/10 text-foreground"
                  : "border-white/8 bg-white/[0.03] text-foreground hover:border-white/16 hover:bg-white/[0.06]";
              } else if (isCorrect) {
                cls += "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
              } else if (isSelected && !isCorrect) {
                cls += "border-red-400/40 bg-red-400/10 text-red-300";
              } else {
                cls += "border-white/5 bg-white/[0.02] text-muted-foreground opacity-60";
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
                          ? "bg-emerald-400/20 text-emerald-400"
                          : showResult && isSelected && !isCorrect
                          ? "bg-red-400/20 text-red-400"
                          : "bg-white/8 text-muted-foreground"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opcao}
                    </span>
                    {showResult && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-red-400" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {estado !== "aguardando" && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${
              estado === "correto"
                ? "border-emerald-400/20 bg-emerald-400/8 text-emerald-300"
                : "border-red-400/20 bg-red-400/8 text-red-300"
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
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-amber-900/20 transition-all duration-150 hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
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
