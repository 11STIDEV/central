import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Clock,
  UserPlus,
  UserMinus,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Search,
  Mail,
  MailX,
  Copy,
  Check,
  AlertTriangle,
  Users,
  UserCheck,
  ChevronDown,
  ExternalLink,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  resolverSugestaoEmail,
  type ResultadoSugestaoEmail,
  type OpcaoEmailAvaliada,
} from "@/lib/alterdataEmailGenerator";

interface MonitorStatus {
  ativo: boolean;
  emExecucao: boolean;
  ultimaVerificacao: string | null;
  proximaVerificacao: string | null;
  horariosAgendados: string[];
  ultimoResultado?: {
    mudancasTotal: number;
    admissoesCount: number;
    demissoesCount: number;
    duracaoMs: number;
  } | null;
}

interface MudancaItem {
  id?: string;
  tipo: "admissao" | "demissao" | "alteracao_status";
  funcionario_nome: string;
  funcionario_email?: string | null;
  funcionario_cpf?: string | null;
  funcionario_matricula?: string | null;
  cargo?: string | null;
  data_evento?: string | null;
  detectado_em: string;
}

interface FuncionarioBanco {
  chave_unica?: string;
  nome_completo: string;
  cpf?: string | null;
  email?: string | null;
  status_atual?: string | null;
  tem_contrato_ativo?: boolean | null;
  codigo_contrato_vigente?: string | null;
  primeira_admissao?: string | null;
  admissao_atual?: string | null;
  demissao_mais_recente?: string | null;
  dados_brutos?: any;
}

