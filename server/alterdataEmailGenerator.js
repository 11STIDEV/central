/**
 * alterdataEmailGenerator.js
 * Regras inteligentes para geração e desempate de e-mails corporativos (@portalcci.com.br).
 * 
 * Regra padrão:
 * - Primeiro nome + último sobrenome: "Andreia Lucia Rios" -> "andreia.rios@portalcci.com.br"
 * 
 * Prevenção de colisões (homônimos e e-mails de ex-funcionários):
 * - Cascata de desempate:
 *   1. primeiro.ultimo@dominio (ex: andreia.rios@portalcci.com.br)
 *   2. primeiro.meio.ultimo@dominio (ex: andreia.lucia.rios@portalcci.com.br)
 *   3. primeiro.inicialMeio.ultimo@dominio (ex: andreia.l.rios@portalcci.com.br)
 *   4. primeiro[inicialMeio].ultimo@dominio (ex: andreial.rios@portalcci.com.br)
 *   5. primeiro.segundoMeio.ultimo@dominio (ex: maria.pinho.sousa@portalcci.com.br)
 *   6. primeiro.ultimo2@dominio, primeiro.ultimo3@dominio, etc.
 */

export const DOMINIO_PADRAO = "portalcci.com.br";

const PREPOSICOES_PT = new Set([
  "de",
  "da",
  "do",
  "dos",
  "das",
  "e",
  "del",
  "di",
  "du",
  "van",
  "von",
]);

/**
 * Normaliza uma string removendo acentos, cedilhas e caracteres especiais.
 */
export function normalizarTexto(texto) {
  if (!texto || typeof texto !== "string") return "";
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // remove caracteres especiais
    .trim();
}

/**
 * Divide o nome em primeiro nome, nomes do meio e último sobrenome,
 * ignorando preposições comuns.
 */
export function extrairPartesNome(nomeCompleto) {
  const normalizado = normalizarTexto(nomeCompleto);
  const partes = normalizado
    .split(/\s+/)
    .filter((p) => p.length > 0 && !PREPOSICOES_PT.has(p));

  if (partes.length === 0) {
    return { primeiro: "usuario", meios: [], ultimo: "cci", partes: ["usuario", "cci"] };
  }

  if (partes.length === 1) {
    return { primeiro: partes[0], meios: [], ultimo: "", partes };
  }

  const primeiro = partes[0];
  const ultimo = partes[partes.length - 1];
  const meios = partes.slice(1, partes.length - 1);

  return { primeiro, meios, ultimo, partes };
}

/**
 * Gera a lista ordenada de candidatos a e-mail em ordem de preferência.
 */
export function gerarCandidatosEmail(nomeCompleto, dominio = DOMINIO_PADRAO) {
  const domLimpo = (dominio || DOMINIO_PADRAO).replace(/^@/, "").trim().toLowerCase();
  const { primeiro, meios, ultimo, partes } = extrairPartesNome(nomeCompleto);

  const candidatos = [];

  // Caso com apenas 1 nome
  if (!ultimo) {
    candidatos.push({
      email: `${primeiro}@${domLimpo}`,
      tipo: "nome_unico",
      descricao: "Nome único",
    });
    for (let i = 2; i <= 9; i++) {
      candidatos.push({
        email: `${primeiro}${i}@${domLimpo}`,
        tipo: "numerico",
        descricao: `Numérico sequencial (${i})`,
      });
    }
    return candidatos;
  }

  // 1. Padrão Oficial: primeiro.ultimo@dominio
  candidatos.push({
    email: `${primeiro}.${ultimo}@${domLimpo}`,
    tipo: "padrao",
    descricao: "Padrão Oficial (primeiro.último)",
  });

  // 2. Se tiver nome do meio: Inicial colada no primeiro nome (ex: marianad.reis / andreial.rios)
  if (meios.length > 0) {
    const inicialMeio = meios[0][0];

    // Prioridade 2 (1º desempate): primeirom.ultimo@dominio
    candidatos.push({
      email: `${primeiro}${inicialMeio}.${ultimo}@${domLimpo}`,
      tipo: "inicial_compacta",
      descricao: `Inicial compacta do meio (${primeiro}${inicialMeio}.${ultimo})`,
    });

    // Prioridade 3: primeiro.inicialMeio.ultimo@dominio
    candidatos.push({
      email: `${primeiro}.${inicialMeio}.${ultimo}@${domLimpo}`,
      tipo: "inicial_meio",
      descricao: `Inicial pontuada do meio (${primeiro}.${inicialMeio}.${ultimo})`,
    });

    // Prioridade 4: primeiro.meio.ultimo@dominio (nome do meio completo)
    candidatos.push({
      email: `${primeiro}.${meios[0]}.${ultimo}@${domLimpo}`,
      tipo: "nome_meio",
      descricao: `Com primeiro nome do meio completo (${meios[0]})`,
    });

    // Prioridade 5: Se houver mais de um nome do meio (ex: Maria Angelita de Pinho Sousa -> maria.pinho.sousa)
    if (meios.length > 1) {
      const segundoMeio = meios[meios.length - 1];
      candidatos.push({
        email: `${primeiro}.${segundoMeio}.${ultimo}@${domLimpo}`,
        tipo: "segundo_meio",
        descricao: `Com segundo sobrenome do meio (${segundoMeio})`,
      });
    }
  }

  // 6. Sufixo numérico sequencial (caso todos os nomes acima já estejam ocupados)
  for (let i = 2; i <= 9; i++) {
    candidatos.push({
      email: `${primeiro}.${ultimo}${i}@${domLimpo}`,
      tipo: "numerico",
      descricao: `Sufixo numérico (${i})`,
    });
  }

  return candidatos;
}

