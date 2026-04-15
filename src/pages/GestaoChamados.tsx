import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  MessageSquare,
  ListChecks,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Send,
  Eye,
  EyeOff,
} from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import {
  type Chamado,
  podeVerChamado,
  salvarChamados,
  obterChamadosParaExibir,
} from "@/lib/chamados";

const prioridadeConfig = {
  baixa: { label: "Baixa", className: "bg-success/10 text-success" },
  media: { label: "Média", className: "bg-warning/10 text-warning" },
  alta: { label: "Alta", className: "bg-destructive/10 text-destructive" },
};

const statusConfig = {
  aberto: { label: "Aberto", icon: AlertTriangle, className: "bg-destructive/10 text-destructive" },
  resolvido: { label: "Resolvido", icon: CheckCircle2, className: "bg-success/10 text-success" },
};

type TabKey = "acompanhamentos" | "tarefas" | "solucao";

function agoraLegivel(): string {
  const d = new Date();
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GestaoChamados() {
  const { usuario } = useAuth();
  const location = useLocation();
  const [chamados, setChamados] = useState<Chamado[]>(() => obterChamadosParaExibir());

  useEffect(() => {
    if (location.pathname === "/chamados/gestao") {
      setChamados(obterChamadosParaExibir());
    }
  }, [location.pathname]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, TabKey>>({});
  const [filter, setFilter] = useState<"todos" | "aberto" | "resolvido">("todos");

  const [acompanhamentoDraft, setAcompanhamentoDraft] = useState<Record<string, string>>({});
  const [tarefaDraft, setTarefaDraft] = useState<Record<string, string>>({});
  const [solucaoDraft, setSolucaoDraft] = useState<Record<string, string>>({});

  const persistir = useCallback((lista: Chamado[]) => {
    setChamados(lista);
    salvarChamados(lista);
  }, []);

  const isSetape = usuario?.papeis.includes("setape") ?? false;

  const visiveisBase = useMemo(() => {
    if (!usuario) return [];
    return chamados.filter((c) => podeVerChamado(usuario, c));
  }, [chamados, usuario]);

  const filtered = useMemo(() => {
    return visiveisBase.filter((c) => {
      const matchSearch =
        c.titulo.toLowerCase().includes(search.toLowerCase()) ||
        c.solicitante.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "todos" || c.status === filter;
      return matchSearch && matchFilter;
    });
  }, [visiveisBase, search, filter]);

  const getTab = (id: string): TabKey => {
    const raw = activeTab[id] ?? "acompanhamentos";
    if (!isSetape && raw === "tarefas") return "acompanhamentos";
    return raw;
  };

  const atualizarChamado = (id: string, fn: (c: Chamado) => Chamado) => {
    persistir(chamados.map((c) => (c.id === id ? fn(c) : c)));
  };

  const adicionarAcompanhamento = (id: string) => {
    const texto = (acompanhamentoDraft[id] ?? "").trim();
    if (!texto || !usuario) return;
    atualizarChamado(id, (c) => ({
      ...c,
      acompanhamentos: [
        ...c.acompanhamentos,
        { autor: usuario.nome, texto, data: agoraLegivel() },
      ],
    }));
    setAcompanhamentoDraft((d) => ({ ...d, [id]: "" }));
  };

  const adicionarTarefa = (id: string) => {
    const texto = (tarefaDraft[id] ?? "").trim();
    if (!texto || !usuario || !isSetape) return;
    atualizarChamado(id, (c) => ({
      ...c,
      tarefas: [...c.tarefas, { autor: usuario.nome, texto, data: agoraLegivel() }],
    }));
    setTarefaDraft((d) => ({ ...d, [id]: "" }));
  };

  const resolverChamado = (id: string) => {
    const texto = (solucaoDraft[id] ?? "").trim();
    if (!texto || !usuario || !isSetape) return;
    atualizarChamado(id, (c) => ({
      ...c,
      status: "resolvido" as const,
      solucao: { autor: usuario.nome, texto, data: agoraLegivel() },
    }));
    setSolucaoDraft((d) => ({ ...d, [id]: "" }));
  };

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  const contagem = (s: "aberto" | "resolvido") =>
    visiveisBase.filter((c) => c.status === s).length;

  return (
    <div className="animate-fade-in">
      <div className="gradient-hero px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-primary-foreground">Gestão de Chamados</h1>
          <p className="mt-2 text-primary-foreground/70">Gerencie e resolva os chamados de suporte</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(["aberto", "resolvido"] as const).map((s) => {
            const config = statusConfig[s];
            return (
              <div key={s} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.className}`}>
                  <config.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{contagem(s)}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar chamados..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["todos", "aberto", "resolvido"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "todos" ? "Todos" : f === "aberto" ? "Aberto" : "Resolvido"}
              </button>
            ))}
          </div>
        </div>

        {/* Chamados list */}
        <div className="space-y-3">
          {filtered.map((chamado) => {
            const isExpanded = expanded === chamado.id;
            const tab = getTab(chamado.id);
            const sc = statusConfig[chamado.status];
            const pc = prioridadeConfig[chamado.prioridade];

            const tabsVisiveis: { key: TabKey; label: string; icon: typeof MessageSquare }[] = [
              { key: "acompanhamentos", label: "Acompanhamentos", icon: MessageSquare },
              ...(isSetape ? [{ key: "tarefas" as const, label: "Tarefas (TI)", icon: ListChecks }] : []),
              { key: "solucao", label: "Solução", icon: CheckCircle2 },
            ];

            return (
              <div key={chamado.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : chamado.id)}
                  className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground">{chamado.id}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sc.className}`}>{sc.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pc.className}`}>{pc.label}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-card-foreground">{chamado.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {chamado.solicitante} · {chamado.data} · {chamado.categoria}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="animate-fade-in border-t border-border px-6 py-4">
                    <p className="mb-4 text-sm text-card-foreground">{chamado.descricao}</p>

                    <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                      {tabsVisiveis.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setActiveTab({ ...activeTab, [chamado.id]: t.key })}
                          className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all sm:flex-initial ${
                            tab === t.key ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <t.icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{t.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {tab === "acompanhamentos" && (
                        <>
                          {chamado.acompanhamentos.map((a, i) => (
                            <div key={i} className="rounded-lg bg-muted/50 px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Eye className="h-3 w-3 text-info" />
                                <span className="text-xs font-medium text-card-foreground">{a.autor}</span>
                                <span className="text-xs text-muted-foreground">{a.data}</span>
                              </div>
                              <p className="mt-1 text-sm text-card-foreground">{a.texto}</p>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input
                              placeholder="Adicionar acompanhamento..."
                              value={acompanhamentoDraft[chamado.id] ?? ""}
                              onChange={(e) =>
                                setAcompanhamentoDraft((d) => ({ ...d, [chamado.id]: e.target.value }))
                              }
                              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                            />
                            <button
                              type="button"
                              onClick={() => adicionarAcompanhamento(chamado.id)}
                              className="rounded-lg gradient-primary px-4 py-2 text-primary-foreground transition-all hover:opacity-90"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}

                      {tab === "tarefas" && isSetape && (
                        <>
                          <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2">
                            <EyeOff className="h-3.5 w-3.5 text-warning" />
                            <span className="text-xs text-warning">Visível apenas para a equipe de TI (Setape)</span>
                          </div>
                          {chamado.tarefas.map((t, i) => (
                            <div key={i} className="rounded-lg bg-muted/50 px-4 py-3">
                              <div className="flex items-center gap-2">
                                <ListChecks className="h-3 w-3 text-primary" />
                                <span className="text-xs font-medium text-card-foreground">{t.autor}</span>
                                <span className="text-xs text-muted-foreground">{t.data}</span>
                              </div>
                              <p className="mt-1 text-sm text-card-foreground">{t.texto}</p>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input
                              placeholder="Adicionar tarefa interna..."
                              value={tarefaDraft[chamado.id] ?? ""}
                              onChange={(e) =>
                                setTarefaDraft((d) => ({ ...d, [chamado.id]: e.target.value }))
                              }
                              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                            />
                            <button
                              type="button"
                              onClick={() => adicionarTarefa(chamado.id)}
                              className="rounded-lg gradient-primary px-4 py-2 text-primary-foreground transition-all hover:opacity-90"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}

                      {tab === "solucao" && (
                        <>
                          {chamado.solucao ? (
                            <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                <span className="text-xs font-medium text-card-foreground">{chamado.solucao.autor}</span>
                                <span className="text-xs text-muted-foreground">{chamado.solucao.data}</span>
                              </div>
                              <p className="mt-1 text-sm text-card-foreground">{chamado.solucao.texto}</p>
                            </div>
                          ) : (
                            <>
                              {isSetape && chamado.status === "aberto" ? (
                                <div className="space-y-3">
                                  <textarea
                                    rows={3}
                                    placeholder="Descreva a solução aplicada..."
                                    value={solucaoDraft[chamado.id] ?? ""}
                                    onChange={(e) =>
                                      setSolucaoDraft((d) => ({ ...d, [chamado.id]: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => resolverChamado(chamado.id)}
                                    className="flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-all hover:opacity-90"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Resolver chamado
                                  </button>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {chamado.status === "aberto"
                                    ? "A solução será registrada pela equipe de TI (Setape) quando o chamado for resolvido."
                                    : "Nenhuma solução registrada."}
                                </p>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhum chamado encontrado para o seu perfil ou para os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  );
}
