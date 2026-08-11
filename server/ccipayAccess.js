/** Permissões Advance-CCI — espelha regras do frontend. */

/** Módulo em revisão na Central — APIs bloqueadas exceto para admin (portal parceiro continua). */
export const CCIPAY_MODULO_BLOQUEADO = false;

export function isCcipayModuloLiberado(papeis) {
  if (!CCIPAY_MODULO_BLOQUEADO) return true;
  return (papeis || []).includes("admin");
}

const PAPEIS_CCIPAY_DP = new Set([
  "admin",
  "ccipay_admin",
  "ccipay_dp",
  "dp",
  "financeiro",
  "gerente_dp",
  "gerente_financeiro",
]);

const PAPEIS_CCIPAY_ADMIN = new Set(["admin", "ccipay_admin"]);

const PAPEIS_CCIPAY_LANCAMENTO = new Set(["admin", "ccipay_admin", "ccipay_lancador"]);

export function competenciaAtual() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function isCcipayAdmin(papeis) {
  return (papeis || []).some((p) => PAPEIS_CCIPAY_ADMIN.has(p));
}

export function isCcipayDp(papeis) {
  return (papeis || []).some((p) => PAPEIS_CCIPAY_DP.has(p));
}

export function isCcipayLancadorRole(papeis) {
  return (papeis || []).some((p) => PAPEIS_CCIPAY_LANCAMENTO.has(p));
}

export async function isCcipayLancador(supabase, email, papeis) {
  if (isCcipayLancadorRole(papeis)) return true;
  if (!supabase || !email) return false;
  const { data } = await supabase
    .from("ccipay_lancadores")
    .select("email")
    .eq("email", String(email).toLowerCase())
    .eq("ativo", true)
    .maybeSingle();
  return Boolean(data);
}

export async function lojasDoLogin(supabase, login) {
  if (!supabase || !login) return [];
  const { data, error } = await supabase
    .from("ccipay_loja_usuarios")
    .select("loja_id, senha_hash, ccipay_lojas(id, nome, descricao, ativa)")
    .eq("login", String(login).toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.ccipay_lojas || !data.senha_hash || !data.ccipay_lojas.ativa) return [];
  const l = data.ccipay_lojas;
  return [{ id: l.id, nome: l.nome, descricao: l.descricao ?? "", ativa: l.ativa ?? true }];
}

export async function isOperadorParceiro(supabase, login, lojaId) {
  if (!supabase || !login || !lojaId) return false;
  const lojas = await lojasDoLogin(supabase, login);
  return lojas.some((l) => l.id === lojaId);
}

export async function lojasDoUsuario(supabase, email) {
  if (!supabase || !email) return [];
  const { data, error } = await supabase
    .from("ccipay_loja_usuarios")
    .select("loja_id, ccipay_lojas(id, nome, descricao, ativa)")
    .eq("email", String(email).toLowerCase());
  if (error) throw new Error(error.message);
  return (data || [])
    .map((r) => r.ccipay_lojas)
    .filter((l) => l && l.ativa);
}

export async function isOperadorLoja(supabase, email, lojaId, papeis) {
  if (isCcipayAdmin(papeis)) return true;
  if ((papeis || []).includes("ccipay_loja") && lojaId) {
    const lojas = await lojasDoUsuario(supabase, email);
    return lojas.some((l) => l.id === lojaId);
  }
  if (!lojaId) return (papeis || []).includes("ccipay_loja");
  const lojas = await lojasDoUsuario(supabase, email);
  return lojas.some((l) => l.id === lojaId);
}
