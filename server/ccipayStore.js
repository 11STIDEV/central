/** Persistência Advance-CCI no Supabase (service_role). */

import { competenciaAtual } from "./ccipayAccess.js";
import { emailSinteticoParceiro } from "./parceiroPassword.js";
import { obterFuncionarioPorEmail, extrairResumoColaborador } from "./alterdataStore.js";

const STATUS_ADIANTAMENTO_ATIVOS = ["pendente", "aprovado", "pago", "descontado_folha"];

function rowToFuncionario(row) {
  return {
    email: row.email,
    nome: row.nome,
    alterdataCodigo: row.alterdata_codigo ?? null,
    limiteAdiantamento: Number(row.limite_adiantamento),
    limiteBonificacao: row.limite_bonificacao != null ? Number(row.limite_bonificacao) : null,
    pixPadrao: row.pix_padrao ?? null,
    ativo: row.ativo ?? true,
  };
}

function rowToMovimento(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    direcao: row.direcao,
    valor: Number(row.valor),
    status: row.status,
    competencia: row.competencia,
    funcionarioEmail: row.funcionario_email,
    funcionarioNome: row.funcionario_nome,
    lojaId: row.loja_id ?? null,
    pedidoId: row.pedido_id ?? null,
    criadoPor: row.criado_por,
    aprovadoPor: row.aprovado_por ?? null,
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToLoja(row) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? "",
    ativa: row.ativa ?? true,
  };
}

function rowToCatalogoItem(row) {
  return {
    id: row.id,
    lojaId: row.loja_id,
    nome: row.nome,
    descricao: row.descricao ?? "",
    preco: Number(row.preco),
    estoque: row.estoque ?? null,
    ativo: row.ativo ?? true,
  };
}

