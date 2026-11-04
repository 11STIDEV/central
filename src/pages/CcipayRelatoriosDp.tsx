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
  ccipayExtratoColaboradorDp,
  labelStatusMovimento,
  type CcipayMovimento,
  type CcipayResumoFuncionarioDp,
  type CcipayLoja,
  type CcipayRelatorioDpTotais,
  type CcipayExtratoColaboradorDpTotais,
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
  CalendarDays,
  ChevronLeft,
  History,
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
  const { googleIdToken, usuario } = useAuth();
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
  const [extratoColaborador, setExtratoColaborador] = useState<{
    movimentos: CcipayMovimento[];
    totais: CcipayExtratoColaboradorDpTotais;
  } | null>(null);
  const [carregandoExtrato, setCarregandoExtrato] = useState(false);
  const [filtroExtratoModal, setFiltroExtratoModal] = useState<"todos" | "pendentes" | "baixados">("todos");
  const [confirmandoBaixa, setConfirmandoBaixa] = useState<{
    funcionarioEmail?: string;
    funcionarioNome?: string;
    movimentoId?: string;
    valor?: number;
    tipoDescricao?: string;
    novoStatus?: "descontado_folha" | "cancelado";
  } | null>(null);
  const [baixando, setBaixando] = useState(false);
  const [exportando, setExportando] = useState<"detalhado" | "consolidado" | null>(null);

  const carregar = useCallback(async () => {
    if (!usuario && !googleIdToken) return;
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
  }, [googleIdToken, competencia, status, tipo, lojaId, usuario]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function exportarCsv(modo: "detalhado" | "consolidado") {
    if (!usuario && !googleIdToken) return;
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
    if (!confirmandoBaixa || (!usuario && !googleIdToken)) return;
    setBaixando(true);
    try {
      const statusAlvo = confirmandoBaixa.novoStatus || "descontado_folha";
      await ccipayDarBaixaFolha(googleIdToken, {
        movimentoIds: confirmandoBaixa.movimentoId ? [confirmandoBaixa.movimentoId] : undefined,
        funcionarioEmail: confirmandoBaixa.funcionarioEmail,
        competencia,
        novoStatus: statusAlvo,
      });
      toast.success(
        statusAlvo === "cancelado"
          ? "Lançamento cancelado e estornado com sucesso!"
          : "Baixa em folha registrada com sucesso!",
      );
      setConfirmandoBaixa(null);
      await carregar();
      if (colaboradorDetalhes?.email) {
        const atualizado = await ccipayExtratoColaboradorDp(googleIdToken, colaboradorDetalhes.email);
        setExtratoColaborador(atualizado);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao registrar baixa em folha.");
    } finally {
      setBaixando(false);
    }
  }

  const rotuloPeriodo = useMemo(() => {
    if (competencia === "todas" || !competencia) {
      return "Todo o Histórico (Acumulado Geral)";
    }
    const [ano, mes] = competencia.split("-");
    if (!ano || !mes) return competencia;
    const d = new Date(Number(ano), Number(mes) - 1, 1);
    const nomeMes = d.toLocaleString("pt-BR", { month: "long" });
    return `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} de ${ano}`;
  }, [competencia]);

  const irMesAnterior = () => {
    let base = new Date();
    if (competencia && competencia !== "todas") {
      const [ano, mes] = competencia.split("-");
      if (ano && mes) {
        base = new Date(Number(ano), Number(mes) - 1, 1);
      }
    }
    base.setMonth(base.getMonth() - 1);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, "0");
    setCompetencia(`${y}-${m}`);
  };

  const irMesAtual = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    setCompetencia(`${y}-${m}`);
  };

  const irProximoMes = () => {
    let base = new Date();
    if (competencia && competencia !== "todas") {
      const [ano, mes] = competencia.split("-");
      if (ano && mes) {
        base = new Date(Number(ano), Number(mes) - 1, 1);
      }
    }
    base.setMonth(base.getMonth() + 1);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, "0");
    setCompetencia(`${y}-${m}`);
  };

  useEffect(() => {
    if (!colaboradorDetalhes?.email || (!usuario && !googleIdToken)) {
      setExtratoColaborador(null);
      return;
    }
    setCarregandoExtrato(true);
    setFiltroExtratoModal("todos");

    const emailColab = colaboradorDetalhes.email.toLowerCase();
    function usarFallbackLocal() {
      const movsLocais = linhas.filter(
        (m) => (m.funcionarioEmail || "").toLowerCase() === emailColab,
      );
      let totalCompras = 0;
      let qtdCompras = 0;
      let totalVales = 0;
      let qtdVales = 0;
      let totalDescontado = 0;
      let totalPendente = 0;

      for (const m of movsLocais) {
        const v = Number(m.valor) || 0;
        if (m.tipo === "compra_loja") {
          totalCompras += v;
          qtdCompras++;
        } else if (m.tipo === "adiantamento" || m.tipo === "vale") {
          totalVales += v;
          qtdVales++;
        }
        if (m.status === "descontado_folha") totalDescontado += v;
        else totalPendente += v;
      }

      setExtratoColaborador({
        movimentos: movsLocais,
        totais: {
          totalCompras: Number(totalCompras.toFixed(2)),
          qtdCompras,
          totalVales: Number(totalVales.toFixed(2)),
          qtdVales,
          totalDeducoes: 0,
          totalDescontado: Number(totalDescontado.toFixed(2)),
          totalPendente: Number(totalPendente.toFixed(2)),
          totalGeralDebitos: Number((totalCompras + totalVales).toFixed(2)),
          totalBonificacoes: 0,
        },
      });
    }

    ccipayExtratoColaboradorDp(googleIdToken, colaboradorDetalhes.email)
      .then((res) => {
        if (res?.ok && Array.isArray(res.movimentos)) {
          setExtratoColaborador(res);
        } else {
          usarFallbackLocal();
        }
      })
      .catch((err) => {
        console.warn("[extrato] Fallback para movimentos locais:", err?.message || err);
        usarFallbackLocal();
      })
      .finally(() => {
        setCarregandoExtrato(false);
      });
  }, [colaboradorDetalhes, googleIdToken, usuario, linhas]);

  const movimentosExtratoFiltrados = useMemo(() => {
    if (!extratoColaborador?.movimentos) return [];
    if (filtroExtratoModal === "pendentes") {
      return extratoColaborador.movimentos.filter(
        (m) => m.status !== "descontado_folha" && m.status !== "cancelado" && m.status !== "negado",
      );
    }
    if (filtroExtratoModal === "baixados") {
      return extratoColaborador.movimentos.filter((m) => m.status === "descontado_folha");
    }
    return extratoColaborador.movimentos;
  }, [extratoColaborador, filtroExtratoModal]);

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5 text-primary" />
              Filtros do Relatório
            </div>
            <Badge variant="outline" className="gap-1.5 text-xs font-medium border-primary/30 text-primary bg-primary/5">
              <CalendarDays className="h-3.5 w-3.5" />
              {rotuloPeriodo}
            </Badge>
          </div>

          {/* Atalhos Rápidos de Competência */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-b border-border/40 pb-2.5">
            <span className="text-[11px] text-muted-foreground font-medium mr-1">Atalhos:</span>
            <Button
              type="button"
              variant={competencia === "todas" ? "default" : "outline"}
              size="sm"
              onClick={() => setCompetencia("todas")}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <History className="h-3.5 w-3.5" />
              Todo o Histórico (Geral)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={irMesAnterior}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Mês Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={irMesAtual}
              className="h-7 px-2.5 text-xs"
            >
              Mês Atual
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={irProximoMes}
              className="h-7 px-2.5 text-xs gap-1"
            >
              Próximo Mês <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Competência */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Competência
                </span>
                {competencia === "todas" && (
                  <span className="text-[10px] text-primary font-semibold">Geral</span>
                )}
              </label>
              {competencia === "todas" ? (
                <div className="flex items-center gap-1.5 h-9">
                  <Badge variant="outline" className="h-full flex-1 justify-center border-primary/40 bg-primary/5 text-primary text-xs font-normal">
                    Todas as Competências
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={irMesAtual}
                    className="h-9 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    title="Filtrar por mês"
                  >
                    Mês
                  </Button>
                </div>
              ) : (
                <Input
                  type="month"
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                  className="h-9 text-xs"
                />
              )}
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
                      <TableHead className="font-semibold text-xs text-center">Competência</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Valor</TableHead>
                      <TableHead className="font-semibold text-xs text-center">Status</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhasFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-xs">
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

                            <TableCell className="py-3 text-center">
                              <Badge variant="outline" className="text-[10px] font-mono border-border">
                                {m.competencia ? `${m.competencia.slice(5, 7)}/${m.competencia.slice(0, 4)}` : "—"}
                              </Badge>
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

      {/* DIÁLOGO: Extrato Histórico Completo do Colaborador */}
      <Dialog open={Boolean(colaboradorDetalhes)} onOpenChange={(open) => !open && setColaboradorDetalhes(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-3 border-b bg-muted/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-base flex items-center gap-2">
                  <span>Extrato Geral: {colaboradorDetalhes?.nome}</span>
                  {colaboradorDetalhes?.ativo ? (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-[10px]">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-muted text-muted-foreground text-[10px]">
                      Inativo
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  {colaboradorDetalhes?.email} · Matrícula Alterdata: <strong>#{colaboradorDetalhes?.codigoReferencia || "—"}</strong>
                </DialogDescription>
              </div>

              <div className="text-right shrink-0">
                <Badge variant="secondary" className="text-xs font-mono">
                  {competencia === "todas" ? "Filtro: Todo o Histórico" : `Filtro atual: ${competencia}`}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {carregandoExtrato ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Carregando extrato histórico completo...</span>
              </div>
            ) : (
              <>
                {/* Cards de Totais Históricos do Colaborador */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center">
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium block">
                      Compras em Loja
                    </span>
                    <strong className="text-base text-foreground block mt-0.5">
                      R$ {(extratoColaborador?.totais?.totalCompras || 0).toFixed(2)}
                    </strong>
                    <span className="text-[10px] text-muted-foreground">
                      {extratoColaborador?.totais?.qtdCompras || 0} compra(s)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 text-center">
                    <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium block">
                      Vales PIX
                    </span>
                    <strong className="text-base text-foreground block mt-0.5">
                      R$ {(extratoColaborador?.totais?.totalVales || 0).toFixed(2)}
                    </strong>
                    <span className="text-[10px] text-muted-foreground">
                      {extratoColaborador?.totais?.qtdVales || 0} vale(s)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">
                      Já Baixado em Folha
                    </span>
                    <strong className="text-base text-emerald-700 dark:text-emerald-400 block mt-0.5">
                      R$ {(extratoColaborador?.totais?.totalDescontado || 0).toFixed(2)}
                    </strong>
                    <span className="text-[10px] text-muted-foreground">Descontado</span>
                  </div>

                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 text-center">
                    <span className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold block">
                      Pendente de Desconto
                    </span>
                    <strong className="text-base text-rose-600 dark:text-rose-400 block mt-0.5">
                      R$ {(extratoColaborador?.totais?.totalPendente || 0).toFixed(2)}
                    </strong>
                    <span className="text-[10px] text-rose-600/80">A descontar</span>
                  </div>
                </div>

                {/* Filtro rápido dentro do modal */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">Extrato Completo:</span>
                    <span className="text-xs text-muted-foreground">
                      ({movimentosExtratoFiltrados.length} lançamento(s))
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant={filtroExtratoModal === "todos" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltroExtratoModal("todos")}
                      className="h-6 px-2 text-[11px]"
                    >
                      Todos ({extratoColaborador?.movimentos?.length || 0})
                    </Button>
                    <Button
                      variant={filtroExtratoModal === "pendentes" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltroExtratoModal("pendentes")}
                      className="h-6 px-2 text-[11px]"
                    >
                      Pendentes ({extratoColaborador?.movimentos?.filter((m) => m.status !== "descontado_folha" && m.status !== "cancelado" && m.status !== "negado").length || 0})
                    </Button>
                    <Button
                      variant={filtroExtratoModal === "baixados" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltroExtratoModal("baixados")}
                      className="h-6 px-2 text-[11px]"
                    >
                      Baixados ({extratoColaborador?.movimentos?.filter((m) => m.status === "descontado_folha").length || 0})
                    </Button>
                  </div>
                </div>

                {/* Lista de Movimentos deste colaborador */}
                {movimentosExtratoFiltrados.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center border rounded-lg">
                    Nenhum lançamento encontrado para o filtro selecionado.
                  </p>
                ) : (
                  <div className="divide-y divide-border/60 rounded-lg border border-border overflow-hidden">
                    {movimentosExtratoFiltrados.map((mov) => {
                      const isPendente =
                        mov.status !== "descontado_folha" &&
                        mov.status !== "cancelado" &&
                        mov.status !== "negado";
                      const desc = mov.metadata?.descricao || mov.metadata?.pix || mov.metadata?.motivo || "";

                      return (
                        <div key={mov.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/30">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
                              {mov.tipo === "compra_loja" ? (
                                <Store className="h-4 w-4 text-amber-500" />
                              ) : mov.tipo === "adiantamento" ? (
                                <Banknote className="h-4 w-4 text-blue-500" />
                              ) : mov.tipo === "bonificacao" ? (
                                <Gift className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <MinusCircle className="h-4 w-4" />
                              )}
                            </span>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                  {mov.lojaNome || (mov.tipo === "adiantamento" ? "Adiantamento Salarial" : mov.tipo === "bonificacao" ? "Bonificação" : mov.tipo)}
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono border-border px-1.5 py-0">
                                  Comp: {mov.competencia ? `${mov.competencia.slice(5, 7)}/${mov.competencia.slice(0, 4)}` : "—"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                <span>
                                  {mov.createdAt
                                    ? new Date(mov.createdAt).toLocaleString("pt-BR", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "—"}
                                </span>
                                {desc && (
                                  <>
                                    <span>·</span>
                                    <span className="italic">{desc}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm text-foreground whitespace-nowrap">
                              R$ {mov.valor.toFixed(2)}
                            </span>

                            {mov.status === "descontado_folha" ? (
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  Baixado
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setConfirmandoBaixa({
                                      movimentoId: mov.id,
                                      funcionarioNome: colaboradorDetalhes?.nome,
                                      funcionarioEmail: colaboradorDetalhes?.email,
                                      valor: mov.valor,
                                      novoStatus: "cancelado",
                                      tipoDescricao: `${mov.lojaNome || mov.tipo} (R$ ${mov.valor.toFixed(2)}) de ${mov.competencia || ""}`,
                                    })
                                  }
                                  className="h-6 px-1.5 text-[10px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-0.5"
                                  title="Estornar / Cancelar este lançamento"
                                >
                                  <XCircle className="h-3 w-3" /> Estornar
                                </Button>
                              </div>
                            ) : mov.status === "cancelado" ? (
                              <Badge variant="outline" className="text-[10px] border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                Cancelado
                              </Badge>
                            ) : isPendente ? (
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                  Pendente
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setConfirmandoBaixa({
                                      movimentoId: mov.id,
                                      funcionarioNome: colaboradorDetalhes?.nome,
                                      funcionarioEmail: colaboradorDetalhes?.email,
                                      valor: mov.valor,
                                      novoStatus: "descontado_folha",
                                      tipoDescricao: `${mov.lojaNome || mov.tipo} (R$ ${mov.valor.toFixed(2)}) de ${mov.competencia || ""}`,
                                    })
                                  }
                                  className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/10 gap-0.5"
                                  title="Dar baixa somente neste lançamento"
                                >
                                  <Check className="h-3 w-3" /> Baixar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setConfirmandoBaixa({
                                      movimentoId: mov.id,
                                      funcionarioNome: colaboradorDetalhes?.nome,
                                      funcionarioEmail: colaboradorDetalhes?.email,
                                      valor: mov.valor,
                                      novoStatus: "cancelado",
                                      tipoDescricao: `${mov.lojaNome || mov.tipo} (R$ ${mov.valor.toFixed(2)}) de ${mov.competencia || ""}`,
                                    })
                                  }
                                  className="h-6 px-1.5 text-[10px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-0.5"
                                  title="Estornar / Cancelar este lançamento"
                                >
                                  <XCircle className="h-3 w-3" /> Estornar
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                {labelStatusMovimento(mov.status, mov.tipo)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between">
            <div>
              {extratoColaborador?.totais && extratoColaborador.totais.totalPendente > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    setConfirmandoBaixa({
                      funcionarioEmail: colaboradorDetalhes?.email,
                      funcionarioNome: colaboradorDetalhes?.nome,
                      valor: extratoColaborador.totais.totalPendente,
                      tipoDescricao: `todos os lançamentos pendentes de todas as competências (Total R$ ${extratoColaborador.totais.totalPendente.toFixed(2)})`,
                    })
                  }
                  className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Check className="h-3.5 w-3.5" />
                  Dar Baixa em Todos os Pendentes (R$ {extratoColaborador.totais.totalPendente.toFixed(2)})
                </Button>
              )}
            </div>

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
              {confirmandoBaixa?.novoStatus === "cancelado" ? (
                <>
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span className="text-rose-600 dark:text-rose-400">Confirmar Cancelamento / Estorno</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Confirmar Baixa em Folha
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {confirmandoBaixa?.novoStatus === "cancelado"
                ? "Esta ação cancelará o lançamento, estornando o valor da folha de pagamento e liberando o saldo do colaborador."
                : "Esta ação marcará o(s) débito(s) como Descontado em Folha (fechado na folha de pagamento do colaborador)."}
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
              variant={confirmandoBaixa?.novoStatus === "cancelado" ? "destructive" : "default"}
              size="sm"
              onClick={executarBaixaFolha}
              disabled={baixando}
              className="gap-2"
            >
              {baixando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : confirmandoBaixa?.novoStatus === "cancelado" ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {confirmandoBaixa?.novoStatus === "cancelado" ? "Confirmar Estorno" : "Confirmar Baixa em Folha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

