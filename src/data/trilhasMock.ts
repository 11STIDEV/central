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
  ofensivaDias: number;
  missoesCompletas: number;
  trilhasCompletas: number;
  progressoPorTrilha: Record<string, string[]>; // trilhaId → [missaoId concluída]
};

// ── Níveis ──────────────────────────────────────────────────
// Ajustados para que o nível 5 seja atingível com o novo limite de XP total (~245 XP)
export const NIVEIS = [
  { nivel: 1, nome: "Iniciante", xpMin: 0, icone: "🌱" },
  { nivel: 2, nome: "Aprendiz", xpMin: 20, icone: "📘" },
  { nivel: 3, nome: "Praticante", xpMin: 60, icone: "⚡" },
  { nivel: 4, nome: "Especialista", xpMin: 120, icone: "🔥" },
  { nivel: 5, nome: "Mestre", xpMin: 200, icone: "🏆" },
] as const;

export function getNivelInfo(xp: number) {
  let atual: typeof NIVEIS[number] = NIVEIS[0];
  for (const n of NIVEIS) {
    if (xp >= n.xpMin) atual = n;
  }
  const idx = NIVEIS.indexOf(atual);
  const proximo = NIVEIS[idx + 1] ?? null;
  return { atual, proximo };
}

import { TRILHAS_MOCK } from "./trilhas";

// Sobrescreve as pontuações mock com as novas regras de XP (5 XP por missão, 10 XP bônus por trilha concluída)
for (const trilha of TRILHAS_MOCK) {
  for (const missao of trilha.missoes) {
    missao.xpRecompensa = 5;
  }
  trilha.xpTotal = (trilha.missoes.length * 5) + 10;
}

export { TRILHAS_MOCK };

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
    id: "badge-ofensiva-7",
    nome: "Semana Perfeita",
    descricao: "Manteve 7 dias consecutivos de ofensiva",
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

// ── Medalhas por tempo de empresa (Separadas das conquistas da trilha) ──
export type MedalhaTempo = {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  anosReq: number;
};

export const MEDALHAS_TEMPO_MOCK: MedalhaTempo[] = [
  {
    id: "badge-anos-1",
    nome: "Medalha de Papel",
    descricao: "Completou 1 ano de empresa",
    icone: "/assets/medals/medal_paper.png",
    anosReq: 1,
  },
  {
    id: "badge-anos-3",
    nome: "Medalha de Madeira",
    descricao: "Completou 3 anos de empresa",
    icone: "/assets/medals/medal_wood.png",
    anosReq: 3,
  },
  {
    id: "badge-anos-5",
    nome: "Medalha de Lata",
    descricao: "Completou 5 anos de empresa",
    icone: "/assets/medals/medal_tin.png",
    anosReq: 5,
  },
  {
    id: "badge-anos-10",
    nome: "Medalha de Bronze",
    descricao: "Completou 10 anos de empresa",
    icone: "/assets/medals/medal_bronze.png",
    anosReq: 10,
  },
  {
    id: "badge-anos-15",
    nome: "Medalha de Prata",
    descricao: "Completou 15 anos de empresa",
    icone: "/assets/medals/medal_silver.png",
    anosReq: 15,
  },
  {
    id: "badge-anos-20",
    nome: "Medalha de Ouro",
    descricao: "Completou 20 anos de empresa",
    icone: "/assets/medals/medal_gold.png",
    anosReq: 20,
  },
  {
    id: "badge-anos-25",
    nome: "Medalha de Esmeralda",
    descricao: "Completou 25 anos de empresa",
    icone: "/assets/medals/medal_emerald.png",
    anosReq: 25,
  },
  {
    id: "badge-anos-30",
    nome: "Medalha de Diamante",
    descricao: "Completou 30 anos de empresa",
    icone: "/assets/medals/medal_diamond.png",
    anosReq: 30,
  },
  {
    id: "badge-anos-35",
    nome: "Medalha de Safira",
    descricao: "Completou 35 anos de empresa",
    icone: "/assets/medals/medal_sapphire.png",
    anosReq: 35,
  },
  {
    id: "badge-anos-40",
    nome: "Medalha de Rubi",
    descricao: "Completou 40 anos de empresa",
    icone: "/assets/medals/medal_rubi.png",
    anosReq: 40,
  },
];

export function obterMedalhaTempoUsuario(anos: number): MedalhaTempo | null {
  const ordenadas = [...MEDALHAS_TEMPO_MOCK].sort((a, b) => b.anosReq - a.anosReq);
  return ordenadas.find((m) => anos >= m.anosReq) || null;
}

// ── Ranking Mock ───────────────────────────────────────────────
export const RANKING_MOCK: RankingEntry[] = [
  { posicao: 1, nome: "Ana Costa", iniciais: "AC", xpSemana: 340, nivel: 4, cor: "from-amber-400 to-orange-500" },
  { posicao: 2, nome: "Carlos Lima", iniciais: "CL", xpSemana: 280, nivel: 3, cor: "from-blue-400 to-indigo-500" },
  { posicao: 3, nome: "Maria Santos", iniciais: "MS", xpSemana: 220, nivel: 3, cor: "from-emerald-400 to-teal-500" },
  { posicao: 4, nome: "João Ferreira", iniciais: "JF", xpSemana: 180, nivel: 2, cor: "from-purple-400 to-violet-500" },
  { posicao: 5, nome: "Paula Rocha", iniciais: "PR", xpSemana: 150, nivel: 2, cor: "from-pink-400 to-rose-500" },
];

