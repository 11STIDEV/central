/**
 * Resolução de papéis do usuário (espelha AuthProvider + chamadosAccess).
 */
import {
  mapearPapeisDoOrgUnit,
  mesclarPapeisManuais,
  normalizarCaminhoOu,
} from "./chamadosAccess.js";

const GERENTE_OU = new Map([
  [normalizarCaminhoOu("/Administrativo/Biblioteca/Gerente"), "gerente_biblioteca"],
  [normalizarCaminhoOu("/Administrativo/Direção/Gerente"), "gerente_direcao"],
  [normalizarCaminhoOu("/Administrativo/Disciplinar/Gerente"), "gerente_disciplinar"],
  [normalizarCaminhoOu("/Administrativo/DP/Gerente"), "gerente_dp"],
  [normalizarCaminhoOu("/Administrativo/Faculdade/Gerente"), "gerente_faculdade"],
  [normalizarCaminhoOu("/Administrativo/Financeiro/Gerente"), "gerente_financeiro"],
  [normalizarCaminhoOu("/Administrativo/Publicidade/Gerente"), "gerente_publicidade"],
  [normalizarCaminhoOu("/Administrativo/Secretaria/Gerente"), "gerente_secretaria"],
  [normalizarCaminhoOu("/Administrativo/Serviços Gerais/Gerente"), "gerente_servicosgerais"],
  [normalizarCaminhoOu("/Administrativo/Setape/Gerente"), "gerente_setape"],
  [normalizarCaminhoOu("/Administrativo/Almoxarifado/Gerente"), "gerente_almoxarifado"],
  [normalizarCaminhoOu("/Administrativo/Primeiros Socorros/Gerente"), "gerente_primeirossocorros"],
  [normalizarCaminhoOu("/Administrativo/CLAT/Gerente"), "gerente_clat"],
]);

const GERENTE_PARA_BASE = {
  gerente_biblioteca: "biblioteca",
  gerente_direcao: "direcao",
  gerente_disciplinar: "disciplinar",
  gerente_dp: "dp",
  gerente_faculdade: "faculdade",
  gerente_financeiro: "financeiro",
  gerente_publicidade: "publicidade",
  gerente_secretaria: "secretaria",
  gerente_servicosgerais: "servicosgerais",
  gerente_setape: "setape",
  gerente_almoxarifado: "almoxarifado",
  gerente_primeirossocorros: "primeirossocorros",
  gerente_clat: "clat",
};

function parseCentralAdminEmails() {
  const raw =
    process.env.CENTRAL_ADMIN_EMAILS ||
    process.env.VITE_CENTRAL_ADMIN_EMAILS ||
    "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isCentralAdminEmail(email) {
  const e = String(email || "")
    .trim()
    .toLowerCase();
  if (!e) return false;
  return parseCentralAdminEmails().includes(e);
}

/**
 * @param {string|null|undefined} orgUnitPath
 * @param {string} email
 * @param {string[]} papeisManuais
 * @param {{ ouPainelAtendente: (chave: string) => boolean, ouPainelAdmin: (chave: string) => boolean }} painel
 */
export function resolverPapeisCompletos(orgUnitPath, email, papeisManuais, painel) {
  const papeis = new Set(mapearPapeisDoOrgUnit(orgUnitPath));

  if (orgUnitPath && String(orgUnitPath).trim() !== "") {
    const chave = normalizarCaminhoOu(orgUnitPath);
    const gerente = GERENTE_OU.get(chave);
    if (gerente) {
      papeis.add(gerente);
      const base = GERENTE_PARA_BASE[gerente];
      if (base) papeis.add(base);
    }
    if (painel.ouPainelAtendente(chave)) {
      papeis.add("painel_atendente");
      papeis.add("secretaria");
    }
    if (painel.ouPainelAdmin(chave)) {
      papeis.add("painel_admin");
    }
  }

  if (isCentralAdminEmail(email)) {
    papeis.add("admin");
  }

  return mesclarPapeisManuais(Array.from(papeis), papeisManuais);
}

/** @param {{ email: string, nome: string, picture?: string, papeis: string[], orgUnitPath?: string|null }} data */
export function contextoViewerFromSession(data) {
  return {
    email: data.email,
    nome: data.nome,
    picture: data.picture,
    papeis: data.papeis,
    orgUnitPath: data.orgUnitPath ?? null,
    viewer: { email: data.email, papeis: data.papeis },
  };
}
