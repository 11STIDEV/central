import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, BookOpen,
  Zap, Clock, CheckCircle2, X, Loader2, AlertCircle, GripVertical,
  Settings2, RefreshCw, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import type { Trilha, Missao, PerguntaQuiz, Dificuldade } from "@/data/trilhasMock";
import {
  carregarTrilhasAdminApi,
  criarTrilhaApi,
  atualizarTrilhaApi,
  excluirTrilhaApi,
  criarMissaoApi,
  atualizarMissaoApi,
  excluirMissaoApi,
  importarTrilhasPadraoApi,
  type TrilhaAdminPayload,
  type MissaoPayload,
} from "@/lib/trilhasStore";
import { DownloadCloud } from "lucide-react";

// ── Gradientes disponíveis ────────────────────────────────────
const GRADIENTES = [
  { label: "Âmbar → Laranja", value: "from-amber-500 to-orange-600" },
  { label: "Índigo → Azul", value: "from-indigo-500 to-blue-600" },
  { label: "Esmeralda → Teal", value: "from-emerald-500 to-teal-600" },
  { label: "Violeta → Roxo", value: "from-violet-500 to-purple-600" },
  { label: "Rosa → Pink", value: "from-rose-500 to-pink-600" },
  { label: "Vermelho → Rosa", value: "from-red-500 to-rose-600" },
  { label: "Ciano → Azul", value: "from-cyan-500 to-blue-600" },
  { label: "Lima → Verde", value: "from-lime-500 to-green-600" },
  { label: "Fúcsia → Pink", value: "from-fuchsia-500 to-pink-600" },
  { label: "Laranja → Vermelho", value: "from-orange-500 to-red-600" },
];

const DIFICULDADES: { label: string; value: Dificuldade }[] = [
  { label: "Iniciante", value: "iniciante" },
  { label: "Intermediário", value: "intermediario" },
  { label: "Avançado", value: "avancado" },
];

function gerarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ── Estado inicial dos formulários ────────────────────────────
const TRILHA_VAZIA: TrilhaAdminPayload = {
  id: "", titulo: "", descricao: "", categoria: "",
  icone: "📚", cor: "from-indigo-500 to-blue-600",
  dificuldade: "iniciante", setorRestrito: "", ativo: true, ordem: 0,
};

const MISSAO_VAZIA: MissaoPayload = {
  id: "", titulo: "", descricao: "", conteudo: "",
  linkExterno: "", xpRecompensa: 5, tempoEstimadoMin: 10,
  quiz: [],
};

const PERGUNTA_VAZIA: PerguntaQuiz = {
  id: "", texto: "", opcoes: ["", "", "", ""], respostaCorreta: 0, explicacao: "",
};

