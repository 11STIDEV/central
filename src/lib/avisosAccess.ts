import type { Papel } from "@/auth/AuthProvider";
import type { Aviso, AvisoSetor } from "@/lib/avisos";
import { AVISO_SETORES } from "@/lib/avisos";

const PAPEL_PARA_SETORES_AVISO: Partial<Record<Papel, AvisoSetor[]>> = {
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

const PAPEIS_COM_SETOR = Object.keys(PAPEL_PARA_SETORES_AVISO) as Papel[];

export function podeAcessarAvisos(papeis: Papel[]): boolean {
  if (papeis.includes("admin")) return true;
  return !papeis.includes("aluno");
}

/** `null` = todos os setores (admin). */
export function setoresVisiveisParaPapeis(papeis: Papel[]): AvisoSetor[] | null {
  if (papeis.includes("admin")) return null;
  if (papeis.includes("aluno")) return [];

  const temPapelDeSetor = papeis.some((p) => PAPEIS_COM_SETOR.includes(p));
  if (!temPapelDeSetor) {
    return ["institucional"];
  }

  const setores = new Set<AvisoSetor>(["institucional"]);
  for (const papel of papeis) {
    const lista = PAPEL_PARA_SETORES_AVISO[papel];
    if (lista) {
      for (const s of lista) setores.add(s);
    }
  }
  return Array.from(setores);
}

export function podeVerAviso(papeis: Papel[], aviso: Aviso): boolean {
  if (!podeAcessarAvisos(papeis)) return false;
  const permitidos = setoresVisiveisParaPapeis(papeis);
  if (permitidos === null) return true;
  return permitidos.includes(aviso.setor);
}

export function podePublicarAvisos(papeis: Papel[]): boolean {
  return papeis.includes("admin") || papeis.includes("setape");
}

export function podePublicarNoSetor(papeis: Papel[], setor: AvisoSetor): boolean {
  if (!podePublicarAvisos(papeis)) return false;
  if (papeis.includes("admin")) {
    const permitidos = setoresVisiveisParaPapeis(papeis);
    if (permitidos === null) return true;
    return permitidos.includes(setor);
  }
  return true;
}

/** Opções de setor para filtros e formulário de publicação. */
export function setoresAvisoParaUsuario(papeis: Papel[]) {
  if (!podePublicarAvisos(papeis)) return [];
  return AVISO_SETORES;
}
