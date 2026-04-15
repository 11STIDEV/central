import type { Papel, UsuarioLogado } from "@/auth/AuthProvider";

export type ChamadoStatus = "aberto" | "resolvido";

export type Chamado = {
  id: string;
  titulo: string;
  solicitante: string;
  solicitanteEmail: string;
  /** Papel (não-`usuario`) usado para agrupar visibilidade entre colegas do mesmo perfil. */
  papelAbertura: Papel;
  categoria: string;
  prioridade: "baixa" | "media" | "alta";
  status: ChamadoStatus;
  data: string;
  descricao: string;
  acompanhamentos: { autor: string; texto: string; data: string }[];
  tarefas: { autor: string; texto: string; data: string }[];
  solucao?: { autor: string; texto: string; data: string };
};

const STORAGE_KEY = "central-connect-chamados-v1";

/** Papel “de equipe” para filtro de visibilidade (exclui `usuario` genérico). */
export function papelPrincipalUsuario(papeis: Papel[]): Papel {
  const semUsuario = papeis.filter((p) => p !== "usuario");
  return semUsuario.length > 0 ? semUsuario[0] : "usuario";
}

/** setape vê todos; demais veem o próprio + mesmo papel de abertura. */
export function podeVerChamado(usuario: UsuarioLogado, chamado: Chamado): boolean {
  if (usuario.papeis.includes("setape")) return true;
  if (chamado.solicitanteEmail.toLowerCase() === usuario.email.toLowerCase()) return true;
  return chamado.papelAbertura === papelPrincipalUsuario(usuario.papeis);
}

function migrarItem(raw: unknown): Chamado | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== "string" || typeof c.titulo !== "string") return null;

  let status = c.status;
  if (status === "em_andamento") status = "aberto";
  if (status !== "aberto" && status !== "resolvido") status = "aberto";

  const solicitanteEmail =
    typeof c.solicitanteEmail === "string"
      ? c.solicitanteEmail
      : typeof c.solicitante === "string"
        ? `${c.solicitante.toLowerCase().replace(/\s+/g, ".")}@portalcci.com.br`
        : "desconhecido@portalcci.com.br";

  const papelAbertura =
    typeof c.papelAbertura === "string" && c.papelAbertura
      ? (c.papelAbertura as Papel)
      : "usuario";

  const prioridade =
    c.prioridade === "baixa" || c.prioridade === "media" || c.prioridade === "alta"
      ? c.prioridade
      : "media";

  const sol = c.solucao;
  const solucao =
    sol && typeof sol === "object" && sol !== null && "texto" in sol
      ? (sol as Chamado["solucao"])
      : undefined;

  return {
    id: c.id as string,
    titulo: c.titulo as string,
    solicitante: typeof c.solicitante === "string" ? c.solicitante : "Usuário",
    solicitanteEmail,
    papelAbertura,
    categoria: typeof c.categoria === "string" ? c.categoria : "Outro",
    prioridade,
    status: status as ChamadoStatus,
    data: typeof c.data === "string" ? c.data : "",
    descricao: typeof c.descricao === "string" ? c.descricao : "",
    acompanhamentos: Array.isArray(c.acompanhamentos)
      ? (c.acompanhamentos as Chamado["acompanhamentos"])
      : [],
    tarefas: Array.isArray(c.tarefas) ? (c.tarefas as Chamado["tarefas"]) : [],
    solucao,
  };
}

export function carregarChamados(): Chamado[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrarItem).filter((x): x is Chamado => x != null);
  } catch {
    return [];
  }
}

export function salvarChamados(lista: Chamado[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  } catch {
    /* ignore */
  }
}

/** Dados iniciais (primeira visita ou storage vazio). */
export const CHAMADOS_INICIAIS: Chamado[] = [
  {
    id: "CHM-001",
    titulo: "Computador não liga",
    solicitante: "Ana Costa",
    solicitanteEmail: "ana.costa@portalcci.com.br",
    papelAbertura: "secretaria",
    categoria: "Hardware",
    prioridade: "alta",
    status: "aberto",
    data: "25/02/2026",
    descricao:
      "O computador da sala 102 não liga desde ontem. Já verifiquei os cabos e está tudo conectado.",
    acompanhamentos: [
      {
        autor: "João Santos",
        texto: "Vamos verificar a fonte de alimentação.",
        data: "25/02/2026 10:30",
      },
    ],
    tarefas: [
      {
        autor: "João Santos",
        texto: "Testar fonte com multímetro",
        data: "25/02/2026 10:35",
      },
    ],
  },
  {
    id: "CHM-002",
    titulo: "Sem acesso ao sistema ERP",
    solicitante: "Pedro Lima",
    solicitanteEmail: "pedro.lima@portalcci.com.br",
    papelAbertura: "dp",
    categoria: "Acesso / Permissão",
    prioridade: "media",
    status: "aberto",
    data: "24/02/2026",
    descricao: "Preciso de acesso ao módulo de compras no ERP. Meu usuário é pedro.lima.",
    acompanhamentos: [
      {
        autor: "João Santos",
        texto: "Solicitação de acesso encaminhada ao administrador do ERP.",
        data: "24/02/2026 14:00",
      },
    ],
    tarefas: [],
  },
  {
    id: "CHM-003",
    titulo: "Impressora travando",
    solicitante: "Juliana Rocha",
    solicitanteEmail: "juliana.rocha@portalcci.com.br",
    papelAbertura: "setape",
    categoria: "Impressora",
    prioridade: "baixa",
    status: "resolvido",
    data: "23/02/2026",
    descricao: "A impressora do 2º andar trava constantemente ao imprimir PDF.",
    acompanhamentos: [
      {
        autor: "João Santos",
        texto: "Driver atualizado e impressora reiniciada.",
        data: "23/02/2026 16:00",
      },
    ],
    tarefas: [
      {
        autor: "João Santos",
        texto: "Verificar driver e firmware",
        data: "23/02/2026 15:00",
      },
    ],
    solucao: {
      autor: "João Santos",
      texto:
        "Driver desatualizado causava o travamento. Atualizado para versão 5.2.1 e testado com sucesso.",
      data: "23/02/2026 16:30",
    },
  },
];

export function obterChamadosParaExibir(): Chamado[] {
  const salvos = carregarChamados();
  if (salvos.length > 0) return salvos;
  salvarChamados(CHAMADOS_INICIAIS);
  return [...CHAMADOS_INICIAIS];
}

/** Inclui na lista (se o storage estiver vazio, preserva os chamados de exemplo antes de gravar). */
export function adicionarChamado(novo: Chamado): void {
  let lista = carregarChamados();
  if (lista.length === 0) {
    lista = [...CHAMADOS_INICIAIS];
  }
  salvarChamados([...lista, novo]);
}
