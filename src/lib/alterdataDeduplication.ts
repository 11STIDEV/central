export interface AlterdataFuncionarioItem {
  id: string;
  type: string;
  attributes?: {
    codigo?: string;
    codigoEmpresa?: string;
    nome?: string;
    nomeFantasia?: string;
    nomecargo?: string;
    status?: string | boolean;
    situacao?: string;
    afastamentodescricao?: string;
    cpf?: string;
    cpfcnpj?: string;
    cpf_cnpj?: string;
    email?: string;
    dataadmissao?: string;
    dataAdmissao?: string;
    admissao?: string;
    datademissao?: string;
    dataDemissao?: string;
    demissao?: string;
    datarescisao?: string;
    dataRescisao?: string;
    [key: string]: any;
  };
  relationships?: any;
}

export interface HistoricoContrato {
  id: string;
  codigo: string;
  status: string;
  dataAdmissao?: string | null;
  dataDemissao?: string | null;
  afastamento?: string | null;
  registroOriginal: AlterdataFuncionarioItem;
}

export interface MedalhaTempoCasa {
  chave: "menos_1_ano" | "1_ano" | "3_anos" | "5_anos" | "10_anos" | "15_anos" | "20_anos";
  titulo: string;
  icone: string;
  corBadge: string;
  corTexto: string;
  descricao: string;
}

export interface CalculoTempoCasa {
  anos: number;
  meses: number;
  diasTotais: number;
  textoFormatado: string;
  medalha: MedalhaTempoCasa;
}

export interface FuncionarioUnificado {
  id: string;
  type: string;
  attributes: AlterdataFuncionarioItem["attributes"];
  relationships?: any;

  _unificado: {
    chaveUnica: string;
    totalContratos: number;
    temContratoAtivo: boolean;
    email?: string | null;
    primeiraAdmissao?: string | null;
    admissaoAtual?: string | null;
    demissaoMaisRecente?: string | null;
    historicoContratos: HistoricoContrato[];
    codigosResumo: string;
    registrosOriginais: AlterdataFuncionarioItem[];
    tempoDeCasa?: CalculoTempoCasa | null;
  };
}

export function getStatusPriority(statusRaw: any): number {
  if (statusRaw === undefined || statusRaw === null) return 0;
  const st = String(statusRaw).trim().toLowerCase();
  if (st === "ativo" || st === "a" || st === "true") return 3;
  if (st.includes("afastad")) return 2;
  if (st.includes("demitid") || st.includes("inativ") || st === "false") return 1;
  return 0;
}

export function extractDataAdmissao(attrs?: any): string | null {
  if (!attrs) return null;
  const d = attrs.dataadmissao || attrs.dataAdmissao || attrs.admissao || attrs.dtadmissao || null;
  return d ? String(d) : null;
}

export function extractDataDemissao(attrs?: any): string | null {
  if (!attrs) return null;
  const d = attrs.datademissao || attrs.dataDemissao || attrs.demissao || attrs.datarescisao || attrs.dataRescisao || null;
  return d ? String(d) : null;
}

export function extractEmail(attrs?: any): string | null {
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

export function parseDataPtBrOuIso(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return isNaN(d.getTime()) ? null : d;
    }
  } else if (str.includes("-")) {
    const parts = str.split("T")[0].split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

export function calcularTempoDeCasa(
  primeiraAdmissaoStr?: string | null
): CalculoTempoCasa | null {
  if (!primeiraAdmissaoStr) return null;
  const dataInicio = parseDataPtBrOuIso(primeiraAdmissaoStr);
  if (!dataInicio) return null;

  const hoje = new Date();
  let anos = hoje.getFullYear() - dataInicio.getFullYear();
  let meses = hoje.getMonth() - dataInicio.getMonth();
  let dias = hoje.getDate() - dataInicio.getDate();

  if (dias < 0) meses -= 1;
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }

  if (anos < 0) anos = 0;
  if (meses < 0) meses = 0;

  const diffMs = hoje.getTime() - dataInicio.getTime();
  const diasTotais = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  const textoFormatado =
    anos === 0
      ? `${meses} mes${meses === 1 ? "" : "es"}`
      : `${anos} ano${anos === 1 ? "" : "s"}${meses > 0 ? ` e ${meses} m` : ""}`;

  return {
    anos,
    meses,
    diasTotais,
    textoFormatado,
  };
}

export function normalizeCpf(cpfRaw?: any): string {
  if (!cpfRaw) return "";
  return String(cpfRaw).replace(/\D/g, "");
}

