import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayRelatorioDp,
  ccipayDarBaixaFolha,
  labelStatusMovimento,
  type CcipayMovimento,
  type CcipayResumoFuncionarioDp,
  type CcipayLoja,
  type CcipayRelatorioDpTotais,
} from "@/lib/ccipay";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  Store,
  Banknote,
  Gift,
  CircleDollarSign,
  Users,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  Check,
  Building2,
  Calendar,
  XCircle,
  ChevronRight,
  Receipt,
  MinusCircle,
} from "lucide-react";

const STATUS_OPCOES = [
  { value: "", label: "Todos os status" },
  { value: "descontado_folha", label: "Descontado em folha" },
  { value: "pago", label: "Depositado / Pago" },
  { value: "aprovado", label: "Aprovado" },
  { value: "pendente", label: "Pendente" },
  { value: "cancelado", label: "Cancelado" },
];

const TIPO_OPCOES = [
  { value: "", label: "Todos os tipos" },
  { value: "compra_loja", label: "Compras em Lojas Parceiras" },
  { value: "adiantamento", label: "Vales / Adiantamentos Salariais" },
  { value: "bonificacao", label: "Bonificações (Créditos)" },
  { value: "deducao", label: "Deduções / Ajustes" },
];

export default function CcipayRelatoriosDp() {
  const { googleIdToken } = useAuth();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [status, setStatus] = useState("");
  const [tipo, setTipo] = useState("");
  const [lojaId, setLojaId] = useState("");
  const [busca, setBusca] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [linhas, setLinhas] = useState<CcipayMovimento[]>([]);
  const [resumo, setResumo] = useState<CcipayResumoFuncionarioDp[]>([]);
  const [lojas, setLojas] = useState<CcipayLoja[]>([]);
  const [totais, setTotais] = useState<CcipayRelatorioDpTotais | null>(null);

  const [abaAtiva, setAbaAtiva] = useState<"colaboradores" | "movimentos">("colaboradores");
  const [colaboradorDetalhes, setColaboradorDetalhes] = useState<CcipayResumoFuncionarioDp | null>(null);
  const [confirmandoBaixa, setConfirmandoBaixa] = useState<{
    funcionarioEmail?: string;
    funcionarioNome?: string;
    movimentoId?: string;
    valor?: number;
    tipoDescricao?: string;
  } | null>(null);
  const [baixando, setBaixando] = useState(false);
  const [exportando, setExportando] = useState<"detalhado" | "consolidado" | null>(null);

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    setCarregando(true);
    try {
      const res = await ccipayRelatorioDp(googleIdToken, competencia, false, {
        status: status || undefined,
        tipo: tipo || undefined,
        lojaId: lojaId || undefined,
      });
      setLinhas(res.movimentos || []);
      setResumo(res.resumoPorFuncionario || []);
      if (res.lojas) setLojas(res.lojas);
      if (res.totais) setTotais(res.totais);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar relatório do DP.");
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken, competencia, status, tipo, lojaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function exportarCsv(modo: "detalhado" | "consolidado") {
    if (!googleIdToken) return;
    setExportando(modo);
    try {
      const res = await ccipayRelatorioDp(googleIdToken, competencia, true, {
        status: status || undefined,
        tipo: tipo || undefined,
        lojaId: lojaId || undefined,
        modoCsv: modo,
      });
      if (!res.csv) {
        toast.error("Nenhum dado gerado para exportação.");
        return;
      }
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        modo === "consolidado"
          ? `advance-cci-folha-consolidada-${competencia}.csv`
          : `advance-cci-lancamentos-analitico-${competencia}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        modo === "consolidado"
          ? "CSV de fechamento de folha baixado com sucesso!"
          : "CSV de lançamentos analítico baixado com sucesso!",
      );
    } catch (e: any) {
      toast.error(e?.message || "Erro ao exportar CSV.");
    } finally {
      setExportando(null);
    }
  }

  async function executarBaixaFolha() {
    if (!confirmandoBaixa || !googleIdToken) return;
    setBaixando(true);
    try {
      await ccipayDarBaixaFolha(googleIdToken, {
        movimentoIds: confirmandoBaixa.movimentoId ? [confirmandoBaixa.movimentoId] : undefined,
        funcionarioEmail: confirmandoBaixa.funcionarioEmail,
        competencia,
        novoStatus: "descontado_folha",
      });
      toast.success("Baixa em folha registrada com sucesso!");
      setConfirmandoBaixa(null);
      await carregar();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao registrar baixa em folha.");
    } finally {
      setBaixando(false);
    }
  }

  // Filtragem local por texto (busca)
  const resumoFiltrado = useMemo(() => {
    if (!busca.trim()) return resumo;
    const term = busca.toLowerCase();
    return resumo.filter(
      (r) =>
        r.nome.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        (r.codigoReferencia && r.codigoReferencia.toLowerCase().includes(term)),
    );
  }, [resumo, busca]);

  const linhasFiltradas = useMemo(() => {
    if (!busca.trim()) return linhas;
    const term = busca.toLowerCase();
    return linhas.filter(
      (m) =>
        m.funcionarioNome.toLowerCase().includes(term) ||
        m.funcionarioEmail.toLowerCase().includes(term) ||
        (m.lojaNome && m.lojaNome.toLowerCase().includes(term)),
    );
  }, [linhas, busca]);

  // Movimentos do colaborador selecionado no modal
  const movimentosDoColaborador = useMemo(() => {
    if (!colaboradorDetalhes) return [];
    return linhas.filter(
      (m) => m.funcionarioEmail.toLowerCase() === colaboradorDetalhes.email.toLowerCase(),
    );
  }, [linhas, colaboradorDetalhes]);

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <PageHero
        title="Relatório DP & Fechamento de Folha"
        subtitle="Visão consolidada de vales, compras em lojas conveniadas e bonificações para fechamento de contracheque."
      />

      <div className="mx-auto max-w-7xl space-y-6 px-4 md:px-8">
        {/* Barra Superior de Navegação */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <Link to="/cci-pay">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Advance-CCI
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportarCsv("consolidado")}
              disabled={Boolean(exportando) || resumo.length === 0}
              className="gap-2 border-primary/30 text-primary hover:bg-primary/5 text-xs h-9"
            >
              {exportando === "consolidado" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              Exportar Folha (Consolidado)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportarCsv("detalhado")}
              disabled={Boolean(exportando) || linhas.length === 0}
              className="gap-2 text-xs h-9"
            >
              {exportando === "detalhado" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Exportar Lançamentos (Analítico)
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={carregar}
              disabled={carregando}
              className="gap-2 text-xs h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Cards de Resumo Executivo (KPIs) */}
        {totais && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total a Descontar em Folha */}
            <div className="relative overflow-hidden rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-background to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  Total a Descontar em Folha
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <CircleDollarSign className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                R$ {totais.totalDescontoFolha.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-rose-500/20 pt-2">
                <span>Pendente: <strong className="text-rose-600 dark:text-rose-400">R$ {totais.totalPendente.toFixed(2)}</strong></span>
                <span>Baixado: <strong className="text-emerald-600 dark:text-emerald-400">R$ {totais.totalDescontado.toFixed(2)}</strong></span>
              </div>
            </div>

            {/* Compras em Lojas Parceiras */}
            <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Compras em Lojas
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Store className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                R$ {totais.totalComprasLoja.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground border-t border-amber-500/20 pt-2">
                {totais.qtdComprasLoja} lançamento(s) em parceiros
              </p>
            </div>

            {/* Vales & Adiantamentos PIX */}
            <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-background to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                  Vales / Adiantamentos
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <Banknote className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                R$ {totais.totalAdiantamentos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground border-t border-blue-500/20 pt-2">
                {totais.qtdAdiantamentos} vale(s) depositado(s) via PIX
              </p>
            </div>

            {/* Bonificações Concedidas */}
            <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Saldo de Bonificação
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Gift className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                R$ {totais.totalBonificacoes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground border-t border-emerald-500/20 pt-2">
                Créditos corporativos disponíveis
              </p>
            </div>
          </div>
        )}

        {/* Filtros de Pesquisa */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-primary" />
            Filtros do Relatório
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Competência */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Competência
              </label>
              <Input
                type="month"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Tipo de Lançamento */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Tipo de Lançamento</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                {TIPO_OPCOES.map((o) => (
                  <option key={o.value || "todos-tipos"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Loja Parceira */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Loja Parceira</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={lojaId}
                onChange={(e) => setLojaId(e.target.value)}
              >
                <option value="">Todas as Lojas</option>
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Status da Folha</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPCOES.map((o) => (
                  <option key={o.value || "todos-status"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Busca Rápida */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Busca Rápida</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Nome, matrícula ou e-mail..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="h-9 pl-8 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Abas: Resumo por Colaborador vs Extrato Analítico */}
        <Tabs value={abaAtiva} onValueChange={(v) => setAbaAtiva(v as any)} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="colaboradores" className="gap-2 text-xs">
              <Users className="h-3.5 w-3.5" />
              Resumo por Colaborador ({resumoFiltrado.length})
            </TabsTrigger>
            <TabsTrigger value="movimentos" className="gap-2 text-xs">
              <Receipt className="h-3.5 w-3.5" />
              Lançamentos Analíticos ({linhasFiltradas.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Resumo Consolidado por Colaborador */}
          <TabsContent value="colaboradores" className="space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold text-xs">Colaborador</TableHead>
                      <TableHead className="font-semibold text-xs">Cód. Ref. / Matrícula</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Vales PIX</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Compras Lojas</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Deduções</TableHead>
                      <TableHead className="font-semibold text-xs text-right text-rose-600 dark:text-rose-400">
                        Total Desconto Folha
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-right">Saldo Bonif.</TableHead>
                      <TableHead className="font-semibold text-xs text-center">Status Folha</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumoFiltrado.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground text-xs">
                          {carregando ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Carregando resumo...
                            </span>
                          ) : (
                            "Nenhum colaborador encontrado com os filtros selecionados."
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      resumoFiltrado.map((r) => {
                        const totalDesconto = r.totalDescontoFolha || 0;
                        const pendente = r.totalPendenteFolha || 0;
                        const baixado = r.totalDescontadoFolha || 0;

                        return (
                          <TableRow key={r.email} className="hover:bg-muted/30">
                            <TableCell className="py-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground text-xs">{r.nome}</span>
                                <span className="text-[11px] text-muted-foreground">{r.email}</span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3">
                              {r.codigoReferencia ? (
                                <span className="font-mono text-xs bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                                  {r.codigoReferencia}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>

                            <TableCell className="py-3 text-right text-xs">
                              {r.totalAdiantamentos && r.totalAdiantamentos > 0 ? (
                                <span className="font-medium text-foreground">
                                  R$ {r.totalAdiantamentos.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>

                            <TableCell className="py-3 text-right text-xs">
                              {r.totalComprasLoja && r.totalComprasLoja > 0 ? (
                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                  R$ {r.totalComprasLoja.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>

                            <TableCell className="py-3 text-right text-xs">
                              {r.totalDeducoes && r.totalDeducoes > 0 ? (
                                <span className="font-medium text-foreground">
                                  R$ {r.totalDeducoes.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>

                            <TableCell className="py-3 text-right text-xs">
                              <span
                                className={`font-bold ${
                                  totalDesconto > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                                }`}
                              >
                                R$ {totalDesconto.toFixed(2)}
                              </span>
                            </TableCell>

                            <TableCell className="py-3 text-right text-xs">
                              {r.saldoBonificacao > 0 ? (
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                  R$ {r.saldoBonificacao.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>

                            <TableCell className="py-3 text-center">
                              {totalDesconto === 0 ? (
                                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                                  Sem débitos
                                </Badge>
                              ) : pendente === 0 ? (
                                <Badge variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                  Totalmente Baixado
                                </Badge>
                              ) : baixando && baixado > 0 ? (
                                <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 gap-1">
                                  <Clock className="h-3 w-3 text-amber-500" />
                                  Parcial (R$ {pendente.toFixed(2)} pend.)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 gap-1">
                                  <AlertCircle className="h-3 w-3 text-rose-500" />
                                  Pendente (R$ {pendente.toFixed(2)})
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setColaboradorDetalhes(r)}
                                  className="h-7 px-2 text-[11px] gap-1"
                                  title="Ver extrato individual deste colaborador"
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                  Extrato
                                </Button>

                                {pendente > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setConfirmandoBaixa({
                                        funcionarioEmail: r.email,
                                        funcionarioNome: r.nome,
                                        valor: pendente,
                                        tipoDescricao: `todos os lançamentos pendentes da competência ${competencia}`,
                                      })
                                    }
                                    className="h-7 px-2 text-[11px] gap-1 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Dar Baixa
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Lançamentos Analíticos */}
          <TabsContent value="movimentos" className="space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold text-xs">Data / Hora</TableHead>
                      <TableHead className="font-semibold text-xs">Colaborador</TableHead>
                      <TableHead className="font-semibold text-xs">Tipo</TableHead>
                      <TableHead className="font-semibold text-xs">Origem / Loja</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Valor</TableHead>
                      <TableHead className="font-semibold text-xs text-center">Status</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhasFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                          {carregando ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Carregando movimentos...
                            </span>
                          ) : (
                            "Nenhum lançamento encontrado para os filtros selecionados."
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      linhasFiltradas.map((m) => {
                        const dataFmt = m.createdAt
                          ? new Date(m.createdAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—";

                        const isDebitoFolha =
                          m.tipo === "compra_loja" || m.tipo === "adiantamento" || m.tipo === "deducao";

                        return (
                          <TableRow key={m.id} className="hover:bg-muted/30">
                            <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {dataFmt}
                            </TableCell>

                            <TableCell className="py-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground text-xs">{m.funcionarioNome}</span>
                                <span className="text-[11px] text-muted-foreground">{m.funcionarioEmail}</span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3">
                              {m.tipo === "compra_loja" ? (
                                <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-normal">
                                  <Store className="h-3 w-3 text-amber-500" /> Compra em Loja
                                </Badge>
                              ) : m.tipo === "adiantamento" ? (
                                <Badge variant="outline" className="gap-1 border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[11px] font-normal">
                                  <Banknote className="h-3 w-3 text-blue-500" /> Vale PIX
                                </Badge>
                              ) : m.tipo === "bonificacao" ? (
                                <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-normal">
                                  <Gift className="h-3 w-3 text-emerald-500" /> Bonificação
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 border-muted bg-muted/40 text-muted-foreground text-[11px] font-normal">
                                  <MinusCircle className="h-3 w-3" /> Dedução
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="py-3">
                              <div className="flex items-center gap-1.5 text-xs text-foreground">
                                {m.lojaNome ? (
                                  <>
                                    <Store className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="font-medium">{m.lojaNome}</span>
                                  </>
                                ) : m.tipo === "adiantamento" ? (
                                  <>
                                    <Banknote className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <span>Adiantamento PIX</span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-3 text-right">
                              <span
                                className={`text-xs font-semibold ${
                                  m.direcao === "credito"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-foreground"
                                }`}
                              >
                                {m.direcao === "credito" ? "+" : "-"} R$ {m.valor.toFixed(2)}
                              </span>
                            </TableCell>

                            <TableCell className="py-3 text-center">
                              {m.status === "descontado_folha" ? (
                                <Badge variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                  Descontado em Folha
                                </Badge>
                              ) : m.status === "pago" || m.status === "aprovado" ? (
                                <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 gap-1">
                                  <Clock className="h-3 w-3 text-amber-500" />
                                  Pendente de Desconto
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                                  {labelStatusMovimento(m.status, m.tipo)}
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="py-3 text-right">
                              {isDebitoFolha && m.status !== "descontado_folha" && m.status !== "cancelado" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setConfirmandoBaixa({
                                      movimentoId: m.id,
                                      funcionarioNome: m.funcionarioNome,
                                      funcionarioEmail: m.funcionarioEmail,
                                      valor: m.valor,
                                      tipoDescricao: `lançamento de ${m.tipo === "compra_loja" ? "compra na loja" : m.tipo} de R$ ${m.valor.toFixed(2)}`,
                                    })
                                  }
                                  className="h-7 px-2 text-[11px] gap-1 text-primary hover:bg-primary/5"
                                  title="Marcar este movimento individual como Descontado em Folha"
                                >
                                  <Check className="h-3 w-3" />
                                  Baixar
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* DIÁLOGO: Extrato Individual do Colaborador */}
      <Dialog open={Boolean(colaboradorDetalhes)} onOpenChange={(open) => !open && setColaboradorDetalhes(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="text-base flex items-center justify-between">
              <span>Extrato de Folha: {colaboradorDetalhes?.nome}</span>
              <span className="text-xs font-mono font-normal text-muted-foreground">
                Comp: {competencia}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {colaboradorDetalhes?.email} · Matrícula: {colaboradorDetalhes?.codigoReferencia || "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Totais do colaborador */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 border border-border/60 text-center">
              <div>
                <span className="text-[11px] text-muted-foreground block">Compras em Lojas</span>
                <strong className="text-sm text-foreground">
                  R$ {(colaboradorDetalhes?.totalComprasLoja || 0).toFixed(2)}
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Vales PIX</span>
                <strong className="text-sm text-foreground">
                  R$ {(colaboradorDetalhes?.totalAdiantamentos || 0).toFixed(2)}
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold block">
                  Total Desconto Folha
                </span>
                <strong className="text-sm text-rose-600 dark:text-rose-400">
                  R$ {(colaboradorDetalhes?.totalDescontoFolha || 0).toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Lista de Movimentos deste colaborador */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Lançamentos da Competência
              </h4>

              {movimentosDoColaborador.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhum lançamento individual registrado neste mês.
                </p>
              ) : (
                <div className="divide-y divide-border/60 rounded-lg border border-border">
                  {movimentosDoColaborador.map((mov) => (
                    <div key={mov.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {mov.lojaNome || (mov.tipo === "adiantamento" ? "Adiantamento Salarial" : mov.tipo)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {mov.createdAt ? new Date(mov.createdAt).toLocaleDateString("pt-BR") : ""}
                          </span>
                        </div>
                        {mov.metadata?.descricao && (
                          <p className="text-[11px] text-muted-foreground">{mov.metadata.descricao}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground">
                          R$ {mov.valor.toFixed(2)}
                        </span>
                        {mov.status === "descontado_folha" ? (
                          <Badge variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Baixado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20">
            <Button variant="outline" size="sm" onClick={() => setColaboradorDetalhes(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Confirmar Baixa em Folha */}
      <Dialog open={Boolean(confirmandoBaixa)} onOpenChange={(open) => !open && setConfirmandoBaixa(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Confirmar Baixa em Folha
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta ação marcará o(s) débito(s) como <strong>Descontado em Folha</strong> (fechado na folha de pagamento do colaborador).
            </DialogDescription>
          </DialogHeader>

          {confirmandoBaixa && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Colaborador:</span>
                  <span className="font-semibold text-foreground">{confirmandoBaixa.funcionarioNome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alvo da Baixa:</span>
                  <span className="text-foreground">{confirmandoBaixa.tipoDescricao}</span>
                </div>
                {confirmandoBaixa.valor != null && (
                  <div className="flex justify-between pt-1 border-t border-border/50">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">Valor a Baixar:</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-bold">
                      R$ {confirmandoBaixa.valor.toFixed(2)}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmandoBaixa(null)}
              disabled={baixando}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={executarBaixaFolha}
              disabled={baixando}
              className="gap-2"
            >
              {baixando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Confirmar Baixa em Folha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

