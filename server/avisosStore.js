/** Persistência de avisos no Supabase (service_role). */

export const AVISO_TIPOS_VALIDOS = [
  "aviso",
  "informativo",
  "urgente",
  "tutorial",
  "atualizacao",
];

export const AVISO_SETORES_VALIDOS = [
  "institucional",
  "direcao",
  "secretaria",
  "dp",
  "financeiro",
  "setape",
  "disciplinar",
  "publicidade",
  "servicosgerais",
  "almoxarifado",
  "biblioteca",
  "faculdade",
  "clat",
  "primeiros-socorros",
  "professores-faculdade",
  "professores-tecs",
  "professores-regular",
];

function rowToAviso(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    conteudo: row.conteudo ?? "",
    tipo: row.tipo,
    setor: row.setor,
    autor: row.autor,
    autorEmail: row.autor_email,
    data: row.data_publicacao,
    createdAt: row.created_at,
  };
}

function avisoToRow(aviso) {
  const now = new Date().toISOString();
  return {
    id: aviso.id,
    titulo: aviso.titulo,
    conteudo: aviso.conteudo ?? "",
    tipo: aviso.tipo,
    setor: aviso.setor,
    autor: aviso.autor,
    autor_email: aviso.autorEmail,
    data_publicacao: aviso.data,
    updated_at: now,
  };
}

export async function listarTodosAvisos(supabase) {
  const { data, error } = await supabase
    .from("intranet_avisos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`[avisos/supabase] leitura: ${error.message}`);
  }
  return (data || []).map(rowToAviso);
}

export async function inserirAviso(supabase, aviso) {
  const row = { ...avisoToRow(aviso), created_at: new Date().toISOString() };
  const { error } = await supabase.from("intranet_avisos").insert(row);
  if (error) {
    throw new Error(`[avisos/supabase] inserção: ${error.message}`);
  }
  return aviso;
}
