/** Permissões CCI Pay — espelha regras do frontend. */

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
