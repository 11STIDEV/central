import { PageHero } from "@/components/PageHero";
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
  Pencil,
  X,
  RotateCcw,
} from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type Papel } from "@/auth/AuthProvider";
import {
  type Chamado,
  podeVerChamado,
  listarChamados,
  atualizarChamadoRemoto,
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

function obterNomeAmigavelSetor(setor?: string) {
  const mapeamento: Record<string, string> = {
    setape: "TI / Setape",
    secretaria: "Secretaria",
    financeiro: "Financeiro",
    dp: "DP / Departamento de Pessoal",
    direcao: "Direção",
    disciplinar: "Disciplinar",
    biblioteca: "Biblioteca",
    servicosgerais: "Serviços Gerais",
    almoxarifado: "Almoxarifado",
    primeirossocorros: "Primeiros Socorros",
    clat: "CLAT",
    publicidade: "Publicidade",
  };
  return mapeamento[setor ?? ""] || setor || "TI / Setape";
}

const SECTORS_LIST = [
  { value: "setape", label: "TI / Setape" },
  { value: "secretaria", label: "Secretaria" },
  { value: "financeiro", label: "Financeiro" },
  { value: "dp", label: "DP / Departamento de Pessoal" },
  { value: "direcao", label: "Direção" },
  { value: "disciplinar", label: "Disciplinar" },
  { value: "biblioteca", label: "Biblioteca" },
  { value: "servicosgerais", label: "Serviços Gerais" },
  { value: "almoxarifado", label: "Almoxarifado" },
  { value: "primeirossocorros", label: "Primeiros Socorros" },
  { value: "clat", label: "CLAT" },
  { value: "publicidade", label: "Publicidade" },
];

type TabKey = "acompanhamentos" | "tarefas" | "solucao";

type EditandoItem = {
  tipo: "acompanhamento" | "tarefa" | "solucao";
  idx: number;
  texto: string;
} | null;

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
  const { usuario, googleIdToken } = useAuth();
  const location = useLocation();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!googleIdToken) {
      setChamados([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErroCarregar(null);
    try {
      const lista = await listarChamados(googleIdToken);
      setChamados(lista);
    } catch (e) {
      setErroCarregar(e instanceof Error ? e.message : "Erro ao carregar chamados.");
      setChamados([]);
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken]);

  useEffect(() => {
    if (location.pathname === "/chamados/gestao") {
      void recarregar();
    }
  }, [location.pathname, recarregar]);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, TabKey>>({});
  const [filter, setFilter] = useState<"todos" | "aberto" | "resolvido">("todos");

  // Drafts para novas entradas
  const [acompanhamentoDraft, setAcompanhamentoDraft] = useState<Record<string, string>>({});
  const [tarefaDraft, setTarefaDraft] = useState<Record<string, string>>({});
  const [solucaoDraft, setSolucaoDraft] = useState<Record<string, string>>({});

  // Reabertura
  const [reaberturaDraft, setReaberturaDraft] = useState<Record<string, string>>({});
  const [mostraReabertura, setMostraReabertura] = useState<Record<string, boolean>>({});

  // Edição inline
  const [editando, setEditando] = useState<Record<string, EditandoItem>>({});

  const [abaFluxo, setAbaFluxo] = useState<"recebidos" | "enviados">("recebidos");
  const [atribuindoSetor, setAtribuindoSetor] = useState<{ id: string; setor: string; justificativa: string } | null>(null);

  const podeGerenciar = (c: Chamado) => {
    if (!usuario) return false;
    if (usuario.papeis.includes("admin") || usuario.papeis.includes("setape")) return true;
    const dests = c.setorDestino ?? ["setape"];
    return dests.some((d) => usuario.papeis.includes(d as Papel));
  };

  const persistir = useCallback(
    async (lista: Chamado[], idAlterado: string) => {
      if (!googleIdToken) return;
      const chamado = lista.find((c) => c.id === idAlterado);
      if (!chamado) return;

      setChamados(lista);
      setSalvandoId(idAlterado);
      try {
        const atualizado = await atualizarChamadoRemoto(googleIdToken, chamado);
        setChamados((prev) => prev.map((c) => (c.id === idAlterado ? atualizado : c)));
      } catch (e) {
        void recarregar();
        setErroCarregar(e instanceof Error ? e.message : "Erro ao salvar alterações.");
      } finally {
        setSalvandoId(null);
      }
    },
    [googleIdToken, recarregar],
  );

  const visiveisBase = useMemo(() => {
    if (!usuario) return [];
    return chamados.filter((c) => podeVerChamado(usuario, c));
  }, [chamados, usuario]);

  const chamadosRecebidos = useMemo(() => {
    if (!usuario) return [];
    return visiveisBase.filter((c) => {
      const dests = c.setorDestino ?? ["setape"];
      const isDest = dests.some((d) => usuario.papeis.includes(d as Papel));
      const isAdminOrSetape = usuario.papeis.includes("admin") || usuario.papeis.includes("setape");
      return isDest || isAdminOrSetape;
    });
  }, [visiveisBase, usuario]);

  const chamadosEnviados = useMemo(() => {
    if (!usuario) return [];
    return visiveisBase.filter((c) => {
      const isSolicitante = c.solicitanteEmail.toLowerCase() === usuario.email.toLowerCase();
      const isCriadorPapel = c.papelAbertura && usuario.papeis.includes(c.papelAbertura);
      return isSolicitante || isCriadorPapel;
    });
  }, [visiveisBase, usuario]);

  const listaAtiva = useMemo(() => {
    return abaFluxo === "recebidos" ? chamadosRecebidos : chamadosEnviados;
  }, [abaFluxo, chamadosRecebidos, chamadosEnviados]);

  const filtered = useMemo(() => {
    return listaAtiva.filter((c) => {
      const matchSearch =
        c.titulo.toLowerCase().includes(search.toLowerCase()) ||
        c.solicitante.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "todos" || c.status === filter;
      return matchSearch && matchFilter;
    });
  }, [listaAtiva, search, filter]);

  const getTab = (id: string, podeGerenciar: boolean): TabKey => {
    const raw = activeTab[id] ?? "acompanhamentos";
    if (!podeGerenciar && raw === "tarefas") return "acompanhamentos";
    return raw;
  };

  const atualizarChamado = (id: string, fn: (c: Chamado) => Chamado) => {
    const lista = chamados.map((c) => (c.id === id ? fn(c) : c));
    void persistir(lista, id);
  };

  // ── Adicionar entradas ──────────────────────────────────────────────────────

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
    const c = chamados.find((x) => x.id === id);
    if (!texto || !usuario || !c || !podeGerenciar(c)) return;
    atualizarChamado(id, (item) => ({
      ...item,
      tarefas: [...item.tarefas, { autor: usuario.nome, texto, data: agoraLegivel() }],
    }));
    setTarefaDraft((d) => ({ ...d, [id]: "" }));
  };

  const resolverChamado = (id: string) => {
    const texto = (solucaoDraft[id] ?? "").trim();
    const c = chamados.find((x) => x.id === id);
    if (!texto || !usuario || !c || !podeGerenciar(c)) return;
    atualizarChamado(id, (item) => ({
      ...item,
      status: "resolvido" as const,
      solucao: { autor: usuario!.nome, texto, data: agoraLegivel() },
    }));
    setSolucaoDraft((d) => ({ ...d, [id]: "" }));
  };

  // ── Reabertura ──────────────────────────────────────────────────────────────

  const reabrirChamado = (id: string) => {
    const motivo = (reaberturaDraft[id] ?? "").trim();
    const c = chamados.find((x) => x.id === id);
    if (!motivo || !usuario || !c || !podeGerenciar(c)) return;
    atualizarChamado(id, (item) => ({
      ...item,
      status: "aberto" as const,
      solucao: undefined,
      reaberturas: [
        ...(item.reaberturas ?? []),
        {
          autor: usuario.nome,
          data: agoraLegivel(),
          motivo,
          solucaoAnterior: item.solucao,
        },
      ],
    }));
    setReaberturaDraft((d) => ({ ...d, [id]: "" }));
    setMostraReabertura((d) => ({ ...d, [id]: false }));
  };

  const confirmarAtribuicaoSetor = (id: string) => {
    if (!usuario || !atribuindoSetor) return;
    const { setor, justificativa } = atribuindoSetor;
    if (!setor || !justificativa.trim()) return;

    const c = chamados.find((x) => x.id === id);
    if (!c) return;

    const novosSetores = [...(c.setorDestino ?? [])];
    if (!novosSetores.includes(setor)) {
      novosSetores.push(setor);
    }

    const novoAcomp = {
      autor: usuario.nome,
      texto: `[Atribuição de Setor] Adicionado setor "${obterNomeAmigavelSetor(setor)}". Justificativa: ${justificativa.trim()}`,
      data: agoraLegivel(),
    };

    atualizarChamado(id, (item) => ({
      ...item,
      setorDestino: novosSetores,
      acompanhamentos: [...item.acompanhamentos, novoAcomp],
    }));

    setAtribuindoSetor(null);
  };

  // ── Edição inline ───────────────────────────────────────────────────────────

  const iniciarEdicao = (
    chamadoId: string,
    tipo: "acompanhamento" | "tarefa" | "solucao",
    idx: number,
    texto: string,
  ) => {
    setEditando((prev) => ({ ...prev, [chamadoId]: { tipo, idx, texto } }));
  };

  const cancelarEdicao = (chamadoId: string) => {
    setEditando((prev) => ({ ...prev, [chamadoId]: null }));
  };

  const salvarEdicao = (chamadoId: string) => {
    const ed = editando[chamadoId];
    if (!ed) return;
    const textoNovo = ed.texto.trim();
    if (!textoNovo) return;

    atualizarChamado(chamadoId, (c) => {
      if (ed.tipo === "acompanhamento") {
        const lista = c.acompanhamentos.map((a, i) =>
          i === ed.idx ? { ...a, texto: textoNovo } : a,
        );
        return { ...c, acompanhamentos: lista };
      }
      if (ed.tipo === "tarefa") {
        const lista = c.tarefas.map((t, i) =>
          i === ed.idx ? { ...t, texto: textoNovo } : t,
        );
        return { ...c, tarefas: lista };
      }
      // solucao
      if (c.solucao) {
        return { ...c, solucao: { ...c.solucao, texto: textoNovo } };
      }
      return c;
    });

    cancelarEdicao(chamadoId);
  };

  // ── Permissões de edição ────────────────────────────────────────────────────

  const podeEditarAcompanhamento = (chamado: Chamado) =>
    podeGerenciar(chamado) || chamado.solicitanteEmail.toLowerCase() === (usuario?.email ?? "").toLowerCase();

  const podeEditarSolucao = (chamado: Chamado) =>
    podeGerenciar(chamado) || chamado.solicitanteEmail.toLowerCase() === (usuario?.email ?? "").toLowerCase();

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  const contagem = (s: "aberto" | "resolvido") =>
    listaAtiva.filter((c) => c.status === s).length;

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Gestão de Chamados"
        subtitle="Gerencie e resolva os chamados de suporte"
      />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {erroCarregar && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erroCarregar}
          </div>
        )}

        {carregando ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Carregando chamados...</div>
        ) : (
          <>
            {/* Abas: Recebidos vs Enviados */}
            <div className="mb-6 flex gap-4 border-b border-border pb-px">
              <button
                type="button"
                onClick={() => {
                  setAbaFluxo("recebidos");
                  setExpanded(null);
                }}
                className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                  abaFluxo === "recebidos"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                📥 Recebidos ({chamadosRecebidos.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbaFluxo("enviados");
                  setExpanded(null);
                }}
                className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                  abaFluxo === "enviados"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                📤 Enviados ({chamadosEnviados.length})
              </button>
            </div>
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
                const sc = statusConfig[chamado.status];
                const pc = prioridadeConfig[chamado.prioridade];
                const ed = editando[chamado.id] ?? null;
                const salvando = salvandoId === chamado.id;

                const podeGerenciarEsse = podeGerenciar(chamado);
                const tab = getTab(chamado.id, podeGerenciarEsse);

                const tabsVisiveis: { key: TabKey; label: string; icon: typeof MessageSquare }[] = [
                  { key: "acompanhamentos", label: "Acompanhamentos", icon: MessageSquare },
                  ...(podeGerenciarEsse ? [{ key: "tarefas" as const, label: `Tarefas (${(chamado.setorDestino ?? ["setape"]).map(obterNomeAmigavelSetor).join(" & ")})`, icon: ListChecks }] : []),
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
                          {salvando && (
                            <span className="text-xs text-muted-foreground animate-pulse">Salvando...</span>
                          )}
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

                        {/* Setores Destinatários */}
                        <div className="mb-4 text-xs border-b border-border/40 pb-4">
                          <span className="font-semibold text-muted-foreground block mb-1.5 font-sans">Setor(es) Responsável(is)</span>
                          <div className="flex flex-wrap gap-2 items-center">
                            {(chamado.setorDestino ?? ["setape"]).map((dest) => (
                              <span key={dest} className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-lg font-medium animate-fade-in">
                                {obterNomeAmigavelSetor(dest)}
                              </span>
                            ))}

                            {podeGerenciarEsse && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (atribuindoSetor?.id === chamado.id) {
                                    setAtribuindoSetor(null);
                                  } else {
                                    setAtribuindoSetor({ id: chamado.id, setor: "", justificativa: "" });
                                  }
                                }}
                                className="inline-flex items-center gap-1 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg font-medium border border-border/60 transition-colors"
                              >
                                + Atribuir Setor
                              </button>
                            )}
                          </div>

                          {/* Formulário de atribuição de setor com justificativa */}
                          {atribuindoSetor?.id === chamado.id && (
                            <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 max-w-md animate-fade-in">
                              <p className="font-semibold text-xs text-foreground">Atribuir Novo Setor ao Chamado</p>
                              <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-muted-foreground">Selecionar Setor</label>
                                <select
                                  value={atribuindoSetor.setor}
                                  onChange={(e) => setAtribuindoSetor({ ...atribuindoSetor, setor: e.target.value })}
                                  className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                  <option value="">Selecione...</option>
                                  {SECTORS_LIST.filter(s => !(chamado.setorDestino ?? ["setape"]).includes(s.value)).map((s) => (
                                    <option key={s.value} value={s.value}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-muted-foreground">Justificativa da Atribuição *</label>
                                <textarea
                                  rows={2}
                                  placeholder="Explique o porquê este setor está sendo acionado..."
                                  value={atribuindoSetor.justificativa}
                                  onChange={(e) => setAtribuindoSetor({ ...atribuindoSetor, justificativa: e.target.value })}
                                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => confirmarAtribuicaoSetor(chamado.id)}
                                  disabled={!atribuindoSetor.setor || !atribuindoSetor.justificativa.trim()}
                                  className="rounded bg-primary px-3 py-1.5 text-white font-medium text-xs hover:opacity-90 disabled:opacity-50"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAtribuindoSetor(null)}
                                  className="rounded border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground text-xs bg-card"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>


                        {/* Tabs */}
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

                          {/* ── Acompanhamentos ── */}
                          {tab === "acompanhamentos" && (
                            <>
                              {chamado.acompanhamentos.map((a, i) => {
                                const estaEditando = ed?.tipo === "acompanhamento" && ed.idx === i;
                                return (
                                  <div key={i} className="rounded-lg bg-muted/50 px-4 py-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <Eye className="h-3 w-3 text-info" />
                                        <span className="text-xs font-medium text-card-foreground">{a.autor}</span>
                                        <span className="text-xs text-muted-foreground">{a.data}</span>
                                      </div>
                                      {podeEditarAcompanhamento(chamado) && !estaEditando && (
                                        <button
                                          type="button"
                                          title="Editar acompanhamento"
                                          onClick={() => iniciarEdicao(chamado.id, "acompanhamento", i, a.texto)}
                                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                    {estaEditando ? (
                                      <div className="mt-2 space-y-2">
                                        <textarea
                                          rows={3}
                                          value={ed.texto}
                                          onChange={(e) =>
                                            setEditando((prev) => ({
                                              ...prev,
                                              [chamado.id]: { ...ed, texto: e.target.value },
                                            }))
                                          }
                                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => salvarEdicao(chamado.id)}
                                            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                                          >
                                            <CheckCircle2 className="h-3 w-3" /> Salvar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => cancelarEdicao(chamado.id)}
                                            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                          >
                                            <X className="h-3 w-3" /> Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-sm text-card-foreground">{a.texto}</p>
                                    )}
                                  </div>
                                );
                              })}
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

                          {/* ── Tarefas (Setor Destinatário) ── */}
                          {tab === "tarefas" && podeGerenciarEsse && (
                            <>
                              <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2">
                                <EyeOff className="h-3.5 w-3.5 text-warning" />
                                <span className="text-xs text-warning">Visível apenas para a equipe de {(chamado.setorDestino ?? ["setape"]).map(obterNomeAmigavelSetor).join(" & ")}</span>
                              </div>
                              {chamado.tarefas.map((t, i) => {
                                const estaEditando = ed?.tipo === "tarefa" && ed.idx === i;
                                return (
                                  <div key={i} className="rounded-lg bg-muted/50 px-4 py-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <ListChecks className="h-3 w-3 text-primary" />
                                        <span className="text-xs font-medium text-card-foreground">{t.autor}</span>
                                        <span className="text-xs text-muted-foreground">{t.data}</span>
                                      </div>
                                      {podeGerenciarEsse && !estaEditando && (
                                        <button
                                          type="button"
                                          title="Editar tarefa"
                                          onClick={() => iniciarEdicao(chamado.id, "tarefa", i, t.texto)}
                                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                    {estaEditando ? (
                                      <div className="mt-2 space-y-2">
                                        <textarea
                                          rows={3}
                                          value={ed.texto}
                                          onChange={(e) =>
                                            setEditando((prev) => ({
                                              ...prev,
                                              [chamado.id]: { ...ed, texto: e.target.value },
                                            }))
                                          }
                                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => salvarEdicao(chamado.id)}
                                            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                                          >
                                            <CheckCircle2 className="h-3 w-3" /> Salvar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => cancelarEdicao(chamado.id)}
                                            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                          >
                                            <X className="h-3 w-3" /> Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-sm text-card-foreground">{t.texto}</p>
                                    )}
                                  </div>
                                );
                              })}
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

                          {/* ── Solução ── */}
                          {tab === "solucao" && (
                            <div className="space-y-3">

                              {/* Histórico de soluções anteriores (badge amarelo) */}
                              {(chamado.reaberturas ?? []).map((r, i) =>
                                r.solucaoAnterior ? (
                                  <div key={i} className="rounded-lg border border-warning/40 bg-warning/5 px-4 py-3">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <RotateCcw className="h-3.5 w-3.5 text-warning shrink-0" />
                                      <span className="text-xs font-medium text-warning">Solução anterior</span>
                                      <span className="text-xs text-muted-foreground">— {r.solucaoAnterior.autor} · {r.solucaoAnterior.data}</span>
                                    </div>
                                    <p className="text-sm text-card-foreground italic mb-2">{r.solucaoAnterior.texto}</p>
                                    <div className="flex items-start gap-1.5 border-t border-warning/20 pt-2 mt-1">
                                      <span className="text-xs text-warning font-medium shrink-0">Motivo da reabertura:</span>
                                      <span className="text-xs text-muted-foreground">{r.motivo}</span>
                                    </div>
                                  </div>
                                ) : null
                              )}

                              {/* Solução ativa (verde) — apenas quando resolvido */}
                              {chamado.solucao && (
                                <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                      <span className="text-xs font-medium text-card-foreground">{chamado.solucao.autor}</span>
                                      <span className="text-xs text-muted-foreground">{chamado.solucao.data}</span>
                                    </div>
                                    {podeEditarSolucao(chamado) && !(ed?.tipo === "solucao") && (
                                      <button
                                        type="button"
                                        title="Editar solução"
                                        onClick={() => iniciarEdicao(chamado.id, "solucao", 0, chamado.solucao!.texto)}
                                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  {ed?.tipo === "solucao" ? (
                                    <div className="mt-2 space-y-2">
                                      <textarea
                                        rows={3}
                                        value={ed.texto}
                                        onChange={(e) =>
                                          setEditando((prev) => ({
                                            ...prev,
                                            [chamado.id]: { ...ed, texto: e.target.value },
                                          }))
                                        }
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => salvarEdicao(chamado.id)}
                                          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                                        >
                                          <CheckCircle2 className="h-3 w-3" /> Salvar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => cancelarEdicao(chamado.id)}
                                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                        >
                                          <X className="h-3 w-3" /> Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="mt-1 text-sm text-card-foreground">{chamado.solucao.texto}</p>
                                  )}
                                </div>
                              )}

                              {/* Chamado sem solução alguma ainda */}
                              {!chamado.solucao && chamado.status === "resolvido" && (chamado.reaberturas ?? []).length === 0 && (
                                <p className="text-sm text-muted-foreground">Nenhuma solução registrada.</p>
                              )}

                              {/* Chamado aberto: textarea para nova solução (setor responsável) */}
                              {chamado.status === "aberto" && (
                                podeGerenciarEsse ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground">
                                      {(chamado.reaberturas ?? []).length > 0 ? "Nova solução" : "Registrar solução"}
                                    </p>
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
                                    A solução será registrada pela equipe de {(chamado.setorDestino ?? ["setape"]).map(obterNomeAmigavelSetor).join(" & ")} quando o chamado for resolvido.
                                  </p>
                                )
                              )}

                              {/* Botão de reabertura (setor responsável, apenas quando resolvido) */}
                              {podeGerenciarEsse && chamado.status === "resolvido" && (
                                <div className="pt-1">
                                  {mostraReabertura[chamado.id] ? (
                                    <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
                                      <p className="text-xs font-medium text-warning">Reabrir chamado</p>
                                      <textarea
                                        rows={2}
                                        placeholder="Motivo da reabertura..."
                                        value={reaberturaDraft[chamado.id] ?? ""}
                                        onChange={(e) =>
                                          setReaberturaDraft((d) => ({ ...d, [chamado.id]: e.target.value }))
                                        }
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => reabrirChamado(chamado.id)}
                                          className="flex items-center gap-1.5 rounded-lg bg-warning px-3 py-1.5 text-xs font-medium text-warning-foreground hover:opacity-90"
                                        >
                                          <RotateCcw className="h-3 w-3" /> Confirmar reabertura
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setMostraReabertura((d) => ({ ...d, [chamado.id]: false }))}
                                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                        >
                                          <X className="h-3 w-3" /> Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setMostraReabertura((d) => ({ ...d, [chamado.id]: true }))}
                                      className="flex items-center gap-2 rounded-lg border border-warning/40 px-3 py-2 text-xs font-medium text-warning hover:bg-warning/10 transition-colors"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                      Reabrir chamado
                                    </button>
                                  )}
                                </div>
                              )}

                            </div>
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
          </>
        )}
      </div>
    </div>
  );
}
