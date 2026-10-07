import type { Papel } from "@/auth/AuthProvider";
import type { Trilha } from "@/data/trilhasMock";
import { SETORES_CONFIG, getSetoresDoUsuario } from "@/navigation/setoresConfig";

/**
 * Normaliza uma string de setor para comparação sem acentos e em minúsculas.
 */
function normalizarSetor(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Verifica se um usuário (com base em seus papéis) possui acesso para visualizar
 * e realizar missões de uma trilha de conhecimento.
 *
 * Regras:
 * 1. Administradores (`admin`) possuem acesso total a qualquer trilha.
 * 2. Trilhas sem setor restrito (ou com "Todos os setores" / vazio) são públicas para todos.
 * 3. Trilhas com setores especificados só são acessíveis a colaboradores pertencentes a um desses setores.
 */
export function podeAcessarTrilha(trilha: Trilha, papeis?: Papel[]): boolean {
  // Administradores sempre têm acesso a todas as trilhas
  if (papeis?.includes("admin")) {
    return true;
  }

  const restrito = trilha.setorRestrito?.trim();
  if (!restrito || restrito === "" || restrito.toLowerCase() === "todos os setores" || restrito.toLowerCase() === "todos") {
    return true;
  }

  if (!papeis || papeis.length === 0) {
    return false;
  }

  // Lista de setores permitidos configurados na trilha
  const setoresPermitidos = restrito
    .split(",")
    .map((s) => normalizarSetor(s))
    .filter(Boolean);

  if (setoresPermitidos.length === 0 || setoresPermitidos.includes("todos") || setoresPermitidos.includes("todos os setores")) {
    return true;
  }

  // Obter setores do usuário através dos seus papéis
  const setoresDoUsuario = getSetoresDoUsuario(papeis);
  const nomesSetoresUsuario = new Set(
    setoresDoUsuario.flatMap((s) => [normalizarSetor(s.label), normalizarSetor(s.slug)])
  );

  return setoresPermitidos.some((setorReq) => {
    // 1. Coincide com algum setor que o usuário pertence
    if (nomesSetoresUsuario.has(setorReq)) return true;

    // 2. Busca configuração do setor no sistema para testar papéis diretos
    const config = SETORES_CONFIG.find(
      (sc) => normalizarSetor(sc.label) === setorReq || normalizarSetor(sc.slug) === setorReq
    );
    if (config && config.papeis.some((p) => papeis.includes(p))) {
      return true;
    }

    // 3. Mapeamentos comuns para compatibilidade adicional
    if (
      (setorReq === "ti" || setorReq === "setape") &&
      (papeis.includes("setape") || papeis.includes("gerente_setape"))
    ) {
      return true;
    }

    if (
      (setorReq === "dp" || setorReq === "financeiro" || setorReq === "dp e financeiro" || setorReq === "dp / financeiro") &&
      (papeis.includes("dp") || papeis.includes("financeiro") || papeis.includes("gerente_dp") || papeis.includes("gerente_financeiro"))
    ) {
      return true;
    }

    return false;
  });
}
