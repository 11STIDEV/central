import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayListarLojas,
  ccipayRelatorioLoja,
  ccipayRegistrarRepasseLoja,
  ccipayExcluirRepasseLoja,
  labelFormaRepasse,
  type CcipayLoja,
  type CcipayPedido,
  type CcipayVendaQr,
  type CcipayRepasseLoja,
  type CcipayRelatorioLojaTotais,
} from "@/lib/ccipay";
import {
  ArrowLeft,
  Loader2,
  QrCode,
  ShoppingBag,
  DollarSign,
  RefreshCw,
  CheckCircle2,
  Clock,
  Store,
  Calendar,
  Filter,
  Send,
  Trash2,
  AlertCircle,
  TrendingUp,
  Receipt,
  FileCheck,
} from "lucide-react";

function getUltimosMeses(qtd = 12) {
  const lista: { valor: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < qtd; i++) {
    const data = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const y = data.getFullYear();
    const m = String(data.getMonth() + 1).padStart(2, "0");
    const valor = `${y}-${m}`;
    const nomeMes = data.toLocaleString("pt-BR", { month: "long" });
    const label = `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} de ${y}`;
    lista.push({ valor, label });
  }
  return lista;
}

export default function CcipayRelatoriosLoja() {
  const { googleIdToken, user } = useAuth();
  const [lojaId, setLojaId] = useState("");
  const [lojas, setLojas] = useState<CcipayLoja[]>([]);

  // Filtros
  const [competencia, setCompetencia] = useState<string>("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  // Dados
  const [totais, setTotais] = useState<CcipayRelatorioLojaTotais | null>(null);
  const [pedidos, setPedidos] = useState<CcipayPedido[]>([]);
  const [vendasQr, setVendasQr] = useState<CcipayVendaQr[]>([]);
  const [repasses, setRepasses] = useState<CcipayRepasseLoja[]>([]);

  // Estados de carregamento
  const [carregando, setCarregando] = useState(false);
  const [carregandoLojas, setCarregandoLojas] = useState(true);

  // Modal de Repasse
  const [modalRepasseAberto, setModalRepasseAberto] = useState(false);
  const [repasseValor, setRepasseValor] = useState("");
  const [repasseData, setRepasseData] = useState(() => new Date().toISOString().slice(0, 10));
  const [repasseForma, setRepasseForma] = useState("pix");
  const [repasseComp, setRepasseComp] = useState("");
  const [repasseComprovante, setRepasseComprovante] = useState("");
  const [repasseObs, setRepasseObs] = useState("");
  const [salvandoRepasse, setSalvandoRepasse] = useState(false);
  const [erroRepasse, setErroRepasse] = useState<string | null>(null);

  // Vendas vinculadas ao repasse
  const [vendasSelecionadasIds, setVendasSelecionadasIds] = useState<string[]>([]);
  const [pedidosSelecionadosIds, setPedidosSelecionadosIds] = useState<string[]>([]);

  // Sub-filtro de status de repasse na listagem de vendas
  const [filtroStatusRepasse, setFiltroStatusRepasse] = useState<"todos" | "pendentes" | "repassados">("todos");

  const mesesDisponiveis = getUltimosMeses(12);

  const carregarRelatorio = useCallback(
    async (opcoes?: {
      idDaLoja?: string;
      comp?: string;
      de?: string;
      ate?: string;
      st?: string;
    }) => {
      const id = opcoes?.idDaLoja ?? lojaId;
      if (!googleIdToken || !id) return;
      setCarregando(true);
      try {
        const compFinal = opcoes?.comp !== undefined ? opcoes.comp : competencia;
        const deFinal = opcoes?.de !== undefined ? opcoes.de : dataInicio;
        const ateFinal = opcoes?.ate !== undefined ? opcoes.ate : dataFim;
        const stFinal = opcoes?.st !== undefined ? opcoes.st : filtroStatus;

        const { totais: t, pedidos: p, vendasQr: v, repasses: r } = await ccipayRelatorioLoja(
          googleIdToken,
          {
            lojaId: id,
            competencia: compFinal || undefined,
            de: deFinal ? `${deFinal}T00:00:00.000Z` : undefined,
            ate: ateFinal ? `${ateFinal}T23:59:59.999Z` : undefined,
            status: stFinal !== "todos" ? stFinal : undefined,
          },
        );
        setTotais(t);
        setPedidos(p || []);
        setVendasQr(v || []);
        setRepasses(r || []);
      } catch (e) {
        console.error("Erro ao carregar relatório da loja:", e);
      } finally {
        setCarregando(false);
      }
    },
    [googleIdToken, lojaId, competencia, dataInicio, dataFim, filtroStatus],
  );

  // 1. Carrega lista de lojas vinculadas (apenas quando o token mudar/iniciar)
  useEffect(() => {
    if (!googleIdToken) return;
    let active = true;
    setCarregandoLojas(true);

    ccipayListarLojas(googleIdToken)
      .then(({ lojas: l }) => {
        if (!active) return;
        setLojas(l);
        setCarregandoLojas(false);
        if (l.length > 0) {
          setLojaId((prev) => {
            if (prev && l.some((item) => item.id === prev)) {
              return prev;
            }
            return l[0].id;
          });
        }
      })
      .catch((e) => {
        console.error("Erro ao listar lojas:", e);
        if (active) setCarregandoLojas(false);
      });

    return () => {
      active = false;
    };
  }, [googleIdToken]);

  // 2. Carrega relatório ao selecionar ou trocar de loja
  useEffect(() => {
    if (!googleIdToken || !lojaId) return;
    void carregarRelatorio({ idDaLoja: lojaId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleIdToken, lojaId]);

  const handleLojaChange = (novoId: string) => {
    setLojaId(novoId);
  };

  const aplicarCompetencia = (comp: string) => {
    setCompetencia(comp);
    setDataInicio("");
    setDataFim("");
    void carregarRelatorio({ comp, de: "", ate: "" });
  };

  const aplicarAtalhoEsteMes = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const c = `${y}-${m}`;
    aplicarCompetencia(c);
  };

  const aplicarAtalhoMesAnterior = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const c = `${y}-${m}`;
    aplicarCompetencia(c);
  };

  const aplicarAtalhoUltimos30Dias = () => {
    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);

    const de = trintaDiasAtras.toISOString().slice(0, 10);
    const ate = hoje.toISOString().slice(0, 10);

    setCompetencia("");
    setDataInicio(de);
    setDataFim(ate);
    void carregarRelatorio({ comp: "", de, ate });
  };

  const limparFiltros = () => {
    setCompetencia("");
    setDataInicio("");
    setDataFim("");
    setFiltroStatus("todos");
    void carregarRelatorio({ comp: "", de: "", ate: "", st: "todos" });
  };

  // Listas de vendas pendentes de repasse
  const vendasQrPendentes = useMemo(() => {
    return vendasQr.filter((v) => v.status === "pago" && !v.repasseId);
  }, [vendasQr]);

  const pedidosPendentes = useMemo(() => {
    return pedidos.filter((p) => !p.repasseId && p.status !== "cancelado");
  }, [pedidos]);

  const vendasQrFiltradas = useMemo(() => {
    if (filtroStatusRepasse === "pendentes") {
      return vendasQr.filter((v) => v.status === "pago" && !v.repasseId);
    }
    if (filtroStatusRepasse === "repassados") {
      return vendasQr.filter((v) => v.status === "pago" && Boolean(v.repasseId));
    }
    return vendasQr;
  }, [vendasQr, filtroStatusRepasse]);

  const recalcularValorPorSelecao = (vIds: string[], pIds: string[]) => {
    const somaV = vendasQr
      .filter((v) => vIds.includes(v.id))
      .reduce((acc, v) => acc + (Number(v.valor) || 0), 0);
    const somaP = pedidos
      .filter((p) => pIds.includes(p.id))
      .reduce((acc, p) => acc + (Number(p.valorTotal) || 0), 0);
    const total = somaV + somaP;
    if (total > 0) {
      setRepasseValor(total.toFixed(2));
    }
  };

  const toggleVendaSelecionada = (id: string) => {
    setVendasSelecionadasIds((prev) => {
      const novo = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      recalcularValorPorSelecao(novo, pedidosSelecionadosIds);
      return novo;
    });
  };

  const togglePedidoSelecionado = (id: string) => {
    setPedidosSelecionadosIds((prev) => {
      const novo = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      recalcularValorPorSelecao(vendasSelecionadasIds, novo);
      return novo;
    });
  };

  const marcarTodasPendentes = () => {
    const vIds = vendasQrPendentes.map((v) => v.id);
    const pIds = pedidosPendentes.map((p) => p.id);
    setVendasSelecionadasIds(vIds);
    setPedidosSelecionadosIds(pIds);
    recalcularValorPorSelecao(vIds, pIds);
  };

  const desmarcarTodas = () => {
    setVendasSelecionadasIds([]);
    setPedidosSelecionadosIds([]);
  };

  const abrirModalRepasse = (preSelecionarVendaId?: string) => {
    setErroRepasse(null);
    let selVendas: string[] = [];
    let selPeds: string[] = [];
    let somaTotal = 0;

    if (preSelecionarVendaId) {
      selVendas = [preSelecionarVendaId];
      const venda = vendasQr.find((v) => v.id === preSelecionarVendaId);
      somaTotal = Number(venda?.valor) || 0;
    } else {
      selVendas = vendasQrPendentes.map((v) => v.id);
      selPeds = pedidosPendentes.map((p) => p.id);
      const somaV = vendasQrPendentes.reduce((acc, v) => acc + (Number(v.valor) || 0), 0);
      const somaP = pedidosPendentes.reduce((acc, p) => acc + (Number(p.valorTotal) || 0), 0);
      somaTotal = somaV + somaP;
    }

    setVendasSelecionadasIds(selVendas);
    setPedidosSelecionadosIds(selPeds);

    const saldo = somaTotal > 0 ? somaTotal : (totais?.saldoDevendo ?? 0);
    setRepasseValor(saldo > 0 ? saldo.toFixed(2) : "");
    setRepasseData(new Date().toISOString().slice(0, 10));
    setRepasseForma(lojaAtual?.formaRepasse || "pix");
    setRepasseComp(competencia || new Date().toISOString().slice(0, 7));
    setRepasseComprovante("");
    setRepasseObs(lojaAtual?.dadosRepasse ? `Dados: ${lojaAtual.dadosRepasse}` : "");
    setModalRepasseAberto(true);
  };

  const salvarRepasse = async () => {
    if (!googleIdToken || !lojaId) return;
    const v = Number(repasseValor.replace(",", "."));
    if (Number.isNaN(v) || v <= 0) {
      setErroRepasse("Informe um valor de repasse válido e positivo.");
      return;
    }

    setSalvandoRepasse(true);
    setErroRepasse(null);
    try {
      await ccipayRegistrarRepasseLoja(googleIdToken, {
        lojaId,
        valor: v,
        competencia: repasseComp || undefined,
        dataPagamento: repasseData,
        formaPagamento: repasseForma,
        comprovante: repasseComprovante.trim(),
        observacao: repasseObs.trim(),
        vendaIds: vendasSelecionadasIds,
        pedidoIds: pedidosSelecionadosIds,
      });
      setModalRepasseAberto(false);
      await carregarRelatorio();
    } catch (e) {
      setErroRepasse(e instanceof Error ? e.message : "Erro ao salvar repasse.");
    } finally {
      setSalvandoRepasse(false);
    }
  };

  const excluirRepasse = async (id: string) => {
    if (!googleIdToken || !confirm("Deseja realmente estornar/excluir este registro de repasse?")) return;
    try {
      await ccipayExcluirRepasseLoja(googleIdToken, id);
      await carregarRelatorio();
    } catch (e) {
      console.error("Erro ao excluir repasse:", e);
    }
  };

  const lojaAtual = lojas.find((l) => l.id === lojaId);
  const temFiltroAtivo = Boolean(competencia || dataInicio || dataFim || filtroStatus !== "todos");

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Relatório Loja & Conciliação"
        subtitle="Vendas efetuadas, repasses realizados e saldo a pagar à loja conveniada."
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/cci-pay">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Advance-CCI
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void carregarRelatorio()}
              disabled={carregando || !lojaId}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
              Atualizar
            </Button>

            <Button
              size="sm"
              onClick={abrirModalRepasse}
              disabled={carregando || !lojaId}
              className="gap-2 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
              Registrar Repasse
            </Button>
          </div>
        </div>

        {/* Seletor de Loja */}
        {carregandoLojas ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Carregando lojas vinculadas...
          </div>
        ) : lojas.length > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Store className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                value={lojaId}
                onChange={(e) => handleLojaChange(e.target.value)}
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>
            {lojaAtual?.formaRepasse && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border/50 px-3 py-1.5 rounded-lg">
                <span className="font-medium text-foreground">Repasse cadastrado:</span>
                <Badge variant="outline" className="font-semibold text-xs border-primary/30 text-primary">
                  {labelFormaRepasse(lojaAtual.formaRepasse)}
                </Badge>
                {lojaAtual.dadosRepasse && (
                  <span className="font-mono text-[11px] max-w-[200px] truncate" title={lojaAtual.dadosRepasse}>
                    ({lojaAtual.dadosRepasse})
                  </span>
                )}
              </div>
            )}
          </div>
        ) : lojaAtual ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              Loja: {lojaAtual.nome}
            </div>
            {lojaAtual.formaRepasse && (
              <div className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <span>Repasse:</span>
                <Badge variant="outline" className="font-medium text-xs border-primary/30 text-primary">
                  {labelFormaRepasse(lojaAtual.formaRepasse)}
                </Badge>
                {lojaAtual.dadosRepasse && (
                  <span className="font-mono text-[11px]">({lojaAtual.dadosRepasse})</span>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Painel de Filtros Avançados */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="h-4 w-4 text-primary" />
              Filtros de Período e Status
            </div>

            {temFiltroAtivo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={limparFiltros}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* Filtro por Mês/Competência */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Mês / Competência
              </Label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                value={competencia}
                onChange={(e) => aplicarCompetencia(e.target.value)}
              >
                <option value="">Todo o histórico (sem filtro de mês)</option>
                {mesesDisponiveis.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Intervalo de Datas Personalizado */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">De (Data inicial)</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setCompetencia("");
                  void carregarRelatorio({ comp: "", de: e.target.value });
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Até (Data final)</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value);
                  setCompetencia("");
                  void carregarRelatorio({ comp: "", ate: e.target.value });
                }}
              />
            </div>
          </div>

          {/* Atalhos Rápidos de Período */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-xs">
            <span className="text-muted-foreground font-medium">Atalhos:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={aplicarAtalhoEsteMes}
              className="h-7 px-2.5 text-xs"
            >
              Este Mês
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={aplicarAtalhoMesAnterior}
              className="h-7 px-2.5 text-xs"
            >
              Mês Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={aplicarAtalhoUltimos30Dias}
              className="h-7 px-2.5 text-xs"
            >
              Últimos 30 Dias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={limparFiltros}
              className="h-7 px-2.5 text-xs"
            >
              Todo o Histórico
            </Button>
          </div>
        </div>

        {/* Indicador de Carregamento */}
        {carregando && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Atualizando valores e conciliação financeira...</span>
          </div>
        )}

        {/* Cards de Conciliação Financeira Instituição x Parceiro */}
        {totais && (
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Card 1: Total Faturado/Vendas */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Vendas do Parceiro
                </span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                R$ {totais.valorTotal.toFixed(2)}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{totais.vendasQrPagas ?? 0} QR code(s)</span>
                <span>·</span>
                <span>{totais.pedidos} pedido(s)</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground/90">
                Valor retido em folha pela instituição.
              </p>
            </div>

            {/* Card 2: Total Já Repassado */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Total Já Repassado
                </span>
                <FileCheck className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                R$ {(totais.totalRepassado ?? 0).toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {repasses.length} repasse(s) efetuado(s)
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground/90">
                Valores transferidos pela instituição.
              </p>
            </div>

            {/* Card 3: Saldo Devendo ao Parceiro */}
            <div className={`rounded-xl border p-5 shadow-xs transition-colors ${
              (totais.saldoDevendo ?? 0) > 0
                ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10"
                : "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
            }`}>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Devendo ao Parceiro
                </span>
                <DollarSign className={`h-4 w-4 ${
                  (totais.saldoDevendo ?? 0) > 0 ? "text-amber-500" : "text-emerald-500"
                }`} />
              </div>
              <p className={`mt-2 text-2xl font-extrabold ${
                (totais.saldoDevendo ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              }`}>
                R$ {(totais.saldoDevendo ?? 0).toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(totais.saldoDevendo ?? 0) > 0 ? (
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    Aguardando repasse ao parceiro
                  </span>
                ) : (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Contas 100% quitadas com o parceiro
                  </span>
                )}
              </p>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-7"
                  onClick={abrirModalRepasse}
                >
                  Registrar Pagamento
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Abas com Dados Detalhados */}
        <Tabs defaultValue="vendas-qr" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vendas-qr" className="gap-2">
              <QrCode className="h-4 w-4" />
              Vendas QR ({vendasQr.length})
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              Pedidos ({pedidos.length})
            </TabsTrigger>
            <TabsTrigger value="repasses" className="gap-2">
              <Receipt className="h-4 w-4" />
              Repasses ({repasses.length})
            </TabsTrigger>
          </TabsList>

          {/* Aba: Vendas QR Code */}
          <TabsContent value="vendas-qr" className="space-y-3">
            {/* Sub-filtros de Repasse */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground font-medium">Filtrar por repasse:</span>
                <button
                  type="button"
                  onClick={() => setFiltroStatusRepasse("todas")}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    filtroStatusRepasse === "todas"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Todas ({vendasQr.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusRepasse("pendentes")}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    filtroStatusRepasse === "pendentes"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                  }`}
                >
                  Aguardando Repasse ({vendasQrPendentes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusRepasse("repassados")}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    filtroStatusRepasse === "repassados"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                  }`}
                >
                  Já Repassadas ({vendasQr.filter((v) => v.status === "pago" && Boolean(v.repasseId)).length})
                </button>
              </div>

              {vendasQrPendentes.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abrirModalRepasse()}
                  className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Send className="h-3 w-3" /> Repassar Todas Pendentes
                </Button>
              )}
            </div>

            {vendasQrFiltradas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhuma venda encontrada para o filtro selecionado.
              </div>
            ) : (
              vendasQrFiltradas.map((v) => {
                const isPago = v.status === "pago";
                const isPendente = v.status === "pendente";
                const dataFormatada = v.createdAt
                  ? new Date(v.createdAt).toLocaleString("pt-BR")
                  : "";

                return (
                  <div
                    key={v.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {v.funcionarioNome || v.funcionarioEmail || "Pagamento QR"}
                        </p>
                        <Badge
                          variant={isPago ? "default" : isPendente ? "secondary" : "destructive"}
                          className="gap-1 text-xs"
                        >
                          {isPago ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Pago pelo Colaborador
                            </>
                          ) : isPendente ? (
                            <>
                              <Clock className="h-3 w-3" /> Aguardando QR
                            </>
                          ) : (
                            v.status
                          )}
                        </Badge>

                        {/* Status de Repasse à Loja */}
                        {isPago && (
                          v.repasseId ? (
                            <Badge variant="outline" className="gap-1 border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-medium">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              Repassado à Loja {v.repassadoEm ? `(${new Date(v.repassadoEm).toLocaleDateString("pt-BR")})` : ""}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-medium">
                              <Clock className="h-3 w-3 text-amber-500" />
                              Aguardando Repasse
                            </Badge>
                          )
                        )}
                      </div>

                      {v.funcionarioEmail && (
                        <p className="text-xs text-muted-foreground">{v.funcionarioEmail}</p>
                      )}

                      {v.descricao ? (
                        <p className="text-xs text-muted-foreground">
                          {v.descricao}
                        </p>
                      ) : null}

                      {dataFormatada && (
                        <p className="text-[11px] text-muted-foreground/80">
                          {dataFormatada}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                      <p className="text-lg font-bold text-foreground">
                        R$ {Number(v.valor).toFixed(2)}
                      </p>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Token: {v.token?.slice(0, 8)}...
                      </span>

                      {isPago && !v.repasseId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirModalRepasse(v.id)}
                          className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5 mt-1"
                          title="Fazer repasse desta venda à loja conveniada"
                        >
                          <Send className="h-3 w-3" /> Repassar Venda
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Aba: Pedidos de Catálogo */}
          <TabsContent value="pedidos" className="space-y-3">
            {pedidos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhum pedido de catálogo registrado no período selecionado.
              </div>
            ) : (
              pedidos.map((p) => {
                const dataFormatada = p.createdAt
                  ? new Date(p.createdAt).toLocaleString("pt-BR")
                  : "";

                return (
                  <div
                    key={p.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 text-sm sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {p.funcionarioNome}
                        </p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.funcionarioEmail}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.itens?.length || 0} item(ns)
                      </p>
                      {p.observacao && (
                        <p className="text-xs text-muted-foreground italic">
                          "{p.observacao}"
                        </p>
                      )}
                      {dataFormatada && (
                        <p className="text-[11px] text-muted-foreground/80">
                          {dataFormatada}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        R$ {p.valorTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Aba: Repasses Realizados */}
          <TabsContent value="repasses" className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <p className="text-xs text-muted-foreground">
                Histórico de transferências e pagamentos efetuados pela instituição a esta loja.
              </p>
              <Button size="sm" variant="outline" onClick={abrirModalRepasse} className="gap-1 text-xs">
                <Send className="h-3 w-3" /> Novo Repasse
              </Button>
            </div>

            {repasses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhum repasse registrado para esta loja ainda.
              </div>
            ) : (
              repasses.map((r) => {
                const dataFormatada = r.dataPagamento
                  ? new Date(r.dataPagamento).toLocaleDateString("pt-BR")
                  : "";

                return (
                  <div
                    key={r.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 text-sm sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-700">
                          Pago ao Parceiro
                        </Badge>
                        <span className="font-semibold text-foreground">
                          R$ {r.valor.toFixed(2)}
                        </span>
                        <span className="text-xs uppercase font-mono text-muted-foreground">
                          ({r.formaPagamento})
                        </span>
                      </div>

                      {dataFormatada && (
                        <p className="text-xs text-muted-foreground">
                          Data do pagamento: <strong>{dataFormatada}</strong>
                          {r.competencia ? ` · Competência: ${r.competencia}` : ""}
                        </p>
                      )}

                      {r.comprovante ? (
                        <p className="text-xs text-muted-foreground">
                          Comprovante / ID: <code className="bg-muted px-1 py-0.5 rounded">{r.comprovante}</code>
                        </p>
                      ) : null}

                      {r.observacao ? (
                        <p className="text-xs text-muted-foreground italic">
                          "{r.observacao}"
                        </p>
                      ) : null}

                      {r.criadoPor ? (
                        <p className="text-[11px] text-muted-foreground/75">
                          Registrado por: {r.criadoPor}
                        </p>
                      ) : null}

                      {/* Vendas Quitadas por Este Repasse */}
                      {((r.vendaIds && r.vendaIds.length > 0) || (r.pedidoIds && r.pedidoIds.length > 0)) && (
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Vendas quitadas neste repasse ({(r.vendaIds?.length || 0) + (r.pedidoIds?.length || 0)}):
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {r.vendaIds?.map((vId) => {
                              const venda = vendasQr.find((x) => x.id === vId);
                              return (
                                <span
                                  key={vId}
                                  className="inline-flex items-center gap-1 text-[11px] font-mono bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded"
                                  title={venda ? `${venda.funcionarioNome || venda.funcionarioEmail}: R$ ${Number(venda.valor).toFixed(2)}` : vId}
                                >
                                  {venda ? `${venda.funcionarioNome?.split(" ")[0] || "Venda"} — R$ ${Number(venda.valor).toFixed(2)}` : `#${vId.slice(0, 8)}`}
                                </span>
                              );
                            })}
                            {r.pedidoIds?.map((pId) => {
                              const ped = pedidos.find((x) => x.id === pId);
                              return (
                                <span
                                  key={pId}
                                  className="inline-flex items-center gap-1 text-[11px] font-mono bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded"
                                  title={ped ? `${ped.funcionarioNome}: R$ ${Number(ped.valorTotal).toFixed(2)}` : pId}
                                >
                                  Pedido: {ped ? `${ped.funcionarioNome?.split(" ")[0]} — R$ ${Number(ped.valorTotal).toFixed(2)}` : `#${pId.slice(0, 8)}`}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 sm:self-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void excluirRepasse(r.id)}
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Estornar / Excluir Repasse"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sm:hidden">Estornar</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal para Registrar Repasse ao Parceiro */}
      <Dialog open={modalRepasseAberto} onOpenChange={setModalRepasseAberto}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Registrar Repasse ao Parceiro
            </DialogTitle>
            <DialogDescription>
              Lance o pagamento transferido para a loja <strong>{lojaAtual?.nome}</strong> e vincule as vendas que estão sendo quitadas.
            </DialogDescription>
          </DialogHeader>

          {erroRepasse && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{erroRepasse}</span>
            </div>
          )}

          <div className="space-y-4 py-2 text-sm">
            {/* Seletor de Vendas a Repassar */}
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                <div>
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Vendas a Quitar Neste Repasse
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Marque as vendas que estão sendo repassadas para registrar o vínculo financeiro.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={marcarTodasPendentes}
                    className="h-6 text-[11px] px-2 text-primary hover:text-primary"
                  >
                    Marcar Todas
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={desmarcarTodas}
                    className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                  >
                    Desmarcar
                  </Button>
                </div>
              </div>

              {vendasQrPendentes.length === 0 && pedidosPendentes.length === 0 ? (
                <div className="text-center py-3 text-xs text-muted-foreground bg-muted/40 rounded-lg border border-border/50">
                  Nenhuma venda pendente encontrada no filtro atual. Você ainda pode registrar um repasse avulso informando o valor abaixo.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {vendasQrPendentes.map((v) => {
                    const selecionada = vendasSelecionadasIds.includes(v.id);
                    return (
                      <label
                        key={v.id}
                        className={`flex items-center justify-between gap-3 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          selecionada
                            ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                            : "border-border/60 bg-card hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={selecionada}
                            onChange={() => toggleVendaSelecionada(v.id)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {v.funcionarioNome || v.funcionarioEmail || "Venda QR"}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {v.createdAt ? new Date(v.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                              {v.descricao ? ` · ${v.descricao}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-foreground">
                            R$ {Number(v.valor).toFixed(2)}
                          </span>
                        </div>
                      </label>
                    );
                  })}

                  {pedidosPendentes.map((p) => {
                    const selecionado = pedidosSelecionadosIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between gap-3 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          selecionado
                            ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                            : "border-border/60 bg-card hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={selecionado}
                            onChange={() => togglePedidoSelecionado(p.id)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              Pedido · {p.funcionarioNome}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : ""}
                              {` · ${p.itens?.length || 0} item(ns)`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-foreground">
                            R$ {Number(p.valorTotal).toFixed(2)}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {(vendasSelecionadasIds.length > 0 || pedidosSelecionadosIds.length > 0) && (
                <div className="flex items-center justify-between pt-1 text-xs text-primary font-medium border-t border-border/50">
                  <span>
                    {vendasSelecionadasIds.length + pedidosSelecionadosIds.length} venda(s) selecionada(s)
                  </span>
                  <span>
                    Soma das vendas: R$ {repasseValor}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="repasse-valor">Valor Total do Repasse (R$) *</Label>
                {totais && (totais.saldoDevendo ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setRepasseValor((totais.saldoDevendo ?? 0).toFixed(2))}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Usar dívida geral (R$ {(totais.saldoDevendo ?? 0).toFixed(2)})
                  </button>
                )}
              </div>
              <Input
                id="repasse-valor"
                type="number"
                step="0.01"
                placeholder="Ex: 150.00"
                value={repasseValor}
                onChange={(e) => setRepasseValor(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="repasse-data">Data do Pagamento *</Label>
                <Input
                  id="repasse-data"
                  type="date"
                  value={repasseData}
                  onChange={(e) => setRepasseData(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="repasse-forma">Forma de Pagamento</Label>
                <select
                  id="repasse-forma"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={repasseForma}
                  onChange={(e) => setRepasseForma(e.target.value)}
                >
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cheque">Cheque</option>
                  <option value="ted">TED / Transferência</option>
                  <option value="boleto">Boleto</option>
                  <option value="outro">Outro</option>
                </select>
                {lojaAtual?.formaRepasse && (
                  <p className="text-[11px] text-muted-foreground">
                    Forma preferencial cadastrada da loja:{" "}
                    <strong className="text-foreground">{labelFormaRepasse(lojaAtual.formaRepasse)}</strong>
                    {lojaAtual.dadosRepasse ? ` (${lojaAtual.dadosRepasse})` : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="repasse-comp">Competência de Referência (opcional)</Label>
              <Input
                id="repasse-comp"
                placeholder="Ex: 2026-10"
                value={repasseComp}
                onChange={(e) => setRepasseComp(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="repasse-comprovante">ID da Transação / Comprovante (opcional)</Label>
              <Input
                id="repasse-comprovante"
                placeholder="Ex: E2E123456789... ou Chave PIX"
                value={repasseComprovante}
                onChange={(e) => setRepasseComprovante(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="repasse-obs">Observação / Justificativa</Label>
              <Input
                id="repasse-obs"
                placeholder="Ex: Repasse de vendas da quinzena"
                value={repasseObs}
                onChange={(e) => setRepasseObs(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRepasseAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarRepasse} disabled={salvandoRepasse}>
              {salvandoRepasse ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Confirmar Repasse"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