function rowToPedido(row, itens = []) {
  return {
    id: row.id,
    lojaId: row.loja_id,
    funcionarioEmail: row.funcionario_email,
    funcionarioNome: row.funcionario_nome,
    status: row.status,
    valorTotal: Number(row.valor_total),
    observacao: row.observacao ?? "",
    confirmadoPor: row.confirmado_por ?? null,
    itens,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function obterFuncionario(supabase, email) {
  const { data, error } = await supabase
    .from("ccipay_funcionarios")
    .select("*")
    .eq("email", String(email).toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`[ccipay] funcionario: ${error.message}`);
  return data ? rowToFuncionario(data) : null;
}

export async function registrarOuAtualizarFuncionario(supabase, { email, nome, pixPadrao, alterdataCodigo }) {
  const now = new Date().toISOString();
  const emailLower = String(email).toLowerCase();
  const existente = await obterFuncionario(supabase, emailLower);

  let alterdataCode = alterdataCodigo || existente?.alterdataCodigo || null;
  let nomeFinal = nome || existente?.nome || emailLower;
  let pixFinal = pixPadrao !== undefined ? (pixPadrao || null) : (existente?.pixPadrao || null);

  // Se não tem código Alterdata ou PIX, tenta resolver do banco Alterdata consolidado
  if (!alterdataCode || !pixFinal || !existente) {
    try {
      const alterdataFunc = await obterFuncionarioPorEmail(supabase, emailLower);
      if (alterdataFunc) {
        const resumo = extrairResumoColaborador(alterdataFunc);
        if (!alterdataCode && resumo?.codigo) alterdataCode = resumo.codigo;
        if ((!existente || !existente.nome) && resumo?.nome) nomeFinal = resumo.nome;
        if (!pixFinal && resumo?.pixPadrao) pixFinal = resumo.pixPadrao;
      }
    } catch {
      /* fallback silencioso */
    }
  }

  const row = {
    email: emailLower,
    nome: nomeFinal,
    updated_at: now,
    ...(alterdataCode ? { alterdata_codigo: alterdataCode } : {}),
    ...(pixFinal !== undefined ? { pix_padrao: pixFinal } : {}),
    ...(!existente ? { created_at: now } : {}),
  };
  const { error } = await supabase.from("ccipay_funcionarios").upsert(row, { onConflict: "email" });
  if (error) throw new Error(`[ccipay] upsert funcionario: ${error.message}`);
  return obterFuncionario(supabase, emailLower);
}

export async function sincronizarFuncionariosAdvanceComAlterdata(supabase) {
  if (!supabase) throw new Error("Supabase não configurado.");

  // 1. Busca todos os colaboradores consolidados do Alterdata
  const { data: colaboradores, error: errAlt } = await supabase
    .from("intranet_alterdata_funcionarios")
    .select("*")
    .order("nome_completo", { ascending: true });

  if (errAlt) throw new Error(`Erro ao consultar Alterdata no Supabase: ${errAlt.message}`);

  // 2. Busca os funcionários já existentes no Advance-CCI
  const existentes = await listarFuncionarios(supabase);
  const mapaExistentes = new Map(existentes.map((f) => [f.email.toLowerCase(), f]));

  const now = new Date().toISOString();
  let novos = 0;
  let atualizados = 0;
  let ignoradosSemEmail = 0;

  const rowsToUpsert = [];

  for (const c of colaboradores || []) {
    if (!c.email || !c.email.trim()) {
      ignoradosSemEmail += 1;
      continue;
    }
    const emailLower = c.email.trim().toLowerCase();
    const ex = mapaExistentes.get(emailLower);
    const resumo = extrairResumoColaborador(c);

    const codigo = resumo?.codigo || c.codigo_contrato_vigente || null;
    const nome = c.nome_completo || ex?.nome || emailLower;
    const pix = ex?.pixPadrao || resumo?.pixPadrao || null;
    const ativo = c.tem_contrato_ativo !== false;

    if (!ex) {
      novos += 1;
      rowsToUpsert.push({
        email: emailLower,
        nome,
        alterdata_codigo: codigo,
        limite_adiantamento: 500.0,
        limite_bonificacao: null,
        pix_padrao: pix,
        ativo,
        created_at: now,
        updated_at: now,
      });
    } else if (!ex.alterdataCodigo && codigo) {
      atualizados += 1;
      rowsToUpsert.push({
        email: emailLower,
        nome: ex.nome || nome,
        alterdata_codigo: codigo,
        limite_adiantamento: ex.limiteAdiantamento,
        limite_bonificacao: ex.limiteBonificacao,
        pix_padrao: ex.pixPadrao || pix,
        ativo: ex.ativo,
        created_at: ex.createdAt || now,
        updated_at: now,
      });
    }
  }

  if (rowsToUpsert.length > 0) {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < rowsToUpsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToUpsert.slice(i, i + CHUNK_SIZE);
      const { error: errUp } = await supabase
        .from("ccipay_funcionarios")
        .upsert(chunk, { onConflict: "email" });
      if (errUp) throw new Error(`Erro ao sincronizar ccipay_funcionarios: ${errUp.message}`);
    }
  }

  return {
    ok: true,
    totalAlterdata: (colaboradores || []).length,
    sincronizados: rowsToUpsert.length,
    novosCadastros: novos,
    atualizadosComCodigo: atualizados,
    ignoradosSemEmail,
  };
}

export async function listarFuncionarios(supabase) {
  const { data, error } = await supabase
    .from("ccipay_funcionarios")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw new Error(`[ccipay] listar funcionarios: ${error.message}`);
  return (data || []).map(rowToFuncionario);
}

export async function atualizarFuncionarioAdmin(supabase, email, patch) {
  const row = { updated_at: new Date().toISOString() };
  if (patch.nome !== undefined) row.nome = patch.nome;
  if (patch.alterdataCodigo !== undefined) row.alterdata_codigo = patch.alterdataCodigo || null;
  if (patch.limiteAdiantamento !== undefined) row.limite_adiantamento = patch.limiteAdiantamento;
  if (patch.limiteBonificacao !== undefined) row.limite_bonificacao = patch.limiteBonificacao;
  if (patch.pixPadrao !== undefined) row.pix_padrao = patch.pixPadrao || null;
  if (patch.ativo !== undefined) row.ativo = patch.ativo;
  const { error } = await supabase
    .from("ccipay_funcionarios")
    .update(row)
    .eq("email", String(email).toLowerCase());
  if (error) throw new Error(`[ccipay] atualizar funcionario: ${error.message}`);
  return obterFuncionario(supabase, email);
}

export async function somarAdiantamentosCompetencia(supabase, email, competencia) {
  const { data, error } = await supabase
    .from("ccipay_movimentos")
    .select("valor, status")
    .eq("funcionario_email", String(email).toLowerCase())
    .eq("competencia", competencia)
    .in("tipo", ["adiantamento", "vale"])
    .in("status", STATUS_ADIANTAMENTO_ATIVOS);
  if (error) throw new Error(`[ccipay] somar adiantamentos: ${error.message}`);
  return (data || []).reduce((acc, r) => acc + Number(r.valor), 0);
}

export async function saldoBonificacao(supabase, email, competencia) {
  const { data, error } = await supabase
    .from("ccipay_movimentos")
    .select("direcao, valor, status")
    .eq("funcionario_email", String(email).toLowerCase())
    .eq("competencia", competencia)
    .in("tipo", ["bonificacao", "deducao", "compra_loja"])
    .neq("status", "cancelado")
    .neq("status", "negado");
  if (error) throw new Error(`[ccipay] saldo bonificacao: ${error.message}`);
  let saldo = 0;
  for (const r of data || []) {
    const v = Number(r.valor);
    if (r.direcao === "credito") saldo += v;
    else saldo -= v;
  }
  return saldo;
}

export class CcipayBonificacaoError extends Error {
  constructor(message) {
    super(message);
    this.name = "CcipayBonificacaoError";
    this.status = 400;
  }
}

/** Valida crédito de bonificação contra o teto `limiteBonificacao` (se definido). */
export async function validarCreditoBonificacao(supabase, func, email, competencia, valorCredito) {
  const valor = Number(valorCredito);
  if (Number.isNaN(valor) || valor <= 0) {
    throw new CcipayBonificacaoError("Informe um valor maior que zero.");
  }
  const saldo = await saldoBonificacao(supabase, email, competencia);
  const novoSaldo = saldo + valor;
  if (func.limiteBonificacao != null && novoSaldo > func.limiteBonificacao) {
    const disponivel = Math.max(0, func.limiteBonificacao - saldo);
    throw new CcipayBonificacaoError(
      `Bonificação excede o limite. Disponível para creditar: R$ ${disponivel.toFixed(2)}.`,
    );
  }
  return { saldo, novoSaldo };
}

/** Valida débito (dedução, compra loja, QR) contra o saldo da competência. */
export async function validarDebitoBonificacao(supabase, email, competencia, valorDebito) {
  const valor = Number(valorDebito);
  if (Number.isNaN(valor) || valor <= 0) {
    throw new CcipayBonificacaoError("Informe um valor maior que zero.");
  }
  const saldo = await saldoBonificacao(supabase, email, competencia);
  if (valor > saldo) {
    throw new CcipayBonificacaoError(`Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2)}.`);
  }
  return { saldo, novoSaldo: saldo - valor };
}

export async function criarMovimento(supabase, mov) {
  const now = new Date().toISOString();
  const row = {
    tipo: mov.tipo,
    direcao: mov.direcao,
    valor: mov.valor,
    status: mov.status || "pendente",
    competencia: mov.competencia || competenciaAtual(),
    funcionario_email: String(mov.funcionarioEmail).toLowerCase(),
    funcionario_nome: mov.funcionarioNome || "",
    loja_id: mov.lojaId ?? null,
    pedido_id: mov.pedidoId ?? null,
    criado_por: mov.criadoPor,
    aprovado_por: mov.aprovadoPor ?? null,
    metadata: mov.metadata ?? {},
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase.from("ccipay_movimentos").insert(row).select("*").single();
  if (error) throw new Error(`[ccipay] criar movimento: ${error.message}`);
  return rowToMovimento(data);
}

export async function listarMovimentos(supabase, filtros = {}) {
  let q = supabase.from("ccipay_movimentos").select("*").order("created_at", { ascending: false });
  if (filtros.funcionarioEmail) q = q.eq("funcionario_email", String(filtros.funcionarioEmail).toLowerCase());
  if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
  if (filtros.tipos) q = q.in("tipo", filtros.tipos);
  if (filtros.status) q = q.eq("status", filtros.status);
  if (filtros.competencia) q = q.eq("competencia", filtros.competencia);
  if (filtros.lojaId) q = q.eq("loja_id", filtros.lojaId);
  const { data, error } = await q;
  if (error) throw new Error(`[ccipay] listar movimentos: ${error.message}`);
  return (data || []).map(rowToMovimento);
}

export async function obterMovimento(supabase, id) {
  const { data, error } = await supabase.from("ccipay_movimentos").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`[ccipay] obter movimento: ${error.message}`);
  return data ? rowToMovimento(data) : null;
}

export async function atualizarMovimentoStatus(supabase, id, { status, aprovadoPor, metadataPatch }) {
  const existente = await obterMovimento(supabase, id);
  if (!existente) return null;
  const metadata = { ...existente.metadata, ...(metadataPatch || {}) };
  const { data, error } = await supabase
    .from("ccipay_movimentos")
    .update({
      status,
      aprovado_por: aprovadoPor ?? existente.aprovadoPor,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`[ccipay] atualizar movimento: ${error.message}`);
  return rowToMovimento(data);
}

// --- Lojas ---

export async function listarLojas(supabase, { apenasAtivas = false } = {}) {
  let q = supabase.from("ccipay_lojas").select("*").order("nome", { ascending: true });
  if (apenasAtivas) q = q.eq("ativa", true);
  const { data, error } = await q;
  if (error) throw new Error(`[ccipay] listar lojas: ${error.message}`);
  return (data || []).map(rowToLoja);
}

export async function criarLoja(supabase, { nome, descricao }) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ccipay_lojas")
    .insert({ nome, descricao: descricao || "", created_at: now, updated_at: now })
    .select("*")
    .single();
  if (error) throw new Error(`[ccipay] criar loja: ${error.message}`);
  return rowToLoja(data);
}

export async function atualizarLoja(supabase, id, patch) {
  const row = { updated_at: new Date().toISOString() };
  if (patch.nome !== undefined) row.nome = patch.nome;
  if (patch.descricao !== undefined) row.descricao = patch.descricao;
  if (patch.ativa !== undefined) row.ativa = patch.ativa;
  const { data, error } = await supabase.from("ccipay_lojas").update(row).eq("id", id).select("*").single();
  if (error) throw new Error(`[ccipay] atualizar loja: ${error.message}`);
  return rowToLoja(data);
}

export async function listarUsuariosLoja(supabase, lojaId) {
  const { data, error } = await supabase
    .from("ccipay_loja_usuarios")
    .select("*")
    .eq("loja_id", lojaId);
  if (error) throw new Error(`[ccipay] listar usuarios loja: ${error.message}`);
  return (data || []).map((r) => ({
    lojaId: r.loja_id,
    email: r.email,
    login: r.login ?? null,
    nome: r.nome,
    temSenha: Boolean(r.senha_hash),
  }));
}

export async function obterOperadorPorLogin(supabase, login) {
  const { data, error } = await supabase
    .from("ccipay_loja_usuarios")
    .select("*, ccipay_lojas(id, nome, descricao, ativa)")
    .eq("login", String(login).toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`[ccipay] obter operador: ${error.message}`);
  if (!data) return null;
  const loja = data.ccipay_lojas;
  return {
    lojaId: data.loja_id,
    login: data.login,
    nome: data.nome,
    senhaHash: data.senha_hash ?? null,
    loja: loja
      ? { id: loja.id, nome: loja.nome, descricao: loja.descricao ?? "", ativa: loja.ativa ?? true }
      : null,
  };
}

export async function vincularOperadorLoja(supabase, lojaId, { login, senhaHash, nome }) {
  const loginNorm = String(login).toLowerCase();
  const { error } = await supabase.from("ccipay_loja_usuarios").upsert(
    {
      loja_id: lojaId,
      login: loginNorm,
      email: emailSinteticoParceiro(loginNorm),
      nome: nome || loginNorm,
      senha_hash: senhaHash,
    },
    { onConflict: "loja_id,email" },
  );
  if (error) throw new Error(`[ccipay] vincular operador: ${error.message}`);
}

export async function redefinirSenhaOperador(supabase, login, senhaHash) {
  const { error } = await supabase
    .from("ccipay_loja_usuarios")
    .update({ senha_hash: senhaHash })
    .eq("login", String(login).toLowerCase());
  if (error) throw new Error(`[ccipay] redefinir senha operador: ${error.message}`);
}

export async function desvincularOperadorLoja(supabase, lojaId, login) {
  const { error } = await supabase
    .from("ccipay_loja_usuarios")
    .delete()
    .eq("loja_id", lojaId)
    .eq("login", String(login).toLowerCase());
  if (error) throw new Error(`[ccipay] desvincular operador: ${error.message}`);
}

/** @deprecated use vincularOperadorLoja */
export async function vincularUsuarioLoja(supabase, lojaId, email, nome) {
  const { error } = await supabase.from("ccipay_loja_usuarios").upsert({
    loja_id: lojaId,
    email: String(email).toLowerCase(),
    nome: nome || email,
  });
  if (error) throw new Error(`[ccipay] vincular usuario loja: ${error.message}`);
}

/** @deprecated use desvincularOperadorLoja */
export async function desvincularUsuarioLoja(supabase, lojaId, email) {
  const { error } = await supabase
    .from("ccipay_loja_usuarios")
    .delete()
    .eq("loja_id", lojaId)
    .eq("email", String(email).toLowerCase());
  if (error) throw new Error(`[ccipay] desvincular usuario loja: ${error.message}`);
}

// --- Lançadores ---

export async function listarLancadores(supabase) {
  const { data, error } = await supabase.from("ccipay_lancadores").select("*").order("nome");
  if (error) throw new Error(`[ccipay] listar lancadores: ${error.message}`);
  return (data || []).map((r) => ({ email: r.email, nome: r.nome, ativo: r.ativo }));
}

export async function salvarLancador(supabase, email, nome, ativo = true) {
  const { error } = await supabase.from("ccipay_lancadores").upsert({
    email: String(email).toLowerCase(),
    nome: nome || email,
    ativo,
  });
  if (error) throw new Error(`[ccipay] salvar lancador: ${error.message}`);
}

export async function removerLancador(supabase, email) {
  const { error } = await supabase
    .from("ccipay_lancadores")
    .delete()
    .eq("email", String(email).toLowerCase());
  if (error) throw new Error(`[ccipay] remover lancador: ${error.message}`);
}

// --- Catálogo ---

export async function listarCatalogo(supabase, lojaId, { apenasAtivos = false } = {}) {
  let q = supabase.from("ccipay_catalogo_itens").select("*").eq("loja_id", lojaId).order("nome");
  if (apenasAtivos) q = q.eq("ativo", true);
  const { data, error } = await q;
  if (error) throw new Error(`[ccipay] listar catalogo: ${error.message}`);
  return (data || []).map(rowToCatalogoItem);
}

export async function salvarCatalogoItem(supabase, item) {
  const now = new Date().toISOString();
  if (item.id) {
    const { data, error } = await supabase
      .from("ccipay_catalogo_itens")
      .update({
        nome: item.nome,
        descricao: item.descricao ?? "",
        preco: item.preco,
        estoque: item.estoque ?? null,
        ativo: item.ativo ?? true,
        updated_at: now,
      })
      .eq("id", item.id)
      .select("*")
      .single();
    if (error) throw new Error(`[ccipay] atualizar catalogo: ${error.message}`);
    return rowToCatalogoItem(data);
  }
  const { data, error } = await supabase
    .from("ccipay_catalogo_itens")
    .insert({
      loja_id: item.lojaId,
      nome: item.nome,
      descricao: item.descricao ?? "",
      preco: item.preco,
      estoque: item.estoque ?? null,
      ativo: item.ativo ?? true,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) throw new Error(`[ccipay] criar catalogo: ${error.message}`);
  return rowToCatalogoItem(data);
}

// --- Pedidos ---

export async function criarPedido(supabase, pedido, itens) {
  const now = new Date().toISOString();
  const { data: ped, error: errPed } = await supabase
    .from("ccipay_pedidos_loja")
    .insert({
      loja_id: pedido.lojaId,
      funcionario_email: String(pedido.funcionarioEmail).toLowerCase(),
      funcionario_nome: pedido.funcionarioNome,
      status: "pendente",
      valor_total: pedido.valorTotal,
      observacao: pedido.observacao ?? "",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (errPed) throw new Error(`[ccipay] criar pedido: ${errPed.message}`);

  const rowsItens = itens.map((i) => ({
    pedido_id: ped.id,
    item_id: i.itemId ?? null,
    nome: i.nome,
    quantidade: i.quantidade,
    preco_unitario: i.precoUnitario,
    subtotal: i.subtotal,
  }));
  const { error: errItens } = await supabase.from("ccipay_pedidos_itens").insert(rowsItens);
  if (errItens) throw new Error(`[ccipay] criar itens pedido: ${errItens.message}`);

  return obterPedidoCompleto(supabase, ped.id);
}

export async function obterPedidoCompleto(supabase, id) {
  const { data: ped, error } = await supabase.from("ccipay_pedidos_loja").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`[ccipay] obter pedido: ${error.message}`);
  if (!ped) return null;
  const { data: itens } = await supabase.from("ccipay_pedidos_itens").select("*").eq("pedido_id", id);
  const mappedItens = (itens || []).map((i) => ({
    id: i.id,
    itemId: i.item_id,
    nome: i.nome,
    quantidade: i.quantidade,
    precoUnitario: Number(i.preco_unitario),
    subtotal: Number(i.subtotal),
  }));
  return rowToPedido(ped, mappedItens);
}

export async function listarPedidos(supabase, filtros = {}) {
  let q = supabase.from("ccipay_pedidos_loja").select("*").order("created_at", { ascending: false });
  if (filtros.lojaId) q = q.eq("loja_id", filtros.lojaId);
  if (filtros.funcionarioEmail) q = q.eq("funcionario_email", String(filtros.funcionarioEmail).toLowerCase());
  if (filtros.status) q = q.eq("status", filtros.status);
  const { data, error } = await q;
  if (error) throw new Error(`[ccipay] listar pedidos: ${error.message}`);
  const out = [];
  for (const ped of data || []) {
    out.push(await obterPedidoCompleto(supabase, ped.id));
  }
  return out;
}

export async function atualizarPedidoStatus(supabase, id, status, confirmadoPor) {
  const { data, error } = await supabase
    .from("ccipay_pedidos_loja")
    .update({ status, confirmado_por: confirmadoPor ?? null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`[ccipay] atualizar pedido: ${error.message}`);
  return obterPedidoCompleto(supabase, data.id);
}

export async function relatorioDpMovimentos(supabase, { competencia, tipo, status }) {
  let q = supabase.from("ccipay_movimentos").select("*").order("created_at", { ascending: false });
  if (competencia) q = q.eq("competencia", competencia);
  if (tipo) q = q.eq("tipo", tipo);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(`[ccipay] relatorio dp: ${error.message}`);
  return (data || []).map(rowToMovimento);
}

export async function relatorioResumoPorFuncionario(supabase, competencia) {
  const funcionarios = await listarFuncionarios(supabase);
  const resumo = [];
  for (const f of funcionarios) {
    const usado = await somarAdiantamentosCompetencia(supabase, f.email, competencia);
    const saldoBon = await saldoBonificacao(supabase, f.email, competencia);
    if (!f.ativo && usado === 0 && saldoBon === 0) continue;
    resumo.push({
      email: f.email,
      nome: f.nome,
      codigoReferencia: f.alterdataCodigo,
      ativo: f.ativo,
      limiteAdiantamento: f.limiteAdiantamento,
      adiantamentoUsado: usado,
      adiantamentoDisponivel: Math.max(0, f.limiteAdiantamento - usado),
      limiteBonificacao: f.limiteBonificacao,
      saldoBonificacao: saldoBon,
    });
  }
  return resumo;
}

export async function relatorioLojaPedidos(supabase, { lojaId, de, ate }) {
  let q = supabase.from("ccipay_pedidos_loja").select("*").eq("loja_id", lojaId);
  if (de) q = q.gte("created_at", de);
  if (ate) q = q.lte("created_at", ate);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(`[ccipay] relatorio loja: ${error.message}`);
  const out = [];
  for (const ped of data || []) {
    out.push(await obterPedidoCompleto(supabase, ped.id));
  }
  return out;
}

export async function montarResumoFuncionario(supabase, email) {
  const comp = competenciaAtual();
  const func = await obterFuncionario(supabase, email);
  if (!func) return null;
  const usado = await somarAdiantamentosCompetencia(supabase, email, comp);
  const saldoBon = await saldoBonificacao(supabase, email, comp);
  const movimentos = await listarMovimentos(supabase, { funcionarioEmail: email });
  const bonificacaoDisponivelGastar = saldoBon;
  const bonificacaoTeto =
    func.limiteBonificacao != null ? func.limiteBonificacao : null;
  const bonificacaoDisponivelCreditar =
    func.limiteBonificacao != null
      ? Math.max(0, func.limiteBonificacao - saldoBon)
      : null;

  return {
    funcionario: func,
    competencia: comp,
    adiantamentoUsado: usado,
    adiantamentoDisponivel: Math.max(0, func.limiteAdiantamento - usado),
    saldoBonificacao: saldoBon,
    bonificacaoDisponivelGastar,
    bonificacaoTeto,
    bonificacaoDisponivelCreditar,
    movimentos: movimentos.slice(0, 50),
  };
}

// --- Vendas QR (portal parceiro) ---

function rowToVendaQr(row, lojaNome = "") {
  return {
    id: row.id,
    token: row.token,
    lojaId: row.loja_id,
    lojaNome,
    valor: Number(row.valor),
    descricao: row.descricao ?? "",
    status: row.status,
    funcionarioEmail: row.funcionario_email ?? null,
    funcionarioNome: row.funcionario_nome ?? null,
    movimentoId: row.movimento_id ?? null,
    criadoPor: row.criado_por,
    expiresAt: row.expires_at,
    pagoEm: row.pago_em ?? null,
    createdAt: row.created_at,
  };
}

async function enriquecerVenda(supabase, row) {
  const { data: loja } = await supabase
    .from("ccipay_lojas")
    .select("nome")
    .eq("id", row.loja_id)
    .maybeSingle();
  return rowToVendaQr(row, loja?.nome ?? "");
}

export async function criarVendaQr(supabase, { lojaId, valor, descricao, criadoPor, token, expiresAt }) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ccipay_vendas_qr")
    .insert({
      token,
      loja_id: lojaId,
      valor,
      descricao: descricao || "",
      status: "pendente",
      criado_por: criadoPor,
      expires_at: expiresAt,
      created_at: now,
    })
    .select("*")
    .single();
  if (error) throw new Error(`[ccipay] criar venda qr: ${error.message}`);
  return enriquecerVenda(supabase, data);
}

export async function obterVendaPorToken(supabase, token) {
  const { data, error } = await supabase
    .from("ccipay_vendas_qr")
    .select("*")
    .eq("token", String(token))
    .maybeSingle();
  if (error) throw new Error(`[ccipay] obter venda qr: ${error.message}`);
  if (!data) return null;
  return enriquecerVenda(supabase, data);
}

export async function obterVendaPorId(supabase, id) {
  const { data, error } = await supabase
    .from("ccipay_vendas_qr")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`[ccipay] obter venda qr: ${error.message}`);
  if (!data) return null;
  return enriquecerVenda(supabase, data);
}

export async function listarVendasQr(supabase, { lojaId, status, de, ate }) {
  let q = supabase.from("ccipay_vendas_qr").select("*").eq("loja_id", lojaId);
  if (status) q = q.eq("status", status);
  if (de) q = q.gte("created_at", de);
  if (ate) q = q.lte("created_at", ate);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(`[ccipay] listar vendas qr: ${error.message}`);
  const out = [];
  for (const row of data || []) {
    out.push(await enriquecerVenda(supabase, row));
  }
  return out;
}

export async function resumoVendasParceiro(supabase, lojaId) {
  const comp = competenciaAtual();
  const inicioMes = `${comp}-01T00:00:00.000Z`;
  const vendas = await listarVendasQr(supabase, { lojaId, de: inicioMes });
  let aReceber = 0;
  let pendente = 0;
  let totalMes = 0;
  let qtdPendentes = 0;
  for (const v of vendas) {
    if (v.status === "pago") {
      aReceber += v.valor;
      totalMes += v.valor;
    } else if (v.status === "pendente") {
      pendente += v.valor;
      qtdPendentes += 1;
    }
  }
  return { aReceber, pendente, totalMes, qtdPendentes, vendasMes: vendas.length };
}

export async function atualizarVendaQr(supabase, id, patch) {
  const row = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.funcionarioEmail !== undefined) row.funcionario_email = patch.funcionarioEmail;
  if (patch.funcionarioNome !== undefined) row.funcionario_nome = patch.funcionarioNome;
  if (patch.movimentoId !== undefined) row.movimento_id = patch.movimentoId;
  if (patch.pagoEm !== undefined) row.pago_em = patch.pagoEm;
  const { data, error } = await supabase
    .from("ccipay_vendas_qr")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`[ccipay] atualizar venda qr: ${error.message}`);
  return enriquecerVenda(supabase, data);
}
