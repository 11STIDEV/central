import type { Papel } from "@/auth/AuthProvider";
import { apiUrl, centralFetch, authJsonBody } from "@/lib/apiBase";

export type CcipayMovimentoStatus =
  | "pendente"
  | "aprovado"
  | "negado"
  | "pago"
  | "descontado_folha"
  | "cancelado";

export type CcipayMovimento = {
  id: string;
  tipo: string;
  direcao: "credito" | "debito";
  valor: number;
  status: CcipayMovimentoStatus;
  competencia: string;
  funcionarioEmail: string;
  funcionarioNome: string;
  lojaId?: string | null;
  pedidoId?: string | null;
  criadoPor: string;
  aprovadoPor?: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
};

export type CcipayFuncionario = {
  email: string;
  nome: string;
  alterdataCodigo?: string | null;
  limiteAdiantamento: number;
  limiteBonificacao?: number | null;
  pixPadrao?: string | null;
  ativo: boolean;
};

export type CcipayLoja = {
  id: string;
  nome: string;
  descricao: string;
  ativa: boolean;
};

export type CcipayCatalogoItem = {
  id: string;
  lojaId: string;
  nome: string;
  descricao: string;
  preco: number;
  estoque?: number | null;
  ativo: boolean;
};

export type CcipayPedidoItem = {
  id?: string;
  itemId?: string | null;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
};

export type CcipayPedido = {
  id: string;
  lojaId: string;
  funcionarioEmail: string;
  funcionarioNome: string;
  status: string;
  valorTotal: number;
  observacao: string;
  confirmadoPor?: string | null;
  itens: CcipayPedidoItem[];
  createdAt?: string;
};

export type CcipayResumo = {
  funcionario: CcipayFuncionario;
  competencia: string;
  adiantamentoUsado: number;
  adiantamentoDisponivel: number;
  saldoBonificacao: number;
  movimentos: CcipayMovimento[];
};

export type CcipayVendaQrStatus = "pendente" | "pago" | "expirado" | "cancelado";

export type CcipayVendaQr = {
  id: string;
  token: string;
  lojaId: string;
  lojaNome: string;
  valor: number;
  descricao: string;
  status: CcipayVendaQrStatus;
  funcionarioEmail?: string | null;
  funcionarioNome?: string | null;
  movimentoId?: string | null;
  criadoPor: string;
  expiresAt: string;
  pagoEm?: string | null;
  createdAt?: string;
};

export type CcipayResumoParceiro = {
  aReceber: number;
  pendente: number;
  totalMes: number;
  qtdPendentes: number;
  vendasMes: number;
};

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function err(data: Record<string, unknown>, fallback: string): string {
  return typeof data.error === "string" ? data.error : fallback;
}

async function post<T>(path: string, idToken?: string | null, body: Record<string, unknown> = {}): Promise<T> {
  const res = await centralFetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: authJsonBody({ ...body }, idToken),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(err(data, `Erro HTTP ${res.status}`));
  return data as T;
}

export async function ccipayMe(idToken: string): Promise<CcipayResumo> {
  const data = await post<{ funcionario: CcipayFuncionario; competencia: string; adiantamentoUsado: number; adiantamentoDisponivel: number; saldoBonificacao: number; movimentos: CcipayMovimento[] }>(
    "/api/ccipay/me",
    idToken,
  );
  return {
    funcionario: data.funcionario,
    competencia: data.competencia,
    adiantamentoUsado: data.adiantamentoUsado,
    adiantamentoDisponivel: data.adiantamentoDisponivel,
    saldoBonificacao: data.saldoBonificacao,
    movimentos: data.movimentos,
  };
}

export async function ccipayCriarAdiantamento(idToken?: string | null, pix: string, valor: number) {
  return post<{ movimento: CcipayMovimento }>("/api/ccipay/adiantamentos/criar", idToken, { pix, valor });
}

export async function ccipayListarAdiantamentos(idToken: string) {
  return post<{ movimentos: CcipayMovimento[] }>("/api/ccipay/adiantamentos/listar", idToken);
}