/**
 * Resolve o melhor e-mail para um colaborador verificando colisões contra uma lista ou Set de e-mails existentes.
 * 
 * @param {string} nomeCompleto - Nome do colaborador
 * @param {Map<string, Object>|Set<string>|Array<Object>} baseExistente - Lista de funcionários existentes ou mapa de e-mails
 * @param {string} dominio - Domínio padrão (@portalcci.com.br)
 * @returns {Object} Detalhes da sugestão e histórico de colisão
 */
export function resolverSugestaoEmail(nomeCompleto, baseExistente = [], dominio = DOMINIO_PADRAO) {
  // Constrói mapa de busca rápida em minúsculas
  let mapaExistentes = new Map();

  if (baseExistente instanceof Map) {
    mapaExistentes = baseExistente;
  } else if (baseExistente instanceof Set) {
    for (const em of baseExistente) {
      if (em) mapaExistentes.set(String(em).trim().toLowerCase(), { email: em });
    }
  } else if (Array.isArray(baseExistente)) {
    for (const item of baseExistente) {
      const em = item.email || item.attributes?.email;
      if (em && String(em).trim()) {
        mapaExistentes.set(String(em).trim().toLowerCase(), item);
      }
    }
  }

  const candidatos = gerarCandidatosEmail(nomeCompleto, dominio);
  const padraoOriginal = candidatos[0]?.email || "";

  let eleito = null;
  let houveColisao = false;
  let colididoCom = null;
  const opcoesAvaliadas = [];

  for (let i = 0; i < candidatos.length; i++) {
    const cand = candidatos[i];
    const emailNorm = cand.email.toLowerCase();
    const ocupante = mapaExistentes.get(emailNorm);

    const disponivel = !ocupante;
    opcoesAvaliadas.push({
      email: cand.email,
      tipo: cand.tipo,
      descricao: cand.descricao,
      disponivel,
      ocupante: ocupante
        ? {
            nome: ocupante.nome_completo || ocupante.attributes?.nome || "Colaborador cadastrado",
            status: ocupante.status_atual || ocupante.attributes?.status || "Histórico",
            ativo: Boolean(ocupante.tem_contrato_ativo || ocupante._unificado?.temContratoAtivo),
            matricula: ocupante.codigo_contrato_vigente || ocupante.attributes?.codigo,
          }
        : null,
    });

    if (disponivel && !eleito) {
      eleito = cand;
      if (i > 0) {
        houveColisao = true;
      }
    } else if (!disponivel && i === 0) {
      colididoCom = ocupante;
    }
  }

  // Se por algum motivo todos estiverem ocupados, gera com timestamp
  if (!eleito) {
    const fallback = `${candidatos[0].email.split("@")[0]}${Date.now().toString().slice(-4)}@${dominio}`;
    eleito = { email: fallback, tipo: "fallback_extremo", descricao: "Fallback único" };
    houveColisao = true;
  }

  let motivoColisao = null;
  let statusColisao = "disponivel";

  if (houveColisao) {
    const statusOcupante = colididoCom?.tem_contrato_ativo ? "ativo" : "inativo/ex-funcionário";
    const nomeOcupante = colididoCom?.nome_completo || colididoCom?.attributes?.nome || "outro colaborador";
    motivoColisao = `O e-mail padrão '${padraoOriginal}' já foi utilizado por ${nomeOcupante} (${statusOcupante}). Foi sugerida a alternativa '${eleito.email}' para evitar conflitos no Google Workspace.`;
    statusColisao = colididoCom?.tem_contrato_ativo ? "colisao_com_ativo" : "colisao_com_ex_funcionario";
  }

  return {
    emailSugerido: eleito.email,
    tipoEleito: eleito.tipo,
    padraoOriginal,
    houveColisao,
    statusColisao,
    motivoColisao,
    colididoCom: colididoCom
      ? {
          nome: colididoCom.nome_completo || colididoCom.attributes?.nome,
          status: colididoCom.status_atual || colididoCom.attributes?.status,
          ativo: Boolean(colididoCom.tem_contrato_ativo),
          matricula: colididoCom.codigo_contrato_vigente || colididoCom.attributes?.codigo,
        }
      : null,
    opcoes: opcoesAvaliadas,
  };
}