export function normalizeNome(nomeRaw?: any): string {
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

export function getTokensNome(nomeRaw?: any): string[] {
  const norm = normalizeNome(nomeRaw);
  if (!norm) return [];
  return norm.split(" ").filter((tok) => tok.length > 0 && !PREPOSICOES.has(tok));
}

export function nomesSaoDaMesmaPessoa(nomeA?: any, nomeB?: any): boolean {
  const normA = normalizeNome(nomeA);
  const normB = normalizeNome(nomeB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const tokensA = getTokensNome(nomeA);
  const tokensB = getTokensNome(nomeB);

  if (tokensA.length === 0 || tokensB.length === 0) return false;
  if (tokensA[0] !== tokensB[0]) return false;

  if (tokensA.length > 1 && tokensB.length > 1 && tokensA[1] !== tokensB[1]) {
    return false;
  }

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  const [menorSet, maiorSet] = tokensA.length <= tokensB.length ? [tokensA, setB] : [tokensB, setA];
  const correspondencias = menorSet.filter((t) => maiorSet.has(t)).length;

  if (menorSet.length >= 2 && correspondencias === menorSet.length) {
    return true;
  }

  const taxa = correspondencias / menorSet.length;
  return taxa >= 0.75;
}

export function unificarFuncionariosAlterdata(
  items: AlterdataFuncionarioItem[]
): FuncionarioUnificado[] {
  if (!Array.isArray(items)) return [];

  try {
    const validItems = items.filter((item) => item && typeof item === "object");
    const grupos: AlterdataFuncionarioItem[][] = [];

    validItems.forEach((item) => {
      const attrs = item.attributes || {};
      const cpfItem = normalizeCpf(attrs.cpf || attrs.cpfcnpj || attrs.cpf_cnpj);
      const nomeItem = attrs.nome || attrs.nomeFantasia || attrs.nomecargo;

      let grupoEncontrado = false;

      for (const grupo of grupos) {
        const rep = grupo[0];
        const repAttrs = rep?.attributes || {};
        const cpfRep = normalizeCpf(repAttrs.cpf || repAttrs.cpfcnpj || repAttrs.cpf_cnpj);
        const nomeRep = repAttrs.nome || repAttrs.nomeFantasia || repAttrs.nomecargo;

        if (cpfItem && cpfRep && cpfItem.length >= 11 && cpfItem === cpfRep) {
          grupo.push(item);
          grupoEncontrado = true;
          break;
        }

        if (nomesSaoDaMesmaPessoa(nomeItem, nomeRep)) {
          grupo.push(item);
          grupoEncontrado = true;
          break;
        }
      }

      if (!grupoEncontrado) {
        grupos.push([item]);
      }
    });

    const resultado: FuncionarioUnificado[] = [];

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

      const historicoContratos: HistoricoContrato[] = registros
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
        .filter((d): d is string => Boolean(d));

      const primeiraAdmissao = datasAdmissaoValidas.length > 0 ? datasAdmissaoValidas[0] : extractDataAdmissao(principal?.attributes);
      const admissaoAtual = extractDataAdmissao(principal?.attributes);

      const datasDemissaoValidas = historicoContratos
        .map((h) => h.dataDemissao)
        .filter((d): d is string => Boolean(d));
      const demissaoMaisRecente = datasDemissaoValidas.length > 0 ? datasDemissaoValidas[datasDemissaoValidas.length - 1] : extractDataDemissao(principal?.attributes);

      const codigosResumo = historicoContratos
        .map((h) => `#${h.codigo} (${h.status}${h.dataAdmissao ? ` - Adm: ${h.dataAdmissao}` : ""})`)
        .join(" ➔ ");

      const repAttrs = principal?.attributes || {};
      const cpfChave = normalizeCpf(repAttrs.cpf || repAttrs.cpfcnpj || repAttrs.cpf_cnpj);
      const chaveUnica = cpfChave ? `CPF:${cpfChave}` : `NOME:${normalizeNome(repAttrs.nome)}`;
      const tempoDeCasa = calcularTempoDeCasa(primeiraAdmissao);

      // Localiza o e-mail nos registros de contratos do colaborador
      let emailEncontrado: string | null = null;
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
          registrosOriginais: registros,
          tempoDeCasa,
        },
      });
    });

    return resultado;
  } catch (err) {
    console.error("Erro seguro ao unificar funcionários Alterdata:", err);
    return (items || []).map((item) => ({
      id: String(item?.id || "0"),
      type: String(item?.type || "funcionarios"),
      attributes: item?.attributes || {},
      relationships: item?.relationships,
      _unificado: {
        chaveUnica: `ID:${item?.id}`,
        totalContratos: 1,
        temContratoAtivo: true,
        historicoContratos: [],
        codigosResumo: `#${item?.attributes?.codigo || item?.id || "-"}`,
        registrosOriginais: [item],
      },
    }));
  }
}
