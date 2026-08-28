import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import {
  unificarFuncionariosAlterdata,
  type FuncionarioUnificado,
  type AlterdataFuncionarioItem,
} from "@/lib/alterdataDeduplication";
import {
  Server,
  Key,
  Play,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  User,
  Building2,
  Code2,
  Copy,
  Check,
  ChevronRight,
  Filter,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Users,
  UserX,
  GitMerge,
  ChevronDown,
  ChevronUp,
  Download,
  Calendar,
  History,
  Sparkles,
  Clock,
  UserCheck,
  Briefcase,
  Database,
  Save,
  Zap,
  Mail,
} from "lucide-react";

const HOSTS_ALTERDATA = [
  { label: "Departamento Pessoal (dp.pack.alterdata.com.br)", value: "https://dp.pack.alterdata.com.br" },
  { label: "Identificação (identificacao.pack.alterdata.com.br)", value: "https://identificacao.pack.alterdata.com.br" },
  { label: "Atendimentos (atendimentos.pack.alterdata.com.br)", value: "https://atendimentos.pack.alterdata.com.br" },
  { label: "Documentos (documentos.pack.alterdata.com.br)", value: "https://documentos.pack.alterdata.com.br" },
  { label: "CND (cnd.pack.alterdata.com.br)", value: "https://cnd.pack.alterdata.com.br" },
];

