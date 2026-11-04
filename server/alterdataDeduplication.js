/**
 * Deduplicação e unificação de múltiplos contratos do Alterdata para o backend.
 */

export function getStatusPriority(statusRaw) {
  if (statusRaw === undefined || statusRaw === null) return 0;
  const st = String(statusRaw).trim().toLowerCase();
  if (st === "ativo" || st === "a" || st === "true") return 3;
  if (st.includes("afastad")) return 2;
  if (st.includes("demitid") || st.includes("inativ") || st === "false") return 1;
  return 0;
}

export function extractDataAdmissao(attrs) {
  if (!attrs) return null;
  const d = attrs.dataadmissao || attrs.dataAdmissao || attrs.admissao || attrs.dtadmissao || null;
  return d ? String(d) : null;
}

export function extractDataDemissao(attrs) {
  if (!attrs) return null;
  const d = attrs.datademissao || attrs.dataDemissao || attrs.demissao || attrs.datarescisao || attrs.dataRescisao || null;
  return d ? String(d) : null;
}

export function extractEmail(attrs) {
  if (!attrs) return null;
  const mail =
    attrs.email ||
    attrs.emailComercial ||
    attrs.emailPessoal ||
    attrs.email_corporativo ||
    attrs.emailcorporativo ||
    attrs.email_pessoal ||
    attrs.emailTrabalho ||
    attrs.emailPrincipal ||
    attrs.e_mail ||
    null;
  if (!mail) return null;
  const str = String(mail).trim().toLowerCase();
  return str.length > 3 && str.includes("@") ? str : null;
}

export function normalizeCpf(cpfRaw) {
  if (!cpfRaw) return "";
  return String(cpfRaw).replace(/\D/g, "");
}

export function normalizeNome(nomeRaw) {
  if (!nomeRaw) return "";
  const str = String(nomeRaw);
  try {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ");
  } catch {
    return str.trim().toUpperCase().replace(/\s+/g, " ");
  }
}

const PREPOSICOES = new Set(["DE", "DA", "DAS", "DO", "DOS", "E"]);

export function getTokensNome(nomeRaw) {
  const norm = normalizeNome(nomeRaw);
  if (!norm) return [];
  return norm.split(" ").filter((tok) => tok.length > 0 && !PREPOSICOES.has(tok));
}