export async function ccipayAprovarAdiantamento(
  idToken?: string | null,
  movimentoId: string,
  acao: "aprovar" | "negar",
  justificativa?: string,
) {
  return post<{ movimento: CcipayMovimento }>("/api/ccipay/adiantamentos/aprovar", idToken, {
    movimentoId,
    acao,
    justificativa,
  });
}

export async function ccipayLancarBonificacao(
  idToken?: string | null,
  funcionarioEmail: string,
  valor: number,
  descricao: string,
) {
  return post("/api/ccipay/bonificacoes/lancar", idToken, { funcionarioEmail, valor, descricao });
}

export async function ccipayLancarDeducao(
  idToken?: string | null,
  funcionarioEmail: string,
  valor: number,
  descricao: string,
) {
  return post("/api/ccipay/deducoes/lancar", idToken, { funcionarioEmail, valor, descricao });
}

export async function ccipayListarFuncionarios(idToken: string) {
  return post<{ funcionarios: CcipayFuncionario[] }>("/api/ccipay/funcionarios/listar", idToken);
}

export async function ccipayAtualizarFuncionario(
  idToken?: string | null,
  email: string,
  patch: Partial<CcipayFuncionario>,
) {
  return post<{ funcionario: CcipayFuncionario }>("/api/ccipay/funcionarios/atualizar", idToken, {
    email,
    patch: {
      nome: patch.nome,
      alterdataCodigo: patch.alterdataCodigo,
      limiteAdiantamento: patch.limiteAdiantamento,
      limiteBonificacao: patch.limiteBonificacao,
      pixPadrao: patch.pixPadrao,
      ativo: patch.ativo,
    },
  });
}

export async function ccipayListarLojas(idToken?: string | null, apenasAtivas = false) {
  return post<{ lojas: CcipayLoja[] }>("/api/ccipay/lojas/listar", idToken, { apenasAtivas });
}

export async function ccipaySalvarLoja(idToken?: string | null, loja: Partial<CcipayLoja> & { nome: string }) {
  return post<{ loja: CcipayLoja }>("/api/ccipay/lojas/salvar", idToken, { loja });
}

export async function ccipayLojaUsuarios(
  idToken?: string | null,
  lojaId: string,
  acao: "vincular" | "remover" | "listar",
  opts: { login?: string; senha?: string; nome?: string; email?: string } = {},
) {
  return post<{ usuarios: { email: string; login?: string | null; nome: string; temSenha?: boolean }[] }>(
    "/api/ccipay/lojas/usuarios",
    idToken,
    {
      lojaId,
      acao: acao === "remover" ? "remover" : acao === "listar" ? "listar" : undefined,
      login: opts.login,
      senha: opts.senha,
      nome: opts.nome,
      email: opts.email,
    },
  );
}

export async function ccipayListarLancadores(idToken: string) {
  return post<{ lancadores: { email: string; nome: string; ativo: boolean }[] }>(
    "/api/ccipay/lancadores/listar",
    idToken,
  );
}

export async function ccipaySalvarLancador(
  idToken?: string | null,
  email: string,
  nome: string,
  acao?: "remover",
) {
  return post("/api/ccipay/lancadores/salvar", idToken, { email, nome, acao });
}

export async function ccipayListarCatalogo(idToken?: string | null, lojaId: string, apenasAtivos = true) {
  return post<{ itens: CcipayCatalogoItem[] }>("/api/ccipay/catalogo/listar", idToken, {
    lojaId,
    apenasAtivos,
  });
}

export async function ccipaySalvarCatalogoItem(idToken?: string | null, item: Partial<CcipayCatalogoItem> & { lojaId: string; nome: string; preco: number }) {
  return post<{ item: CcipayCatalogoItem }>("/api/ccipay/catalogo/salvar", idToken, { item });
}

export async function ccipayCriarPedido(
  idToken?: string | null,
  lojaId: string,
  itens: CcipayPedidoItem[],
  observacao?: string,
) {
  return post<{ pedido: CcipayPedido }>("/api/ccipay/pedidos/criar", idToken, { lojaId, itens, observacao });
}

export async function ccipayListarPedidos(idToken?: string | null, lojaId?: string, status?: string) {
  return post<{ pedidos: CcipayPedido[] }>("/api/ccipay/pedidos/listar", idToken, { lojaId, status });
}