export function AlterdataTester() {
  // Configurações Globais de Requisição
  const [token, setToken] = useState<string>(() => localStorage.getItem("alterdata_token") || "");
  const [host, setHost] = useState<string>(HOSTS_ALTERDATA[0].value);
  const [copiedToken, setCopiedToken] = useState(false);

  // Aba Interna do Testador (Padrão: Colaboradores Ativos & Histórico)
  const [subTab, setSubTab] = useState<"ativos_historico" | "funcionarios" | "funcionario_id" | "empresas" | "custom">("ativos_historico");

  // Estado da Requisição
  const [loading, setLoading] = useState(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const [responseJson, setResponseJson] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Filtros Consulta Funcionários ---
  const [empresaId, setEmpresaId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [fieldsParam, setFieldsParam] = useState<string>("");
  const [pageLimit, setPageLimit] = useState<number>(100);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [sortField, setSortField] = useState<string>("codigo");
  const [displayLimit, setDisplayLimit] = useState<number | "all">("all");
  const [unificarRegistros, setUnificarRegistros] = useState<boolean>(true);

  // Mapeamento e Unificação de Resultados (Calculado no topo do componente para estar no escopo de todo o JSX)
  const rawItems: AlterdataFuncionarioItem[] = useMemo(() => {
    return Array.isArray(responseJson?.data) ? responseJson.data : [];
  }, [responseJson]);

  const unifiedItems: FuncionarioUnificado[] = useMemo(() => {
    if (!rawItems || rawItems.length === 0) return [];
    if (rawItems[0] && (rawItems[0] as any)._unificado) {
      return rawItems as FuncionarioUnificado[];
    }
    try {
      return unificarFuncionariosAlterdata(rawItems);
    } catch (e) {
      console.error("Erro ao unificar funcionários:", e);
      return [];
    }
  }, [rawItems]);

  const displayItems = unificarRegistros ? unifiedItems : rawItems;

  // Estado do Filtro de Status para Visualização na Aba ("ativos" | "todos" | "demitidos")
  const [filtroStatusView, setFiltroStatusView] = useState<"ativos" | "todos" | "demitidos">("ativos");
  const [salvarApenasAtivosOption, setSalvarApenasAtivosOption] = useState<boolean>(true);

  // Filtra colaboradores unificados conforme o filtro de status selecionado
  const displayUnifiedItems: FuncionarioUnificado[] = useMemo(() => {
    if (filtroStatusView === "ativos") {
      return unifiedItems.filter((u) => u._unificado?.temContratoAtivo);
    }
    if (filtroStatusView === "demitidos") {
      return unifiedItems.filter((u) => !u._unificado?.temContratoAtivo);
    }
    return unifiedItems;
  }, [unifiedItems, filtroStatusView]);

  // Filtra apenas colaboradores com contrato ativo no momento para atalhos
  const activeUnifiedItems: FuncionarioUnificado[] = useMemo(() => {
    return unifiedItems.filter((u) => u._unificado?.temContratoAtivo);
  }, [unifiedItems]);

  // Estado da Busca na Aba "Colaboradores Ativos & Histórico"
  const [searchTermAtivos, setSearchTermAtivos] = useState<string>("");
  const [expandedTimelineId, setExpandedTimelineId] = useState<Record<string, boolean>>({});

  const filteredActiveItems = useMemo(() => {
    if (!searchTermAtivos.trim()) return displayUnifiedItems;
    const term = searchTermAtivos.toLowerCase().trim();
    return displayUnifiedItems.filter((item) => {
      const nome = String(item.attributes?.nome || item.attributes?.nomecargo || "").toLowerCase();
      const cpf = String(item.attributes?.cpf || item.attributes?.cpfcnpj || "").replace(/\D/g, "");
      const email = String(item._unificado?.email || item.attributes?.email || "").toLowerCase();
      const codigos = (item._unificado?.codigosResumo || "").toLowerCase();
      return nome.includes(term) || cpf.includes(term) || email.includes(term) || codigos.includes(term);
    });
  }, [displayUnifiedItems, searchTermAtivos]);

  const toggleTimeline = (id: string) => {
    setExpandedTimelineId((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // --- Persistência em Banco Local & Supabase ---
  const [salvandoBanco, setSalvandoBanco] = useState(false);
  const [carregandoBancoLocal, setCarregandoBancoLocal] = useState(false);
  const [statusBancoMsg, setStatusBancoMsg] = useState<string | null>(null);

  // Consulta iterativa para baixar TODAS as páginas de registros do Alterdata
  const handleConsultarTodosFuncionariosAlterdata = async () => {
    if (!token.trim()) {
      setErrorMsg("Informe o Token de Autorização do eContador antes de executar a requisição.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setStatusCode(null);
    setStatusBancoMsg("Iniciando busca completa de todas as páginas no Alterdata...");
    const startTime = performance.now();

    const limit = 100;
    let offset = 0;
    let todosRegistros: AlterdataFuncionarioItem[] = [];
    let temMaisPaginas = true;
    let paginaAtual = 1;

    try {
      while (temMaisPaginas) {
        setStatusBancoMsg(`Buscando no Alterdata (Página ${paginaAtual} — offset ${offset})... ${todosRegistros.length} registros baixados até agora.`);
        
        const params = new URLSearchParams();
        if (empresaId.trim()) params.append("filter[empresaId]", empresaId.trim());
        if (statusFilter.trim()) params.append("filter[status]", statusFilter.trim());
        params.append("page[limit]", limit.toString());
        params.append("page[offset]", offset.toString());

        const fullUrl = `${host}/api/v1/funcionarios?${params.toString()}`;
        const res = await fetch(fullUrl, {
          headers: {
            "Authorization": `Bearer ${token.trim()}`,
            "Accept": "application/vnd.api+json",
          },
        });

        if (!res.ok) {
          setErrorMsg(`Erro ao baixar a página ${paginaAtual} (offset ${offset}): HTTP ${res.status}`);
          break;
        }

        const json = await res.json();
        const itensPagina: AlterdataFuncionarioItem[] = Array.isArray(json?.data) ? json.data : [];

        if (itensPagina.length === 0) {
          temMaisPaginas = false;
        } else {
          todosRegistros = [...todosRegistros, ...itensPagina];
          offset += limit;
          paginaAtual += 1;

          if (itensPagina.length < limit) {
            temMaisPaginas = false;
          }
        }
      }

      const endTime = performance.now();
      setExecutionTimeMs(Math.round(endTime - startTime));
      setStatusCode(200);
      setStatusBancoMsg(`✅ Sucesso! Baixados TODOS os ${todosRegistros.length} registros de contratos do Alterdata (${paginaAtual - 1} páginas consultadas).`);
      
      setResponseJson({
        data: todosRegistros,
      });
    } catch (err: any) {
      setErrorMsg(`Erro na busca completa do Alterdata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarNoBancoLocal = async () => {
    const listaOriginal = salvarApenasAtivosOption
      ? unifiedItems.filter((u) => u._unificado?.temContratoAtivo)
      : unifiedItems;

    if (!listaOriginal || listaOriginal.length === 0) {
      setStatusBancoMsg("Nenhum colaborador foi localizado para salvar com os filtros selecionados.");
      return;
    }

    // Sanitiza removendo registrosOriginais brutos para reduzir dramaticamente o tamanho do payload HTTP
    const listaParaSalvar = listaOriginal.map((item) => {
      if (!item._unificado) return item;
      const { registrosOriginais, ...restoUnificado } = item._unificado;
      return {
        ...item,
        _unificado: restoUnificado,
      };
    });

    setSalvandoBanco(true);
    setStatusBancoMsg("Enviando colaboradores unificados para persistência no banco local/Supabase...");

    try {
      const res = await fetch("/api/alterdata/salvar-banco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funcionarios: listaParaSalvar,
          apenasAtivos: salvarApenasAtivosOption,
        }),
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Resposta do servidor backend (HTTP ${res.status}): ${responseText.slice(0, 200)}`);
      }

      if (res.ok && data.ok) {
        if (data.supabase?.sucesso) {
          setStatusBancoMsg(`✅ Sucesso! ${data.salvos} colaboradores unificados salvos no Supabase e no banco local.`);
        } else if (data.supabase?.erro) {
          setStatusBancoMsg(`💾 Salvo no banco local (${data.salvos} colaboradores). Aviso Supabase: ${data.supabase.erro}`);
        } else {
          setStatusBancoMsg(`✅ Sucesso! ${data.salvos} colaboradores unificados salvos no Supabase/banco local (${data.totalBancoLocal} total na base).`);
        }
      } else {
        setStatusBancoMsg(`⚠️ Erro ao salvar: ${data.error || "Falha na requisição"}`);
      }
    } catch (err: any) {
      setStatusBancoMsg(`⚠️ Erro de conexão com nosso backend: ${err.message}`);
    } finally {
      setSalvandoBanco(false);
    }
  };

  const handleCarregarDoBancoLocal = async () => {
    setCarregandoBancoLocal(true);
    setStatusBancoMsg(null);

    try {
      const res = await fetch("/api/alterdata/banco-funcionarios");
      const data = await res.json();

      if (res.ok && data.ok) {
        setStatusBancoMsg(`⚡ Dados carregados com sucesso do nosso banco local! (${data.total} colaboradores unificados na base local).`);
        setResponseJson({
          data: (data.data || []).map((dbItem: any) => ({
            id: dbItem.id_alterdata_principal || dbItem.chave_unica,
            type: "funcionarios_banco_local",
            attributes: {
              codigo: dbItem.codigo_contrato_vigente,
              nome: dbItem.nome_completo,
              cpf: dbItem.cpf,
              email: dbItem.email,
              status: dbItem.status_atual,
              dataadmissao: dbItem.primeira_admissao,
            },
            _unificado: {
              chaveUnica: dbItem.chave_unica,
              totalContratos: dbItem.total_contratos,
              temContratoAtivo: dbItem.tem_contrato_ativo,
              email: dbItem.email,
              primeiraAdmissao: dbItem.primeira_admissao,
              admissaoAtual: dbItem.admissao_atual,
              demissaoMaisRecente: dbItem.demissao_mais_recente,
              historicoContratos: dbItem.historico_contratos || [],
              codigosResumo: dbItem.codigos_resumo,
              registrosOriginais: [],
              tempoDeCasa: calcularTempoDeCasa(dbItem.primeira_admissao),
            },
          })),
        });
      } else {
        setStatusBancoMsg(`⚠️ Erro ao ler banco local: ${data.error || "Falha na requisição"}`);
      }
    } catch (err: any) {
      setStatusBancoMsg(`⚠️ Erro de conexão: ${err.message}`);
    } finally {
      setCarregandoBancoLocal(false);
    }
  };

  const handleExportarCsvAtivos = (itemsToExport: FuncionarioUnificado[]) => {
    if (!itemsToExport || itemsToExport.length === 0) return;

    const headers = [
      "Nome Completo",
      "CPF",
      "E-mail",
      "Status",
      "Contrato Vigente",
      "1ª Admissão",
      "Admissão Atual",
      "Demissão Mais Recente",
      "Total Contratos",
      "Tempo de Casa",
      "Resumo dos Contratos",
    ];

    const rows = itemsToExport.map((item) => {
      const attrs = item.attributes || {};
      const nome = attrs.nome || attrs.nomecargo || "";
      const cpf = attrs.cpf || attrs.cpfcnpj || "";
      const email = item._unificado?.email || attrs.email || "";
      const status = item._unificado?.temContratoAtivo ? "Ativo" : "Inativo";
      const codAtual = attrs.codigo || attrs.codigoEmpresa || item.id || "";
      const primeiraAdm = item._unificado?.primeiraAdmissao || attrs.dataadmissao || "";
      const admAtual = item._unificado?.admissaoAtual || attrs.dataadmissao || "";
      const demissaoRecente = item._unificado?.demissaoMaisRecente || "";
      const totalContratos = item._unificado?.totalContratos || 1;
      const tempo = item._unificado?.tempoDeCasa?.textoFormatado || "";
      const resumo = item._unificado?.codigosResumo || "";

      return [
        `"${nome.replace(/"/g, '""')}"`,
        `"${cpf}"`,
        `"${email.replace(/"/g, '""')}"`,
        `"${status}"`,
        `"${codAtual}"`,
        `"${primeiraAdm}"`,
        `"${admAtual}"`,
        `"${demissaoRecente}"`,
        totalContratos,
        `"${tempo}"`,
        `"${resumo.replace(/"/g, '""')}"`,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `colaboradores_alterdata_${filtroStatusView}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Filtros Consulta Funcionário por ID ---
  const [funcionarioId, setFuncionarioId] = useState<string>("");
  const [includesSelecionados, setIncludesSelecionados] = useState<string[]>([
    "departamento",
    "estadocivil",
    "formadepagamento",
    "tipoDeConta",
    "tipoDeChavePix"
  ]);

  // --- Requisição Customizada ---
  const [customMethod, setCustomMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("GET");
  const [customEndpoint, setCustomEndpoint] = useState<string>("/api/v1/funcionarios");
  const [customBody, setCustomBody] = useState<string>("{\n  \"data\": {}\n}");

  // Guard para evitar loops infinitos de re-renderização no React
  const hasRunInitialFetch = useRef(false);

  // Execução automática ao abrir a aba de "Colaboradores Ativos & Histórico" baixando TODAS as páginas do Alterdata
  useEffect(() => {
    if (subTab === "ativos_historico" && !hasRunInitialFetch.current && token) {
      hasRunInitialFetch.current = true;
      handleConsultarTodosFuncionariosAlterdata();
    }
  }, [subTab, token]);

  const toggleInclude = (inc: string) => {
    setIncludesSelecionados(prev =>
      prev.includes(inc) ? prev.filter(item => item !== inc) : [...prev, inc]
    );
  };

  const executarRequisicao = async (endpointPath: string, method = "GET", bodyPayload?: any) => {
    if (!token.trim()) {
      setErrorMsg("Informe o Token de Autorização do eContador antes de executar a requisição.");
      setStatusCode(null);
      setResponseJson(null);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setStatusCode(null);
    setResponseJson(null);
    setExecutionTimeMs(null);

    const startTime = performance.now();
    const fullUrl = `${host}${endpointPath}`;

    try {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token.trim()}`,
        "Accept": "application/vnd.api+json",
      };

      if (method !== "GET" && method !== "HEAD") {
        headers["Content-Type"] = "application/vnd.api+json";
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (bodyPayload && (method === "POST" || method === "PUT" || method === "PATCH")) {
        options.body = typeof bodyPayload === "string" ? bodyPayload : JSON.stringify(bodyPayload);
      }

      const res = await fetch(fullUrl, options);
      const endTime = performance.now();
      setExecutionTimeMs(Math.round(endTime - startTime));
      setStatusCode(res.status);

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { responseText: text };
        }
      }

      if (!res.ok) {
        let msg = `Erro HTTP ${res.status}: ${res.statusText || "Internal Server Error"}`;
        if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const firstErr = data.errors[0];
          msg += ` — ${firstErr.title || firstErr.detail || firstErr.code || JSON.stringify(firstErr)}`;
        } else if (data?.responseText) {
          msg += ` — ${data.responseText.slice(0, 150)}`;
        }
        setErrorMsg(msg);
      }

      setResponseJson(data);
    } catch (err: any) {
      const endTime = performance.now();
      setExecutionTimeMs(Math.round(endTime - startTime));
      setErrorMsg(err.message || "Erro ao conectar com a API Alterdata (verifique se há bloqueio CORS ou conectividade).");
    } finally {
      setLoading(false);
    }
  };

  // Triggers de execução por aba
  const handleConsultarFuncionarios = (overrideOffset?: number, overrideLimit?: number) => {
    const targetOffset = overrideOffset !== undefined ? overrideOffset : pageOffset;
    const targetLimit = overrideLimit !== undefined ? overrideLimit : pageLimit;

    if (overrideOffset !== undefined) setPageOffset(overrideOffset);
    if (overrideLimit !== undefined) setPageLimit(overrideLimit);

    const params = new URLSearchParams();
    if (empresaId.trim()) params.append("filter[empresaId]", empresaId.trim());
    if (statusFilter.trim()) params.append("filter[status]", statusFilter.trim());
    if (fieldsParam.trim()) params.append("fields[funcionarios]", fieldsParam.trim());
    if (targetLimit) params.append("page[limit]", targetLimit.toString());
    if (targetOffset > 0) params.append("page[offset]", targetOffset.toString());
    if (sortField.trim()) params.append("sort", sortField.trim());

    const path = `/api/v1/funcionarios?${params.toString()}`;
    executarRequisicao(path, "GET");
  };

  const handleConsultarFuncionarioId = () => {
    if (!funcionarioId.trim()) {
      setErrorMsg("Digite um ID de funcionário para pesquisar.");
      return;
    }
    const params = new URLSearchParams();
    if (includesSelecionados.length > 0) {
      params.append("include", includesSelecionados.join(","));
    }
    const path = `/api/v1/funcionarios/${funcionarioId.trim()}?${params.toString()}`;
    executarRequisicao(path, "GET");
  };

  const handleConsultarEmpresas = () => {
    executarRequisicao("/api/v1/empresas", "GET");
  };

  const handleExecutarCustom = () => {
    let payload = undefined;
    if (customMethod === "POST" || customMethod === "PUT") {
      try {
        payload = JSON.parse(customBody);
      } catch {
        setErrorMsg("O corpo da requisição deve ser um JSON válido.");
        return;
      }
    }
    executarRequisicao(customEndpoint, customMethod, payload);
  };

  return (
    <div className="space-y-6">
      {/* Header Informativo */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-card-foreground">Ambiente de Testes — Alterdata ePlugin API</h2>
              <p className="text-xs text-muted-foreground">
                Integração eContador &amp; Departamento Pessoal (JSON:API Standard)
              </p>
            </div>
          </div>

          <a
            href="https://eplugin.pack.alterdata.com.br/#funcion%C3%A1rios-consulta-de-funcion%C3%A1rios-get"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-primary shadow-sm hover:bg-accent transition-colors"
          >
            Documentação Oficial <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Card de Conexão / Token */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-card-foreground">
            <Key className="h-4 w-4 text-primary" />
            <span>Configurações de Autenticação</span>
          </div>
          {token ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" /> Token Configurado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              <ShieldAlert className="h-3.5 w-3.5" /> Token Pendente
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Host / API Alterdata
            </label>
            <select
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs font-medium text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            >
              {HOSTS_ALTERDATA.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Bearer Token (Obtido no eContador &gt; Configurações &gt; ePlugin)
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="Cole o token JWT obtido no eContador..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-lg border border-input bg-card py-2 pl-3 pr-24 text-xs font-mono text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(token);
                  setCopiedToken(true);
                  setTimeout(() => setCopiedToken(false), 2000);
                }}
                disabled={!token}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
              >
                {copiedToken ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seletor de Abas de Teste */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        <button
          onClick={() => setSubTab("ativos_historico")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            subTab === "ativos_historico"
              ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
          Colaboradores Ativos &amp; Histórico (Auto)
        </button>

        <button
          onClick={() => setSubTab("funcionarios")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
            subTab === "funcionarios"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          Consulta Geral (GET)
        </button>

        <button
          onClick={() => setSubTab("funcionario_id")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
            subTab === "funcionario_id"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          Funcionário por ID (GET)
        </button>

        <button
          onClick={() => setSubTab("empresas")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
            subTab === "empresas"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          Empresas (GET)
        </button>

        <button
          onClick={() => setSubTab("custom")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
            subTab === "custom"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Code2 className="h-3.5 w-3.5" />
          Playground / Custom HTTP
        </button>
      </div>

      {/* Painel do Teste Ativo */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        {subTab === "ativos_historico" && (
          <div className="space-y-5">
            {/* Header Informativo da Aba */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/40 p-4 rounded-xl border border-border/60">
              <div>
                <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Mapeamento Automático: Colaboradores Ativos &amp; Histórico Unificado
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visualização consolidada de colaboradores ativos no momento, com a 1ª data de admissão e o histórico completo de contratos recontratados.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleConsultarTodosFuncionariosAlterdata}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all"
                  title="Baixa iterativamente todas as páginas do Alterdata"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  <span>Carregar TODOS do Alterdata (Todas Páginas)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSalvarNoBancoLocal}
                  disabled={salvandoBanco || unifiedItems.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-40 transition-all shadow-xs"
                >
                  {salvandoBanco ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Salvar no Banco</span>
                </button>

                <button
                  type="button"
                  onClick={handleCarregarDoBancoLocal}
                  disabled={carregandoBancoLocal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 transition-all shadow-xs"
                >
                  {carregandoBancoLocal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
                  <span>Carregar do Banco Local</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportarCsvAtivos(filteredActiveItems)}
                  disabled={filteredActiveItems.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-all shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* Abas Visuais de Filtro: Somente Ativos | Todos os Colaboradores | Somente Demitidos */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border border-border">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltroStatusView("ativos")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                    filtroStatusView === "ativos"
                      ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
                      : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Somente Ativos ({activeUnifiedItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroStatusView("todos")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                    filtroStatusView === "todos"
                      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                      : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Todos os Colaboradores ({unifiedItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroStatusView("demitidos")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                    filtroStatusView === "demitidos"
                      ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30"
                      : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
                  }`}
                >
                  <UserX className="h-3.5 w-3.5" />
                  <span>Somente Demitidos ({unifiedItems.length - activeUnifiedItems.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-card-foreground flex items-center gap-1.5 cursor-pointer select-none bg-card px-3 py-1.5 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    checked={salvarApenasAtivosOption}
                    onChange={(e) => setSalvarApenasAtivosOption(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary/20"
                  />
                  <span>Ao Salvar no Banco: Apenas Ativos</span>
                </label>

                <div className="text-xs text-muted-foreground hidden sm:block">
                  Exibindo: <strong className="text-card-foreground">{displayUnifiedItems.length}</strong> de <strong className="text-primary">{rawItems.length}</strong> contratos brutos
                </div>
              </div>
            </div>

            {statusBancoMsg && (
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs font-semibold text-card-foreground">
                {statusBancoMsg}
              </div>
            )}

            {/* Painel de Métricas Rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Colaboradores Ativos</span>
                  <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {activeUnifiedItems.length}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Pessoas físicas com contrato ativo no momento</p>
              </div>

              <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Recontratados (Histórico)</span>
                  <GitMerge className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="mt-1 text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {activeUnifiedItems.filter((u) => (u._unificado?.totalContratos || 1) > 1).length}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Possuem 2 ou mais contratos na história</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-3.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Registros Brutos</span>
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-1 text-xl font-black text-card-foreground">
                  {rawItems.length}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Contratos retornados pelo ePlugin</p>
              </div>
            </div>


            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filtrar por nome, CPF ou código de contrato em tempo real..."
                value={searchTermAtivos}
                onChange={(e) => setSearchTermAtivos(e.target.value)}
                className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2 text-xs font-medium text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Tabela de Colaboradores Ativos */}
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-xs font-medium">Buscando e unificando colaboradores ativos da Alterdata...</span>
              </div>
            ) : filteredActiveItems.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3">Colaborador / Nome Atual</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">1ª Admissão (Histórico)</th>
                      <th className="p-3">Admissão Atual</th>
                      <th className="p-3">Histórico de Contratos</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredActiveItems.map((item) => {
                      const isExpanded = Boolean(expandedTimelineId[item.id]);
                      const attrs = item.attributes || {};
                      const nome = attrs.nome || attrs.nomecargo || "Sem Nome";
                      const cpf = attrs.cpf || attrs.cpfcnpj || attrs.cpf_cnpj;
                      const email = item._unificado?.email || attrs.email;
                      const codAtual = attrs.codigo || attrs.codigoEmpresa || item.id;
                      const primeiraAdm = item._unificado?.primeiraAdmissao || attrs.dataadmissao || attrs.dataAdmissao || null;
                      const admAtual = item._unificado?.admissaoAtual || attrs.dataadmissao || attrs.dataAdmissao || null;
                      const totalContratos = item._unificado?.totalContratos || 1;
                      const tempo = item._unificado?.tempoDeCasa;

                      const isAtivo = item._unificado?.temContratoAtivo ?? (attrs.status === "Ativo" || attrs.status === true);

                      return (
                        <Fragment key={item.id}>
                          <tr className="hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-card-foreground text-xs">{nome}</span>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                  {cpf ? (
                                    <span className="font-mono bg-muted px-1.5 py-0.2 rounded border border-border/80">
                                      CPF: {cpf}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/60 italic">CPF não informado</span>
                                  )}
                                  <span>•</span>
                                  <span className="font-mono text-primary font-medium">Contrato: #{codAtual}</span>
                                  {email && (
                                    <>
                                      <span>•</span>
                                      <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                                        <Mail className="h-3 w-3" />
                                        {email}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="p-3">
                              {isAtivo ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="h-3 w-3" /> Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                  <XCircle className="h-3 w-3" /> Demitido / Inativo
                                </span>
                              )}
                            </td>

                            <td className="p-3 font-mono text-xs">
                              {primeiraAdm ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 font-bold text-card-foreground">
                                    🗓️ {primeiraAdm}
                                  </span>
                                  {tempo && (
                                    <span className="text-[10px] text-muted-foreground font-sans">
                                      ({tempo.textoFormatado})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">-</span>
                              )}
                            </td>

                            <td className="p-3 font-mono text-xs">
                              {admAtual ? (
                                <span className="inline-flex items-center gap-1 font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                                  📅 {admAtual}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">-</span>
                              )}
                            </td>

                            <td className="p-3">
                              {totalContratos > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleTimeline(item.id)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/25 transition-all"
                                >
                                  <GitMerge className="h-3.5 w-3.5" />
                                  {totalContratos} Contratos Históricos
                                </button>
                              ) : (
                                <span className="text-muted-foreground text-[11px] font-medium">1 Contrato Único</span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => toggleTimeline(item.id)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                              >
                                <span>{isExpanded ? "Ocultar Histórico" : "Ver Linha do Tempo"}</span>
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            </td>
                          </tr>

                          {/* Linha Expansível de Histórico de Contratos */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="bg-muted/20 p-4 border-t border-b border-border/80">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-bold text-card-foreground flex items-center gap-1.5">
                                      <History className="h-3.5 w-3.5 text-primary" />
                                      Linha do Tempo de Contratações ({nome})
                                    </h5>
                                    <span className="text-[11px] text-muted-foreground">
                                      {totalContratos} contrato(s) unificado(s) por CPF/Nome
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {(item._unificado?.historicoContratos || []).map((hc, idx) => {
                                      const stLower = String(hc.status).toLowerCase();
                                      const isContratoAtivo = stLower === "ativo" || stLower === "a" || stLower === "true";

                                      return (
                                        <div
                                          key={hc.id || idx}
                                          className={`rounded-lg p-3 border text-xs space-y-1.5 transition-all ${
                                            isContratoAtivo
                                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100 shadow-xs"
                                              : "bg-card border-border/80 text-card-foreground"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between font-bold">
                                            <span className="font-mono text-primary text-xs">
                                              Contrato #{hc.codigo}
                                            </span>
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                                isContratoAtivo
                                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                              }`}
                                            >
                                              {hc.status}
                                            </span>
                                          </div>

                                          <div className="text-[11px] space-y-1 text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3 text-primary shrink-0" />
                                              <span>Admissão: <strong>{hc.dataAdmissao || "Não informada"}</strong></span>
                                            </div>

                                            {hc.dataDemissao && (
                                              <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                                <Clock className="h-3 w-3 shrink-0" />
                                                <span>Demissão: <strong>{hc.dataDemissao}</strong></span>
                                              </div>
                                            )}

                                            {hc.afastamento && (
                                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                                Afastamento: {hc.afastamento}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
                <Users className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <div className="text-xs text-muted-foreground">
                  {searchTermAtivos
                    ? "Nenhum colaborador ativo encontrado para a busca especificada."
                    : responseJson
                    ? "Nenhum colaborador com contrato ativo foi localizado no retorno."
                    : "Clique em 'Sincronizar Dados' acima para carregar a lista automática de colaboradores ativos da Alterdata."}
                </div>
                {!responseJson && token && (
                  <button
                    type="button"
                    onClick={() => handleConsultarFuncionarios(0, 100)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Carregar Colaboradores Agora
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {subTab === "funcionarios" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">GET /api/v1/funcionarios</h3>
                <p className="text-xs text-muted-foreground">
                  Consulta a lista de colaboradores com filtros por empresa, status e ordenação.
                </p>
              </div>

              <button
                onClick={handleConsultarFuncionarios}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                <span>Executar Consulta</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 bg-muted/40 p-4 rounded-xl border border-border/50">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  filter[empresaId] (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1"
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  filter[status]
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Todos (Ativos e Inativos)</option>
                  <option value="ativo">ativo</option>
                  <option value="inativo">inativo</option>
                  <option value="demitido">demitido</option>
                  <option value="afastado">afastado</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  fields[funcionarios]
                </label>
                <input
                  type="text"
                  placeholder="codigo,nome,afastamentodescricao"
                  value={fieldsParam}
                  onChange={(e) => setFieldsParam(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  sort
                </label>
                <input
                  type="text"
                  placeholder="codigo"
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  page[limit]
                </label>
                <input
                  type="number"
                  value={pageLimit}
                  onChange={(e) => setPageLimit(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  page[offset] (Deslocamento)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={pageOffset}
                  onChange={(e) => setPageOffset(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        )}

        {subTab === "funcionario_id" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">GET /api/v1/funcionarios/{'{id}'}</h3>
                <p className="text-xs text-muted-foreground">
                  Consulta detalhes completos de um funcionário por ID incluindo dados de contatos, banco e chave PIX.
                </p>
              </div>

              <button
                onClick={handleConsultarFuncionarioId}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                <span>Buscar por ID</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/40 p-4 rounded-xl border border-border/50">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  ID do Funcionário *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 11"
                  value={funcionarioId}
                  onChange={(e) => setFuncionarioId(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-3 py-1.5 text-xs text-card-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Relacionamentos para Incluir (`include`)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "departamento",
                    "estadocivil",
                    "foto",
                    "formadepagamento",
                    "tipoDeConta",
                    "tipoDeChavePix",
                    "naturalidade",
                    "nacionalidade",
                    "estado"
                  ].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => toggleInclude(inc)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                        includesSelecionados.includes(inc)
                          ? "bg-primary/15 text-primary border-primary/40 font-semibold"
                          : "bg-card text-muted-foreground border-border hover:bg-accent"
                      }`}
                    >
                      {inc}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === "empresas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">GET /api/v1/empresas</h3>
                <p className="text-xs text-muted-foreground">
                  Lista todas as empresas cadastradas e vinculadas ao eContador.
                </p>
              </div>

              <button
                onClick={handleConsultarEmpresas}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                <span>Buscar Empresas</span>
              </button>
            </div>
          </div>
        )}

        {subTab === "custom" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">Playground HTTP Livre</h3>
                <p className="text-xs text-muted-foreground">
                  Testar qualquer rota da documentação com parâmetros ou payloads personalizados.
                </p>
              </div>

              <button
                onClick={handleExecutarCustom}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                <span>Enviar Requisição</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/40 p-4 rounded-xl border border-border/50">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Método
                </label>
                <select
                  value={customMethod}
                  onChange={(e) => setCustomMethod(e.target.value as any)}
                  className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs font-bold text-card-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Caminho do Endpoint (com base no Host selecionado)
                </label>
                <input
                  type="text"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  className="w-full rounded-md border border-input bg-card px-3 py-1.5 text-xs font-mono text-card-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {(customMethod === "POST" || customMethod === "PUT") && (
                <div className="md:col-span-4">
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Corpo da Requisição (JSON)
                  </label>
                  <textarea
                    rows={6}
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    className="w-full rounded-md border border-input bg-card p-3 text-xs font-mono text-card-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Retorno / Resposta HTTP */}
      {(statusCode !== null || errorMsg || responseJson || loading) && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-card-foreground uppercase tracking-wider">Resposta HTTP</span>

              {statusCode !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold ${
                    statusCode >= 200 && statusCode < 300
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  }`}
                >
                  Status: {statusCode}
                </span>
              )}

              {executionTimeMs !== null && (
                <span className="text-xs font-mono text-muted-foreground">
                  Tempo: {executionTimeMs} ms
                </span>
              )}
            </div>

            {responseJson && (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(JSON.stringify(responseJson, null, 2))}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar JSON
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMsg}</p>
                <p className="mt-1 text-[11px] opacity-90">
                  Dica: Verifique se o Token no topo está correto e se o servidor da Alterdata permite a requisição.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-xs font-medium">Aguardando resposta do ePlugin Alterdata...</span>
            </div>
          ) : responseJson ? (
            <div className="space-y-4">
              {/* Se houver array de funcionários no retorno de listagem, podemos mostrar tabela resumida */}
              {rawItems.length > 0 && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2 bg-muted/30 p-3 rounded-xl border border-border/60">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-xs font-bold text-card-foreground flex items-center gap-1.5">
                        <User className="h-4 w-4 text-primary" />
                        {unificarRegistros ? (
                          <span>
                            {unifiedItems.length} Colaboradores Unificados{" "}
                            <span className="font-normal text-muted-foreground">
                              ({rawItems.length} registros brutos)
                            </span>
                          </span>
                        ) : (
                          <span>Registros Encontrados ({rawItems.length})</span>
                        )}
                      </h4>

                      {/* Botão de Unificação por CPF/Nome */}
                      <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer bg-primary/10 border border-primary/25 px-3 py-1 rounded-lg text-primary hover:bg-primary/20 transition-all select-none shadow-xs">
                        <input
                          type="checkbox"
                          checked={unificarRegistros}
                          onChange={(e) => setUnificarRegistros(e.target.checked)}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <GitMerge className="h-3.5 w-3.5" />
                        <span>Unificar Colaboradores (1 nome por CPF/Nome)</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground text-[11px]">Exibir na tabela:</span>
                      <select
                        value={displayLimit}
                        onChange={(e) => setDisplayLimit(e.target.value === "all" ? "all" : Number(e.target.value))}
                        className="rounded border border-input bg-card px-2 py-0.5 text-xs text-card-foreground focus:outline-none font-medium"
                      >
                        <option value="all">Todos os {displayItems.length} na página</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-2.5">ID</th>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Nome / Razão</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">1ª Admissão (Histórico)</th>
                          <th className="p-2.5">Contratos / Histórico</th>
                          <th className="p-2.5">Afastamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(displayLimit === "all" ? displayItems : displayItems.slice(0, displayLimit)).map((item: any, idx: number) => {
                          if (!item) return null;
                          const unificado = item._unificado;
                          const statusRaw = item.attributes?.status ?? item.attributes?.situacao ?? (item.attributes?.ativa !== undefined ? (item.attributes.ativa ? "Ativo" : "Inativo") : null);
                          const statusText = statusRaw ? String(statusRaw) : "N/A";
                          const stLower = statusText.toLowerCase();
                          const isAtivo = stLower === "ativo" || stLower === "a" || stLower === "true";
                          const isAfastado = stLower.includes("afastad");
                          const isDemitido = stLower.includes("demitid") || stLower.includes("inativ") || stLower === "false";

                          const badgeClass = isAtivo
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold"
                            : isAfastado
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold"
                            : isDemitido
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold"
                            : "bg-muted text-muted-foreground border border-border";

                          const primeiraAdm = unificado?.primeiraAdmissao || item.attributes?.dataadmissao || item.attributes?.dataAdmissao || null;

                          return (
                            <tr key={item.id || idx} className="hover:bg-muted/30">
                              <td className="p-2.5 font-mono text-primary font-bold">{item.id || "-"}</td>
                              <td className="p-2.5 font-mono font-bold">
                                {item.attributes?.codigo || item.attributes?.codigoEmpresa || "-"}
                              </td>
                              <td className="p-2.5 font-semibold text-card-foreground">
                                {item.attributes?.nome || item.attributes?.nomeFantasia || item.attributes?.nomecargo || "-"}
                              </td>
                              <td className="p-2.5">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] capitalize ${badgeClass}`}>
                                  {statusText}
                                </span>
                              </td>
                              <td className="p-2.5 font-mono text-xs">
                                {primeiraAdm ? (
                                  <span className="inline-flex items-center gap-1 font-semibold text-card-foreground bg-muted px-2 py-0.5 rounded border border-border">
                                    🗓️ {primeiraAdm}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">-</span>
                                )}
                              </td>
                              <td className="p-2.5">
                                {unificado ? (
                                  unificado.totalContratos > 1 ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                        <GitMerge className="h-3 w-3" />
                                        {unificado.totalContratos} Contratos Unificados
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-mono">
                                        {unificado.codigosResumo}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-[11px]">1 contrato único</span>
                                  )
                                ) : (
                                  <span className="text-muted-foreground font-mono">{item.type || "-"}</span>
                                )}
                              </td>
                              <td className="p-2.5 text-muted-foreground">{item.attributes?.afastamentodescricao || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* JSON Viewer */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-semibold text-card-foreground flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5 text-primary" /> Conteúdo JSON
                    {unificarRegistros ? " (Visualização Unificada Disponível)" : " Bruto"}
                  </h4>
                </div>
                <pre className="max-h-96 overflow-auto rounded-xl border border-border bg-slate-950 p-4 font-mono text-xs text-slate-100 shadow-inner">
                  {JSON.stringify(
                    unificarRegistros && Array.isArray(responseJson.data)
                      ? {
                          ...responseJson,
                          unificado: true,
                          data: unifiedItems,
                        }
                      : responseJson,
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
