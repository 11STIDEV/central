/** Persistência de usuários no Supabase. */

export async function registrarOuAtualizarUsuario(supabase, { email, nome, setor, isGerente, fotoUrl }) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("intranet_usuarios")
    .upsert(
      {
        email,
        nome,
        setor: setor ?? null,
        is_gerente: isGerente ?? false,
        foto_url: fotoUrl ?? null,
        atualizado_em: now,
      },
      { onConflict: "email", ignoreDuplicates: false }
    );
  if (error) {
    throw new Error(`[usuarios/supabase] upsert: ${error.message}`);
  }
}

export async function listarUsuariosPorSetor(supabase, setor) {
  const { data, error } = await supabase
    .from("intranet_usuarios")
    .select("email, nome, is_gerente, foto_url")
    .eq("setor", setor)
    .order("nome", { ascending: true });
  if (error) {
    throw new Error(`[usuarios/supabase] listar: ${error.message}`);
  }
  return (data || []).map((row) => ({
    email: row.email,
    nome: row.nome,
    isGerente: row.is_gerente ?? false,
    fotoUrl: row.foto_url ?? null,
  }));
}
