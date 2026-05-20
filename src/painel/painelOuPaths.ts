/**
 * Reconhecimento de OU do Google Workspace para permissões do painel de senhas.
 * Caminhos podem vir como `/Administrativo/Secretaria` ou `/portalcci.com.br/Administrativo/Secretaria`.
 */

export function normalizarCaminhoOuPainel(path: string): string {
  let s = path
    .trim()
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .replace(/\s+/g, " ");
  if (!s.startsWith("/")) s = `/${s}`;
  s = s.replace(/\/+/g, "/").replace(/\/+$/, "");
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Funcionários da Secretaria (e sub-OUs) → atendente do painel. */
const RE_OU_PAINEL_SECRETARIA = /(^|\/)administrativo\/secretaria(\/|$)/;

/** Setape / Direção → administração do painel. */
const RE_OU_PAINEL_ADMIN = /(^|\/)administrativo\/(setape|direcao)(\/|$)/;

export function ouPainelAtendentePeloCaminho(chaveNormalizada: string): boolean {
  if (RE_OU_PAINEL_SECRETARIA.test(chaveNormalizada)) return true;
  const prefixo = normalizarCaminhoOuPainel("/Administrativo/Secretaria");
  return chaveNormalizada === prefixo || chaveNormalizada.startsWith(`${prefixo}/`);
}

export function ouPainelAdminPeloCaminho(chaveNormalizada: string): boolean {
  if (RE_OU_PAINEL_ADMIN.test(chaveNormalizada)) return true;
  for (const segmento of ["setape", "direcao"]) {
    const prefixo = normalizarCaminhoOuPainel(`/Administrativo/${segmento === "direcao" ? "Direção" : "Setape"}`);
    if (chaveNormalizada === prefixo || chaveNormalizada.startsWith(`${prefixo}/`)) return true;
  }
  return false;
}