export function nomesSaoDaMesmaPessoa(nomeA, nomeB) {
  const normA = normalizeNome(nomeA);
  const normB = normalizeNome(nomeB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const tokensA = getTokensNome(nomeA);
  const tokensB = getTokensNome(nomeB);

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // Se os tokens sem preposição forem idênticos (ex.: "Maria de Lourdes da Silva" vs "Maria de Lourdes Silva")
  if (tokensA.join(" ") === tokensB.join(" ")) {
    return true;
  }

  // Primeiro nome e último sobrenome DEVEM ser idênticos
  if (tokensA[0] !== tokensB[0]) return false;
  if (tokensA[tokensA.length - 1] !== tokensB[tokensB.length - 1]) return false;

  // Se ambos têm 2 ou mais tokens, e o segundo token for diferente, não é a mesma pessoa
  if (tokensA.length > 1 && tokensB.length > 1 && tokensA[1] !== tokensB[1]) {
    return false;
  }

  // Se a quantidade de tokens for diferente, só permite se os tokens a mais forem meras abreviações (ex: "L." ou "L")
  // NUNCA unifica se houver sobrenomes familiares inteiros divergentes (ex: "Silva" vs "Conceição Freitas e Silva")
  if (tokensA.length !== tokensB.length) {
    const [menor, maior] = tokensA.length < tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
    const diff = maior.filter((t) => !menor.includes(t));
    const todosAbrev = diff.every((t) => t.length <= 2);
    if (!todosAbrev) {
      return false;
    }
  }

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const [menorSet, maiorSet] = tokensA.length <= tokensB.length ? [tokensA, setB] : [tokensB, setA];
  const correspondencias = menorSet.filter((t) => maiorSet.has(t)).length;

  return correspondencias === menorSet.length;
}

export function unificarFuncionariosAlterdata(items) {
  if (!Array.isArray(items)) return [];

  try {
    const validItems = items.filter((item) => item && typeof item === "object");
    const grupos = [];

    validItems.forEach((item) => {
      const attrs = item.attributes || {};
      const cpfItem = normalizeCpf(attrs.cpf || attrs.cpfcnpj || attrs.cpf_cnpj);
      const nomeItem = attrs.nome || attrs.nomeFantasia || attrs.nomecargo;

      let grupoEncontrado = false;

      for (const grupo of grupos) {
        let temCpfConflitante = false;
        let temCpfIgual = false;
        const nomesGrupo = [];

        for (const membro of grupo) {
          const mAttrs = membro.attributes || {};
          const cpfMembro = normalizeCpf(mAttrs.cpf || mAttrs.cpfcnpj || mAttrs.cpf_cnpj);
          if (cpfItem && cpfItem.length >= 11 && cpfMembro && cpfMembro.length >= 11) {
            if (cpfItem === cpfMembro) {
              temCpfIgual = true;
            } else {
              temCpfConflitante = true;
            }
          }
          const mNome = mAttrs.nome || mAttrs.nomeFantasia || mAttrs.nomecargo;
          if (mNome) nomesGrupo.push(mNome);
        }

        // REGRA DE OURO: Se houver CPFs válidos conflitantes, NUNCA unifica
        if (temCpfConflitante) {
          continue;
        }

        // 1. CPFs válidos e idênticos: unifica com certeza
        if (temCpfIgual) {
          grupo.push(item);
          grupoEncontrado = true;
          break;
        }

        // 2. Se não há conflito de CPF (um ou ambos não têm CPF), unifica por nome estritamente compatível
        if (nomesGrupo.some((ng) => nomesSaoDaMesmaPessoa(nomeItem, ng))) {
          grupo.push(item);
          grupoEncontrado = true;
          break;
        }
      }

      if (!grupoEncontrado) {
        grupos.push([item]);
      }
    });

    const resultado = [];

    grupos.forEach((registros) => {
      const ordenadosParaPrincipal = [...registros].sort((a, b) => {
        const pA = getStatusPriority(a.attributes?.status ?? a.attributes?.situacao);
        const pB = getStatusPriority(b.attributes?.status ?? b.attributes?.situacao);
        if (pA !== pB) return pB - pA;

        const lenA = String(a.attributes?.nome || "").length;
        const lenB = String(b.attributes?.nome || "").length;
        if (lenA !== lenB) return lenB - lenA;

        const codeA = String(a.attributes?.codigo || a.id || "");
        const codeB = String(b.attributes?.codigo || b.id || "");
        return codeB.localeCompare(codeA, undefined, { numeric: true });
      });

      const principal = ordenadosParaPrincipal[0] || registros[0];
      const temContratoAtivo = registros.some(
        (r) => getStatusPriority(r.attributes?.status ?? r.attributes?.situacao) === 3
      );

      const historicoContratos = registros
        .map((r) => {
          const st = String(r.attributes?.status ?? r.attributes?.situacao ?? "N/A");
          return {
            id: String(r.id || "0"),
            codigo: String(r.attributes?.codigo || r.attributes?.codigoEmpresa || r.id || "-"),
            status: st,
            dataAdmissao: extractDataAdmissao(r.attributes),
            dataDemissao: extractDataDemissao(r.attributes),
            afastamento: r.attributes?.afastamentodescricao ? String(r.attributes.afastamentodescricao) : null,
            registroOriginal: r,
          };
        })
        .sort((a, b) => {
          if (a.dataAdmissao && b.dataAdmissao) {
            return a.dataAdmissao.localeCompare(b.dataAdmissao);
          }
          return String(a.codigo).localeCompare(String(b.codigo), undefined, { numeric: true });
        });

      const datasAdmissaoValidas = historicoContratos
        .map((h) => h.dataAdmissao)
        .filter(Boolean);

      const primeiraAdmissao = datasAdmissaoValidas.length > 0 ? datasAdmissaoValidas[0] : extractDataAdmissao(principal?.attributes);
      const admissaoAtual = extractDataAdmissao(principal?.attributes);

      const datasDemissaoValidas = historicoContratos
        .map((h) => h.dataDemissao)
        .filter(Boolean);
      const demissaoMaisRecente = datasDemissaoValidas.length > 0 ? datasDemissaoValidas[datasDemissaoValidas.length - 1] : extractDataDemissao(principal?.attributes);

      const codigosResumo = historicoContratos
        .map((h) => `#${h.codigo} (${h.status}${h.dataAdmissao ? ` - Adm: ${h.dataAdmissao}` : ""})`)
        .join(" ➔ ");

      const repAttrs = principal?.attributes || {};
      const cpfChave = normalizeCpf(repAttrs.cpf || repAttrs.cpfcnpj || repAttrs.cpf_cnpj);
      const chaveUnica = cpfChave ? `CPF:${cpfChave}` : `NOME:${normalizeNome(repAttrs.nome)}`;

      let emailEncontrado = null;
      for (const reg of registros) {
        const m = extractEmail(reg.attributes);
        if (m) {
          emailEncontrado = m;
          break;
        }
      }

      resultado.push({
        id: String(principal?.id || "0"),
        type: String(principal?.type || "funcionarios"),
        attributes: {
          ...(principal?.attributes || {}),
          email: emailEncontrado || principal?.attributes?.email || undefined,
        },
        relationships: principal?.relationships,
        _unificado: {
          chaveUnica,
          totalContratos: registros.length,
          temContratoAtivo,
          email: emailEncontrado,
          primeiraAdmissao,
          admissaoAtual,
          demissaoMaisRecente,
          historicoContratos,
          codigosResumo,
        },
      });
    });

    return resultado;
  } catch (err) {
    console.error("[alterdataDeduplication] Erro:", err);
    return [];
  }
}