// ── Componente principal ──────────────────────────────────────
export default function TrilhaAdmin() {
  const navigate = useNavigate();
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  // Modais
  const [modalTrilha, setModalTrilha] = useState<"criar" | "editar" | null>(null);
  const [trilhaEditando, setTrilhaEditando] = useState<Trilha | null>(null);
  const [formTrilha, setFormTrilha] = useState<TrilhaAdminPayload>(TRILHA_VAZIA);

  const [modalMissao, setModalMissao] = useState<"criar" | "editar" | null>(null);
  const [trilhaIdMissao, setTrilhaIdMissao] = useState<string>("");
  const [missaoEditando, setMissaoEditando] = useState<Missao | null>(null);
  const [formMissao, setFormMissao] = useState<MissaoPayload>(MISSAO_VAZIA);

  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await carregarTrilhasAdminApi();
      setTrilhas(dados);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao carregar trilhas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  async function handleImportarPadrao() {
    if (!confirm("Deseja importar/atualizar as 7 trilhas padrão para o banco de dados?")) return;
    setImportando(true);
    try {
      const res = await importarTrilhasPadraoApi();
      toast.success(`${res.count} trilhas padrão importadas com sucesso!`);
      void carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao importar trilhas padrão.");
    } finally {
      setImportando(false);
    }
  }

  useEffect(() => { void carregar(); }, [carregar]);

  // ── Trilha helpers ────────────────────────────────────────
  function abrirCriarTrilha() {
    setFormTrilha({ ...TRILHA_VAZIA, ordem: trilhas.length });
    setTrilhaEditando(null);
    setModalTrilha("criar");
  }

  function abrirEditarTrilha(t: Trilha) {
    setFormTrilha({
      id: t.id, titulo: t.titulo, descricao: t.descricao, categoria: t.categoria,
      icone: t.icone, cor: t.cor, dificuldade: t.dificuldade,
      setorRestrito: (t as any).setorRestrito ?? "",
      ativo: (t as any)._ativo !== false,
      ordem: (t as any)._ordem ?? 0,
    });
    setTrilhaEditando(t);
    setModalTrilha("editar");
  }

  async function salvarTrilha() {
    if (!formTrilha.titulo.trim()) { toast.error("Título obrigatório."); return; }
    setSalvando(true);
    try {
      const payload = {
        ...formTrilha,
        id: formTrilha.id || gerarSlug(formTrilha.titulo),
        setorRestrito: formTrilha.setorRestrito?.trim() || undefined,
      };
      if (modalTrilha === "criar") {
        await criarTrilhaApi(payload as TrilhaAdminPayload);
        toast.success("Trilha criada com sucesso!");
      } else {
        await atualizarTrilhaApi(trilhaEditando!.id, payload);
        toast.success("Trilha atualizada!");
      }
      setModalTrilha(null);
      void carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function deletarTrilha(t: Trilha) {
    if (!confirm(`Excluir a trilha "${t.titulo}" e todas as suas missões?`)) return;
    try {
      await excluirTrilhaApi(t.id);
      toast.success("Trilha excluída.");
      void carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir.");
    }
  }

  async function toggleAtivo(t: Trilha) {
    try {
      await atualizarTrilhaApi(t.id, { ativo: !(t as any)._ativo });
      void carregar();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  // ── Missão helpers ────────────────────────────────────────
  function abrirCriarMissao(trilhaId: string, qtdMissoes: number) {
    setFormMissao({ ...MISSAO_VAZIA, ordem: qtdMissoes + 1 });
    setMissaoEditando(null);
    setTrilhaIdMissao(trilhaId);
    setModalMissao("criar");
  }

  function abrirEditarMissao(trilhaId: string, m: Missao) {
    setFormMissao({
      id: m.id, titulo: m.titulo, descricao: m.descricao, conteudo: m.conteudo,
      linkExterno: m.linkExterno ?? "", xpRecompensa: m.xpRecompensa,
      tempoEstimadoMin: m.tempoEstimadoMin, quiz: m.quiz,
    });
    setMissaoEditando(m);
    setTrilhaIdMissao(trilhaId);
    setModalMissao("editar");
  }

  async function salvarMissao() {
    if (!formMissao.titulo.trim()) { toast.error("Título da missão obrigatório."); return; }
    setSalvando(true);
    try {
      const payload = {
        ...formMissao,
        id: formMissao.id || `${trilhaIdMissao}-m${Date.now()}`,
        linkExterno: formMissao.linkExterno?.trim() || undefined,
      };
      if (modalMissao === "criar") {
        await criarMissaoApi(trilhaIdMissao, payload as MissaoPayload);
        toast.success("Missão criada!");
      } else {
        await atualizarMissaoApi(trilhaIdMissao, missaoEditando!.id, payload);
        toast.success("Missão atualizada!");
      }
      setModalMissao(null);
      void carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function deletarMissao(trilhaId: string, m: Missao) {
    if (!confirm(`Excluir a missão "${m.titulo}"?`)) return;
    try {
      await excluirMissaoApi(trilhaId, m.id);
      toast.success("Missão excluída.");
      void carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir.");
    }
  }

  // ── Quiz helpers ─────────────────────────────────────────
  function addPergunta() {
    setFormMissao((f) => ({
      ...f,
      quiz: [...(f.quiz ?? []), { ...PERGUNTA_VAZIA, id: `q-${Date.now()}` }],
    }));
  }

  function removerPergunta(idx: number) {
    setFormMissao((f) => ({ ...f, quiz: (f.quiz ?? []).filter((_, i) => i !== idx) }));
  }

  function atualizarPergunta(idx: number, campo: keyof PerguntaQuiz, valor: any) {
    setFormMissao((f) => {
      const quiz = [...(f.quiz ?? [])];
      quiz[idx] = { ...quiz[idx], [campo]: valor };
      return { ...f, quiz };
    });
  }

  function atualizarOpcao(pIdx: number, oIdx: number, valor: string) {
    setFormMissao((f) => {
      const quiz = [...(f.quiz ?? [])];
      const opcoes = [...quiz[pIdx].opcoes];
      opcoes[oIdx] = valor;
      quiz[pIdx] = { ...quiz[pIdx], opcoes };
      return { ...f, quiz };
    });
  }

  const toggleExpandida = (id: string) =>
    setExpandidas((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-white/8 bg-gradient-to-r from-indigo-950/40 to-purple-950/20">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Settings2 className="h-5 w-5 text-indigo-400" />
                <span className="text-xs font-mono font-semibold uppercase tracking-widest text-indigo-400">
                  Painel Admin
                </span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">Gerenciar Trilhas</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Crie e edite trilhas e missões de conhecimento
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleImportarPadrao}
                disabled={importando}
                title="Importa as 7 trilhas de conhecimento padrão com todas as missões"
                className="flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-3.5 py-2 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20 disabled:opacity-50"
              >
                {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                {importando ? "Importando..." : "Importar Padrão"}
              </button>
              <button
                onClick={() => void carregar()}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </button>
              <button
                onClick={abrirCriarTrilha}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-900/20 transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Nova Trilha
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        {carregando ? (
          <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando trilhas...</span>
          </div>
        ) : erro ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-400">Erro ao carregar</p>
              <p className="text-sm text-muted-foreground mt-1">{erro}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Execute o script <code>scripts/trilha-conteudo-schema.sql</code> no Supabase e reinicie o servidor.
              </p>
            </div>
          </div>
        ) : trilhas.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl">📚</span>
            <h2 className="mt-4 text-xl font-bold text-foreground">Nenhuma trilha cadastrada</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie uma trilha do zero ou importe as 7 trilhas padrão do sistema.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={handleImportarPadrao}
                disabled={importando}
                className="flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
              >
                <DownloadCloud className="h-4 w-4" />
                Importar Trilhas Padrão
              </button>
              <button
                onClick={abrirCriarTrilha}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Criar Nova Trilha
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {trilhas.map((t) => (
              <TrilhaItem
                key={t.id}
                trilha={t}
                expandida={expandidas.has(t.id)}
                onToggle={() => toggleExpandida(t.id)}
                onEditar={() => abrirEditarTrilha(t)}
                onDeletar={() => void deletarTrilha(t)}
                onToggleAtivo={() => void toggleAtivo(t)}
                onCriarMissao={() => abrirCriarMissao(t.id, t.missoes.length)}
                onEditarMissao={(m) => abrirEditarMissao(t.id, m)}
                onDeletarMissao={(m) => void deletarMissao(t.id, m)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Trilha */}
      {modalTrilha && (
        <ModalTrilha
          modo={modalTrilha}
          form={formTrilha}
          onChange={(f) => setFormTrilha(f)}
          onSalvar={() => void salvarTrilha()}
          onFechar={() => setModalTrilha(null)}
          salvando={salvando}
        />
      )}

      {/* Modal Missão */}
      {modalMissao && (
        <ModalMissao
          modo={modalMissao}
          form={formMissao}
          onChange={(f) => setFormMissao(f)}
          onSalvar={() => void salvarMissao()}
          onFechar={() => setModalMissao(null)}
          onAddPergunta={addPergunta}
          onRemoverPergunta={removerPergunta}
          onAtualizarPergunta={atualizarPergunta}
          onAtualizarOpcao={atualizarOpcao}
          salvando={salvando}
        />
      )}
    </div>
  );
}

// ── TrilhaItem ────────────────────────────────────────────────
function TrilhaItem({
  trilha, expandida, onToggle, onEditar, onDeletar, onToggleAtivo,
  onCriarMissao, onEditarMissao, onDeletarMissao,
}: {
  trilha: Trilha;
  expandida: boolean;
  onToggle: () => void;
  onEditar: () => void;
  onDeletar: () => void;
  onToggleAtivo: () => void;
  onCriarMissao: () => void;
  onEditarMissao: (m: Missao) => void;
  onDeletarMissao: (m: Missao) => void;
}) {
  const ativo = (trilha as any)._ativo !== false;

  return (
    <div className={`rounded-2xl border transition-all ${ativo ? "border-white/10 bg-white/[0.02]" : "border-white/5 bg-white/[0.01] opacity-60"}`}>
      {/* Trilha header row */}
      <div className="flex items-center gap-4 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${trilha.cor} text-xl shadow-md`}>
          {trilha.icone}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground truncate">{trilha.titulo}</p>
            {!ativo && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">Inativa</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {trilha.categoria} · {trilha.dificuldade} · {trilha.missoes.length} missão(ões) · {trilha.xpTotal} XP
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleAtivo}
            title={ativo ? "Desativar" : "Ativar"}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
          >
            {ativo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={onEditar}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDeletar}
            className="rounded-lg p-2 text-red-400/60 transition hover:bg-red-400/10 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onToggle}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
          >
            {expandida ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Missões expandidas */}
      {expandida && (
        <div className="border-t border-white/6 px-4 pb-4 pt-3">
          <div className="space-y-2">
            {trilha.missoes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                Nenhuma missão. Adicione a primeira!
              </p>
            ) : (
              trilha.missoes.map((m, idx) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-2.5"
                >
                  <GripVertical className="h-4 w-4 text-white/20 shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.xpRecompensa} XP · ~{m.tempoEstimadoMin} min · {m.quiz.length} perguntas
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onEditarMissao(m)}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletarMissao(m)}
                      className="rounded-lg p-1.5 text-red-400/60 transition hover:bg-red-400/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={onCriarMissao}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-2.5 text-sm text-muted-foreground transition hover:border-indigo-400/40 hover:text-indigo-400"
          >
            <Plus className="h-4 w-4" />
            Nova Missão
          </button>
        </div>
      )}
    </div>
  );
}

// ── Modal de Trilha ───────────────────────────────────────────
function ModalTrilha({
  modo, form, onChange, onSalvar, onFechar, salvando,
}: {
  modo: "criar" | "editar";
  form: TrilhaAdminPayload;
  onChange: (f: TrilhaAdminPayload) => void;
  onSalvar: () => void;
  onFechar: () => void;
  salvando: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[var(--background)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <h2 className="font-bold text-foreground">
            {modo === "criar" ? "Nova Trilha" : "Editar Trilha"}
          </h2>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
          {/* Preview */}
          <div className={`flex items-center gap-3 rounded-xl bg-gradient-to-br ${form.cor || "from-indigo-500 to-blue-600"} p-4`}>
            <span className="text-3xl">{form.icone || "📚"}</span>
            <div>
              <p className="font-bold text-white">{form.titulo || "Título da trilha"}</p>
              <p className="text-xs text-white/70">{form.categoria || "Categoria"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Título *</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={form.titulo}
                onChange={(e) => onChange({ ...form, titulo: e.target.value, id: form.id || gerarSlug(e.target.value) })}
                placeholder="Ex: Missão, Princípios e Visão do CCI"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">ID (slug)</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={form.id}
                onChange={(e) => onChange({ ...form, id: e.target.value })}
                placeholder="missao-visao-cci"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Ícone (emoji)</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xl text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={form.icone}
                onChange={(e) => onChange({ ...form, icone: e.target.value })}
                maxLength={2}
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Descrição</label>
              <textarea
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                value={form.descricao}
                onChange={(e) => onChange({ ...form, descricao: e.target.value })}
                placeholder="Breve descrição da trilha"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoria</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={form.categoria}
                onChange={(e) => onChange({ ...form, categoria: e.target.value })}
                placeholder="Ex: Institucional"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Dificuldade</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-[var(--background)] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={form.dificuldade}
                onChange={(e) => onChange({ ...form, dificuldade: e.target.value as Dificuldade })}
              >
                {DIFICULDADES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Cor do cartão</label>
              <div className="grid grid-cols-5 gap-2">
                {GRADIENTES.map((g) => (
                  <button
                    key={g.value}
                    title={g.label}
                    onClick={() => onChange({ ...form, cor: g.value })}
                    className={`h-8 rounded-lg bg-gradient-to-br ${g.value} transition ${form.cor === g.value ? "ring-2 ring-white scale-110" : "opacity-70 hover:opacity-100"}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Setor restrito</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={form.setorRestrito ?? ""}
                onChange={(e) => onChange({ ...form, setorRestrito: e.target.value })}
                placeholder="Deixe vazio para todos"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Ordem</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={form.ordem ?? 0}
                onChange={(e) => onChange({ ...form, ordem: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="trilha-ativo"
                checked={form.ativo !== false}
                onChange={(e) => onChange({ ...form, ativo: e.target.checked })}
                className="h-4 w-4 rounded accent-indigo-500"
              />
              <label htmlFor="trilha-ativo" className="text-sm text-foreground cursor-pointer">
                Trilha ativa (visível para os usuários)
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/8 px-6 py-4">
          <button onClick={onFechar} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition">
            Cancelar
          </button>
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Missão ───────────────────────────────────────────
function ModalMissao({
  modo, form, onChange, onSalvar, onFechar,
  onAddPergunta, onRemoverPergunta, onAtualizarPergunta, onAtualizarOpcao, salvando,
}: {
  modo: "criar" | "editar";
  form: MissaoPayload;
  onChange: (f: MissaoPayload) => void;
  onSalvar: () => void;
  onFechar: () => void;
  onAddPergunta: () => void;
  onRemoverPergunta: (idx: number) => void;
  onAtualizarPergunta: (idx: number, campo: keyof PerguntaQuiz, valor: any) => void;
  onAtualizarOpcao: (pIdx: number, oIdx: number, valor: string) => void;
  salvando: boolean;
}) {
  const [abaAtiva, setAbaAtiva] = useState<"info" | "conteudo" | "quiz">("info");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[var(--background)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <h2 className="font-bold text-foreground">
            {modo === "criar" ? "Nova Missão" : "Editar Missão"}
          </h2>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8">
          {(["info", "conteudo", "quiz"] as const).map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaAtiva(aba)}
              className={`flex-1 py-2.5 text-sm font-medium transition ${
                abaAtiva === aba
                  ? "text-indigo-400 border-b-2 border-indigo-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {aba === "info" ? "Informações" : aba === "conteudo" ? "Conteúdo" : `Quiz (${form.quiz?.length ?? 0})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {/* Aba Info */}
          {abaAtiva === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Título *</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={form.titulo}
                    onChange={(e) => onChange({ ...form, titulo: e.target.value, id: form.id || `missao-${Date.now()}` })}
                    placeholder="Ex: Introdução ao Google Drive"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">ID (slug)</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={form.id}
                    onChange={(e) => onChange({ ...form, id: e.target.value })}
                    placeholder="drive-m1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Ordem</label>
                  <input
                    type="number" min={1}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={form.ordem ?? 1}
                    onChange={(e) => onChange({ ...form, ordem: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Descrição curta</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={form.descricao}
                    onChange={(e) => onChange({ ...form, descricao: e.target.value })}
                    placeholder="Breve resumo exibido no card da missão"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">XP de Recompensa</label>
                  <input
                    type="number" min={1}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={form.xpRecompensa ?? 5}
                    onChange={(e) => onChange({ ...form, xpRecompensa: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Tempo Estimado (min)</label>
                  <input
                    type="number" min={1}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={form.tempoEstimadoMin ?? 10}
                    onChange={(e) => onChange({ ...form, tempoEstimadoMin: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Link Externo (opcional)</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={form.linkExterno ?? ""}
                    onChange={(e) => onChange({ ...form, linkExterno: e.target.value })}
                    placeholder="https://docs.google.com/..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Aba Conteúdo */}
          {abaAtiva === "conteudo" && (
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                Conteúdo em Markdown
                <span className="ml-2 text-xs text-muted-foreground/60">
                  (use ## para títulos, **negrito**, - para listas)
                </span>
              </label>
              <textarea
                rows={18}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                value={form.conteudo}
                onChange={(e) => onChange({ ...form, conteudo: e.target.value })}
                placeholder={"## Título Principal\n\nDescrição da missão...\n\n### Subtítulo\n\n- Item 1\n- Item 2"}
              />
            </div>
          )}

          {/* Aba Quiz */}
          {abaAtiva === "quiz" && (
            <div className="space-y-6">
              {(form.quiz ?? []).map((p, pIdx) => (
                <div key={pIdx} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-semibold text-indigo-400 uppercase tracking-wide">
                      Pergunta {pIdx + 1}
                    </span>
                    <button
                      onClick={() => onRemoverPergunta(pIdx)}
                      className="rounded p-1 text-red-400/60 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground mb-3 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={p.texto}
                    onChange={(e) => onAtualizarPergunta(pIdx, "texto", e.target.value)}
                    placeholder="Texto da pergunta"
                  />
                  <div className="space-y-2 mb-3">
                    {p.opcoes.map((op, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correta-${pIdx}`}
                          checked={p.respostaCorreta === oIdx}
                          onChange={() => onAtualizarPergunta(pIdx, "respostaCorreta", oIdx)}
                          className="h-4 w-4 accent-emerald-500 shrink-0"
                          title="Marcar como correta"
                        />
                        <input
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={op}
                          onChange={(e) => onAtualizarOpcao(pIdx, oIdx, e.target.value)}
                          placeholder={`Opção ${oIdx + 1}${p.respostaCorreta === oIdx ? " ✓" : ""}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Explicação da resposta correta</p>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={p.explicacao}
                    onChange={(e) => onAtualizarPergunta(pIdx, "explicacao", e.target.value)}
                    placeholder="Por que esta é a resposta correta?"
                  />
                </div>
              ))}
              <button
                onClick={onAddPergunta}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-sm text-muted-foreground transition hover:border-indigo-400/40 hover:text-indigo-400"
              >
                <Plus className="h-4 w-4" />
                Adicionar Pergunta
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/8 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {form.quiz?.length ?? 0} perguntas no quiz
          </p>
          <div className="flex items-center gap-3">
            <button onClick={onFechar} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition">
              Cancelar
            </button>
            <button
              onClick={onSalvar}
              disabled={salvando}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {salvando ? "Salvando..." : "Salvar Missão"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
