/** Categorias de chamados agrupadas por setor destinatário. */

export const CATEGORIAS_POR_SETOR: Record<string, string[]> = {
  direcao: [
    "📚 Pedagógico e Acadêmico",
    "💰 Financeiro",
    "👥 Pessoas, Alunos, Colaboradores e RH",
    "🏢 Estrutura, Manutenção e Segurança",
    "👥 Mediação com outro setor",
    "📝 Processos, Serviços e Atendimento",
    "💡 Ouvidoria - Sugestões, Projetos e Assuntos Estratégicos",
    "🚨 Outros assuntos / Confidencial",
  ],
  setape: [
    "Hardware",
    "Software",
    "Rede / Internet",
    "E-mail",
    "Impressora",
    "Telefonia",
    "Acesso / Permissão",
    "Filmagem de Câmera",
    "Outro",
  ],
  secretaria: [
    "Matrículas e Transferências",
    "Declarações e Históricos",
    "Documentação Escolar",
    "Atendimento a Pais e Alunos",
    "Outros assuntos Secretaria",
  ],
  dp: [
    "Folha de Pagamento / Holerite",
    "Benefícios (VT / VR / Plano)",
    "Férias e Rescisão",
    "Emissão de Boletos / Comprovantes",
    "Prestação de Contas / Reembolso",
    "Outros assuntos DP/Financeiro",
  ],
  financeiro: [
    "Folha de Pagamento / Holerite",
    "Benefícios (VT / VR / Plano)",
    "Férias e Rescisão",
    "Emissão de Boletos / Comprovantes",
    "Prestação de Contas / Reembolso",
    "Outros assuntos DP/Financeiro",
  ],
  disciplinar: [
    "Ocorrências Discentes",
    "Mediação de Conflitos",
    "Acompanhamento Comportamental",
    "Comunicação a Responsáveis",
    "Outros assuntos Disciplinar",
  ],
  biblioteca: [
    "Empréstimo e Devolução de Livros",
    "Catalogação e Acervo",
    "Reserva de Espaço de Estudo",
    "Outros assuntos Biblioteca",
  ],
  servicosgerais: [
    "Limpeza e Higienização",
    "Manutenção Predial / Reparos",
    "Mobiliário e Mudanças",
    "Eletricidade e Hidráulica",
    "Outros assuntos Serviços Gerais",
  ],
  almoxarifado: [
    "Requisição de Materiais",
    "Suprimentos e Estoque",
    "Entrega e Logística Interna",
    "Outros assuntos Almoxarifado",
  ],
  primeirossocorros: [
    "Atendimento de Enfermagem",
    "Ficha Médica e Medicamentos",
    "Ocorrência de Saúde / Atestados",
    "Outros assuntos Enfermagem",
  ],
  clat: [
    "Cursos de Línguas",
    "Inscrição e Turmas",
    "Material Didático",
    "Outros assuntos CLAT",
  ],
  publicidade: [
    "Arte e Design Gráfico",
    "Redes Sociais e Divulgação",
    "Cobertura de Eventos",
    "Material Impresso",
    "Outros assuntos Publicidade",
  ],
};

export const CATEGORIAS_PADRAO: string[] = [
  "Solicitação Geral",
  "Dúvidas / Informações",
  "Suporte Técnico",
  "Outro",
];

/**
 * Retorna as categorias aplicáveis para uma lista de setores destinatários selecionados.
 * Se múltiplos setores forem selecionados, combina as categorias eliminando duplicatas.
 */
export function getCategoriasParaSetores(setores: string[]): string[] {
  if (!setores || setores.length === 0) {
    return CATEGORIAS_POR_SETOR.setape;
  }

  const categorias = new Set<string>();

  for (const s of setores) {
    const list = CATEGORIAS_POR_SETOR[s];
    if (list && list.length > 0) {
      list.forEach((c) => categorias.add(c));
    }
  }

  if (categorias.size === 0) {
    return CATEGORIAS_PADRAO;
  }

  return Array.from(categorias);
}
