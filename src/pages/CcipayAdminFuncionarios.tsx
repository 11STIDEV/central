import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayAtualizarFuncionario,
  ccipayListarFuncionarios,
  ccipaySincronizarAlterdata,
  ccipayLancarBonificacao,
  ccipayLancarDeducao,
  type CcipayFuncionario,
} from "@/lib/ccipay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Sparkles,
  Gift,
  Coins,
  MinusCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function CcipayAdminFuncionarios() {
  const { googleIdToken } = useAuth();
  const [lista, setLista] = useState<CcipayFuncionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "inativos">("todos");

  // Modal de Bonificação
  const [modalBonificacaoAberto, setModalBonificacaoAberto] = useState(false);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<CcipayFuncionario | null>(null);
  const [tipoOperacao, setTipoOperacao] = useState<"bonificacao" | "deducao">("bonificacao");
  const [valorBonificacao, setValorBonificacao] = useState("");
  const [descricaoBonificacao, setDescricaoBonificacao] = useState("");
  const [salvandoBonificacao, setSalvandoBonificacao] = useState(false);

  function abrirModalBonificacao(f: CcipayFuncionario) {
    setFuncionarioSelecionado(f);
    setTipoOperacao("bonificacao");
    setValorBonificacao("");
    setDescricaoBonificacao("");
    setModalBonificacaoAberto(true);
  }

  async function handleConfirmarBonificacao() {
    if (!googleIdToken || !funcionarioSelecionado) return;
    const v = Number(valorBonificacao.replace(",", "."));
    if (Number.isNaN(v) || v <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }
    setSalvandoBonificacao(true);
    try {
      if (tipoOperacao === "bonificacao") {
        await ccipayLancarBonificacao(
          googleIdToken,
          funcionarioSelecionado.email,
          v,
          descricaoBonificacao.trim() || "Bonificação de saldo"
        );
        toast.success(`Crédito de R$ ${v.toFixed(2)} lançado para ${funcionarioSelecionado.nome}!`);
      } else {
        await ccipayLancarDeducao(
          googleIdToken,
          funcionarioSelecionado.email,
          v,
          descricaoBonificacao.trim() || "Ajuste / dedução de bonificação"
        );
        toast.success(`Dedução de R$ ${v.toFixed(2)} lançada para ${funcionarioSelecionado.nome}!`);
      }
      setModalBonificacaoAberto(false);
      await carregar();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao processar lançamento.");
    } finally {
      setSalvandoBonificacao(false);
    }
  }

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    setCarregando(true);
    try {
      const { funcionarios } = await ccipayListarFuncionarios(googleIdToken);
      setLista(funcionarios || []);
    } catch (e: any) {
      toast.error(`Erro ao carregar colaboradores: ${e.message}`);
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(f: CcipayFuncionario, patch: Partial<CcipayFuncionario>) {
    if (!googleIdToken) return;
    try {
      await ccipayAtualizarFuncionario(googleIdToken, f.email, patch);
      toast.success("Dados salvos com sucesso.");
      await carregar();
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e.message}`);
    }
  }

  async function handleSincronizarComAlterdata() {
    if (!googleIdToken) return;
    setSincronizando(true);
    try {
      const res = await ccipaySincronizarAlterdata(googleIdToken);
      if (res.ok) {
        toast.success(
          `Sincronização concluída! ${res.novosCadastros} novos cadastrados, ${res.atualizadosComCodigo} códigos vinculados.`
        );
        if (res.funcionarios) {
          setLista(res.funcionarios);
        } else {
          await carregar();
        }
      }
    } catch (e: any) {
      toast.error(`Erro ao sincronizar com Alterdata: ${e.message}`);
    } finally {
      setSincronizando(false);
    }
  }

  const filtrados = useMemo(() => {
    return lista.filter((f) => {
      if (filtroStatus === "ativos" && !f.ativo) return false;
      if (filtroStatus === "inativos" && f.ativo) return false;
      if (!busca.trim()) return true;
      const b = busca.toLowerCase().trim();
      return (
        f.nome?.toLowerCase().includes(b) ||
        f.email?.toLowerCase().includes(b) ||
        f.alterdataCodigo?.toLowerCase().includes(b)
      );
    });
  }, [lista, busca, filtroStatus]);

  const stats = useMemo(() => {
    const total = lista.length;
    const ativos = lista.filter((f) => f.ativo).length;
    const comCodigo = lista.filter((f) => f.alterdataCodigo && f.alterdataCodigo.trim()).length;
    const totalBonificacoes = lista
      .filter((f) => f.ativo)
      .reduce((acc, f) => acc + (f.saldoBonificacao || 0), 0);
    return { total, ativos, comCodigo, semCodigo: total - comCodigo, totalBonificacoes };
  }, [lista]);

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Funcionários Advance-CCI"
        subtitle="Gestão de limites de adiantamento, tetos e vínculo automático de matrículas do Alterdata via Supabase."
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/cci-pay">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Advance-CCI
            </Link>
          </Button>

          <Button
            onClick={handleSincronizarComAlterdata}
            disabled={sincronizando || carregando}
            variant="default"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} />
            {sincronizando ? "Sincronizando com Alterdata..." : "Sincronizar com Alterdata (Supabase)"}
          </Button>
        </div>

        {/* Painel de Estatísticas Rápidas */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Total Cadastrados</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-xl border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Ativos no Advance</p>
            <p className="text-xl font-bold text-emerald-600">{stats.ativos}</p>
          </div>
          <div className="rounded-xl border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Com Matrícula Alterdata</p>
            <p className="text-xl font-bold text-primary">{stats.comCodigo}</p>
          </div>
          <div className="rounded-xl border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Sem Código Folha</p>
            <p className="text-xl font-bold text-amber-600">{stats.semCodigo}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Bonificações do Mês</p>
            <p className="text-xl font-bold text-emerald-600">
              R$ {stats.totalBonificacoes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail ou código de folha..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 text-xs">
            <Button
              variant={filtroStatus === "todos" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFiltroStatus("todos")}
            >
              Todos ({lista.length})
            </Button>
            <Button
              variant={filtroStatus === "ativos" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFiltroStatus("ativos")}
            >
              Ativos ({stats.ativos})
            </Button>
            <Button
              variant={filtroStatus === "inativos" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFiltroStatus("inativos")}
            >
              Inativos ({lista.length - stats.ativos})
            </Button>
          </div>
        </div>

        {carregando ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando colaboradores...</p>
        ) : filtrados.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            <p>Nenhum colaborador encontrado com os filtros aplicados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((f) => (
              <div
                key={f.email}
                className={`rounded-xl border bg-card p-4 transition-colors ${
                  f.ativo ? "border-border" : "border-dashed border-muted opacity-75"
                }`}
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{f.nome}</p>
                    <p className="text-xs text-muted-foreground">{f.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {f.alterdataCodigo ? (
                      <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
                        Folha: #{f.alterdataCodigo}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                        Sem matrícula
                      </Badge>
                    )}

                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold"
                    >
                      Bonificação: R$ {(f.saldoBonificacao ?? 0).toFixed(2)}
                    </Badge>

                    <Badge variant={f.ativo ? "default" : "secondary"}>
                      {f.ativo ? "Ativo" : "Inativo"}
                    </Badge>

                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-semibold shadow-xs"
                      onClick={() => abrirModalBonificacao(f)}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Bonificar
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => salvar(f, { ativo: !f.ativo })}
                    >
                      {f.ativo ? "Inativar" : "Ativar"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Código referência (folha)
                    </label>
                    <Input
                      defaultValue={f.alterdataCodigo ?? ""}
                      placeholder="Ex.: 303104"
                      onBlur={(e) => salvar(f, { alterdataCodigo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Limite adiantamento / vales (R$)
                    </label>
                    <Input
                      type="number"
                      defaultValue={f.limiteAdiantamento}
                      placeholder="300.00"
                      onBlur={(e) => salvar(f, { limiteAdiantamento: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Teto bonificações (R$)
                    </label>
                    <Input
                      type="number"
                      defaultValue={f.limiteBonificacao ?? ""}
                      placeholder="Vazio = sem teto"
                      onBlur={(e) =>
                        salvar(f, {
                          limiteBonificacao: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Chave PIX padrão
                    </label>
                    <Input
                      defaultValue={f.pixPadrao ?? ""}
                      placeholder="Chave PIX (CPF/Email/Tel)"
                      onBlur={(e) => salvar(f, { pixPadrao: e.target.value || null })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Lançamento / Ajuste de Bonificação */}
      <Dialog open={modalBonificacaoAberto} onOpenChange={setModalBonificacaoAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <Sparkles className="h-5 w-5" />
              <DialogTitle>Lançar Bonificação</DialogTitle>
            </div>
            <DialogDescription>
              Adicione crédito de bonificação para uso no convênio Advance-CCI ou efetue deduções.
            </DialogDescription>
          </DialogHeader>

          {funcionarioSelecionado && (
            <div className="space-y-4 py-2">
              {/* Card Resumo do Colaborador */}
              <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground text-sm">
                    {funcionarioSelecionado.nome}
                  </p>
                  {funcionarioSelecionado.alterdataCodigo && (
                    <Badge variant="outline" className="text-xs">
                      #{funcionarioSelecionado.alterdataCodigo}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{funcionarioSelecionado.email}</p>
                <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground border-t border-border/60 mt-1.5">
                  <div>
                    <span>Saldo atual no mês: </span>
                    <strong className="text-emerald-600 font-semibold">
                      R$ {(funcionarioSelecionado.saldoBonificacao ?? 0).toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span>Teto configurado: </span>
                    <strong>
                      {funcionarioSelecionado.limiteBonificacao != null
                        ? `R$ ${funcionarioSelecionado.limiteBonificacao.toFixed(2)}`
                        : "Sem teto"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Seletor de Tipo de Operação */}
              <div className="flex rounded-lg border bg-muted/40 p-1 text-xs">
                <button
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition-colors ${
                    tipoOperacao === "bonificacao"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setTipoOperacao("bonificacao")}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Bonificação (Crédito +)
                </button>
                <button
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition-colors ${
                    tipoOperacao === "deducao"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setTipoOperacao("deducao")}
                >
                  <MinusCircle className="h-3.5 w-3.5" />
                  Dedução / Ajuste (-)
                </button>
              </div>

              {/* Input de Valor */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {tipoOperacao === "bonificacao" ? "Valor a Bonificar (R$)" : "Valor a Deduzir (R$)"}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={valorBonificacao}
                  onChange={(e) => setValorBonificacao(e.target.value)}
                  className="text-base font-semibold"
                  autoFocus
                />
                {/* Botões rápidos de valor */}
                <div className="flex gap-1.5 pt-1">
                  {[20, 50, 100, 200].map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setValorBonificacao(String(v))}
                    >
                      +R$ {v}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Input de Descrição / Motivo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Motivo / Descrição
                </label>
                <Input
                  placeholder="Ex.: Premiação por metas, Destaque do mês..."
                  value={descricaoBonificacao}
                  onChange={(e) => setDescricaoBonificacao(e.target.value)}
                />
                {/* Sugestões rápidas de descrição */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "Premiação de metas",
                    "Destaque do mês",
                    "Campanha interna",
                    "Gratificação institucional",
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      className="text-[11px] px-2 py-0.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border transition-colors"
                      onClick={() => setDescricaoBonificacao(sug)}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aviso de teto se aplicável */}
              {tipoOperacao === "bonificacao" &&
                funcionarioSelecionado.limiteBonificacao != null &&
                Number(valorBonificacao) > 0 &&
                (funcionarioSelecionado.saldoBonificacao ?? 0) + Number(valorBonificacao) >
                  funcionarioSelecionado.limiteBonificacao && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    O valor ultrapassará o teto de R${" "}
                    {funcionarioSelecionado.limiteBonificacao.toFixed(2)}. Disponível para crédito: R${" "}
                    {Math.max(
                      0,
                      funcionarioSelecionado.limiteBonificacao -
                        (funcionarioSelecionado.saldoBonificacao ?? 0)
                    ).toFixed(2)}
                    .
                  </p>
                )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={salvandoBonificacao}
              onClick={() => setModalBonificacaoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={salvandoBonificacao || !valorBonificacao || Number(valorBonificacao) <= 0}
              className={
                tipoOperacao === "bonificacao"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }
              onClick={handleConfirmarBonificacao}
            >
              {salvandoBonificacao ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : tipoOperacao === "bonificacao" ? (
                "Confirmar Bonificação"
              ) : (
                "Confirmar Dedução"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
