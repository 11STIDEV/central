/** Papéis que só podem ser atribuídos manualmente (nunca pela OU do Google). Mantido alinhado ao tipo `Papel` em AuthProvider. */
export const PAPEIS_ATRIBUICAO_MANUAL: { id: string; label: string; descricao: string }[] = [
  {
    id: "admin",
    label: "Administrador",
    descricao: "Acesso a todas as páginas e permissões; gestão de papéis manuais.",
  },
  {
    id: "ccipay_admin",
    label: "Advance-CCI — Admin",
    descricao: "Gestão completa do módulo Advance-CCI (lojas, lançadores, cadastros).",
  },
  {
    id: "ccipay_dp",
    label: "Advance-CCI — DP/Financeiro",
    descricao: "Aprovar vales, relatórios DP e cadastro de funcionários.",
  },
  {
    id: "ccipay_loja",
    label: "Advance-CCI — Operador loja",
    descricao: "Operar catálogo e pedidos da loja vinculada.",
  },
  {
    id: "ccipay_lancador",
    label: "Advance-CCI — Lançador",
    descricao: "Lançar bonificações e deduções manualmente.",
  },
];

export function isPapelAtribuicaoManualConhecido(p: string): boolean {
  return PAPEIS_ATRIBUICAO_MANUAL.some((x) => x.id === p);
}