export async function ccipayConfirmarPedido(idToken?: string | null, pedidoId: string, acao: "entregar" | "cancelar") {
  return post<{ pedido: CcipayPedido }>("/api/ccipay/pedidos/confirmar", idToken, {
    pedidoId,
    acao: acao === "cancelar" ? "cancelar" : "entregar",
  });
}

export async function ccipayRelatorioDp(idToken?: string | null, competencia?: string, exportarCsv = false) {
  return post<{ movimentos: CcipayMovimento[]; funcionarios?: CcipayFuncionario[]; csv?: string }>(
    "/api/ccipay/relatorios/dp",
    idToken,
    { competencia, exportarCsv },
  );
}

export async function ccipayRelatorioLoja(idToken?: string | null, lojaId: string, de?: string, ate?: string) {
  return post<{ pedidos: CcipayPedido[]; totais: { pedidos: number; valorTotal: number; entregues: number } }>(
    "/api/ccipay/relatorios/loja",
    idToken,
    { lojaId, de, ate },
  );
}

export async function ccipayCriarVendaQr(
  idToken: string,
  lojaId: string,
  valor: number,
  descricao?: string,
) {
  return post<{ venda: CcipayVendaQr; token: string }>("/api/ccipay/vendas/criar", idToken, {
    lojaId,
    valor,
    descricao,
  });
}

export async function ccipayListarVendasQr(
  idToken: string,
  lojaId: string,
  opts?: { status?: string; de?: string; ate?: string },
) {
  return post<{ vendas: CcipayVendaQr[] }>("/api/ccipay/vendas/listar", idToken, {
    lojaId,
    ...opts,
  });
}

export async function ccipayResumoParceiro(idToken: string, lojaId: string) {
  return post<CcipayResumoParceiro>("/api/ccipay/vendas/resumo", idToken, { lojaId });
}

export async function ccipayObterVendaQr(idToken: string, token: string) {
  return post<{ venda: CcipayVendaQr }>("/api/ccipay/vendas/obter", idToken, { token });
}

export async function ccipayPagarVendaQr(idToken: string, token: string) {
  return post<{ venda: CcipayVendaQr; movimento: CcipayMovimento }>(
    "/api/ccipay/vendas/pagar",
    idToken,
    { token },
  );
}

export async function ccipayCancelarVendaQr(idToken: string, vendaId: string) {
  return post<{ venda: CcipayVendaQr }>("/api/ccipay/vendas/cancelar", idToken, { vendaId });
}

export function labelStatusVendaQr(status: CcipayVendaQrStatus): string {
  const map: Record<CcipayVendaQrStatus, string> = {
    pendente: "Aguardando pagamento",
    pago: "Pago",
    expirado: "Expirado",
    cancelado: "Cancelado",
  };
  return map[status] ?? status;
}

export function urlPagamentoVendaQr(token: string): string {
  if (typeof window === "undefined") return `/cci-pay/pagar/${token}`;
  return `${window.location.origin}/cci-pay/pagar/${token}`;
}

const PAPEIS_CCIPAY_DP: Papel[] = [
  "admin",
  "ccipay_admin",
  "ccipay_dp",
  "dp",
  "financeiro",
  "gerente_dp",
  "gerente_financeiro",
];

export function isCcipayDpPapel(papeis: Papel[]): boolean {
  return papeis.some((p) => PAPEIS_CCIPAY_DP.includes(p));
}

export function isCcipayAdminPapel(papeis: Papel[]): boolean {
  return papeis.includes("admin") || papeis.includes("ccipay_admin");
}

export function isCcipayLancadorPapel(papeis: Papel[]): boolean {
  return papeis.some((p) => ["admin", "ccipay_admin", "ccipay_lancador"].includes(p));
}

export function isCcipayLojaPapel(papeis: Papel[]): boolean {
  return papeis.some((p) => ["admin", "ccipay_admin", "ccipay_loja"].includes(p));
}

export function labelStatusMovimento(status: CcipayMovimentoStatus): string {
  const map: Record<CcipayMovimentoStatus, string> = {
    pendente: "Pendente",
    aprovado: "Aprovado",
    negado: "Negado",
    pago: "Pago",
    descontado_folha: "Descontado em folha",
    cancelado: "Cancelado",
  };
  return map[status] ?? status;
}