export function AlterdataMonitorCard() {
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [mudancas, setMudancas] = useState<MudancaItem[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioBanco[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [busca, setBusca] = useState("");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // E-mail selecionado manualmente caso o operador queira escolher uma alternativa
  const [emailSelecionado, setEmailSelecionado] = useState<Record<string, string>>({});
  // ID do colaborador com menu de opções de e-mail aberto
  const [opcoesAbertasId, setOpcoesAbertasId] = useState<string | null>(null);

  // Aba selecionada dentro do Monitor: "ativos" | "sem_email" | "demitidos" | "mudancas"
  const [abaMonitor, setAbaMonitor] = useState<"ativos" | "sem_email" | "demitidos" | "mudancas">("ativos");
  const [filtroApenasSemEmail, setFiltroApenasSemEmail] = useState(false);

  const carregarDados = useCallback(async () => {
    try {
      const [resStatus, resMudancas, resFuncionarios] = await Promise.all([
        fetch("/api/alterdata/monitor/status"),
        fetch("/api/alterdata/monitor/mudancas"),
        fetch("/api/alterdata/banco-funcionarios"),
      ]);

      if (resStatus.ok) {
        const jsonStatus = await resStatus.json();
        setStatus(jsonStatus.status);
      }

      if (resMudancas.ok) {
        const jsonMudancas = await resMudancas.json();
        setMudancas(jsonMudancas.mudancas || []);
      }

      if (resFuncionarios.ok) {
        const jsonFunc = await resFuncionarios.json();
        setFuncionarios(jsonFunc.data || []);
      }
    } catch (e: any) {
      console.warn("[AlterdataMonitorCard] Falha ao carregar status:", e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
    // Atualiza status a cada 30 segundos
    const timer = setInterval(() => {
      void carregarDados();
    }, 30000);
    return () => clearInterval(timer);
  }, [carregarDados]);

  async function handleVerificarAgora() {
    setVerificando(true);
    const token = localStorage.getItem("alterdata_token") || "";

    try {
      const res = await fetch("/api/alterdata/monitor/verificar-agora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() || undefined }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      if (json.mudancasTotal === 0) {
        toast.success("Verificação concluída! Base do Supabase 100% alinhada com o Alterdata.");
      } else {
        toast.success(
          `Verificação concluída! Detectadas ${json.admissoesCount} admissões e ${json.demissoesCount} demissões. Supabase atualizado!`
        );
      }

      await carregarDados();
    } catch (err: any) {
      toast.error(`Erro na verificação do Alterdata: ${err.message}`);
    } finally {
      setVerificando(false);
    }
  }

  // Separação de Listas: Ativos, Demitidos e Sem E-mail
  const ativos = useMemo(() => {
    return funcionarios.filter((f) => f.tem_contrato_ativo || f.status_atual === "Ativo");
  }, [funcionarios]);

  const demitidos = useMemo(() => {
    return funcionarios.filter((f) => !f.tem_contrato_ativo && f.status_atual !== "Ativo");
  }, [funcionarios]);

  const semEmail = useMemo(() => {
    return ativos.filter((f) => !f.email || !f.email.trim());
  }, [ativos]);

  // Mapa com as resoluções inteligentes de e-mail e prevenção de colisão calculadas
  const mapaSugestoes = useMemo(() => {
    const mapa = new Map<string, ResultadoSugestaoEmail>();
    for (const f of funcionarios) {
      const id = f.chave_unica || f.codigo_contrato_vigente || f.nome_completo;
      const res = resolverSugestaoEmail(f.nome_completo, funcionarios);
      mapa.set(id, res);
    }
    return mapa;
  }, [funcionarios]);

  function obterIdFuncionario(f: FuncionarioBanco): string {
    return f.chave_unica || f.codigo_contrato_vigente || f.nome_completo;
  }

  function obterEmailSugeridoFinal(f: FuncionarioBanco): string {
    const id = obterIdFuncionario(f);
    if (emailSelecionado[id]) return emailSelecionado[id];
    const sug = mapaSugestoes.get(id);
    return sug?.emailSugerido || "usuario@portalcci.com.br";
  }

  // Filtro de Ativos
  const ativosFiltrados = useMemo(() => {
    let list = ativos;
    if (filtroApenasSemEmail) {
      list = list.filter((f) => !f.email || !f.email.trim());
    }
    if (busca.trim()) {
      const b = busca.toLowerCase().trim();
      const bDig = b.replace(/\D/g, "");
      list = list.filter((f) => {
        const nome = (f.nome_completo || "").toLowerCase();
        const email = (f.email || "").toLowerCase();
        const cod = (f.codigo_contrato_vigente || "").toLowerCase();
        const cpfDig = (f.cpf || "").replace(/\D/g, "");
        return nome.includes(b) || email.includes(b) || cod.includes(b) || (bDig && cpfDig.includes(bDig));
      });
    }
    return list;
  }, [ativos, filtroApenasSemEmail, busca]);

  // Filtro de Demitidos
  const demitidosFiltrados = useMemo(() => {
    let list = demitidos;
    if (busca.trim()) {
      const b = busca.toLowerCase().trim();
      const bDig = b.replace(/\D/g, "");
      list = list.filter((f) => {
        const nome = (f.nome_completo || "").toLowerCase();
        const email = (f.email || "").toLowerCase();
        const cod = (f.codigo_contrato_vigente || "").toLowerCase();
        const cpfDig = (f.cpf || "").replace(/\D/g, "");
        return nome.includes(b) || email.includes(b) || cod.includes(b) || (bDig && cpfDig.includes(bDig));
      });
    }
    return list;
  }, [demitidos, busca]);

  // Filtro de Sem E-mail
  const semEmailFiltrados = useMemo(() => {
    let list = semEmail;
    if (busca.trim()) {
      const b = busca.toLowerCase().trim();
      const bDig = b.replace(/\D/g, "");
      list = list.filter((f) => {
        const nome = (f.nome_completo || "").toLowerCase();
        const cod = (f.codigo_contrato_vigente || "").toLowerCase();
        const cpfDig = (f.cpf || "").replace(/\D/g, "");
        return nome.includes(b) || cod.includes(b) || (bDig && cpfDig.includes(bDig));
      });
    }
    return list;
  }, [semEmail, busca]);

  // Filtro de Mudanças
  const mudancasFiltradas = useMemo(() => {
    if (!busca.trim()) return mudancas;
    const b = busca.toLowerCase().trim();
    return mudancas.filter((m) =>
      m.funcionario_nome.toLowerCase().includes(b) ||
      m.funcionario_email?.toLowerCase().includes(b) ||
      m.funcionario_matricula?.includes(b) ||
      m.cargo?.toLowerCase().includes(b)
    );
  }, [mudancas, busca]);

  function formatarDataHora(isoString?: string | null) {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return isoString;
    }
  }

  function extrairCargo(f: FuncionarioBanco): string {
    const b = f.dados_brutos;
    return b?.attributes?.nomecargo || b?.cargo || b?.attributes?.cargo || "-";
  }

  function copiarDadosCriacaoGoogle(f: FuncionarioBanco) {
    const id = obterIdFuncionario(f);
    const emailFinal = obterEmailSugeridoFinal(f);
    const sug = mapaSugestoes.get(id);

    const dados = [
      `Nome Completo: ${f.nome_completo}`,
      `E-mail Sugerido: ${emailFinal}`,
      `Matrícula Folha: ${f.codigo_contrato_vigente || "-"}`,
      `CPF: ${f.cpf || "-"}`,
      `Data Admissão: ${f.admissao_atual || f.primeira_admissao || "-"}`,
      `Cargo: ${extrairCargo(f)}`,
      `Domínio: @portalcci.com.br`,
      `Status Homônimo: ${sug?.houveColisao ? `Alternativa selecionada (${sug.motivoColisao})` : "Padrão oficial primeiro.último"}`,
    ].join("\n");

    navigator.clipboard.writeText(dados);
    setCopiadoId(id);
    toast.success(`Dados e e-mail sugerido (${emailFinal}) copiados para o Google!`);
    setTimeout(() => setCopiadoId(null), 2500);
  }

  function copiarApenasEmail(email: string, id: string) {
    navigator.clipboard.writeText(email);
    setCopiadoId(`email-${id}`);
    toast.success(`E-mail ${email} copiado!`);
    setTimeout(() => setCopiadoId(null), 2000);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all md:p-6 space-y-6">
      {/* Header Principal do Monitor */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-bold text-foreground">
              Monitor de Admissões &amp; Demissões (Alterdata)
            </h3>
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
              Rotina Automática: 08:00 e 14:00
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Acompanhe novas contratações, demissões e geração padronizada de e-mails corporativos no Google Workspace (<code className="font-mono">primeiro.ultimo@portalcci.com.br</code>).
          </p>
        </div>

        <Button
          onClick={handleVerificarAgora}
          disabled={verificando}
          size="sm"
          className="gap-2 shadow-sm font-semibold whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className={`h-4 w-4 ${verificando ? "animate-spin" : ""}`} />
          {verificando ? "Verificando no Alterdata..." : "Verificar Alterdata Agora"}
        </Button>
      </div>

      {/* Cartões de Indicadores (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Próxima Verificação */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Próxima Rotina</span>
          </div>
          <p className="mt-1 text-sm font-bold text-foreground">
            {formatarDataHora(status?.proximaVerificacao)}
          </p>
          <span className="text-[11px] text-muted-foreground">Dias úteis às 08:00 e 14:00</span>
        </div>

        {/* Colaboradores Ativos */}
        <div
          onClick={() => { setAbaMonitor("ativos"); setFiltroApenasSemEmail(false); }}
          className="rounded-xl border border-border/80 bg-muted/20 p-4 cursor-pointer hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>Colaboradores Ativos</span>
            </div>
            <span className="text-[11px] font-semibold text-primary hover:underline">Ver lista</span>
          </div>
          <p className="mt-1 text-2xl font-black text-foreground">
            {carregando ? "-" : ativos.length}
          </p>
          <span className="text-[11px] text-muted-foreground">Com contratos vigentes no Alterdata</span>
        </div>

        {/* Novos / Ativos Sem E-mail */}
        <div
          onClick={() => { setAbaMonitor("sem_email"); }}
          className={`rounded-xl border p-4 cursor-pointer transition-all ${
            semEmail.length > 0
              ? "border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/15"
              : "border-border/80 bg-muted/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-semibold">
              <MailX className="h-4 w-4" />
              <span>Sem E-mail (Google)</span>
            </div>
            {semEmail.length > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                Criar contas
              </span>
            )}
          </div>
          <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
            {carregando ? "-" : semEmail.length}
          </p>
          <span className="text-[11px] text-muted-foreground">Colaboradores com e-mail sugerido pronto</span>
        </div>

        {/* Demitidos / Inativos */}
        <div
          onClick={() => { setAbaMonitor("demitidos"); }}
          className="rounded-xl border border-border/80 bg-muted/20 p-4 cursor-pointer hover:border-rose-500/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <UserMinus className="h-4 w-4 text-rose-500" />
              <span>Demitidos / Inativos</span>
            </div>
            <span className="text-[11px] font-semibold text-rose-500 hover:underline">Ver lista</span>
          </div>
          <p className="mt-1 text-2xl font-black text-foreground">
            {carregando ? "-" : demitidos.length}
          </p>
          <span className="text-[11px] text-muted-foreground">Contratos rescindidos no Alterdata</span>
        </div>
      </div>

      {/* Seletor de Abas do Monitor */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex flex-wrap gap-2">
            {/* Aba 1: Colaboradores Ativos */}
            <button
              type="button"
              onClick={() => { setAbaMonitor("ativos"); setFiltroApenasSemEmail(false); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                abaMonitor === "ativos" && !filtroApenasSemEmail
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Colaboradores Ativos</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                {ativos.length}
              </span>
            </button>

            {/* Aba 2: Sem E-mail (Atenção TI) */}
            <button
              type="button"
              onClick={() => setAbaMonitor("sem_email")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                abaMonitor === "sem_email"
                  ? "bg-amber-600 text-white shadow-sm"
                  : semEmail.length > 0
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Sem E-mail Corporativo</span>
              {semEmail.length > 0 && (
                <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                  {semEmail.length}
                </span>
              )}
            </button>

            {/* Aba 3: Demitidos */}
            <button
              type="button"
              onClick={() => setAbaMonitor("demitidos")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                abaMonitor === "demitidos"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <UserMinus className="h-3.5 w-3.5" />
              <span>Demitidos / Desligados</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                {demitidos.length}
              </span>
            </button>

            {/* Aba 4: Histórico de Auditoria */}
            <button
              type="button"
              onClick={() => setAbaMonitor("mudancas")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                abaMonitor === "mudancas"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Histórico de Mudanças</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                {mudancas.length}
              </span>
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome, CPF ou matrícula..."
              className="h-8.5 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        {/* CONTEÚDO DA ABA 1: COLABORADORES ATIVOS */}
        {abaMonitor === "ativos" && (
          <div className="space-y-4">
            {/* Sub-filtro de Ativos */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Exibir:</span>
                <button
                  type="button"
                  onClick={() => setFiltroApenasSemEmail(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    !filtroApenasSemEmail
                      ? "bg-card text-foreground border border-border shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todos os Ativos ({ativos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroApenasSemEmail(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filtroApenasSemEmail
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ⚠️ Apenas Sem E-mail ({semEmail.length})
                </button>
              </div>

              <span className="text-xs text-muted-foreground">
                Exibindo {ativosFiltrados.length} colaborador(es)
              </span>
            </div>

            {/* Tabela de Colaboradores Ativos */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-3.5 py-2.5">Status</th>
                    <th className="px-3.5 py-2.5">Colaborador</th>
                    <th className="px-3.5 py-2.5">Matrícula</th>
                    <th className="px-3.5 py-2.5">E-mail Corporativo</th>
                    <th className="px-3.5 py-2.5">Cargo / Função</th>
                    <th className="px-3.5 py-2.5">1ª Admissão</th>
                    <th className="px-3.5 py-2.5 text-right">Ação Google Workspace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ativosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Nenhum colaborador ativo encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    ativosFiltrados.map((f, idx) => {
                      const id = obterIdFuncionario(f);
                      const hasEmail = Boolean(f.email && f.email.trim());
                      const isCopiado = copiadoId === id;
                      const emailSugerido = obterEmailSugeridoFinal(f);

                      return (
                        <tr key={id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3.5 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3" />
                              Ativo
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <p className="font-semibold text-foreground">{f.nome_completo}</p>
                            {f.cpf && (
                              <p className="text-[11px] text-muted-foreground font-mono">CPF: {f.cpf}</p>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-bold text-foreground">
                            {f.codigo_contrato_vigente ? `#${f.codigo_contrato_vigente}` : "-"}
                          </td>
                          <td className="px-3.5 py-2.5">
                            {hasEmail ? (
                              <span className="inline-flex items-center gap-1 text-foreground font-medium">
                                <Mail className="h-3.5 w-3.5 text-emerald-500" />
                                {f.email}
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold text-[10px] w-fit">
                                  <MailX className="h-3 w-3" />
                                  Sem e-mail cadastrado
                                </Badge>
                                <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                                  <span>Sugerido:</span>
                                  <span className="font-bold text-primary">{emailSugerido}</span>
                                  <button
                                    type="button"
                                    onClick={() => copiarApenasEmail(emailSugerido, id)}
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                    title="Copiar e-mail sugerido"
                                  >
                                    {copiadoId === `email-${id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">
                            {extrairCargo(f)}
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground font-mono">
                            {f.primeira_admissao || f.admissao_atual || "-"}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            {!hasEmail ? (
                              <button
                                type="button"
                                onClick={() => copiarDadosCriacaoGoogle(f)}
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-all shadow-xs"
                                title="Copiar dados formatados para criar a conta no Google Workspace Admin"
                              >
                                {isCopiado ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                <span>{isCopiado ? "Copiado!" : "Copiar p/ Criar Google"}</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Conta Ativa
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: SEM E-MAIL CORPORATIVO (REGRAS E SUGESTÕES INTELIGENTES) */}
        {abaMonitor === "sem_email" && (
          <div className="space-y-4">
            {/* Banner Informativo com Padrão de Nomenclatura e Prevenção de Colisão */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-xs space-y-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Regra Padrão de Criação de E-mails — {semEmail.length} Colaborador(es) Novo(s) ou Ativo(s) Sem E-mail
                  </h4>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    O padrão oficial adotado é <strong>primeironome.ultimosobrenome@portalcci.com.br</strong> (ex: <em>Andreia Lucia Rios &rarr; andreia.rios@portalcci.com.br</em>).
                    O sistema verifica automaticamente se o e-mail já está em uso por outro funcionário ou ex-colaborador no histórico e sugere a alternativa mais limpa com o nome do meio para <strong>evitar qualquer colisão de contas</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Tabela Exclusiva de Colaboradores Sem E-mail com Sugestão e Alternativas */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-3.5 py-2.5">Colaborador</th>
                    <th className="px-3.5 py-2.5">Matrícula</th>
                    <th className="px-3.5 py-2.5">E-mail Sugerido (@portalcci.com.br)</th>
                    <th className="px-3.5 py-2.5">Status da Regra / Homônimo</th>
                    <th className="px-3.5 py-2.5">Data Admissão</th>
                    <th className="px-3.5 py-2.5">Cargo</th>
                    <th className="px-3.5 py-2.5 text-right">Ação Google</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {semEmailFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                        <p className="font-semibold text-foreground">Excelente! Todos os colaboradores ativos possuem e-mail cadastrado.</p>
                      </td>
                    </tr>
                  ) : (
                    semEmailFiltrados.map((f, idx) => {
                      const id = obterIdFuncionario(f);
                      const isCopiado = copiadoId === id;
                      const isCopiadoEmail = copiadoId === `email-${id}`;
                      const emailSugerido = obterEmailSugeridoFinal(f);
                      const sug = mapaSugestoes.get(id);
                      const isMenuAberto = opcoesAbertasId === id;
                      const opcoesDisponiveis = sug?.opcoes.filter((o) => o.disponivel) || [];

                      return (
                        <tr key={id} className="hover:bg-amber-500/5 transition-colors">
                          {/* Colaborador */}
                          <td className="px-3.5 py-2.5">
                            <p className="font-bold text-foreground text-sm">{f.nome_completo}</p>
                            {f.cpf && (
                              <p className="text-[11px] text-muted-foreground font-mono">CPF: {f.cpf}</p>
                            )}
                          </td>

                          {/* Matrícula */}
                          <td className="px-3.5 py-2.5 font-mono font-bold text-foreground">
                            {f.codigo_contrato_vigente ? `#${f.codigo_contrato_vigente}` : "-"}
                          </td>

                          {/* E-mail Sugerido com Botão de Copiar e Menu de Alternativas */}
                          <td className="px-3.5 py-2.5">
                            <div className="space-y-1.5">
                              <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-mono font-bold text-primary shadow-xs">
                                <Mail className="h-3.5 w-3.5" />
                                <span>{emailSugerido}</span>
                                <button
                                  type="button"
                                  onClick={() => copiarApenasEmail(emailSugerido, id)}
                                  className="ml-1 rounded p-0.5 hover:bg-primary/20 text-primary transition-colors"
                                  title="Copiar apenas o e-mail sugerido"
                                >
                                  {isCopiadoEmail ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>

                              {/* Seletor de Alternativas caso haja opções com nome do meio */}
                              {opcoesDisponiveis.length > 1 && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setOpcoesAbertasId(isMenuAberto ? null : id)}
                                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <span>Ver outras opções ({opcoesDisponiveis.length})</span>
                                    <ChevronDown className={`h-3 w-3 transition-transform ${isMenuAberto ? "rotate-180" : ""}`} />
                                  </button>

                                  {isMenuAberto && (
                                    <div className="absolute left-0 top-6 z-20 w-80 rounded-xl border border-border bg-card p-2 shadow-xl space-y-1 animate-in fade-in zoom-in-95">
                                      <p className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Escolha uma alternativa para este colaborador:
                                      </p>
                                      {sug?.opcoes.map((opcao, oIdx) => (
                                        <button
                                          key={oIdx}
                                          type="button"
                                          disabled={!opcao.disponivel}
                                          onClick={() => {
                                            setEmailSelecionado((prev) => ({ ...prev, [id]: opcao.email }));
                                            setOpcoesAbertasId(null);
                                            toast.success(`Opção alterada para ${opcao.email}`);
                                          }}
                                          className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                                            opcao.email === emailSugerido
                                              ? "bg-primary/15 font-bold text-primary border border-primary/30"
                                              : opcao.disponivel
                                              ? "hover:bg-muted text-card-foreground"
                                              : "opacity-40 cursor-not-allowed bg-muted/40"
                                          }`}
                                        >
                                          <div className="flex flex-col">
                                            <span className="font-mono">{opcao.email}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                              {opcao.descricao}
                                            </span>
                                          </div>
                                          {opcao.disponivel ? (
                                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                              Disponível
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-semibold text-rose-500">
                                              Em uso ({opcao.ocupante?.status || "Ocupado"})
                                            </span>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status da Regra / Homônimo */}
                          <td className="px-3.5 py-2.5">
                            {sug?.houveColisao ? (
                              <div className="flex flex-col gap-1 max-w-[200px]">
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-semibold text-[10px] w-fit">
                                  <Sparkles className="h-3 w-3" />
                                  Colisão evitada
                                </Badge>
                                <span className="text-[10px] text-muted-foreground leading-tight" title={sug.motivoColisao || ""}>
                                  Padrão <strong>{sug.padraoOriginal}</strong> já em uso por {sug.colididoCom?.nome?.split(" ")[0]} ({sug.colididoCom?.ativo ? "ativo" : "ex-funcionário"}).
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold text-[10px]">
                                <CheckCircle2 className="h-3 w-3" />
                                Padrão oficial livre
                              </Badge>
                            )}
                          </td>

                          {/* Data Admissão */}
                          <td className="px-3.5 py-2.5 font-mono text-muted-foreground">
                            {f.admissao_atual || f.primeira_admissao || "-"}
                          </td>

                          {/* Cargo */}
                          <td className="px-3.5 py-2.5 text-muted-foreground">
                            {extrairCargo(f)}
                          </td>

                          {/* Ação Google Workspace */}
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => copiarDadosCriacaoGoogle(f)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
                              title="Copiar dados completos com o e-mail sugerido para criar no Google Admin"
                            >
                              {isCopiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              <span>{isCopiado ? "Dados Copiados!" : "Copiar p/ Criar Google"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 3: DEMITIDOS / DESLIGADOS */}
        {abaMonitor === "demitidos" && (
          <div className="space-y-4">
            {/* Banner Informativo */}
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <UserMinus className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    Controle de Desligamentos — {demitidos.length} Colaborador(es) Demitido(s) / Inativo(s)
                  </h4>
                  <p className="text-xs text-rose-800/90 dark:text-rose-300/90 leading-relaxed">
                    Colaboradores com contratos rescindidos no Alterdata e automaticamente inativados no Supabase. Verifique para <strong>suspender ou arquivar as contas no Google Workspace</strong> e revogar acessos aos sistemas internos.
                  </p>
                </div>
              </div>
            </div>

            {/* Tabela de Demitidos */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-3.5 py-2.5">Status</th>
                    <th className="px-3.5 py-2.5">Colaborador</th>
                    <th className="px-3.5 py-2.5">Matrícula</th>
                    <th className="px-3.5 py-2.5">E-mail Corporativo</th>
                    <th className="px-3.5 py-2.5">Data Demissão / Desligamento</th>
                    <th className="px-3.5 py-2.5">Cargo Anterior</th>
                    <th className="px-3.5 py-2.5 text-right">Ação TI Google</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {demitidosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Nenhum colaborador demitido encontrado para a busca especificada.
                      </td>
                    </tr>
                  ) : (
                    demitidosFiltrados.map((f, idx) => {
                      const id = obterIdFuncionario(f);

                      return (
                        <tr key={id} className="hover:bg-rose-500/5 transition-colors">
                          <td className="px-3.5 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              <UserMinus className="h-3 w-3" />
                              Demitido
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <p className="font-semibold text-foreground">{f.nome_completo}</p>
                            {f.cpf && (
                              <p className="text-[11px] text-muted-foreground font-mono">CPF: {f.cpf}</p>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-muted-foreground">
                            {f.codigo_contrato_vigente ? `#${f.codigo_contrato_vigente}` : "-"}
                          </td>
                          <td className="px-3.5 py-2.5">
                            {f.email ? (
                              <span className="text-foreground font-mono text-xs">{f.email}</span>
                            ) : (
                              <span className="text-muted-foreground italic">Sem e-mail registrado</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-rose-600 dark:text-rose-400 font-bold">
                            {f.demissao_mais_recente || "-"}
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">
                            {extrairCargo(f)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                              Suspender no Google
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 4: HISTÓRICO DE AUDITORIA DO MONITOR */}
        {abaMonitor === "mudancas" && (
          <div className="space-y-4">
            {mudancas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/80" />
                <p className="text-sm font-bold text-foreground">
                  Nenhuma mudança pendente registrada pelo monitor
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Quando o agendador (08:00 e 14:00) ou o botão "Verificar Alterdata Agora" identificar novas admissões ou demissões, os registros de auditoria aparecerão nesta tabela.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Tipo</th>
                      <th className="px-3.5 py-2.5">Colaborador</th>
                      <th className="px-3.5 py-2.5">Matrícula</th>
                      <th className="px-3.5 py-2.5">E-mail</th>
                      <th className="px-3.5 py-2.5">Cargo / Função</th>
                      <th className="px-3.5 py-2.5">Data Evento</th>
                      <th className="px-3.5 py-2.5">Detectado Em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mudancasFiltradas.map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3.5 py-2.5">
                          {m.tipo === "admissao" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1 font-bold">
                              <UserPlus className="h-3 w-3" />
                              Nova Admissão
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/30 gap-1 font-bold">
                              <UserMinus className="h-3 w-3" />
                              Demissão
                            </Badge>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <p className="font-semibold text-foreground">{m.funcionario_nome}</p>
                          {m.funcionario_cpf && (
                            <p className="text-[11px] text-muted-foreground font-mono">CPF: {m.funcionario_cpf}</p>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-muted-foreground font-bold">
                          {m.funcionario_matricula ? `#${m.funcionario_matricula}` : "-"}
                        </td>
                        <td className="px-3.5 py-2.5">
                          {m.funcionario_email ? (
                            <span className="text-foreground">{m.funcionario_email}</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                              ⚠️ Sem e-mail
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-muted-foreground">
                          {m.cargo || "-"}
                        </td>
                        <td className="px-3.5 py-2.5 text-muted-foreground font-mono">
                          {m.data_evento || "-"}
                        </td>
                        <td className="px-3.5 py-2.5 text-muted-foreground">
                          {formatarDataHora(m.detectado_em)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
