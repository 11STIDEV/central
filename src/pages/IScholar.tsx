import { useState, useEffect } from "react";
import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/auth/AuthProvider";
import {
  GraduationCap,
  AlertCircle,
  Search,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  User,
  AlertTriangle,
  Copy,
  Check,
  Calendar,
  Layers,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Telefone {
  tipo: string;
  numero: string;
}

interface ContatosTelefonicos {
  responsavel1?: Telefone[];
  responsavel2?: Telefone[];
  aluno?: Telefone[];
  filiacao1?: Telefone[];
  filiacao2?: Telefone[];
}

interface Aluno {
  id_matricula: string;
  id_aluno: string;
  nome_aluno: string;
  email_aluno: string | null;
  turma: string;
  responsavel: string;
  email_responsavel: string | null;
  contatos_telefonicos?: ContatosTelefonicos;
  numero_re?: string;
  periodo?: string;
}

interface AlunoAgrupado {
  id_aluno: string;
  id_matricula: string;
  nome_aluno: string;
  email_aluno: string | null;
  turmas: string[];
  periodos: string[];
  responsavel: string;
  email_responsavel: string | null;
  contatos_telefonicos?: ContatosTelefonicos;
}

interface WebhookLog {
  timestamp: string;
  headers: any;
  query: any;
  body: any;
}

export default function IScholar() {
  const { googleIdToken } = useAuth();
  const codigoEscola = import.meta.env.VITE_ISCHOLAR_CODIGO_ESCOLA;
  const token = import.meta.env.VITE_ISCHOLAR_TOKEN;

  const [activeTab, setActiveTab] = useState<"alunos" | "webhooks">("alunos");

  // State para alunos
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyWithoutEmail, setOnlyWithoutEmail] = useState(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [mensagemAPI, setMensagemAPI] = useState<string>("");

  // State para webhooks
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const hasCredentials = !!codigoEscola && !!token;

  const fetchAllAlunos = async () => {
    if (!hasCredentials) return;
    setLoading(true);
    setError(null);
    setAlunos([]);
    
    let allAlunos: Aluno[] = [];
    let currentPage = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        setLoadingPage(currentPage);
        setMensagemAPI(`Buscando registros da página ${currentPage}...`);
        
        const response = await fetch(
          `https://api.ischolar.app/aluno/pega_alunos?pagina=${currentPage}`,
          {
            method: "GET",
            headers: {
              "X-Codigo-Escola": codigoEscola,
              "X-Autorizacao": token,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Erro na API (Status ${response.status}) na página ${currentPage}`);
        }

        const resData = await response.json();

        if (resData.status === "erro") {
          throw new Error(resData.mensagem || `Erro retornado pela API na página ${currentPage}`);
        }

        if (Array.isArray(resData.dados) && resData.dados.length > 0) {
          allAlunos = [...allAlunos, ...resData.dados];
          
          if (resData.dados.length < 50) {
            hasMore = false;
          } else {
            currentPage++;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } else {
          hasMore = false;
        }
      }

      setAlunos(allAlunos);
      setMensagemAPI(`Carga completa! ${allAlunos.length} registros de matrículas importados.`);
    } catch (err: any) {
      setError(err.message || "Falha ao carregar lista de alunos.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookLogs = async () => {
    if (!googleIdToken) return;
    setLoadingWebhooks(true);
    try {
      const response = await fetch("/api/ti/ischolar/webhook-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: googleIdToken }),
      });
      if (response.ok) {
        const data = await response.json();
        setWebhookLogs(data);
      }
    } catch (e) {
      console.error("Erro ao carregar logs de webhook:", e);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const clearWebhookLogs = async () => {
    if (!googleIdToken) return;
    if (!window.confirm("Deseja realmente limpar o histórico de logs do webhook?")) return;
    try {
      const response = await fetch("/api/ti/ischolar/webhook-logs/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: googleIdToken }),
      });
      if (response.ok) {
        setWebhookLogs([]);
        setExpandedLogs(new Set());
      }
    } catch (e) {
      console.error("Erro ao limpar logs de webhook:", e);
    }
  };

  useEffect(() => {
    if (hasCredentials && activeTab === "alunos") {
      fetchAllAlunos();
    } else if (activeTab === "webhooks") {
      fetchWebhookLogs();
    }
  }, [activeTab, googleIdToken]);

  const toggleExpandLog = (index: number) => {
    const next = new Set(expandedLogs);
    next.has(index) ? next.delete(index) : next.add(index);
    setExpandedLogs(next);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getTelefoneExibicao = (aluno: AlunoAgrupado) => {
    const contatos = aluno.contatos_telefonicos;
    if (!contatos) return "Não informado";

    const todosTelefones: string[] = [];

    const extrair = (arr?: Telefone[]) => {
      if (arr && Array.isArray(arr)) {
        arr.forEach((t) => {
          if (t.numero && !todosTelefones.includes(t.numero)) {
            todosTelefones.push(t.numero);
          }
        });
      }
    };

    extrair(contatos.responsavel1);
    extrair(contatos.responsavel2);
    extrair(contatos.aluno);
    extrair(contatos.filiacao1);
    extrair(contatos.filiacao2);

    if (todosTelefones.length === 0) return "Não informado";
    return todosTelefones.join(" / ");
  };

  const isPeriodoExcluido = (periodo: string | null | undefined): boolean => {
    if (!periodo) return false;
    const p = periodo.toLowerCase().trim();
    return p.includes("p1negoccia") || p.includes("pec 2026");
  };

  // 1. Filtragem inicial
  const matriculasValidas = alunos.filter(
    (aluno) => !isPeriodoExcluido(aluno.periodo)
  );

  // 2. Agrupamento por Aluno
  const agruparAlunos = (lista: Aluno[]): AlunoAgrupado[] => {
    const grupos: { [id_aluno: string]: Aluno[] } = {};

    lista.forEach((aluno) => {
      const id = aluno.id_aluno || `m-${aluno.id_matricula}`;
      if (!grupos[id]) {
        grupos[id] = [];
      }
      grupos[id].push(aluno);
    });

    return Object.keys(grupos).map((id) => {
      const registros = grupos[id];

      const registroComEmail = registros.find(
        (m) => m.email_aluno && m.email_aluno.trim() !== ""
      );
      const email_aluno = registroComEmail ? registroComEmail.email_aluno : registros[0].email_aluno;

      const registroComEmailResp = registros.find(
        (m) => m.email_responsavel && m.email_responsavel.trim() !== ""
      );
      const email_responsavel = registroComEmailResp
        ? registroComEmailResp.email_responsavel
        : registros[0].email_responsavel;

      const turmas = Array.from(new Set(registros.map((m) => m.turma).filter(Boolean)));
      const periodos = Array.from(new Set(registros.map((m) => m.periodo).filter(Boolean)));
      const idsMatricula = registros.map((m) => m.id_matricula).join(", ");

      const contatosMesclados: ContatosTelefonicos = {};
      registros.forEach((m) => {
        if (m.contatos_telefonicos) {
          if (m.contatos_telefonicos.responsavel1) {
            contatosMesclados.responsavel1 = [
              ...(contatosMesclados.responsavel1 || []),
              ...m.contatos_telefonicos.responsavel1,
            ];
          }
          if (m.contatos_telefonicos.responsavel2) {
            contatosMesclados.responsavel2 = [
              ...(contatosMesclados.responsavel2 || []),
              ...m.contatos_telefonicos.responsavel2,
            ];
          }
          if (m.contatos_telefonicos.aluno) {
            contatosMesclados.aluno = [
              ...(contatosMesclados.aluno || []),
              ...m.contatos_telefonicos.aluno,
            ];
          }
          if (m.contatos_telefonicos.filiacao1) {
            contatosMesclados.filiacao1 = [
              ...(contatosMesclados.filiacao1 || []),
              ...m.contatos_telefonicos.filiacao1,
            ];
          }
          if (m.contatos_telefonicos.filiacao2) {
            contatosMesclados.filiacao2 = [
              ...(contatosMesclados.filiacao2 || []),
              ...m.contatos_telefonicos.filiacao2,
            ];
          }
        }
      });

      const limparTelefones = (arr?: Telefone[]) => {
        if (!arr) return undefined;
        const vistos = new Set<string>();
        return arr.filter((t) => {
          if (!t.numero) return false;
          const numLimpo = t.numero.replace(/\D/g, "");
          if (vistos.has(numLimpo)) return false;
          vistos.add(numLimpo);
          return true;
        });
      };

      contatosMesclados.responsavel1 = limparTelefones(contatosMesclados.responsavel1);
      contatosMesclados.responsavel2 = limparTelefones(contatosMesclados.responsavel2);
      contatosMesclados.aluno = limparTelefones(contatosMesclados.aluno);
      contatosMesclados.filiacao1 = limparTelefones(contatosMesclados.filiacao1);
      contatosMesclados.filiacao2 = limparTelefones(contatosMesclados.filiacao2);

      return {
        id_aluno: id,
        id_matricula: idsMatricula,
        nome_aluno: registros[0].nome_aluno,
        email_aluno,
        turmas,
        periodos,
        responsavel: registros[0].responsavel,
        email_responsavel,
        contatos_telefonicos: contatosMesclados,
      };
    });
  };

  const alunosAgrupados = agruparAlunos(matriculasValidas);

  // 3. Filtragem final
  const alunosFiltradosExibicao = alunosAgrupados.filter((aluno) => {
    const semEmail = !aluno.email_aluno || aluno.email_aluno.trim() === "";
    if (onlyWithoutEmail && !semEmail) return false;

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const nomeMatch = aluno.nome_aluno?.toLowerCase().includes(query);
      const turmasMatch = aluno.turmas.some((t) => t.toLowerCase().includes(query));
      const responsavelMatch = aluno.responsavel?.toLowerCase().includes(query);
      return nomeMatch || turmasMatch || responsavelMatch;
    }

    return true;
  });

  const totalAlunosUnicosValidos = alunosAgrupados.length;
  const totalSemEmail = alunosAgrupados.filter(
    (aluno) => !aluno.email_aluno || aluno.email_aluno.trim() === ""
  ).length;

  const periodosCarregados = Array.from(
    new Set(alunos.map((a) => a.periodo).filter(Boolean))
  ) as string[];

  // Formatação de data
  const formatarData = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString("pt-BR");
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHero
        title="iScholar - Módulo de Integração"
        subtitle="Ferramentas de diagnóstico cadastral e monitoramento de webhooks"
      />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* Abas */}
        <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab("alunos")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === "alunos" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Diagnóstico de Alunos
          </button>
          <button
            onClick={() => setActiveTab("webhooks")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === "webhooks" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            Histórico de Webhooks
          </button>
        </div>

        {activeTab === "alunos" && (
          <div className="space-y-6">
            {!hasCredentials ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center max-w-2xl mx-auto">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground">Credenciais Ausentes</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Preencha as variáveis{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-destructive">
                    VITE_ISCHOLAR_CODIGO_ESCOLA
                  </code>{" "}
                  e{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-destructive">
                    VITE_ISCHOLAR_TOKEN
                  </code>{" "}
                  no arquivo <code className="font-mono text-xs">.env.local</code>.
                </p>
              </div>
            ) : (
              <>
                {/* Aviso */}
                <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <Layers className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <strong>Unificação de Perfis Ativa:</strong> Agrupamos os dados por aluno. Se o e-mail estiver preenchido em **qualquer** uma das matrículas dele, ele será considerado com e-mail e não aparecerá na lista de diagnóstico. Períodos `p1negoccia` e `pec 2026` foram excluídos.
                  </p>
                </div>

                {/* Controles */}
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-card md:flex-row md:items-center md:justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Filtrar por nome, turma ou responsável..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-card-foreground">
                      <input
                        type="checkbox"
                        checked={onlyWithoutEmail}
                        onChange={(e) => setOnlyWithoutEmail(e.target.checked)}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-ring/20"
                      />
                      <span>Mostrar apenas sem e-mail ({totalSemEmail})</span>
                    </label>

                    <button
                      onClick={fetchAllAlunos}
                      disabled={loading}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground hover:bg-muted disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      Recarregar Tudo
                    </button>
                  </div>
                </div>

                {/* Métricas */}
                {!loading && alunos.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                      <div className="text-xs text-muted-foreground">Alunos Únicos Ativos</div>
                      <div className="text-2xl font-bold text-card-foreground mt-1">{totalAlunosUnicosValidos}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Agrupados a partir de {matriculasValidas.length} matrículas
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                      <div className="text-xs text-muted-foreground">Alunos sem E-mail</div>
                      <div className="text-2xl font-bold text-destructive mt-1">{totalSemEmail}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Sem e-mail em nenhuma matrícula
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                      <div className="text-xs text-muted-foreground">Qualidade Cadastral</div>
                      <div className="text-2xl font-bold text-green-500 mt-1">
                        {totalAlunosUnicosValidos ? Math.round(((totalAlunosUnicosValidos - totalSemEmail) / totalAlunosUnicosValidos) * 100) : 0}%
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Meta ideal: 100%
                      </div>
                    </div>
                  </div>
                )}

                {/* Status */}
                {mensagemAPI && (
                  <div className="text-xs text-muted-foreground px-1 flex justify-between items-center">
                    <span>{mensagemAPI}</span>
                    {!loading && (
                      <span>Exibindo {alunosFiltradosExibicao.length} alunos</span>
                    )}
                  </div>
                )}

                {/* Períodos */}
                {!loading && periodosCarregados.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-card-foreground mb-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Períodos Letivos Carregados da API:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {periodosCarregados.map((p) => {
                        const excluido = isPeriodoExcluido(p);
                        return (
                          <span
                            key={p}
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                              excluido
                                ? "bg-destructive/10 text-destructive border-destructive/20 line-through"
                                : "bg-muted text-card-foreground border-border"
                            }`}
                          >
                            {p} {excluido ? "(Excluído)" : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tabela */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-border bg-card shadow-card">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-sm font-medium text-card-foreground">Carregando alunos...</p>
                  </div>
                ) : error ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                    <button onClick={fetchAllAlunos} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
                      Recarregar
                    </button>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <th className="px-6 py-4 text-left">Aluno</th>
                            <th className="px-6 py-4 text-left">Turmas</th>
                            <th className="px-6 py-4 text-left">Períodos Letivos</th>
                            <th className="px-6 py-4 text-left">E-mail do Aluno</th>
                            <th className="px-6 py-4 text-left">Responsável</th>
                            <th className="px-6 py-4 text-left">Telefones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-sm">
                          {alunosFiltradosExibicao.map((aluno, i) => {
                            const semEmail = !aluno.email_aluno || aluno.email_aluno.trim() === "";
                            const telefones = getTelefoneExibicao(aluno);
                            return (
                              <tr key={aluno.id_aluno || i} className="transition-colors hover:bg-muted/30">
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-card-foreground">{aluno.nome_aluno}</div>
                                  <div className="text-xs text-muted-foreground font-mono">Matrículas: {aluno.id_matricula}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1.5">
                                    {aluno.turmas.map((t) => (
                                      <span key={t} className="inline-flex w-max items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-muted-foreground text-xs">{aluno.periodos.join(", ")}</td>
                                <td className="px-6 py-4">
                                  {semEmail ? (
                                    <span className="inline-flex items-center gap-1 text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded text-xs">
                                      <AlertCircle className="h-3 w-3" /> Sem E-mail
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-card-foreground font-medium">
                                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span>{aluno.email_aluno}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-medium text-card-foreground">{aluno.responsavel}</span>
                                  </div>
                                  {aluno.email_responsavel && (
                                    <div className="text-xs text-muted-foreground ml-5">{aluno.email_responsavel}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-card-foreground font-mono">{telefones}</span>
                                    {telefones !== "Não informado" && (
                                      <button onClick={() => copyToClipboard(telefones)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
                                        {copiedText === telefones ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "webhooks" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-card md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">Monitor de Webhooks iScholar</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  URL para configuração no iScholar: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-primary">/api/webhooks/ischolar</code>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={fetchWebhookLogs}
                  disabled={loadingWebhooks}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground hover:bg-muted disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingWebhooks ? "animate-spin" : ""}`} />
                  Recarregar Logs
                </button>
                <button
                  onClick={clearWebhookLogs}
                  disabled={webhookLogs.length === 0}
                  className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar Histórico
                </button>
              </div>
            </div>

            {loadingWebhooks ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-border bg-card shadow-card">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">Carregando histórico de eventos...</p>
              </div>
            ) : webhookLogs.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Layers className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground">Nenhum evento registrado</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Aguardando recebimento de notificações do iScholar no servidor.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {webhookLogs.map((log, index) => {
                  const isExpanded = expandedLogs.has(index);
                  // Tenta extrair informações úteis do body
                  const evType = log.body?.evento || log.body?.event || "Evento Recebido";
                  const alunoNome = log.body?.aluno?.nome_aluno || log.body?.dados?.nome_aluno || log.body?.nome_aluno || "";
                  const matriculaId = log.body?.aluno?.id_matricula || log.body?.dados?.id_matricula || log.body?.id_matricula || "";

                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-border bg-card shadow-card overflow-hidden transition-all"
                    >
                      {/* Cabeçalho do Card */}
                      <button
                        onClick={() => toggleExpandLog(index)}
                        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary uppercase">
                            POST
                          </span>
                          <div>
                            <div className="font-semibold text-card-foreground flex items-center gap-2 flex-wrap">
                              <span>{evType}</span>
                              {alunoNome && (
                                <span className="text-xs text-muted-foreground font-normal font-sans">
                                  ({alunoNome} {matriculaId ? `- Matrícula: ${matriculaId}` : ""})
                                </span>
                              )}
                              {log.automacao && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  log.automacao.status === "sucesso" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                  log.automacao.status === "ignorado" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                                  log.automacao.status === "erro" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400" :
                                  "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                                }`}>
                                  Automação: {log.automacao.status.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {formatarData(log.timestamp)}
                            </div>
                          </div>
                        </div>
                        <div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Corpo Expandível */}
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/30 p-6 space-y-4 animate-fade-in">
                          {/* Resumo da Automação */}
                          {log.automacao && (
                            <div className={`p-4 rounded-lg border ${
                              log.automacao.status === "sucesso" ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900" :
                              log.automacao.status === "ignorado" ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900" :
                              log.automacao.status === "erro" ? "bg-rose-50/50 border-rose-200 dark:bg-rose-950/10 dark:border-rose-900" :
                              "bg-muted/50 border-border"
                            }`}>
                              <div className="text-xs font-bold text-card-foreground mb-1">Resultado do Processamento:</div>
                              <div className="text-xs text-muted-foreground">
                                <strong>Detalhe:</strong> {log.automacao.motivo}
                              </div>
                              {log.automacao.email && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  <strong>E-mail Candidato:</strong> <code className="bg-background px-1 py-0.5 rounded font-mono border text-primary">{log.automacao.email}</code>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Query params se existirem */}
                          {log.query && Object.keys(log.query).length > 0 && (
                            <div>
                              <div className="text-xs font-bold text-card-foreground mb-1">Query Params:</div>
                              <pre className="text-xs bg-muted p-3 rounded font-mono overflow-auto text-card-foreground">
                                {JSON.stringify(log.query, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Body Payload */}
                          <div>
                            <div className="text-xs font-bold text-card-foreground mb-1 flex items-center justify-between">
                              <span>Body JSON Payload:</span>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(log.body, null, 2))}
                                className="text-primary hover:underline text-[11px] font-medium flex items-center gap-1"
                              >
                                <Copy className="h-3 w-3" />
                                Copiar JSON
                              </button>
                            </div>
                            <pre className="text-xs bg-muted p-4 rounded font-mono overflow-auto max-h-96 text-card-foreground border border-border shadow-inner">
                              {JSON.stringify(log.body, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
