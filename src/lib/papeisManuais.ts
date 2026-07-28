/** Papéis que só podem ser atribuídos manualmente (nunca pela OU do Google). Mantido alinhado ao tipo `Papel` em AuthProvider. */
export const PAPEIS_ATRIBUICAO_MANUAL: { id: string; label: string; descricao: string }[] = [
  {
    id: "admin",
    label: "Administrador",
    descricao: "Acesso a todas as páginas e permissões; gestão de papéis manuais.",
  },
  {
    id: "ccipay_admin",
    label: "CCI Pay — Admin",
    descricao: "Gestão completa do módulo CCI Pay (lojas, lançadores, cadastros).",
  },
  {
    id: "ccipay_dp",
    label: "CCI Pay — DP/Financeiro",
    descricao: "Aprovar vales, relatórios DP e cadastro de funcionários.",
  },
  {
    id: "ccipay_loja",
    label: "CCI Pay — Operador loja",
    descricao: "Operar catálogo e pedidos da loja vinculada.",
  },
  {
    id: "ccipay_lancador",
    label: "CCI Pay — Lançador",
    descricao: "Lançar bonificações e deduções manualmente.",
  },
];

export function isPapelAtribuicaoManualConhecido(p: string): boolean {
  return PAPEIS_ATRIBUICAO_MANUAL.some((x) => x.id === p);
}
