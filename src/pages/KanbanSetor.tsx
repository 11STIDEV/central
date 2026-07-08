import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import {
  KANBAN_SETORES,
  COLUNAS,
  PRIORIDADE_INFO,
  iniciais,
  isGerenteDoSetor,
  podeAcessarKanban,
  listarKanbanCards,
  criarKanbanCard,
  atualizarKanbanCard,
  excluirKanbanCard,
  listarKanbanUsuarios,
  type KanbanCard,
  type KanbanColuna,
  type KanbanPrioridade,
  type KanbanUsuario,
} from "@/lib/kanban";
import {
  Plus, Pencil, Trash2, X, Loader2, LayoutDashboard,
  User, Calendar, Flag, GripVertical, AlertTriangle,
  CheckCircle2, Clock, Circle,
} from "lucide-react";

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ nome, size = "sm" }: { nome: string | null | undefined; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div
      className={`${cls} rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-white shrink-0 shadow-sm`}
    >
      {iniciais(nome)}
    </div>
  );
}

// ─── Badge de prioridade ─────────────────────────────────────────────────────

function PrioridadeBadge({ p }: { p: KanbanPrioridade }) {
  const info = PRIORIDADE_INFO[p];
  const icons: Record<KanbanPrioridade, React.ReactNode> = {
    alta:  <Flag className="w-2.5 h-2.5" />,
    media: <Flag className="w-2.5 h-2.5" />,
    baixa: <Flag className="w-2.5 h-2.5" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${info.className}`}>
      {icons[p]}{info.label}
    </span>
  );
}

// ─── Card Kanban ─────────────────────────────────────────────────────────────

interface CardProps {
  card: KanbanCard;
  isGerente: boolean;
  emailUsuario: string;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function KanbanCardItem({ card, isGerente, emailUsuario, dragging, onDragStart, onDragEnd, onEdit, onDelete }: CardProps) {
  const podeArrastar = isGerente || (card.atribuidoA ?? []).includes(emailUsuario);

  return (
    <div
      draggable={podeArrastar}
      onDragStart={podeArrastar ? onDragStart : undefined}
      onDragEnd={podeArrastar ? onDragEnd : undefined}
      className={`group relative rounded-xl border bg-card p-3.5 transition-all duration-200
        ${podeArrastar ? "cursor-grab active:cursor-grabbing hover:bg-accent/30 dark:hover:bg-white/[0.04] hover:shadow-md hover:-translate-y-0.5" : "cursor-default"}
        ${dragging ? "opacity-30 scale-95 rotate-1 shadow-lg" : "shadow-sm"}
        border-border/60`}
    >
      {/* Grip */}
      {podeArrastar && (
        <div className="absolute right-2.5 top-3 opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical className="w-4 h-4 text-foreground" />
        </div>
      )}

      {/* Header: Título + ações gerente */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-semibold text-foreground leading-snug pr-5">{card.titulo}</span>
        {isGerente && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={onEdit}
              className="p-1 rounded-lg hover:bg-blue-500/10 text-blue-500 dark:text-blue-400 transition-colors"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded-lg hover:bg-red-500/10 text-red-500 dark:text-red-400 transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Descrição */}
      {card.descricao && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{card.descricao}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2.5 border-t border-border/40">
        <PrioridadeBadge p={card.prioridade} />
        <div className="flex items-center gap-2">
          {card.dataLimite && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 opacity-60" />{card.dataLimite}
            </span>
          )}
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {(card.atribuidoNome ?? []).length > 0 ? (
              (card.atribuidoNome ?? []).map((nome, idx) => (
                <Avatar key={idx} nome={nome} size="sm" />
              ))
            ) : (
              <div className="w-7 h-7 rounded-full border border-dashed border-border flex items-center justify-center bg-muted/40">
                <User className="w-3.5 h-3.5 text-muted-foreground/60" />
              </div>
            )}
          </div>
        </div>
      </div>

      {(card.atribuidoNome ?? []).length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {(card.atribuidoNome ?? []).map((nome, idx) => (
            <span key={idx} className="text-[9px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/40">
              {nome}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Coluna ──────────────────────────────────────────────────────────────────

interface ColunaProps {
  coluna: typeof COLUNAS[number];
  cards: KanbanCard[];
  isGerente: boolean;
  emailUsuario: string;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (coluna: KanbanColuna) => void;
  onEdit: (card: KanbanCard) => void;
  onDelete: (card: KanbanCard) => void;
  onNovaCard: () => void;
}

function KanbanColuna({ coluna, cards, isGerente, emailUsuario, draggingId, onDragStart, onDragEnd, onDrop, onEdit, onDelete, onNovaCard }: ColunaProps) {
  const [dragOver, setDragOver] = useState(false);
  const icones: Record<string, React.ReactNode> = {
    todo:  <Circle className="w-4 h-4" />,
    doing: <Clock className="w-4 h-4" />,
    done:  <CheckCircle2 className="w-4 h-4" />,
  };

  return (
    <div className="flex flex-col min-h-[500px] w-full">
      {/* Cabeçalho da coluna */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl mb-3 border ${coluna.bgGlass} ${coluna.borderColor}`}>
        <div className={`flex items-center gap-2 font-bold text-sm ${coluna.cor}`}>
          {icones[coluna.key]}
          {coluna.label}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-0.5 rounded-full bg-background/60 font-mono ${coluna.cor} border border-border/30`}>
            {cards.length}
          </span>
          {isGerente && coluna.key === "todo" && (
            <button
              onClick={onNovaCard}
              className="p-1 rounded-lg hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
              title="Nova tarefa"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Zona de drop */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={() => { setDragOver(false); onDrop(coluna.key); }}
        className={`flex-1 flex flex-col gap-2.5 p-2 rounded-xl min-h-[400px] transition-all duration-200
          ${dragOver ? `${coluna.bgGlass} ${coluna.borderColor} border-2 border-dashed` : "border-2 border-transparent"}`}
      >
        {cards.length === 0 && !dragOver && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/30 select-none">
            <LayoutDashboard className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs">Nenhuma tarefa</span>
          </div>
        )}
        {cards.map((card) => (
          <KanbanCardItem
            key={card.id}
            card={card}
            isGerente={isGerente}
            emailUsuario={emailUsuario}
            dragging={draggingId === card.id}
            onDragStart={() => onDragStart(card.id)}
            onDragEnd={onDragEnd}
            onEdit={() => onEdit(card)}
            onDelete={() => onDelete(card)}
          />
        ))}
        {dragOver && (
          <div className={`h-20 rounded-xl border-2 border-dashed ${coluna.borderColor} flex items-center justify-center`}>
            <span className={`text-xs ${coluna.cor} opacity-60`}>Solte aqui</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal de criação/edição ─────────────────────────────────────────────────

interface ModalCardProps {
  card: Partial<KanbanCard> | null;
  usuarios: KanbanUsuario[];
  onSalvar: (dados: Partial<KanbanCard>) => void;
  onFechar: () => void;
  salvando: boolean;
}

function ModalCard({ card, usuarios, onSalvar, onFechar, salvando }: ModalCardProps) {
  const [titulo, setTitulo] = useState(card?.titulo ?? "");
  const [descricao, setDescricao] = useState(card?.descricao ?? "");
  const [prioridade, setPrioridade] = useState<KanbanPrioridade>(card?.prioridade ?? "media");
  const [atribuidoA, setAtribuidoA] = useState<string[]>(card?.atribuidoA ?? []);
  const [dataLimite, setDataLimite] = useState(card?.dataLimite ?? "");

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    const nomes = atribuidoA
      .map((email) => usuarios.find((u) => u.email === email)?.nome)
      .filter((n): n is string => !!n);

    onSalvar({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      prioridade,
      atribuidoA,
      atribuidoNome: nomes,
      dataLimite: dataLimite || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onFechar}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            {card?.id ? "Editar Tarefa" : "Nova Tarefa"}
          </h2>
          <button onClick={onFechar} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Título *</label>
            <input
              ref={inputRef}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Descreva a tarefa..."
              required
              className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes adicionais..."
              rows={3}
              className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none transition-all"
            />
          </div>

          {/* Prioridade + Data Limite */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Prioridade</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as KanbanPrioridade)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-all bg-card"
              >
                <option value="alta" className="bg-card text-foreground">Alta</option>
                <option value="media" className="bg-card text-foreground">Média</option>
                <option value="baixa" className="bg-card text-foreground">Baixa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Data Limite</label>
              <input
                type="text"
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
                placeholder="dd/mm/aaaa"
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Atribuir a (Múltiplos) */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Atribuir a (Selecione um ou mais)
            </label>
            <div className="w-full bg-background border border-input rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
              {usuarios.length === 0 ? (
                <span className="text-xs text-muted-foreground/50">Nenhum colaborador encontrado no setor.</span>
              ) : (
                usuarios.map((u) => {
                  const isChecked = atribuidoA.includes(u.email);
                  return (
                    <label key={u.email} className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer hover:bg-muted p-1.5 rounded-lg transition-all">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setAtribuidoA((prev) => prev.filter((email) => email !== u.email));
                          } else {
                            setAtribuidoA((prev) => [...prev, u.email]);
                          }
                        }}
                        className="rounded border-input bg-card text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>{u.nome}{u.isGerente ? " (Gerente)" : ""}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-sm font-medium transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || !titulo.trim()}
              className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {card?.id ? "Salvar" : "Criar Tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal de confirmação de exclusão ────────────────────────────────────────

function ModalConfirmar({ card, onConfirmar, onCancelar, excluindo }: {
  card: KanbanCard; onConfirmar: () => void; onCancelar: () => void; excluindo: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onCancelar}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground mb-1">Excluir tarefa?</h3>
            <p className="text-sm text-muted-foreground">
              A tarefa <strong className="text-foreground">"{card.titulo}"</strong> será excluída permanentemente.
            </p>
          </div>
          <div className="flex gap-2 w-full pt-1.5 border-t border-border/40">
            <button onClick={onCancelar} className="flex-1 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-sm transition-all">
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={excluindo}
              className="flex-1 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
            >
              {excluindo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function KanbanSetor() {
  const { setor: slug } = useParams<{ setor: string }>();
  const navigate = useNavigate();
  const { usuario, googleIdToken } = useAuth();

  const setorConfig = KANBAN_SETORES.find((s) => s.slug === (slug ?? ""));
  const gerente = !!usuario && isGerenteDoSetor(usuario.papeis, slug ?? "");
  const temAcesso = !!usuario && podeAcessarKanban(usuario.papeis, slug ?? "");

  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [usuarios, setUsuarios] = useState<KanbanUsuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [modalCard, setModalCard] = useState<Partial<KanbanCard> | null>(null);
  const [cardParaExcluir, setCardParaExcluir] = useState<KanbanCard | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!googleIdToken || !setorConfig) return;
    setCarregando(true);
    setErro(null);
    try {
      const [c, u] = await Promise.all([
        listarKanbanCards(googleIdToken, setorConfig.papel),
        listarKanbanUsuarios(googleIdToken, setorConfig.papel),
      ]);
      setCards(c);
      setUsuarios(u);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar dados.");
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken, setorConfig]);

  useEffect(() => {
    if (!temAcesso) { navigate("/"); return; }
    carregarDados();
  }, [temAcesso, carregarDados, navigate]);

  // Drag-and-drop
  const handleDrop = useCallback(async (novaColuna: KanbanColuna) => {
    if (!draggingId || !googleIdToken) return;
    const card = cards.find((c) => c.id === draggingId);
    if (!card || card.coluna === novaColuna) { setDraggingId(null); return; }

    // Verifica permissão: gerente pode mover qualquer card; colaborador só o atribuído a ele
    const podeArrastar = gerente || (card.atribuidoA ?? []).includes(usuario?.email ?? "");
    if (!podeArrastar) { setDraggingId(null); return; }

    setCards((prev) => prev.map((c) => c.id === draggingId ? { ...c, coluna: novaColuna } : c));
    setDraggingId(null);
    try {
      await atualizarKanbanCard(googleIdToken, draggingId, { coluna: novaColuna });
    } catch {
      // Reverte em caso de erro
      setCards((prev) => prev.map((c) => c.id === draggingId ? { ...c, coluna: card.coluna } : c));
    }
  }, [draggingId, cards, googleIdToken, gerente, usuario?.email]);

  // Criar / editar
  const handleSalvar = async (dados: Partial<KanbanCard>) => {
    if (!googleIdToken || !setorConfig) return;
    setSalvando(true);
    try {
      if (modalCard?.id) {
        const atualizado = await atualizarKanbanCard(googleIdToken, modalCard.id, dados);
        setCards((prev) => prev.map((c) => c.id === atualizado.id ? atualizado : c));
      } else {
        const novo = await criarKanbanCard(googleIdToken, { ...dados, setor: setorConfig.papel, coluna: "todo" });
        setCards((prev) => [...prev, novo]);
      }
      setModalCard(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  // Excluir
  const handleExcluir = async () => {
    if (!cardParaExcluir || !googleIdToken) return;
    setExcluindo(true);
    try {
      await excluirKanbanCard(googleIdToken, cardParaExcluir.id);
      setCards((prev) => prev.filter((c) => c.id !== cardParaExcluir.id));
      setCardParaExcluir(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    } finally {
      setExcluindo(false);
    }
  };

  if (!setorConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-lg font-semibold">Setor não encontrado.</p>
          <button onClick={() => navigate("/")} className="mt-4 text-sm text-primary hover:underline">
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground animate-fade-in pb-12">
      {/* Header */}
      <div className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow shadow-violet-500/10">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Kanban — {setorConfig.nome}</h1>
              <p className="text-xs text-muted-foreground">
                {gerente ? "Gerente — acesso total" : "Colaborador — visualização + mover tarefas atribuídas a você"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {gerente && (
              <button
                onClick={() => setModalCard({})}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nova Tarefa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {carregando ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : erro ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 animate-fade-in">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-muted-foreground text-sm">{erro}</p>
            <button
              onClick={carregarDados}
              className="px-4 py-2 rounded-xl border border-border text-sm text-foreground hover:bg-muted transition-all"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {COLUNAS.map((col) => (
              <KanbanColuna
                key={col.key}
                coluna={col}
                cards={cards.filter((c) => c.coluna === col.key)}
                isGerente={gerente}
                emailUsuario={usuario?.email ?? ""}
                draggingId={draggingId}
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
                onDrop={handleDrop}
                onEdit={(card) => setModalCard(card)}
                onDelete={(card) => setCardParaExcluir(card)}
                onNovaCard={() => setModalCard({})}
              />
            ))}
          </div>
        )}

        {/* Estatísticas */}
        {!carregando && !erro && (
          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border pt-5 select-none">
            <span>{cards.length} tarefas no total</span>
            <span>•</span>
            <span>{cards.filter((c) => c.coluna === "done").length} concluídas</span>
            <span>•</span>
            <span>{usuarios.length} colaborador{usuarios.length !== 1 ? "es" : ""} no setor</span>
          </div>
        )}
      </div>

      {/* Modais */}
      {modalCard !== null && (
        <ModalCard
          card={modalCard}
          usuarios={usuarios}
          onSalvar={handleSalvar}
          onFechar={() => setModalCard(null)}
          salvando={salvando}
        />
      )}
      {cardParaExcluir && (
        <ModalConfirmar
          card={cardParaExcluir}
          onConfirmar={handleExcluir}
          onCancelar={() => setCardParaExcluir(null)}
          excluindo={excluindo}
        />
      )}
    </div>
  );
}
