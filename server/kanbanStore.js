/** Persistência dos cards do Kanban no Supabase. */

function rowToCard(row) {
  return {
    id: row.id,
    setor: row.setor,
    titulo: row.titulo,
    descricao: row.descricao ?? "",
    coluna: row.coluna,
    atribuidoA: Array.isArray(row.atribuido_a) ? row.atribuido_a : [],
    atribuidoNome: Array.isArray(row.atribuido_nome) ? row.atribuido_nome : [],
    criadoPor: row.criado_por,
    criadoPorNome: row.criado_por_nome ?? null,
    prioridade: row.prioridade ?? "media",
    dataLimite: row.data_limite ?? null,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

export async function listarCardsPorSetor(supabase, setor) {
  const { data, error } = await supabase
    .from("intranet_kanban_cards")
    .select("*")
    .eq("setor", setor)
    .order("criado_em", { ascending: true });
  if (error) throw new Error(`[kanban/listar] ${error.message}`);
  return (data || []).map(rowToCard);
}

export async function criarCard(supabase, card) {
  const now = new Date().toISOString();
  const row = {
    id: card.id,
    setor: card.setor,
    titulo: card.titulo,
    descricao: card.descricao ?? "",
    coluna: card.coluna ?? "todo",
    atribuido_a: Array.isArray(card.atribuidoA) ? card.atribuidoA : [],
    atribuido_nome: Array.isArray(card.atribuidoNome) ? card.atribuidoNome : [],
    criado_por: card.criadoPor,
    criado_por_nome: card.criadoPorNome ?? null,
    prioridade: card.prioridade ?? "media",
    data_limite: card.dataLimite ?? null,
    criado_em: now,
    atualizado_em: now,
  };
  const { data, error } = await supabase
    .from("intranet_kanban_cards")
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(`[kanban/criar] ${error.message}`);
  return rowToCard(data);
}

export async function atualizarCard(supabase, id, patch) {
  const row = {};
  if (patch.titulo !== undefined) row.titulo = patch.titulo;
  if (patch.descricao !== undefined) row.descricao = patch.descricao;
  if (patch.coluna !== undefined) row.coluna = patch.coluna;
  if (patch.atribuidoA !== undefined) {
    row.atribuido_a = Array.isArray(patch.atribuidoA) ? patch.atribuidoA : [];
  }
  if (patch.atribuidoNome !== undefined) {
    row.atribuido_nome = Array.isArray(patch.atribuidoNome) ? patch.atribuidoNome : [];
  }
  if (patch.prioridade !== undefined) row.prioridade = patch.prioridade;
  if (patch.dataLimite !== undefined) row.data_limite = patch.dataLimite;
  row.atualizado_em = new Date().toISOString();
  const { data, error } = await supabase
    .from("intranet_kanban_cards")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`[kanban/atualizar] ${error.message}`);
  return rowToCard(data);
}

export async function excluirCard(supabase, id) {
  const { error } = await supabase
    .from("intranet_kanban_cards")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`[kanban/excluir] ${error.message}`);
}
