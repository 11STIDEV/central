/** Papéis que só podem ser atribuídos manualmente (nunca pela OU do Google). Mantido alinhado ao tipo `Papel` em AuthProvider. */
export const PAPEIS_ATRIBUICAO_MANUAL: { id: string; label: string; descricao: string }[] = [
  {
    id: "admin",
    label: "Administrador",
    descricao: "Acesso a todas as páginas e permissões; gestão de papéis manuais.",
  },
];

export function isPapelAtribuicaoManualConhecido(p: string): boolean {
  return PAPEIS_ATRIBUICAO_MANUAL.some((x) => x.id === p);
}
