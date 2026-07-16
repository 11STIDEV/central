/**
 * Papéis e visibilidade de chamados — espelha `src/auth/AuthProvider.tsx` (OU → papel).
 */

export function normalizarCaminhoOu(path) {
  let s = String(path)
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

const RE_SEG_OU_ALUNO = /(^|\/)(alunos faculdade|alunos teccscci)(\/|$)/;

const OU_PARA_PAPEL = new Map([
  [normalizarCaminhoOu("/Administrativo/Biblioteca"), "biblioteca"],
  [normalizarCaminhoOu("/Administrativo/Direção"), "direcao"],
  [normalizarCaminhoOu("/Administrativo/Disciplinar"), "disciplinar"],
  [normalizarCaminhoOu("/Administrativo/DP"), "dp"],
  [normalizarCaminhoOu("/Administrativo/Faculdade"), "faculdade"],
  [normalizarCaminhoOu("/Administrativo/Financeiro"), "financeiro"],
  [normalizarCaminhoOu("/Administrativo/Publicidade"), "publicidade"],
  [normalizarCaminhoOu("/Administrativo/Secretaria"), "secretaria"],
  [normalizarCaminhoOu("/Administrativo/Serviços Gerais"), "servicosgerais"],
  [normalizarCaminhoOu("/Administrativo/Setape"), "setape"],
  [normalizarCaminhoOu("/Administrativo/Almoxarifado"), "almoxarifado"],
  [normalizarCaminhoOu("/Administrativo/Primeiros Socorros"), "primeirossocorros"],
  [normalizarCaminhoOu("/Administrativo/CLAT"), "clat"],
  [normalizarCaminhoOu("/Professores FAC"), "professorfac"],
  [normalizarCaminhoOu("/Professores TECS"), "professortecs"],
  [normalizarCaminhoOu("/Professores REGULAR"), "professorregular"],
  [normalizarCaminhoOu("/Alunos FACULDADE"), "aluno"],
  [normalizarCaminhoOu("/Alunos TECSCCI"), "aluno"],
  [normalizarCaminhoOu("/Portalcci.com.br/Alunos FACULDADE"), "aluno"],
  [normalizarCaminhoOu("/Portalcci.com.br/Alunos TECSCCI"), "aluno"],
]);

/** @param {string|null|undefined} orgUnitPath @returns {string[]} */
export function mapearPapeisDoOrgUnit(orgUnitPath) {
  const papeis = new Set(["usuario"]);
  if (!orgUnitPath || String(orgUnitPath).trim() === "") {
    return Array.from(papeis);
  }
  const chave = normalizarCaminhoOu(orgUnitPath);
  let papelOu = OU_PARA_PAPEL.get(chave);
  if (!papelOu && RE_SEG_OU_ALUNO.test(chave)) {
    papelOu = "aluno";
  }
  if (papelOu) papeis.add(papelOu);
  return Array.from(papeis);
}

/** @param {string[]} papeis @param {string[]} papeisManuais */
export function mesclarPapeisManuais(papeis, papeisManuais) {
  const out = new Set(papeis);
  const permitidos = new Set(["admin", "painel_admin", "painel_atendente"]);
  for (const p of papeisManuais || []) {
    if (typeof p === "string" && permitidos.has(p)) out.add(p);
  }
  return Array.from(out);
}

/** @param {string[]} papeis */
export function papelPrincipalUsuario(papeis) {
  const semUsuario = papeis.filter((p) => p !== "usuario");
  return semUsuario.length > 0 ? semUsuario[0] : "usuario";
}

/**
 * @param {{ email: string, papeis: string[] }} viewer
 * @param {{ solicitanteEmail: string, papelAbertura: string, setorDestino?: string }} chamado
 */
export function podeVerChamado(viewer, chamado) {
  if (viewer.papeis.includes("admin")) return true;
  if (viewer.papeis.includes("setape")) return true;
  const dest = chamado.setorDestino ?? "setape";
  if (viewer.papeis.includes(dest)) return true;
  if (
    chamado.solicitanteEmail.toLowerCase() === viewer.email.toLowerCase()
  ) {
    return true;
  }
  return chamado.papelAbertura === papelPrincipalUsuario(viewer.papeis);
}

export function podeGerenciarChamado(viewer, chamado) {
  if (viewer.papeis.includes("admin")) return true;
  if (viewer.papeis.includes("setape")) return true;
  const dest = chamado.setorDestino ?? "setape";
  return viewer.papeis.includes(dest);
}

/** @param {string[]} papeis */
export function isSetapeOuAdmin(papeis) {
  return papeis.includes("setape") || papeis.includes("admin");
}
