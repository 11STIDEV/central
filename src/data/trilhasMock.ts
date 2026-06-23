// ============================================================
// TRILHA DE CONHECIMENTO — Tipos e progresso mock
// Conteúdo das trilhas: src/data/trilhas/
// Substitua progresso por API quando o banco estiver pronto.
// ============================================================

export type Dificuldade = "iniciante" | "intermediario" | "avancado";

export type PerguntaQuiz = {
  id: string;
  texto: string;
  opcoes: string[];
  respostaCorreta: number; // índice 0-based
  explicacao: string;
};

export type Missao = {
  id: string;
  trilhaId: string;
  ordem: number;
  titulo: string;
  descricao: string;
  conteudo: string;
  linkExterno?: string;
  xpRecompensa: number;
  tempoEstimadoMin: number;
  quiz: PerguntaQuiz[];
};

export type Trilha = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  icone: string; // emoji
  cor: string; // tailwind gradient classes
  xpTotal: number;
  dificuldade: Dificuldade;
  missoes: Missao[];
  setorRestrito?: string; // se vazio = todos
};

export type Badge = {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  cor: string;
  desbloqueadoEm?: string; // ISO date, undefined = não conquistado
};

export type RankingEntry = {
  posicao: number;
  nome: string;
  avatar?: string;
  iniciais: string;
  xpSemana: number;
  nivel: number;
  cor: string; // cor do avatar
};

export type UserProgress = {
  xpTotal: number;
  nivel: number;
  xpProximoNivel: number;
  streakDias: number;
  missoesCompletas: number;
  trilhasCompletas: number;
  progressoPorTrilha: Record<string, string[]>; // trilhaId → [missaoId concluída]
};

// ── Níveis ──────────────────────────────────────────────────
export const NIVEIS = [
  { nivel: 1, nome: "Iniciante", xpMin: 0, icone: "🌱" },
  { nivel: 2, nome: "Aprendiz", xpMin: 100, icone: "📘" },
  { nivel: 3, nome: "Praticante", xpMin: 300, icone: "⚡" },
  { nivel: 4, nome: "Especialista", xpMin: 600, icone: "🔥" },
  { nivel: 5, nome: "Mestre", xpMin: 1000, icone: "🏆" },
] as const;

export function getNivelInfo(xp: number) {
  let atual = NIVEIS[0];
  for (const n of NIVEIS) {
    if (xp >= n.xpMin) atual = n;
  }
  const idx = NIVEIS.indexOf(atual as (typeof NIVEIS)[number]);
  const proximo = NIVEIS[idx + 1] ?? null;
  return { atual, proximo };
}

export { TRILHAS_MOCK } from "./trilhas";

// ── Badges Mock ───────────────────────────────────────────────
export const BADGES_MOCK: Badge[] = [
  {
    id: "badge-primeira-missao",
    nome: "Primeira Missão",
    descricao: "Completou sua primeira missão na plataforma",
    icone: "🎯",
    cor: "from-amber-400 to-yellow-500",
  },
  {
    id: "badge-missao-visao-cci",
    nome: "Guardião da Identidade",
    descricao: "Concluiu a trilha Missão, Princípios e Visão do CCI",
    icone: "🏫",
    cor: "from-orange-400 to-amber-500",
  },
  {
    id: "badge-google-drive",
    nome: "Organizador Digital",
    descricao: "Concluiu a trilha Google Drive — Drives Compartilhados",
    icone: "📁",
    cor: "from-blue-400 to-cyan-500",
  },
  {
    id: "badge-ischolar",
    nome: "Mestre iScholar",
    descricao: "Concluiu a trilha iScholar — Gestão Escolar",
    icone: "🎓",
    cor: "from-indigo-400 to-violet-500",
  },
  {
    id: "badge-plurall",
    nome: "Professor Digital",
    descricao: "Concluiu a trilha Plurall — Ambiente Virtual",
    icone: "💻",
    cor: "from-emerald-400 to-teal-500",
  },
  {
    id: "badge-bloom",
    nome: "Arquiteto da Aprendizagem",
    descricao: "Concluiu a trilha Taxonomia de Bloom",
    icone: "🧠",
    cor: "from-purple-400 to-fuchsia-500",
  },
  {
    id: "badge-espacos",
    nome: "Guia do Campus",
    descricao: "Concluiu a trilha Espaços da Escola",
    icone: "🏛️",
    cor: "from-rose-400 to-orange-500",
  },
  {
    id: "badge-primeiros-socorros",
    nome: "Salva-Vidas",
    descricao: "Concluiu a trilha POP — Primeiros Socorros",
    icone: "🩺",
    cor: "from-red-400 to-rose-500",
  },
  {
    id: "badge-streak-7",
    nome: "Semana Perfeita",
    descricao: "Manteve 7 dias consecutivos de streak",
    icone: "🔥",
    cor: "from-red-400 to-orange-500",
  },
  {
    id: "badge-quiz-perfeito",
    nome: "Quiz Perfeito",
    descricao: "Acertou todas as perguntas de um quiz sem errar",
    icone: "💯",
    cor: "from-pink-400 to-rose-500",
  },
];

// ── Ranking Mock ───────────────────────────────────────────────
export const RANKING_MOCK: RankingEntry[] = [
  { posicao: 1, nome: "Ana Costa", iniciais: "AC", xpSemana: 340, nivel: 4, cor: "from-amber-400 to-orange-500" },
  { posicao: 2, nome: "Carlos Lima", iniciais: "CL", xpSemana: 280, nivel: 3, cor: "from-blue-400 to-indigo-500" },
  { posicao: 3, nome: "Maria Santos", iniciais: "MS", xpSemana: 220, nivel: 3, cor: "from-emerald-400 to-teal-500" },
  { posicao: 4, nome: "João Ferreira", iniciais: "JF", xpSemana: 180, nivel: 2, cor: "from-purple-400 to-violet-500" },
  { posicao: 5, nome: "Paula Rocha", iniciais: "PR", xpSemana: 150, nivel: 2, cor: "from-pink-400 to-rose-500" },
];

// ── User Progress Mock ─────────────────────────────────────────
export const USER_PROGRESS_MOCK: UserProgress = {
  xpTotal: 0,
  nivel: 1,
  xpProximoNivel: 100,
  streakDias: 0,
  missoesCompletas: 0,
  trilhasCompletas: 0,
  progressoPorTrilha: {},
};
