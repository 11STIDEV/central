/**
 * Visibilidade de avisos por papel (OU do Workspace).
 * Institucional: todos com papel de setor; quem só tem `usuario` vê apenas institucional.
 * Papel `aluno`: sem acesso a avisos.
 */

import { AVISO_SETORES_VALIDOS } from "./avisosStore.js";

/** @type {Record<string, string[]>} */
const PAPEL_PARA_SETORES_AVISO = {
  biblioteca: ["biblioteca"],
  direcao: ["direcao"],
  disciplinar: ["disciplinar"],
  dp: ["dp", "financeiro"],
  faculdade: ["faculdade"],
  financeiro: ["dp", "financeiro"],
  publicidade: ["publicidade"],
  secretaria: ["secretaria"],
  servicosgerais: ["servicosgerais"],
  setape: ["setape"],
  almoxarifado: ["almoxarifado"],
  primeirossocorros: ["primeiros-socorros"],
  clat: ["clat"],
  professorfac: ["professores-faculdade"],
  professortecs: ["professores-tecs"],
  professorregular: ["professores-regular"],
};

const PAPEIS_COM_SETOR = Object.keys(PAPEL_PARA_SETORES_AVISO);

/** @param {string[]} papeis */
export function podeAcessarAvisos(papeis) {
  if (papeis.includes("admin")) return true;
  return !papeis.includes("aluno");
}

/**
 * Setores que o usuário pode ver. `null` = todos (admin).
 * @param {string[]} papeis
 * @returns {string[] | null}
 */
export function setoresVisiveisParaPapeis(papeis) {
  if (papeis.includes("admin")) return null;
  if (papeis.includes("aluno")) return [];

  const temPapelDeSetor = papeis.some((p) => PAPEIS_COM_SETOR.includes(p));
  if (!temPapelDeSetor) {
    return ["institucional"];
  }

  const setores = new Set(["institucional"]);
  for (const papel of papeis) {
    const lista = PAPEL_PARA_SETORES_AVISO[papel];
    if (lista) {
      for (const s of lista) setores.add(s);
    }
  }
  return Array.from(setores);
}

/**
 * @param {{ papeis: string[] }} viewer
 * @param {{ setor: string }} aviso
 */
export function podeVerAviso(viewer, aviso) {
  if (!podeAcessarAvisos(viewer.papeis)) return false;
  const permitidos = setoresVisiveisParaPapeis(viewer.papeis);
  if (permitidos === null) return true;
  return permitidos.includes(aviso.setor);
}

/** @param {string[]} papeis @param {string} setor */
export function podePublicarNoSetor(papeis, setor) {
  if (!AVISO_SETORES_VALIDOS.includes(setor)) return false;
  // Regra de negócio: somente administradores podem publicar avisos.
  return papeis.includes("admin");
}

