import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Phone as PhoneIcon,
  User,
  Filter,
  Plus,
  Pencil,
  Trash2,
  Check,
  Copy,
  X,
  Loader2,
  RefreshCw,
  Building2,
  ShieldCheck,
  PhoneCall
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/auth/AuthProvider";
import { apiUrl } from "@/lib/apiBase";
import { toast } from "sonner";

export interface RamalItem {
  id?: string;
  nome: string;
  ramal: string;
  setor: string;
  ordem?: number;
  criadoEm?: string;
  atualizadoEm?: string;
}

const DEFAULT_RAMAIS: RamalItem[] = [
  // Direção
  { id: "ramal-1", nome: "Clayton", ramal: "213", setor: "Direção", ordem: 1 },
  { id: "ramal-2", nome: "Ademilton", ramal: "212", setor: "Direção", ordem: 2 },
  { id: "ramal-3", nome: "Valquíria/Renata", ramal: "211", setor: "Direção", ordem: 3 },
  { id: "ramal-4", nome: "Valquíria", ramal: "210", setor: "Direção", ordem: 4 },
  // Secretaria de atendimento
  { id: "ramal-5", nome: "Atendente 1", ramal: "203", setor: "Secretaria de atendimento", ordem: 5 },
  { id: "ramal-6", nome: "Atendente 2", ramal: "204", setor: "Secretaria de atendimento", ordem: 6 },
  { id: "ramal-7", nome: "Atendente 3", ramal: "205", setor: "Secretaria de atendimento", ordem: 7 },
  { id: "ramal-8", nome: "Atendente 4", ramal: "209", setor: "Secretaria de atendimento", ordem: 8 },
  { id: "ramal-9", nome: "Atendente 5", ramal: "208", setor: "Secretaria de atendimento", ordem: 9 },
  { id: "ramal-10", nome: "Katrleen", ramal: "207", setor: "Secretaria de atendimento", ordem: 10 },
  { id: "ramal-11", nome: "Vanessa", ramal: "206", setor: "Secretaria de atendimento", ordem: 11 },
  // Faculdade CCI
  { id: "ramal-12", nome: "Atendente 1", ramal: "240", setor: "Faculdade CCI", ordem: 12 },
  { id: "ramal-13", nome: "Atendente 2", ramal: "241", setor: "Faculdade CCI", ordem: 13 },
  { id: "ramal-14", nome: "Valéria/Jesiel", ramal: "244", setor: "Faculdade CCI", ordem: 14 },
  // NegoCCIe
  { id: "ramal-15", nome: "Giovanna/Renato/Rodrigo", ramal: "250", setor: "NegoCCIe", ordem: 15 },
  { id: "ramal-16", nome: "Déborah/Danielly", ramal: "251", setor: "NegoCCIe", ordem: 16 },
  // Coordenação
  { id: "ramal-17", nome: "Michel", ramal: "215", setor: "Coordenação", ordem: 17 },
  { id: "ramal-18", nome: "Stephanie", ramal: "216", setor: "Coordenação", ordem: 18 },
  { id: "ramal-19", nome: "Luzimar", ramal: "218", setor: "Coordenação", ordem: 19 },
  { id: "ramal-20", nome: "Aldeni", ramal: "219", setor: "Coordenação", ordem: 20 },
  { id: "ramal-21", nome: "Andresa", ramal: "220", setor: "Coordenação", ordem: 21 },
  { id: "ramal-22", nome: "Thaisa", ramal: "221", setor: "Coordenação", ordem: 22 },
  { id: "ramal-23", nome: "Mábia", ramal: "222", setor: "Coordenação", ordem: 23 },
  { id: "ramal-24", nome: "Flávia", ramal: "223", setor: "Coordenação", ordem: 24 },
  { id: "ramal-25", nome: "Kátia", ramal: "224", setor: "Coordenação", ordem: 25 },
  { id: "ramal-26", nome: "Isabel", ramal: "225", setor: "Coordenação", ordem: 26 },
  { id: "ramal-27", nome: "Rafael", ramal: "226", setor: "Coordenação", ordem: 27 },
  { id: "ramal-28", nome: "Félix", ramal: "227", setor: "Coordenação", ordem: 28 },
  { id: "ramal-29", nome: "Francianne", ramal: "239", setor: "Coordenação", ordem: 29 },
  // Departamento pessoal e financeiro
  { id: "ramal-30", nome: "Francisco", ramal: "237", setor: "Departamento pessoal e financeiro", ordem: 30 },
  { id: "ramal-31", nome: "Mirla", ramal: "238", setor: "Departamento pessoal e financeiro", ordem: 31 },
  { id: "ramal-32", nome: "Michelle", ramal: "263", setor: "Departamento pessoal e financeiro", ordem: 32 },
  { id: "ramal-33", nome: "Leane/Nathalia", ramal: "264", setor: "Departamento pessoal e financeiro", ordem: 33 },
  // Setape
  { id: "ramal-34", nome: "Jediael/Thiago", ramal: "232", setor: "Setape", ordem: 34 },
  { id: "ramal-35", nome: "Hugo/Pedro/Yuri", ramal: "235", setor: "Setape", ordem: 35 },
  // Coordenação infantil ao 1º EF
  { id: "ramal-36", nome: "Ângela", ramal: "228", setor: "Coordenação infantil ao 1º EF", ordem: 36 },
  { id: "ramal-37", nome: "Regina", ramal: "229", setor: "Coordenação infantil ao 1º EF", ordem: 37 },
  { id: "ramal-38", nome: "Ivete", ramal: "230", setor: "Coordenação infantil ao 1º EF", ordem: 38 },
  // Enfermaria
  { id: "ramal-39", nome: "Joyce", ramal: "231", setor: "Enfermaria", ordem: 39 },
  // Publicidade
  { id: "ramal-40", nome: "Bárbara", ramal: "253", setor: "Publicidade", ordem: 40 },
  // Biblioteca
  { id: "ramal-41", nome: "Sirlene/Edivanete", ramal: "233", setor: "Biblioteca", ordem: 41 },
  // Xerox
  { id: "ramal-42", nome: "Fabrício", ramal: "246", setor: "Xerox", ordem: 42 },
  // Clat
  { id: "ramal-43", nome: "Alessandra", ramal: "260", setor: "Clat", ordem: 43 },
  // Lanchonetes
  { id: "ramal-44", nome: "Geração saúde", ramal: "214", setor: "Lanchonetes", ordem: 44 },
  { id: "ramal-45", nome: "Delícia de sabor", ramal: "248", setor: "Lanchonetes", ordem: 45 }
];