// ── Persistência Local do Progresso ──────────────────────────────
const LOCAL_STORAGE_KEY = "central-trilha-progress";

export function calcularProgresso(progressoPorTrilha: Record<string, string[]>) {
  let missoesCompletas = 0;
  let trilhasCompletas = 0;

  for (const trail of TRILHAS_MOCK) {
    const concluidas = progressoPorTrilha[trail.id] ?? [];
    missoesCompletas += concluidas.length;
    if (concluidas.length > 0 && concluidas.length === trail.missoes.length) {
      trilhasCompletas += 1;
    }
  }

  const xpTotal = (missoesCompletas * 5) + (trilhasCompletas * 10);
  
  return { xpTotal, missoesCompletas, trilhasCompletas };
}

// Atualiza o estado das conquistas desbloqueadas dinamicamente
export function atualizarBadgesConquistadas(progress: UserProgress) {
  // 1. Conquistas por missões completadas (Primeira Missão se > 0)
  const primeiraMissao = BADGES_MOCK.find(x => x.id === "badge-primeira-missao");
  if (primeiraMissao) {
    if (progress.missoesCompletas > 0) {
      primeiraMissao.desbloqueadoEm = primeiraMissao.desbloqueadoEm ?? new Date().toISOString();
    } else {
      delete primeiraMissao.desbloqueadoEm;
    }
  }

  // 2. Conquistas por trilhas completadas específicas
  const conquistasTrilha = [
    { id: "badge-missao-visao-cci", trilhaId: "missao-visao-cci" },
    { id: "badge-google-drive", trilhaId: "google-drive" },
    { id: "badge-ischolar", trilhaId: "ischolar" },
    { id: "badge-plurall", trilhaId: "plurall" },
    { id: "badge-bloom", trilhaId: "bloom" },
    { id: "badge-espacos", trilhaId: "espacosEscola" },
    { id: "badge-primeiros-socorros", trilhaId: "primeiros-socorros" },
  ];

  for (const item of conquistasTrilha) {
    const b = BADGES_MOCK.find(x => x.id === item.id);
    if (b) {
      const concluidas = progress.progressoPorTrilha[item.trilhaId] ?? [];
      const trilha = TRILHAS_MOCK.find(t => t.id === item.trilhaId);
      if (trilha && concluidas.length === trilha.missoes.length && trilha.missoes.length > 0) {
        b.desbloqueadoEm = b.desbloqueadoEm ?? new Date().toISOString();
      } else {
        delete b.desbloqueadoEm;
      }
    }
  }

  // 3. Conquistas por Ofensiva (ex: 7 dias)
  const ofensiva7 = BADGES_MOCK.find(x => x.id === "badge-ofensiva-7");
  if (ofensiva7) {
    if (progress.ofensivaDias >= 7) {
      ofensiva7.desbloqueadoEm = ofensiva7.desbloqueadoEm ?? new Date().toISOString();
    } else {
      delete ofensiva7.desbloqueadoEm;
    }
  }
}

const baseMock: UserProgress = {
  xpTotal: 0,
  nivel: 1,
  xpProximoNivel: 100,
  ofensivaDias: 0,
  missoesCompletas: 0,
  trilhasCompletas: 0,
  progressoPorTrilha: {},
  anosDeEmpresa: 3, // Mock padrão para fins de demonstração (desbloqueia medalhas de 1 e 3 anos)
};

function carregarProgressoInicial(): UserProgress {
  if (typeof window === "undefined") return baseMock;
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    atualizarBadgesConquistadas(baseMock);
    return baseMock;
  }
  try {
    const parsed = JSON.parse(raw);
    const ofensivaDias = typeof parsed.ofensivaDias === "number"
      ? parsed.ofensivaDias
      : (parsed.streakDias ?? 0);
    const progressoPorTrilha = parsed.progressoPorTrilha ?? {};
    const stats = calcularProgresso(progressoPorTrilha);
    const progress = {
      ...baseMock,
      ...parsed,
      ofensivaDias,
      ...stats,
    };
    atualizarBadgesConquistadas(progress);
    return progress;
  } catch {
    atualizarBadgesConquistadas(baseMock);
    return baseMock;
  }
}

// ── User Progress Mock ─────────────────────────────────────────
export const USER_PROGRESS_MOCK: UserProgress = carregarProgressoInicial();

export function salvarProgressoUsuario(progress: UserProgress) {
  if (typeof window === "undefined") return;
  const stats = calcularProgresso(progress.progressoPorTrilha);
  const atualizado = {
    ...progress,
    ...stats,
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(atualizado));
  atualizarBadgesConquistadas(atualizado);
  Object.assign(USER_PROGRESS_MOCK, atualizado);
}
