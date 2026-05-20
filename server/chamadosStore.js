/** Persistência de chamados no Supabase (service_role). */

function rowToChamado(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    solicitante: row.solicitante,
    solicitanteEmail: row.solicitante_email,
    papelAbertura: row.papel_abertura,
    categoria: row.categoria,
    prioridade: row.prioridade,
    status: row.status,
    data: row.data_abertura,
    descricao: row.descricao ?? "",
    acompanhamentos: Array.isArray(row.acompanhamentos) ? row.acompanhamentos : [],
    tarefas: Array.isArray(row.tarefas) ? row.tarefas : [],
    solucao: row.solucao && typeof row.solucao === "object" ? row.solucao : undefined,
  };
}

function chamadoToRow(chamado) {
  const now = new Date().toISOString();
  return {
    id: chamado.id,
    titulo: chamado.titulo,
    solicitante: chamado.solicitante,
    solicitante_email: chamado.solicitanteEmail,
    papel_abertura: chamado.papelAbertura,
    categoria: chamado.categoria,
    prioridade: chamado.prioridade,
    status: chamado.status,
    data_abertura: chamado.data,
    descricao: chamado.descricao ?? "",
    acompanhamentos: chamado.acompanhamentos ?? [],
    tarefas: chamado.tarefas ?? [],
    solucao: chamado.solucao ?? null,
    updated_at: now,
  };
}

export async function listarTodosChamados(supabase) {
  const { data, error } = await supabase
    .from("intranet_chamados")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`[chamados/supabase] leitura: ${error.message}`);
  }
  return (data || []).map(rowToChamado);
}

export async function obterChamadoPorId(supabase, id) {
  const { data, error } = await supabase
    .from("intranet_chamados")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`[chamados/supabase] leitura: ${error.message}`);
  }
  return data ? rowToChamado(data) : null;
}

export async function inserirChamado(supabase, chamado) {
  const row = { ...chamadoToRow(chamado), created_at: new Date().toISOString() };
  const { error } = await supabase.from("intranet_chamados").insert(row);
  if (error) {
    throw new Error(`[chamados/supabase] inserção: ${error.message}`);
  }
  return chamado;
}

export async function atualizarChamado(supabase, chamado) {
  const row = chamadoToRow(chamado);
  const { error } = await supabase.from("intranet_chamados").update(row).eq("id", chamado.id);
  if (error) {
    throw new Error(`[chamados/supabase] atualização: ${error.message}`);
  }
  return chamado;
}