export default function Ramais() {
  const { usuario, googleIdToken } = useAuth();

  const [ramais, setRamais] = useState<RamalItem[]>(DEFAULT_RAMAIS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [setorFilter, setSetorFilter] = useState<string>("Todos os setores");
  const [copiedRamal, setCopiedRamal] = useState<string | null>(null);

  // Modal de edição / criação
  const [showModal, setShowModal] = useState(false);
  const [editingRamal, setEditingRamal] = useState<RamalItem | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formRamal, setFormRamal] = useState("");
  const [formSetor, setFormSetor] = useState("");
  const [formCustomSetor, setFormCustomSetor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verificação de permissão: Administrador (painel_admin / admin) ou Setape
  const podeEditar = useMemo(() => {
    const papeis = (usuario?.papeis || []).map((p) => String(p).toLowerCase());
    return (
      papeis.includes("admin") ||
      papeis.includes("painel_admin") ||
      papeis.includes("setape")
    );
  }, [usuario]);

  // Carregar lista de ramais da API
  const carregarRamais = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/ramais"));
      const data = await res.json();
      if (data.ok && Array.isArray(data.ramais) && data.ramais.length > 0) {
        setRamais(data.ramais);
      } else {
        setRamais(DEFAULT_RAMAIS);
      }
    } catch (e) {
      console.warn("Falha ao buscar ramais da API, utilizando padrão local:", e);
      setRamais(DEFAULT_RAMAIS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRamais();
  }, []);

  // Lista única de setores para o filtro e para o select de criação
  const listaSetores = useMemo(() => {
    const sets = new Set<string>();
    ramais.forEach((r) => {
      if (r.setor && r.setor.trim()) sets.add(r.setor.trim());
    });
    return Array.from(sets).sort((a, b) => a.localeCompare(b));
  }, [ramais]);

  // Itens filtrados por busca e setor
  const filtered = useMemo(() => {
    return ramais.filter((r) => {
      const matchSetor =
        setorFilter === "Todos os setores" || r.setor === setorFilter;
      const term = search.toLowerCase().trim();
      const matchSearch =
        !term ||
        r.nome.toLowerCase().includes(term) ||
        r.setor.toLowerCase().includes(term) ||
        r.ramal.includes(term);
      return matchSetor && matchSearch;
    });
  }, [ramais, setorFilter, search]);

  const handleCopiarRamal = (ramal: string) => {
    navigator.clipboard.writeText(ramal);
    setCopiedRamal(ramal);
    toast.success(`Ramal ${ramal} copiado!`);
    setTimeout(() => setCopiedRamal(null), 2000);
  };

  const handleAbrirCriar = () => {
    setEditingRamal(null);
    setFormNome("");
    setFormRamal("");
    setFormSetor(listaSetores[0] || "Direção");
    setFormCustomSetor("");
    setShowModal(true);
  };

  const handleAbrirEditar = (r: RamalItem) => {
    setEditingRamal(r);
    setFormNome(r.nome);
    setFormRamal(r.ramal);
    if (listaSetores.includes(r.setor)) {
      setFormSetor(r.setor);
      setFormCustomSetor("");
    } else {
      setFormSetor("__outro__");
      setFormCustomSetor(r.setor);
    }
    setShowModal(true);
  };

  const handleSalvarRamal = async (e: React.FormEvent) => {
    e.preventDefault();
    const setorFinal = formSetor === "__outro__" ? formCustomSetor.trim() : formSetor.trim();

    if (!formNome.trim() || !formRamal.trim() || !setorFinal) {
      toast.error("Por favor, preencha o setor, número do ramal e o nome do responsável.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: RamalItem = {
        id: editingRamal?.id,
        nome: formNome.trim(),
        ramal: formRamal.trim(),
        setor: setorFinal,
        ordem: editingRamal?.ordem
      };

      const res = await fetch(apiUrl("/api/ramais/salvar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: googleIdToken,
          ramal: payload
        })
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(editingRamal ? "Ramal atualizado com sucesso!" : "Novo ramal cadastrado com sucesso!");
        setShowModal(false);
        setEditingRamal(null);
        carregarRamais();
      } else {
        toast.error(data.error || "Erro ao salvar ramal.");
      }
    } catch (err: any) {
      toast.error("Falha na comunicação com o servidor ao salvar o ramal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcluirRamal = async (r: RamalItem) => {
    if (!r.id) return;
    if (!confirm(`Deseja realmente remover o ramal ${r.ramal} (${r.nome})?`)) {
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/ramais/excluir"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: googleIdToken,
          id: r.id
        })
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(`Ramal ${r.ramal} excluído com sucesso!`);
        carregarRamais();
      } else {
        toast.error(data.error || "Erro ao excluir ramal.");
      }
    } catch (e: any) {
      toast.error("Falha ao excluir ramal.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHero
        title="Ramais"
        subtitle="Lista completa de ramais telefônicos e contatos da organização"
      />

      <div className="mx-auto max-w-6xl px-4 py-4 md:px-8 space-y-6">
        {/* BARRA SUPERIOR DE AÇÕES & STATUS */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-card-foreground">
                  Guia Telefônico Interno
                </h3>
                {podeEditar && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="h-3 w-3" />
                    Modo Gerenciamento
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {ramais.length} ramais cadastrados em {listaSetores.length} setores
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={carregarRamais}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all active:scale-95 disabled:opacity-50"
              title="Recarregar lista de ramais"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            {podeEditar && (
              <button
                onClick={handleAbrirCriar}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:from-primary/90 hover:to-indigo-500 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Ramal</span>
              </button>
            )}
          </div>
        </div>

        {/* FILTROS E BUSCA */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 sm:col-span-1">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Select value={setorFilter} onValueChange={setSetorFilter}>
              <SelectTrigger className="w-full rounded-xl border border-input bg-card text-xs">
                <SelectValue placeholder="Filtrar por setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos os setores">Todos os setores ({ramais.length})</SelectItem>
                {listaSetores.map((s) => {
                  const qtd = ramais.filter((r) => r.setor === s).length;
                  return (
                    <SelectItem key={s} value={s}>
                      {s} ({qtd})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, setor ou ramal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-card py-2.5 pl-9 pr-8 text-xs text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
        </div>

        {/* TABELA DE RAMAIS */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-xs font-semibold">Carregando lista de ramais...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Setor
                    </th>
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Ramal
                    </th>
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Responsável
                    </th>
                    {podeEditar && (
                      <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r, i) => (
                    <tr
                      key={r.id || `${r.setor}-${r.ramal}-${r.nome}-${i}`}
                      className="group transition-colors hover:bg-muted/30"
                    >
                      {/* SETOR */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building2 className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-foreground">
                            {r.setor}
                          </span>
                        </div>
                      </td>

                      {/* NÚMERO DO RAMAL (COM BOTÃO DE COPIAR) */}
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleCopiarRamal(r.ramal)}
                          title="Clique para copiar o ramal"
                          className="group/btn inline-flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary transition-all active:scale-95"
                        >
                          <PhoneIcon className="h-3 w-3" />
                          <span>{r.ramal}</span>
                          {copiedRamal === r.ramal ? (
                            <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </td>

                      {/* RESPONSÁVEIS */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium text-foreground">
                            {r.nome}
                          </span>
                        </div>
                      </td>

                      {/* AÇÕES DE ADMINISTRAÇÃO (EDITAR / EXCLUIR) */}
                      {podeEditar && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAbrirEditar(r)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                              title="Editar ramal"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleExcluirRamal(r)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-all"
                              title="Excluir ramal"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PhoneIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-bold text-foreground">Nenhum ramal encontrado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tente ajustar o termo da busca ou o filtro de setor selecionado.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE RAMAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  {editingRamal ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-card-foreground">
                    {editingRamal ? "Editar Ramal" : "Novo Ramal"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {editingRamal
                      ? "Atualize as informações do ramal e setor."
                      : "Cadastre um novo ramal no guia telefônico."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingRamal(null);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarRamal} className="space-y-3.5 text-xs">
              {/* SETOR */}
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Setor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formSetor}
                  onChange={(e) => setFormSetor(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {listaSetores.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__outro__">➕ Outro setor (Digitar novo)...</option>
                </select>
              </div>

              {/* OUTRO SETOR (CUSTOM) */}
              {formSetor === "__outro__" && (
                <div className="animate-in fade-in">
                  <label className="block font-bold text-foreground mb-1">
                    Nome do Novo Setor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCustomSetor}
                    onChange={(e) => setFormCustomSetor(e.target.value)}
                    placeholder="Ex: Recursos Humanos"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              {/* RAMAL */}
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Número do Ramal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formRamal}
                  onChange={(e) => setFormRamal(e.target.value)}
                  placeholder="Ex: 232 ou 201/202"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* RESPONSÁVEIS */}
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Responsável(is) / Descrição <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Jediael / Thiago ou Atendente 1"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* BOTÕES */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRamal(null);
                  }}
                  className="rounded-xl border border-border bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>{editingRamal ? "Salvar Alterações" : "Criar Ramal"}</span>
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
