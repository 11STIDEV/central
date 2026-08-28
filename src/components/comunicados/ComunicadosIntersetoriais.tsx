import { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  Search,
  Building2,
  Calendar,
  Clock,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  UserCheck,
  X,
  Loader2,
  Send,
  FileText,
  User,
  AlertCircle,
  Share2
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { apiUrl } from "@/lib/apiBase";
import { toast } from "sonner";

export interface ComunicadoIntersetorial {
  id: string;
  titulo: string;
  setorOrigem: string;
  setoresDestino: string[];
  canaisDivulgacao?: string[];
  descricao: string;
  dataValidade?: string;
  anexosOuLinks?: Array<{ titulo: string; url: string }>;
  criadoPorEmail: string;
  criadoPorNome: string;
  criadoEm: string;
  atualizadoEm?: string;
  cientes?: Array<{ email: string; nome: string; setor: string; data: string }>;
  isExpirado?: boolean;
  statusCalculado?: "ativo" | "expirado";
}

const SETORES_DISPONIVEIS = [
  "SETAPE",
  "SECRETARIA",
  "DP / FINANCEIRO",
  "DIREÇÃO",
  "DISCIPLINAR",
  "BIBLIOTECA",
  "SERVIÇOS GERAIS",
  "ALMOXARIFADO",
  "PRIMEIROS SOCORROS",
  "CLAT",
  "PUBLICIDADE"
];

const CANAIS_DIVULGACAO_OPCOES = [
  { id: "Whatsapp / Umbler Talk", label: "Whatsapp / Umbler Talk", icon: "💬" },
  { id: "App iScholar", label: "App iScholar", icon: "📱" },
  { id: "Grupo de e-mails pais / alunos", label: "Grupo de e-mails pais / alunos", icon: "✉️" },
  { id: "Agenda CCI", label: "Agenda CCI", icon: "📅" },
  { id: "Compartilhar com funcionários", label: "Compartilhar com funcionários", icon: "👥" },
  { id: "Banco de informações", label: "Banco de informações", icon: "🗄️" }
];

export default function ComunicadosIntersetoriais() {
  const { googleIdToken, usuario } = useAuth();

  const agora = new Date();
  const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

  const [comunicados, setComunicados] = useState<ComunicadoIntersetorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ativo" | "expirado" | "todos">("ativo");

  const obterNomeSetorUsuario = (papeis?: string[]): string => {
    if (!papeis || papeis.length === 0) return "SETAPE";
    const p = papeis.map((x) => String(x).toLowerCase());
    if (p.includes("setape") || p.includes("admin")) return "SETAPE";
    if (p.includes("secretaria")) return "SECRETARIA";
    if (p.includes("dp") || p.includes("financeiro")) return "DP / FINANCEIRO";
    if (p.includes("direcao")) return "DIREÇÃO";
    if (p.includes("disciplinar")) return "DISCIPLINAR";
    if (p.includes("biblioteca")) return "BIBLIOTECA";
    if (p.includes("servicosgerais")) return "SERVIÇOS GERAIS";
    if (p.includes("almoxarifado")) return "ALMOXARIFADO";
    if (p.includes("primeirossocorros")) return "PRIMEIROS SOCORROS";
    if (p.includes("clat")) return "CLAT";
    if (p.includes("publicidade")) return "PUBLICIDADE";
    return "SETAPE";
  };

  const isSetapeOuAdmin = (papeis?: string[]): boolean => {
    if (!papeis || papeis.length === 0) return false;
    const p = papeis.map((x) => String(x).toLowerCase());
    return p.includes("admin") || p.includes("setape");
  };

  const isAdmin = isSetapeOuAdmin(usuario?.papeis);
  const setorProprio = obterNomeSetorUsuario(usuario?.papeis);

  // Modal de Criação
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [formTitulo, setFormTitulo] = useState("");
  const [formSetorOrigem, setFormSetorOrigem] = useState("SETAPE");
  const [formSetoresDestino, setFormSetoresDestino] = useState<string[]>(["SECRETARIA", "DP / FINANCEIRO"]);
  const [formCanaisDivulgacao, setFormCanaisDivulgacao] = useState<string[]>([
    "Whatsapp / Umbler Talk",
    "Compartilhar com funcionários"
  ]);
  const [formDescricao, setFormDescricao] = useState("");
  const [formDataValidade, setFormDataValidade] = useState("");
  const [formLinkTitulo, setFormLinkTitulo] = useState("");
  const [formLinkUrl, setFormLinkUrl] = useState("");
  const [formLinksList, setFormLinksList] = useState<Array<{ titulo: string; url: string }>>([]);

  const carregarComunicados = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/comunicados-intersetoriais/listar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: googleIdToken,
          status: filterStatus,
          busca: search
        })
      });
      const data = await res.json();
      if (data.ok) {
        setComunicados(data.comunicados || []);
      } else {
        toast.error(data.error || "Erro ao carregar comunicados");
      }
    } catch (e: any) {
      toast.error("Erro de conexão ao buscar comunicados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarComunicados();
  }, [filterStatus, search]);

  const handleCriarComunicado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formDescricao.trim()) {
      toast.error("Título e descrição são obrigatórios");
      return;
    }

    if (formSetoresDestino.length === 0) {
      toast.error("Selecione pelo menos um setor de destino");
      return;
    }

    if (formDataValidade && formDataValidade < hojeStr) {
      toast.error("A data de validade não pode ser anterior à data de hoje.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        titulo: formTitulo,
        setorOrigem: formSetorOrigem,
        setoresDestino: formSetoresDestino,
        canaisDivulgacao: formCanaisDivulgacao,
        descricao: formDescricao,
        dataValidade: formDataValidade || undefined,
        anexosOuLinks: formLinksList
      };

      const res = await fetch(apiUrl("/api/comunicados-intersetoriais/criar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: googleIdToken,
          novoComunicado: payload
        })
      });

      const data = await res.json();
      if (data.ok) {
        toast.success("Comunicado publicado com sucesso!");
        setShowModal(false);
        resetForm();
        carregarComunicados();
      } else {
        toast.error(data.error || "Erro ao publicar comunicado");
      }
    } catch (e: any) {
      toast.error("Erro ao salvar comunicado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormTitulo("");
    setFormDescricao("");
    setFormDataValidade("");
    setFormLinksList([]);
    setFormSetorOrigem("SETAPE");
    setFormSetoresDestino(["SECRETARIA", "DP / FINANCEIRO"]);
    setFormCanaisDivulgacao([
      "Whatsapp / Umbler Talk",
      "Compartilhar com funcionários"
    ]);
  };

  const handleMarcarCiente = async (comunicadoId: string) => {
    const setorCalculado = obterNomeSetorUsuario(usuario?.papeis);
    try {
      const res = await fetch(apiUrl("/api/comunicados-intersetoriais/marcar-ciente"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: googleIdToken,
          id: comunicadoId,
          setorUsuario: setorCalculado
        })
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Ciente registrado com sucesso!");
        carregarComunicados();
      } else {
        toast.error(data.error || "Erro ao registrar ciente");
      }
    } catch (e: any) {
      toast.error("Falha ao registrar ciente");
    }
  };

  const handleExcluir = async (comunicadoId: string) => {
    if (!confirm("Deseja realmente excluir este comunicado?")) return;
    try {
      const res = await fetch(apiUrl("/api/comunicados-intersetoriais/excluir"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: googleIdToken,
          id: comunicadoId
        })
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Comunicado excluído!");
        carregarComunicados();
      } else {
        toast.error(data.error || "Erro ao excluir comunicado");
      }
    } catch (e: any) {
      toast.error("Erro ao excluir");
    }
  };

  const copiarResumoAtendimento = (c: ComunicadoIntersetorial) => {
    const linhas = [];
    linhas.push(`📌 *COMUNICADO: ${c.titulo.toUpperCase()}*`);
    linhas.push(`🏢 *Origem:* ${c.setorOrigem}`);
    linhas.push(`👤 *Publicado por:* ${c.criadoPorNome}`);
    if (c.canaisDivulgacao && c.canaisDivulgacao.length > 0) {
      linhas.push(`📢 *Canais de Divulgação:* ${c.canaisDivulgacao.join(", ")}`);
    }
    if (c.dataValidade) {
      const dt = new Date(c.dataValidade + "T00:00:00").toLocaleDateString("pt-BR");
      linhas.push(`📅 *Validade:* ${dt}`);
    }
    linhas.push(`\n📝 *Descrição:*`);
    linhas.push(c.descricao);

    if (c.anexosOuLinks && c.anexosOuLinks.length > 0) {
      linhas.push(`\n🔗 *Links / Anexos:*`);
      c.anexosOuLinks.forEach(lk => {
        linhas.push(`• ${lk.titulo}: ${lk.url}`);
      });
    }

    const texto = linhas.join("\n");
    navigator.clipboard.writeText(texto);
    setCopiedId(c.id);
    toast.success("Resumo formatado copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 3000);
  };

  const addFormLink = () => {
    if (!formLinkTitulo.trim() || !formLinkUrl.trim()) return;
    setFormLinksList(prev => [...prev, { titulo: formLinkTitulo.trim(), url: formLinkUrl.trim() }]);
    setFormLinkTitulo("");
    setFormLinkUrl("");
  };

  const removeFormLink = (index: number) => {
    setFormLinksList(prev => prev.filter((_, i) => i !== index));
  };



  const toggleSetorDestino = (setor: string) => {
    setFormSetoresDestino(prev =>
      prev.includes(setor) ? prev.filter(s => s !== setor) : [...prev, setor]
    );
  };

  const toggleCanalDivulgacao = (canalId: string) => {
    setFormCanaisDivulgacao(prev =>
      prev.includes(canalId) ? prev.filter(c => c !== canalId) : [...prev, canalId]
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER DA SEÇÃO COM GRADIENTE E BOTÕES DE AÇÃO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white shadow-xl dark:border dark:border-indigo-500/20">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-md">
              <Megaphone className="h-3.5 w-3.5" />
              <span>Comunicação Intersetorial</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Quadro de Comunicados
            </h2>
            <p className="max-w-2xl text-xs text-indigo-100/80 sm:text-sm">
              Alinhamento direto entre Coordenação, Secretaria e outros setores. Publique informações relevantes e especifique os canais de divulgação utilizados.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:from-emerald-400 hover:to-teal-500 active:scale-95 sm:text-sm shrink-0"
            >
              <Plus className="h-5 w-5" />
              Novo Comunicado
            </button>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS E BUSCA */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Busca por texto */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar comunicado por título, palavra, canal ou autor..."
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-xs text-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtro Status: Ativo vs Expirado vs Todos */}
        <div className="sm:col-span-1">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground shadow-sm transition-all focus:border-primary focus:outline-none"
          >
            <option value="ativo">🟢 Apenas Ativos</option>
            <option value="expirado">🔴 Apenas Expirados</option>
            <option value="todos">📋 Todos os Status</option>
          </select>
        </div>
      </div>

      {/* FEED / LISTA DE CARDS DE COMUNICADOS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-xs font-semibold">Carregando comunicados...</p>
        </div>
      ) : comunicados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <Megaphone className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-foreground">Nenhum comunicado encontrado</h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Não há comunicados cadastrados para os filtros selecionados. Clique em "Novo Comunicado" para cadastrar um aviso.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all"
          >
            + Publicar Primeiro Comunicado
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {comunicados.map((c) => {
            const userEmailLower = (usuario?.email || "").toLowerCase();
            const jaDeuCiente = (c.cientes || []).some(
              (ci) => ci.email.toLowerCase() === userEmailLower
            );

            // Validade
            const isExpirado = c.dataValidade ? c.dataValidade < hojeStr : false;

            return (
              <div
                key={c.id}
                className={`group relative rounded-2xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md ${isExpirado
                  ? "opacity-75 border-border bg-muted/20"
                  : "border-border"
                  }`}
              >
                {/* CABEÇALHO DO CARD: ORIGEM, DESTINO, AUTOR E STATUS DE VALIDADE */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Setor Origem */}
                    <span className="flex items-center gap-1 font-bold text-primary">
                      <Building2 className="h-3.5 w-3.5" />
                      {c.setorOrigem}
                    </span>
                    <Send className="h-3 w-3 text-muted-foreground" />
                    {/* Setores Destino */}
                    <div className="flex flex-wrap gap-1">
                      {c.setoresDestino?.map((dest) => (
                        <span
                          key={dest}
                          className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground"
                        >
                          {dest}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status de Validade Badge (Ativo / Expirado) */}
                    {isExpirado ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        <AlertCircle className="h-3 w-3" />
                        Expirado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <Clock className="h-3 w-3" />
                        Ativo
                      </span>
                    )}
                  </div>
                </div>

                {/* AUTOR CAPTURADO E INFORMADO AUTOMATICAMENTE NA VISUALIZAÇÃO */}
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-3 w-3" />
                  </div>
                  <span>
                    Publicado por: <strong className="text-foreground">{c.criadoPorNome}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(c.criadoEm).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(c.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* CORPO: TÍTULO E DESCRIÇÃO */}
                <div className="mt-3 space-y-2">
                  <h3 className="text-lg font-bold text-foreground leading-snug">
                    {c.titulo}
                  </h3>
                  <p className="whitespace-pre-line text-xs text-muted-foreground leading-relaxed">
                    {c.descricao}
                  </p>
                </div>

                {/* CANAIS DE DIVULGAÇÃO (BADGES E DESTAQUE) */}
                {c.canaisDivulgacao && c.canaisDivulgacao.length > 0 && (
                  <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 dark:bg-indigo-500/10">
                    <p className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 mb-2">
                      <Share2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      Canais de Divulgação Agendados / Utilizados:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.canaisDivulgacao.map((canalId) => {
                        const infoCanal = CANAIS_DIVULGACAO_OPCOES.find(opt => opt.id === canalId);
                        return (
                          <span
                            key={canalId}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-card px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 shadow-2xs"
                          >
                            <span>{infoCanal?.icon || "📢"}</span>
                            <span>{canalId}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DATA DE VALIDADE E LINKS / ANEXOS */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs pt-3 border-t border-border/40">
                  {c.dataValidade ? (
                    <span className={`flex items-center gap-1.5 font-medium ${isExpirado ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Data de Validade:{" "}
                      <strong>
                        {new Date(c.dataValidade + "T00:00:00").toLocaleDateString("pt-BR")}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">Sem data de validade definida</span>
                  )}

                  {/* Links / Anexos */}
                  {c.anexosOuLinks && c.anexosOuLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {c.anexosOuLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                          {link.titulo}
                          <ExternalLink className="h-3 w-3 opacity-70" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* RODAPÉ DE AÇÕES DA SECRETARIA */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                  {/* Cientes Registrados */}
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Cientes ({c.cientes?.length || 0}):
                    </span>
                    {c.cientes && c.cientes.length > 0 ? (
                      <div className="flex -space-x-1 overflow-hidden">
                        {c.cientes.slice(0, 5).map((ci, idx) => (
                          <div
                            key={idx}
                            title={`${ci.nome} (${ci.setor}) - ${new Date(ci.data).toLocaleDateString("pt-BR")}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white ring-2 ring-card"
                          >
                            {ci.nome.substring(0, 2).toUpperCase()}
                          </div>
                        ))}
                        {c.cientes.length > 5 && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-2 ring-card">
                            +{c.cientes.length - 5}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">Nenhum ciente registrado</span>
                    )}
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Copiar Resumo para Atendimento aos Pais */}
                    <button
                      onClick={() => copiarResumoAtendimento(c)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all shadow-sm ${copiedId === c.id
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                      title="Copiar texto formatado para o atendimento"
                    >
                      {copiedId === c.id ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar p/ Atendimento
                        </>
                      )}
                    </button>

                    {/* Botão Registrar Ciente */}
                    {!jaDeuCiente ? (
                      <button
                        onClick={() => handleMarcarCiente(c.id)}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-all"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Marcar Ciente
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                        Você deu Ciente
                      </span>
                    )}

                    {/* Botão Excluir */}
                    <button
                      onClick={() => handleExcluir(c.id)}
                      className="rounded-xl border border-border bg-muted/60 p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30 transition-all"
                      title="Excluir comunicado"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-card-foreground">
                    Publicar Comunicado
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Preencha as informações necessárias para compartilhar com os setores.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCriarComunicado} className="space-y-4 text-xs">
              {/* TÍTULO DO COMUNICADO */}
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Título do Comunicado <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ex: Passeio ao Museu de Ciências - 4º e 5º Ano"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* SETOR ORIGEM */}
              <div>
                <label className="block font-bold text-foreground mb-1">Setor Origem</label>
                <select
                  value={formSetorOrigem}
                  onChange={(e) => setFormSetorOrigem(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {SETORES_DISPONIVEIS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* SETORES DESTINO (QUEM PRECISA SABER?) */}
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Setores Destino (Quem precisa saber?) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-border bg-background/50 p-3">
                  {SETORES_DISPONIVEIS.map((s) => {
                    const checked = formSetoresDestino.includes(s);
                    return (
                      <label
                        key={s}
                        onClick={() => toggleSetorDestino(s)}
                        className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer select-none transition-all ${checked
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                            }`}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </div>
                        <span className="text-[11px] truncate">{s}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* CANAIS DE DIVULGAÇÃO (NOVO CAMPO REQUERIDO) */}
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Canais de Divulgação (Onde este comunicado deve ser divulgado?)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                  {CANAIS_DIVULGACAO_OPCOES.map((canal) => {
                    const checked = formCanaisDivulgacao.includes(canal.id);
                    return (
                      <label
                        key={canal.id}
                        onClick={() => toggleCanalDivulgacao(canal.id)}
                        className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer select-none transition-all ${checked
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${checked ? "border-indigo-600 bg-indigo-600 text-white" : "border-border bg-card"
                            }`}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </div>
                        <span className="text-[11px] truncate flex items-center gap-1.5">
                          <span>{canal.icon}</span>
                          <span>{canal.label}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* DESCRIÇÃO COMPLETA */}
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Descrição Completa <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Escreva todos os detalhes do comunicado ou passeio..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* DATA DE VALIDADE */}
              <div>
                <label className="block font-bold text-foreground mb-1">Data de Validade</label>
                <input
                  type="date"
                  min={hojeStr}
                  value={formDataValidade}
                  onChange={(e) => setFormDataValidade(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Muda automaticamente o status para <strong className="text-emerald-600 dark:text-emerald-400">Ativo</strong> ou <strong className="text-rose-600 dark:text-rose-400">Expirado</strong> conforme a data.
                </p>
              </div>

              {/* LINKS E ANEXOS */}
              <div className="space-y-2">
                <label className="block font-bold text-foreground">Links / Anexos</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formLinkTitulo}
                    onChange={(e) => setFormLinkTitulo(e.target.value)}
                    placeholder="Nome (ex: Autorização PDF)"
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                  <input
                    type="url"
                    value={formLinkUrl}
                    onChange={(e) => setFormLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addFormLink}
                    className="rounded-xl bg-secondary px-3 py-2 font-semibold text-secondary-foreground hover:bg-secondary/80"
                  >
                    + Add
                  </button>
                </div>

                {formLinksList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {formLinksList.map((lk, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1 text-[11px]"
                      >
                        <FileText className="h-3 w-3 text-primary" />
                        <span className="font-semibold">{lk.titulo}</span>
                        <button
                          type="button"
                          onClick={() => removeFormLink(idx)}
                          className="ml-1 text-rose-500 hover:text-rose-700"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* BOTÕES DO MODAL */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-border bg-muted px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Megaphone className="h-4 w-4" />
                      Publicar Comunicado
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
