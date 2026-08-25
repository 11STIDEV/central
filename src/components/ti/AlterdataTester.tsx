import { useState, useEffect } from "react";
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
  ExternalLink
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

  // Aba Interna do Testador
  const [subTab, setSubTab] = useState<"funcionarios" | "funcionario_id" | "empresas" | "custom">("funcionarios");

  // Estado da Requisição
  const [loading, setLoading] = useState(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const [responseJson, setResponseJson] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Filtros Consulta Funcionários ---
  const [empresaId, setEmpresaId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ativo");
  const [fieldsParam, setFieldsParam] = useState<string>("codigo,nome,afastamentodescricao");
  const [pageLimit, setPageLimit] = useState<number>(25);
  const [sortField, setSortField] = useState<string>("codigo");

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

  // Salva token no localStorage
  useEffect(() => {
    localStorage.setItem("alterdata_token", token);
  }, [token]);

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
        setErrorMsg(`Erro HTTP ${res.status}: ${res.statusText}`);
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
  const handleConsultarFuncionarios = () => {
    const params = new URLSearchParams();
    if (empresaId.trim()) params.append("filter[empresaId]", empresaId.trim());
    if (statusFilter.trim()) params.append("filter[status]", statusFilter.trim());
    if (fieldsParam.trim()) params.append("fields[funcionarios]", fieldsParam.trim());
    if (pageLimit) params.append("page[limit]", pageLimit.toString());
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
          onClick={() => setSubTab("funcionarios")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
            subTab === "funcionarios"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          Consulta Funcionários (GET)
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-muted/40 p-4 rounded-xl border border-border/50">
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
                  <option value="ativo">ativo</option>
                  <option value="">Todos</option>
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
              {Array.isArray(responseJson.data) && responseJson.data.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-card-foreground mb-2 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Registros Encontrados ({responseJson.data.length} de {responseJson.meta?.totalResourceCount || responseJson.data.length})
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-2.5">ID</th>
                          <th className="p-2.5">Tipo</th>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Nome / Razão</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Afastamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {responseJson.data.slice(0, 10).map((item: any, idx: number) => (
                          <tr key={item.id || idx} className="hover:bg-muted/30">
                            <td className="p-2.5 font-mono text-primary font-bold">{item.id}</td>
                            <td className="p-2.5 font-mono text-muted-foreground">{item.type}</td>
                            <td className="p-2.5 font-mono">{item.attributes?.codigo || item.attributes?.codigoEmpresa || "-"}</td>
                            <td className="p-2.5 font-semibold text-card-foreground">
                              {item.attributes?.nome || item.attributes?.nomeFantasia || item.attributes?.nomecargo || "-"}
                            </td>
                            <td className="p-2.5">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {item.attributes?.status || item.attributes?.ativa ? "Ativo" : "N/A"}
                              </span>
                            </td>
                            <td className="p-2.5 text-muted-foreground">{item.attributes?.afastamentodescricao || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {responseJson.data.length > 10 && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 italic">
                      Exibindo os primeiros 10 itens da tabela. Veja a árvore JSON abaixo para o retorno completo.
                    </p>
                  )}
                </div>
              )}

              {/* JSON Viewer */}
              <div>
                <h4 className="text-xs font-semibold text-card-foreground mb-1.5 flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5 text-primary" /> Conteúdo JSON Bruto
                </h4>
                <pre className="max-h-96 overflow-auto rounded-xl border border-border bg-slate-950 p-4 font-mono text-xs text-slate-100 shadow-inner">
                  {JSON.stringify(responseJson, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
