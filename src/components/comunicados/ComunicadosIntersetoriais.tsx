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
  Share2,
  Paperclip,
  Link as LinkIcon,
  Pencil,
  RefreshCw,
  Image as ImageIcon,
  UploadCloud,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download
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
  imagens?: string[];
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
  "COORDENAÇÃO",
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

function formatarUrlLink(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Comprime e redimensiona imagens no cliente via Canvas antes de salvar/enviar,
 * garantindo excelente qualidade visual, baixo consumo de dados e alta performance.
 */
async function compressImageFile(file: File, maxDimension = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error("Falha ao carregar a imagem para processamento."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo de imagem."));
    reader.readAsDataURL(file);
  });
}

export default function ComunicadosIntersetoriais() {
  const { googleIdToken, usuario } = useAuth();

  const agora = new Date();
  const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

  const [comunicados, setComunicados] = useState<ComunicadoIntersetorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ativo" | "expirado" | "todos">("ativo");

  // Lightbox / Visualizador de Imagens em Tela Cheia
  const [lightbox, setLightbox] = useState<{
    open: boolean;
    images: string[];
    index: number;
    title: string;
  }>({
    open: false,
    images: [],
    index: 0,
    title: ""
  });

  const obterNomeSetorUsuario = (papeis?: string[]): string => {
    if (!papeis || papeis.length === 0) return "SETAPE";
    const p = papeis.map((x) => String(x).toLowerCase());
    if (p.includes("setape") || p.includes("admin")) return "SETAPE";
    if (p.includes("secretaria")) return "SECRETARIA";
    if (p.includes("coordenacao") || p.includes("coordenação") || p.includes("coordenador") || p.includes("coordenadora")) return "COORDENAÇÃO";
    if (p.includes("dp") || p.includes("financeiro")) return "DP / FINANCEIRO";
    if (p.includes("direcao") || p.includes("direção")) return "DIREÇÃO";
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

  // Modal de Criação / Edição
  const [showModal, setShowModal] = useState(false);
  const [editingComunicado, setEditingComunicado] = useState<ComunicadoIntersetorial | null>(null);
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
  const [formImagensList, setFormImagensList] = useState<string[]>([]);
  const [formImagemUrl, setFormImagemUrl] = useState("");
  const [isUploadingImages, setIsUploadingImages] = useState(false);

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

  // Listener para atalhos de teclado do Lightbox (Esc para fechar, setas para navegar)
  useEffect(() => {
    if (!lightbox.open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox(prev => ({ ...prev, open: false }));
      } else if (e.key === "ArrowLeft") {
        setLightbox(prev => ({
          ...prev,
          index: prev.index > 0 ? prev.index - 1 : prev.images.length - 1
        }));
      } else if (e.key === "ArrowRight") {
        setLightbox(prev => ({
          ...prev,
          index: prev.index < prev.images.length - 1 ? prev.index + 1 : 0
        }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox.open]);

  const handleAbrirCriar = () => {
    setEditingComunicado(null);
    resetForm();
    setShowModal(true);
  };

  const handleAbrirEditar = (c: ComunicadoIntersetorial) => {
    setEditingComunicado(c);
    setFormTitulo(c.titulo || "");
    setFormSetorOrigem(c.setorOrigem || "SETAPE");
    setFormSetoresDestino(c.setoresDestino || []);
    setFormCanaisDivulgacao(c.canaisDivulgacao || []);
    setFormDescricao(c.descricao || "");
    setFormDataValidade(c.dataValidade ? c.dataValidade.split("T")[0] : "");
    setFormLinksList(c.anexosOuLinks || []);
    setFormImagensList(c.imagens || []);
    setFormLinkTitulo("");
    setFormLinkUrl("");
    setFormImagemUrl("");
    setShowModal(true);
  };

  const handleProcessarImagens = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (fileArray.length === 0) {
      toast.error("Selecione arquivos de imagem válidos (PNG, JPG, JPEG, WEBP).");
      return;
    }
    if (formImagensList.length + fileArray.length > 8) {
      toast.warning("Você pode anexar no máximo 8 imagens por comunicado.");
      return;
    }
    setIsUploadingImages(true);
    try {
      const promises = fileArray.map(f => compressImageFile(f));
      const processed = await Promise.all(promises);
      setFormImagensList(prev => [...prev, ...processed]);
      toast.success(`${processed.length} imagem(ns) adicionada(s) com sucesso!`);
    } catch (err: any) {
      toast.error("Falha ao processar as imagens selecionadas.");
    } finally {
      setIsUploadingImages(false);
    }
  };

  const addFormImageUrl = () => {
    if (!formImagemUrl.trim()) return;
    const urlFormatada = formatarUrlLink(formImagemUrl);
    setFormImagensList(prev => [...prev, urlFormatada]);
    setFormImagemUrl("");
    toast.success("Imagem adicionada por link!");
  };

  const removeFormImage = (index: number) => {
    setFormImagensList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSalvarComunicado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formDescricao.trim()) {
      toast.error("Título e descrição são obrigatórios");
      return;
    }

    if (formSetoresDestino.length === 0) {
      toast.error("Selecione pelo menos um setor de destino");
      return;
    }

    if (formDataValidade && formDataValidade < hojeStr && !editingComunicado) {
      toast.error("A data de validade não pode ser anterior à data de hoje.");
      return;
    }

    // Trava de segurança: impede salvar se houver link digitado que não foi adicionado (+ Add)
    if (formLinkUrl.trim() || formLinkTitulo.trim()) {
      toast.warning(
        "Você digitou um link ou nome no anexo mas não clicou em '+ Add'. Clique no botão '+ Add' (ou aperte Enter) para incluí-lo na lista antes de salvar.",
        { duration: 5000 }
      );
      return;
    }

    // Trava de segurança: impede salvar se houver URL de imagem digitada mas não adicionada (+ Add)
    if (formImagemUrl.trim()) {
      toast.warning(
        "Você digitou uma URL de imagem mas não clicou em '+ Anexar URL'. Clique no botão para incluí-la antes de salvar.",
        { duration: 5000 }
      );
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
        anexosOuLinks: formLinksList,
        imagens: formImagensList
      };

      if (editingComunicado) {
        const res = await fetch(apiUrl("/api/comunicados-intersetoriais/atualizar"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken: googleIdToken,
            id: editingComunicado.id,
            dadosAtualizados: payload
          })
        });

        const data = await res.json();
        if (data.ok) {
          toast.success("Comunicado atualizado com sucesso!");
          setShowModal(false);
          setEditingComunicado(null);
          resetForm();
          carregarComunicados();
        } else {
          toast.error(data.error || "Erro ao atualizar comunicado");
        }
      } else {
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
    setFormImagensList([]);
    setFormImagemUrl("");
    setFormLinkTitulo("");
    setFormLinkUrl("");
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

    if (c.imagens && c.imagens.length > 0) {
      linhas.push(`\n🖼️ *Imagens / Cartazes Anexados:* ${c.imagens.length} imagem(ns) no comunicado`);
    }

    if (c.anexosOuLinks && c.anexosOuLinks.length > 0) {
      linhas.push("\n📎 *Links / Anexos:*");
      c.anexosOuLinks.forEach(lk => {
        linhas.push(`  • ${lk.titulo}: ${formatarUrlLink(lk.url)}`);
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
    const urlFormatada = formatarUrlLink(formLinkUrl);
    setFormLinksList(prev => [...prev, { titulo: formLinkTitulo.trim(), url: urlFormatada }]);
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
              onClick={carregarComunicados}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-3 text-xs font-semibold text-indigo-100 backdrop-blur-md transition-all hover:bg-indigo-500/20 active:scale-95 disabled:opacity-50 sm:text-sm shrink-0"
              title="Recarregar comunicados"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
            <button
              onClick={handleAbrirCriar}
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

            const podeEditarOuExcluir =
              isAdmin ||
              Boolean(
                c.criadoPorEmail &&
                  usuario?.email &&
                  c.criadoPorEmail.toLowerCase() === userEmailLower
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

                {/* CORPO: TÍTULO, BANNER DE IMAGEM E DESCRIÇÃO */}
                <div className="mt-3 space-y-3">
                  <h3 className="text-lg font-bold text-foreground leading-snug">
                    {c.titulo}
                  </h3>

                  {/* IMAGENS EM ESTILO DE BANNER (LOGO ABAIXO DO TÍTULO) */}
                  {c.imagens && c.imagens.length > 0 && (
                    <div>
                      {c.imagens.length === 1 ? (
                        /* BANNER ÚNICO FULL-WIDTH */
                        <div
                          onClick={() => setLightbox({ open: true, images: c.imagens!, index: 0, title: c.titulo })}
                          className="group relative my-2 w-full overflow-hidden rounded-xl border border-border/80 bg-slate-950/5 dark:bg-slate-950/40 shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-52 sm:h-72 md:h-80 flex items-center justify-center"
                          title="Clique para ampliar o banner em tela cheia"
                        >
                          <img
                            src={c.imagens[0]}
                            alt={`Banner de ${c.titulo}`}
                            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end justify-between p-3 sm:p-4">
                            <span className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                              <Maximize2 className="h-3.5 w-3.5" />
                              <span>Clique para ver em tela cheia</span>
                            </span>
                          </div>
                        </div>
                      ) : c.imagens.length === 2 ? (
                        /* 2 BANNERS LADO A LADO */
                        <div className="my-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {c.imagens.map((imgUrl, imgIdx) => (
                            <div
                              key={imgIdx}
                              onClick={() => setLightbox({ open: true, images: c.imagens!, index: imgIdx, title: c.titulo })}
                              className="group relative overflow-hidden rounded-xl border border-border/80 bg-slate-950/5 dark:bg-slate-950/40 shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-48 sm:h-56"
                              title="Clique para ampliar"
                            >
                              <img
                                src={imgUrl}
                                alt={`Banner ${imgIdx + 1} de ${c.titulo}`}
                                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end justify-between p-3">
                                <span className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                                  <Maximize2 className="h-3.5 w-3.5" />
                                  <span>Imagem #{imgIdx + 1}</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* 3 OU MAIS IMAGENS: BANNER PRINCIPAL + MINI-BANNERS */
                        <div className="my-2 space-y-2">
                          <div
                            onClick={() => setLightbox({ open: true, images: c.imagens!, index: 0, title: c.titulo })}
                            className="group relative w-full overflow-hidden rounded-xl border border-border/80 bg-slate-950/5 dark:bg-slate-950/40 shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-52 sm:h-64"
                            title="Clique para ampliar o banner principal"
                          >
                            <img
                              src={c.imagens[0]}
                              alt={`Banner de ${c.titulo}`}
                              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end justify-between p-3 sm:p-4">
                              <span className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                                <Maximize2 className="h-3.5 w-3.5" />
                                <span>Banner Principal</span>
                              </span>
                              <span className="rounded-lg bg-primary/90 px-2.5 py-1 text-[11px] font-bold text-primary-foreground backdrop-blur-md shadow">
                                +{c.imagens.length - 1} fotos adicionais
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {c.imagens.slice(1).map((imgUrl, imgIdx) => {
                              const realIdx = imgIdx + 1;
                              return (
                                <div
                                  key={realIdx}
                                  onClick={() => setLightbox({ open: true, images: c.imagens!, index: realIdx, title: c.titulo })}
                                  className="group relative h-20 sm:h-24 overflow-hidden rounded-lg border border-border bg-slate-950/5 dark:bg-slate-950/40 cursor-pointer shadow-2xs transition-all hover:scale-[1.02] hover:border-primary/50"
                                  title={`Ver imagem #${realIdx + 1}`}
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Imagem ${realIdx + 1} de ${c.titulo}`}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 className="h-4 w-4 text-white" />
                                  </div>
                                  <span className="absolute left-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                                    #{realIdx + 1}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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

                {/* LINKS E DOCUMENTOS ANEXOS (GRID DEDICADO) */}
                {c.anexosOuLinks && c.anexosOuLinks.length > 0 && (
                  <div className="mt-4 rounded-xl border border-border/80 bg-muted/20 p-3">
                    <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 mb-2.5">
                      <Paperclip className="h-3.5 w-3.5 text-primary" />
                      Documentos e Links Anexados ({c.anexosOuLinks.length}):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {c.anexosOuLinks.map((link, idx) => {
                        const urlFormatada = formatarUrlLink(link.url);
                        const isDriveOuDoc =
                          link.url.includes("drive.google") ||
                          link.url.includes("docs.google") ||
                          link.url.includes("pdf") ||
                          link.titulo.toLowerCase().includes("pdf") ||
                          link.titulo.toLowerCase().includes("doc");

                        return (
                          <a
                            key={idx}
                            href={urlFormatada}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center justify-between gap-2.5 rounded-lg border border-border bg-card p-2.5 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                {isDriveOuDoc ? <FileText className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-card-foreground group-hover:text-primary transition-colors">
                                  {link.titulo}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground font-normal">
                                  {link.url.replace(/^https?:\/\//, "").replace(/^www\./, "")}
                                </p>
                              </div>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DATA DE VALIDADE */}
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {c.dataValidade ? (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isExpirado ? "text-rose-600 dark:text-rose-400 font-bold" : "text-muted-foreground"}`}>
                      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>Data de Validade:</span>
                      <strong className="text-foreground">
                        {new Date(c.dataValidade + "T00:00:00").toLocaleDateString("pt-BR")}
                      </strong>
                      {isExpirado && (
                        <span className="ml-1 text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.2 rounded-full border border-rose-500/20 font-bold">
                          Expirado
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      Sem data de validade definida
                    </span>
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

                    {/* Botão Editar */}
                    {podeEditarOuExcluir && (
                      <button
                        onClick={() => handleAbrirEditar(c)}
                        className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all shadow-2xs"
                        title="Editar este comunicado"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </button>
                    )}

                    {/* Botão Excluir */}
                    {podeEditarOuExcluir && (
                      <button
                        onClick={() => handleExcluir(c.id)}
                        className="rounded-xl border border-border bg-muted/60 p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30 transition-all"
                        title="Excluir comunicado"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  {editingComunicado ? <Pencil className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-card-foreground">
                    {editingComunicado ? "Editar Comunicado" : "Publicar Comunicado"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {editingComunicado
                      ? "Atualize as informações, canais, validade, fotos ou links do comunicado."
                      : "Preencha as informações necessárias para compartilhar com os setores."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingComunicado(null);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarComunicado} className="space-y-4 text-xs">
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

              {/* IMAGENS / CARTAZES / BANNERS ANEXADOS */}
              <div className="space-y-2 rounded-xl border border-border bg-muted/10 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span>Anexar Imagens / Cartazes</span>
                    {formImagensList.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {formImagensList.length} / 8
                      </span>
                    )}
                  </label>
                  <span className="text-[10px] text-muted-foreground">PNG, JPG, WEBP (máx. 8)</span>
                </div>

                {/* Dropzone / Upload de Arquivo */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleProcessarImagens(e.dataTransfer.files);
                    }
                  }}
                  className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-background/50 p-4 text-center transition-all hover:border-primary/60 hover:bg-primary/5 cursor-pointer"
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    id="comunicado-image-upload"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleProcessarImagens(e.target.files);
                        e.target.value = "";
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isUploadingImages}
                  />
                  <div className="flex flex-col items-center gap-1 pointer-events-none">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {isUploadingImages ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      {isUploadingImages ? "Otimizando imagens..." : "Clique para selecionar imagens ou arraste para cá"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Fotos de avisos, panfletos, convites de passeios ou cartazes
                    </p>
                  </div>
                </div>

                {/* Ou adicionar por URL */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="url"
                    value={formImagemUrl}
                    onChange={(e) => setFormImagemUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFormImageUrl();
                      }
                    }}
                    placeholder="Ou cole o link direto da foto/imagem (https://...)"
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addFormImageUrl}
                    className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
                  >
                    + Anexar Link
                  </button>
                </div>

                {/* Galeria de Thumbnails das Imagens Anexadas no Modal */}
                {formImagensList.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {formImagensList.map((img, idx) => (
                      <div
                        key={idx}
                        className="group relative aspect-video sm:aspect-square overflow-hidden rounded-lg border border-border bg-black/10 shadow-2xs"
                      >
                        <img
                          src={img}
                          alt={`Anexo ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeFormImage(idx)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600/90 text-white shadow hover:bg-rose-700 transition-all"
                          title="Remover imagem"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <span className="absolute left-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* LINKS E ANEXOS */}
              <div className="space-y-2">
                <label className="block font-bold text-foreground">Outros Links / Documentos (PDF / Formulários)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formLinkTitulo}
                    onChange={(e) => setFormLinkTitulo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFormLink();
                      }
                    }}
                    placeholder="Nome (ex: Autorização PDF)"
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                  <input
                    type="url"
                    value={formLinkUrl}
                    onChange={(e) => setFormLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFormLink();
                      }
                    }}
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

                {/* Aviso se houver link pendente digitado no input */}
                {(formLinkUrl.trim() || formLinkTitulo.trim()) && (
                  <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-0.5 animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Clique em <strong>+ Add</strong> (ou aperte Enter) para anexar o link antes de publicar.
                    </span>
                  </p>
                )}

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
                  onClick={() => {
                    setShowModal(false);
                    setEditingComunicado(null);
                  }}
                  className="rounded-xl border border-border bg-muted px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImages}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {editingComunicado ? "Salvando alterações..." : "Publicando..."}
                    </>
                  ) : (
                    <>
                      {editingComunicado ? <Pencil className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                      {editingComunicado ? "Salvar Alterações" : "Publicar Comunicado"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX / VISUALIZADOR DE IMAGENS EM TELA CHEIA */}
      {lightbox.open && lightbox.images.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightbox(prev => ({ ...prev, open: false }))}
        >
          {/* Header da Lightbox */}
          <div
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 text-white bg-gradient-to-b from-black/80 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-[70%]">
              <h4 className="truncate text-sm font-bold text-white">{lightbox.title}</h4>
              <p className="text-xs text-white/70">
                Imagem {lightbox.index + 1} de {lightbox.images.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={lightbox.images[lightbox.index]}
                download={`comunicado-imagem-${lightbox.index + 1}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/20 transition-all"
                title="Abrir / Baixar original"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Baixar / Abrir</span>
              </a>
              <button
                onClick={() => setLightbox(prev => ({ ...prev, open: false }))}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                title="Fechar (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Imagem Principal Centralizada */}
          <div
            className="relative flex max-h-[82vh] max-w-[95vw] items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.images[lightbox.index]}
              alt={`Visualização ${lightbox.index + 1}`}
              className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl transition-transform"
            />
          </div>

          {/* Botões de Navegação Anterior / Próximo */}
          {lightbox.images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(prev => ({
                    ...prev,
                    index: prev.index > 0 ? prev.index - 1 : prev.images.length - 1
                  }));
                }}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white border border-white/20 hover:bg-black/80 hover:scale-105 active:scale-95 transition-all shadow-xl backdrop-blur-sm"
                title="Imagem anterior (Seta esquerda)"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(prev => ({
                    ...prev,
                    index: prev.index < prev.images.length - 1 ? prev.index + 1 : 0
                  }));
                }}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white border border-white/20 hover:bg-black/80 hover:scale-105 active:scale-95 transition-all shadow-xl backdrop-blur-sm"
                title="Próxima imagem (Seta direita)"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
