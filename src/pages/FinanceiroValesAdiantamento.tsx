import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Send,
  Loader2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Download,
  Layers,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  XCircle,
  Info,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayAprovarAdiantamento,
  ccipayDepositarAdiantamento,
  ccipayLancarFolhaAlterdata,
  ccipayListarAdiantamentos,
  ccipayListarSolicitacoesLimite,
  ccipayAnalisarSolicitacaoLimite,
  ccipayObterAlterdataStatus,
  ccipaySalvarAlterdataToken,
  labelStatusMovimento,
  type CcipayMovimento,
} from "@/lib/ccipay";

export default function FinanceiroValesAdiantamento() {
  const { googleIdToken } = useAuth();

  // Controle de Abas Principais (Vales vs Aumento de Limite)
  const [abaPrincipal, setAbaPrincipal] = useState<"vales" | "limites">("vales");

  const [vales, setVales] = useState<CcipayMovimento[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [justificativa, setJustificativa] = useState("");
  const [acaoSelecionada, setAcaoSelecionada] = useState<"aprovar" | "negar" | null>(null);
  const [valeSelecionado, setValeSelecionado] = useState<CcipayMovimento | null>(null);
  const [lancandoAlterdataId, setLancandoAlterdataId] = useState<string | null>(null);

  // Estados de Solicitações de Aumento de Limite
  const [solicitacoesLimite, setSolicitacoesLimite] = useState<CcipayMovimento[]>([]);
  const [carregandoLimites, setCarregandoLimites] = useState(false);
  const [filtroLimiteTab, setFiltroLimiteTab] = useState<
    "todas" | "pendentes" | "aprovadas" | "recusadas"
  >("pendentes");
  const [solicitacaoParaAnalisar, setSolicitacaoParaAnalisar] = useState<CcipayMovimento | null>(null);
  const [acaoLimite, setAcaoLimite] = useState<"aprovar" | "negar" | null>(null);
  const [valorAprovadoInput, setValorAprovadoInput] = useState<string>("");
  const [justificativaLimiteInput, setJustificativaLimiteInput] = useState<string>("");
  const [salvandoAnaliseLimite, setSalvandoAnaliseLimite] = useState<boolean>(false);

  // Controle de Token Alterdata
  const [tokenModalAberto, setTokenModalAberto] = useState(false);
  const [tokenInput, setTokenInput] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("alterdata_token") || "" : ""
  );
  const [alterdataConfigurado, setAlterdataConfigurado] = useState<boolean>(() =>
    typeof window !== "undefined" ? Boolean(localStorage.getItem("alterdata_token")) : false
  );
  const [salvandoToken, setSalvandoToken] = useState(false);

  // Modal de Detalhes da Resposta Alterdata
  const [detalheVale, setDetalheVale] = useState<CcipayMovimento | null>(null);
  const [copiadoJson, setCopiadoJson] = useState(false);

  // Filtro de aba e Lote
  const [filtroTab, setFiltroTab] = useState<
    "todos" | "pendentes" | "aprovados" | "depositados" | "a_lancar" | "lancados"
  >("todos");
  const [lancandoEmLote, setLancandoEmLote] = useState(false);

  const carregarStatusAlterdata = useCallback(async () => {
    try {
      const res = await ccipayObterAlterdataStatus(googleIdToken);
      if (res?.hasEnvToken || (typeof window !== "undefined" && localStorage.getItem("alterdata_token"))) {
        setAlterdataConfigurado(true);
      } else {
        setAlterdataConfigurado(false);
      }
    } catch {
      // Ignora erro se rota não responder
    }
  }, [googleIdToken]);

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    setCarregando(true);
    setErro(null);
    try {
      const { movimentos } = await ccipayListarAdiantamentos(googleIdToken);
      setVales(movimentos);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar vales.");
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken]);

  const carregarLimites = useCallback(async () => {
    if (!googleIdToken) return;
    setCarregandoLimites(true);
    try {
      const res = await ccipayListarSolicitacoesLimite(googleIdToken);
      setSolicitacoesLimite(res.solicitacoes || []);
    } catch (e: any) {
      console.error("Erro ao carregar solicitações de limite:", e);
    } finally {
      setCarregandoLimites(false);
    }
  }, [googleIdToken]);

  useEffect(() => {
    void carregar();
    void carregarLimites();
    void carregarStatusAlterdata();
  }, [carregar, carregarLimites, carregarStatusAlterdata]);

  const abrirAnaliseLimite = (solicitacao: CcipayMovimento, acao: "aprovar" | "negar") => {
    setSolicitacaoParaAnalisar(solicitacao);
    setAcaoLimite(acao);
    setValorAprovadoInput(String(solicitacao.valor));
    setJustificativaLimiteInput("");
  };

  const confirmarAnaliseLimite = async () => {
    if (!googleIdToken || !solicitacaoParaAnalisar || !acaoLimite) return;
    const valorNum = Number(valorAprovadoInput.replace(",", "."));
    if (acaoLimite === "aprovar" && (Number.isNaN(valorNum) || valorNum <= 0)) {
      toast.error("Informe um valor aprovado válido maior que zero.");
      return;
    }
    if (acaoLimite === "negar" && !justificativaLimiteInput.trim()) {
      toast.error("Informe a justificativa para recusar.");
      return;
    }

    setSalvandoAnaliseLimite(true);
    try {
      const resp = await ccipayAnalisarSolicitacaoLimite(googleIdToken, {
        movimentoId: solicitacaoParaAnalisar.id,
        acao: acaoLimite,
        valorAprovado: acaoLimite === "aprovar" ? valorNum : undefined,
        justificativa: justificativaLimiteInput.trim(),
      });
      if (acaoLimite === "aprovar") {
        toast.success(
          `Aumento aprovado! Novo limite de R$ ${Number(resp.novoLimite || valorNum).toFixed(2)} aplicado ao colaborador.`
        );
      } else {
        toast.info("Solicitação de aumento de limite recusada.");
      }
      setSolicitacaoParaAnalisar(null);
      setAcaoLimite(null);
      await carregarLimites();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao processar análise da solicitação de limite.");
    } finally {
      setSalvandoAnaliseLimite(false);
    }
  };

  const salvarTokenAlterdata = async () => {
    const limpo = tokenInput.trim();
    if (!limpo) {
      toast.error("Informe o token do Alterdata.");
      return;
    }
    setSalvandoToken(true);
    try {
      localStorage.setItem("alterdata_token", limpo);
      await ccipaySalvarAlterdataToken(googleIdToken, limpo);
      setAlterdataConfigurado(true);
      toast.success("Token do Alterdata salvo com sucesso!");
      setTokenModalAberto(false);
    } catch (e: any) {
      // Mesmo se falhar salvar no servidor, salva localmente
      localStorage.setItem("alterdata_token", limpo);
      setAlterdataConfigurado(true);
      toast.success("Token do Alterdata salvo no navegador!");
      setTokenModalAberto(false);
    } finally {
      setSalvandoToken(false);
    }
  };

  const abrirConfirmacao = (vale: CcipayMovimento, acao: "aprovar" | "negar") => {
    setValeSelecionado(vale);
    setAcaoSelecionada(acao);
    setJustificativa("");
  };

  const confirmar = async () => {
    if (!googleIdToken || !valeSelecionado || !acaoSelecionada) return;
    if (acaoSelecionada === "negar" && !justificativa.trim()) {
      setErro("Informe a justificativa para negar.");
      return;
    }
    try {
      const resp = await ccipayAprovarAdiantamento(
        googleIdToken,
        valeSelecionado.id,
        acaoSelecionada,
        justificativa,
      );

      if (acaoSelecionada === "aprovar") {
        toast.success("Vale aprovado pelo DP! Status: Aprovado aguardando recurso.");
      } else {
        toast.info("Vale negado com sucesso.");
      }

      setValeSelecionado(null);
      setAcaoSelecionada(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao processar.");
    }
  };

  const lancarParaAlterdata = async (vale: CcipayMovimento) => {
    if (!googleIdToken) return;
    setLancandoAlterdataId(vale.id);
    try {
      const res = await ccipayLancarFolhaAlterdata(googleIdToken, {
        movimentoId: vale.id,
        funcionarioEmail: vale.funcionarioEmail,
        valor: vale.valor,
        tipoMovimentoId: "4", // 4 = Adiantamento
        eventoId: "1", // 1 = Vale (adiantamento)
        comentario: `Vale Adiantamento Advance-CCI — ${vale.competencia}`,
      });
      const movId = res.data?.data?.id || (res as any)?.alterdataMeta?.movimentoId;
      toast.success(
        `Lançamento enviado com sucesso para a Folha do Alterdata!${movId ? ` (ID #${movId})` : ""}`
      );
      await carregar();
      if (detalheVale?.id === vale.id) {
        setDetalheVale(null);
      }
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar lançamento para o Alterdata.");
      await carregar();
    } finally {
      setLancandoAlterdataId(null);
    }
  };

  const copiarJsonResposta = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoJson(true);
    setTimeout(() => setCopiadoJson(false), 2000);
    toast.success("JSON copiado para a área de transferência!");
  };

  const marcarComoDepositado = async (vale: CcipayMovimento) => {
    if (!googleIdToken) return;
    try {
      const resp = await ccipayDepositarAdiantamento(googleIdToken, vale.id);
      if (resp.alterdata?.sucesso) {
        const movId = resp.alterdata?.alterdataMeta?.movimentoId;
        toast.success(
          `Depósito confirmado e enviado para a Folha do Alterdata!${movId ? ` (ID #${movId})` : ""}`
        );
      } else if (resp.alterdata && !resp.alterdata.sucesso) {
        toast.warning(
          `Depósito confirmado! Porém o envio para a API do Alterdata falhou: ${
            resp.alterdata.erro || resp.alterdata.alterdataMeta?.mensagem || "Verifique o token."
          }`
        );
      } else {
        toast.success(`Vale de ${vale.funcionarioNome} marcado como Depositado!`);
      }
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao marcar como depositado.");
    }
  };

  const lancarTodosParaAlterdata = async () => {
    if (!googleIdToken) return;
    const elegiveis = vales.filter((v) => {
      const altMeta = v.metadata?.alterdata as any;
      const jaLancado =
        altMeta?.status === "sucesso" ||
        Boolean(v.metadata?.alterdataLancado) ||
        v.status === "descontado_folha";
      return v.status === "pago" && !jaLancado;
    });

    if (elegiveis.length === 0) {
      toast.info("Nenhum vale pendente de envio para o Alterdata no momento.");
      return;
    }

    setLancandoEmLote(true);
    let sucessos = 0;
    let falhas = 0;
    for (const v of elegiveis) {
      try {
        await ccipayLancarFolhaAlterdata(googleIdToken, {
          movimentoId: v.id,
          funcionarioEmail: v.funcionarioEmail,
          valor: v.valor,
          tipoMovimentoId: "4",
          eventoId: "1",
          comentario: `Vale Adiantamento Advance-CCI — ${v.competencia}`,
        });
        sucessos++;
      } catch {
        falhas++;
      }
    }
    setLancandoEmLote(false);
    toast.success(
      `Lote finalizado: ${sucessos} lançados no Alterdata com sucesso${
        falhas > 0 ? `, ${falhas} com erro` : ""
      }.`
    );
    await carregar();
  };

  const exportarRelatorioContrachequeCsv = () => {
    if (vales.length === 0) {
      toast.info("Não há dados de vales para exportar.");
      return;
    }
    const headers = [
      "Funcionario",
      "Email",
      "Tipo Chave Pix",
      "Chave Pix",
      "Competencia",
      "Valor (R$)",
      "Status Vale",
      "Status Alterdata Folha",
      "ID Movimento Alterdata",
      "Data Solicitacao",
    ];
    const rows = valesFiltrados.map((v) => {
      const altMeta = v.metadata?.alterdata as any;
      const alterdataStatus =
        altMeta?.status === "sucesso" ||
        Boolean(v.metadata?.alterdataLancado) ||
        v.status === "descontado_folha"
          ? "Integrado na Folha"
          : altMeta?.status === "erro"
          ? "Falha no Envio"
          : "Pendente de Envio";
      return [
        `"${(v.funcionarioNome || "").replace(/"/g, '""')}"`,
        `"${(v.funcionarioEmail || "").replace(/"/g, '""')}"`,
        `"${String(v.metadata?.tipoPix || "—")}"`,
        `"${String(v.metadata?.pix || "—")}"`,
        `"${v.competencia}"`,
        v.valor.toFixed(2),
        `"${labelStatusMovimento(v.status)}"`,
        `"${alterdataStatus}"`,
        `"${altMeta?.movimentoId || ""}"`,
        `"${v.createdAt ? new Date(v.createdAt).toLocaleDateString("pt-BR") : ""}"`,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-vales-contracheques-alterdata-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório de vales para contracheques exportado!");
  };

  const contadores = {
    pendentes: vales.filter((v) => v.status === "pendente").length,
    aprovados: vales.filter((v) => v.status === "aprovado").length,
    depositados: vales.filter((v) => v.status === "pago").length,
    aLancar: vales.filter((v) => {
      const altMeta = v.metadata?.alterdata as any;
      const jaLancado =
        altMeta?.status === "sucesso" ||
        Boolean(v.metadata?.alterdataLancado) ||
        v.status === "descontado_folha";
      return v.status === "pago" && !jaLancado;
    }).length,
    lancados: vales.filter((v) => {
      const altMeta = v.metadata?.alterdata as any;
      return (
        altMeta?.status === "sucesso" ||
        Boolean(v.metadata?.alterdataLancado) ||
        v.status === "descontado_folha"
      );
    }).length,
  };

  const valesFiltrados = vales.filter((v) => {
    const altMeta = v.metadata?.alterdata as any;
    const jaLancado =
      altMeta?.status === "sucesso" ||
      Boolean(v.metadata?.alterdataLancado) ||
      v.status === "descontado_folha";

    if (filtroTab === "pendentes") return v.status === "pendente";
    if (filtroTab === "aprovados") return v.status === "aprovado";
    if (filtroTab === "depositados") return v.status === "pago";
    if (filtroTab === "a_lancar") return v.status === "pago" && !jaLancado;
    if (filtroTab === "lancados") return jaLancado;
    return true;
  });

  const pendentes = contadores.pendentes;

  const contadoresLimite = {
    todas: solicitacoesLimite.length,
    pendentes: solicitacoesLimite.filter((s) => s.status === "pendente").length,
    aprovadas: solicitacoesLimite.filter((s) => s.status === "aprovado").length,
    recusadas: solicitacoesLimite.filter((s) => s.status === "negado" || s.status === "recusado").length,
  };

  const solicitacoesFiltradas = solicitacoesLimite.filter((s) => {
    if (filtroLimiteTab === "pendentes") return s.status === "pendente";
    if (filtroLimiteTab === "aprovadas") return s.status === "aprovado";
    if (filtroLimiteTab === "recusadas") return s.status === "negado" || s.status === "recusado";
    return true;
  });

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Gestão de Vales e Limites"
        subtitle="Aprovação de adiantamentos financeiros, envio ao Alterdata e deliberação de aumentos de limite."
      />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Barra Superior com Voltar e Alternador de Abas */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/cci-pay">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Advance-CCI
            </Link>
          </Button>

          {/* Abas Principais (Vales vs Aumento de Limite) */}
          <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setAbaPrincipal("vales")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                abaPrincipal === "vales"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-4 w-4 text-primary" />
              <span>Gestão de Vales</span>
              {contadores.pendentes > 0 && (
                <span className="rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[11px] font-bold">
                  {contadores.pendentes}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAbaPrincipal("limites")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                abaPrincipal === "limites"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Aumento de Limite</span>
              {contadoresLimite.pendentes > 0 && (
                <span className="rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-[11px] font-bold animate-pulse">
                  {contadoresLimite.pendentes}
                </span>
              )}
            </button>
          </div>
        </div>

        {erro && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {/* ============================================================== */}
        {/* ABA 1: GESTÃO DE ADIANTAMENTOS / VALES                        */}
        {/* ============================================================== */}
        {abaPrincipal === "vales" && (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
              {/* Indicador do Token Alterdata */}
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  alterdataConfigurado
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {alterdataConfigurado ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Token Alterdata Ativo</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Token Alterdata Não Configurado</span>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTokenInput(localStorage.getItem("alterdata_token") || "");
                  setTokenModalAberto(true);
                }}
                className="gap-1.5"
              >
                <KeyRound className="h-4 w-4" />
                Configurar Token
              </Button>

              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Link to="/ti/alterdata" target="_blank">
                  <ExternalLink className="h-4 w-4" />
                  Testador de API
                </Link>
              </Button>
            </div>

        {/* Card Destaque: Relatório de Vales a Lançar nos Contracheques (Alterdata Automático) */}
        <div className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base text-foreground">
                  Relatório de Vales a Lançar nos Contracheques
                </h3>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-xs">
                  Automático via Alterdata
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Integração automática com o ePlugin / Alterdata. Acompanhe os vales a lançar na folha e envie em lote com um clique.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportarRelatorioContrachequeCsv}
                className="gap-1.5 text-xs"
              >
                <Download className="h-4 w-4" />
                Exportar Relatório (CSV)
              </Button>
              <Button
                size="sm"
                onClick={lancarTodosParaAlterdata}
                disabled={lancandoEmLote || contadores.aLancar === 0}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {lancandoEmLote ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Lançar Pendentes no Alterdata ({contadores.aLancar})
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-border/60">
            <div className="rounded-lg bg-background/60 p-2.5">
              <span className="text-[11px] text-muted-foreground block">Aguardando Recurso:</span>
              <strong className="text-sm font-semibold text-blue-600 dark:text-blue-400">{contadores.aprovados}</strong>
            </div>
            <div className="rounded-lg bg-background/60 p-2.5">
              <span className="text-[11px] text-muted-foreground block">Depositados:</span>
              <strong className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{contadores.depositados}</strong>
            </div>
            <div className="rounded-lg bg-background/60 p-2.5">
              <span className="text-[11px] text-muted-foreground block">A Lançar na Folha:</span>
              <strong className="text-sm font-semibold text-amber-600 dark:text-amber-400">{contadores.aLancar}</strong>
            </div>
            <div className="rounded-lg bg-background/60 p-2.5">
              <span className="text-[11px] text-muted-foreground block">Integrados Alterdata:</span>
              <strong className="text-sm font-semibold text-purple-600 dark:text-purple-400">{contadores.lancados}</strong>
            </div>
          </div>
        </div>

        {/* Filtros em Abas Rápidas */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant={filtroTab === "todos" ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setFiltroTab("todos")}
            >
              Todos ({vales.length})
            </Button>
            <Button
              size="sm"
              variant={filtroTab === "pendentes" ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setFiltroTab("pendentes")}
            >
              Pendentes ({contadores.pendentes})
            </Button>
            <Button
              size="sm"
              variant={filtroTab === "aprovados" ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setFiltroTab("aprovados")}
            >
              Aprovados Aguardando Recurso ({contadores.aprovados})
            </Button>
            <Button
              size="sm"
              variant={filtroTab === "depositados" ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setFiltroTab("depositados")}
            >
              Depositados ({contadores.depositados})
            </Button>
            <Button
              size="sm"
              variant={filtroTab === "a_lancar" ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setFiltroTab("a_lancar")}
            >
              A Lançar Folha ({contadores.aLancar})
            </Button>
            <Button
              size="sm"
              variant={filtroTab === "lancados" ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setFiltroTab("lancados")}
            >
              Na Folha ({contadores.lancados})
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={() => void carregar()} disabled={carregando}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {carregando && vales.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Carregando solicitações...
          </div>
        ) : valesFiltrados.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Nenhuma solicitação encontrada para o filtro selecionado.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Chave Pix</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status Solicitação</TableHead>
                  <TableHead>Integração Alterdata</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valesFiltrados.map((vale) => {
                  const altMeta = vale.metadata?.alterdata as any;
                  const alterdataSucesso =
                    altMeta?.status === "sucesso" ||
                    Boolean(vale.metadata?.alterdataLancado) ||
                    vale.status === "descontado_folha";
                  const alterdataErro = altMeta?.status === "erro";

                  return (
                    <TableRow key={vale.id} className="transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{vale.funcionarioNome}</span>
                          <span className="text-xs text-muted-foreground">{vale.funcionarioEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          {vale.metadata?.tipoPix ? (
                            <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                              {vale.metadata.tipoPix === "cpf"
                                ? "CPF"
                                : vale.metadata.tipoPix === "telefone"
                                ? "Celular"
                                : vale.metadata.tipoPix === "email"
                                ? "E-mail"
                                : vale.metadata.tipoPix === "aleatoria"
                                ? "Chave Aleatória"
                                : String(vale.metadata.tipoPix)}
                            </span>
                          ) : null}
                          <span className="font-mono text-foreground">{String(vale.metadata?.pix ?? "—")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{vale.competencia}</TableCell>
                      <TableCell className="font-semibold text-foreground">
                        R$ {vale.valor.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            vale.status === "pendente"
                              ? "secondary"
                              : vale.status === "aprovado" || vale.status === "descontado_folha"
                              ? "default"
                              : "outline"
                          }
                        >
                          {labelStatusMovimento(vale.status)}
                        </Badge>
                      </TableCell>

                      {/* Coluna Alterdata com Status Visual e Detalhes */}
                      <TableCell>
                        {alterdataSucesso ? (
                          <button
                            type="button"
                            onClick={() => setDetalheVale(vale)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
                            title="Clique para ver os dados da resposta da API"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>
                              Na Folha {altMeta?.movimentoId ? `(#${altMeta.movimentoId})` : ""}
                            </span>
                          </button>
                        ) : alterdataErro ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetalheVale(vale)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
                              title="Clique para ver o motivo do erro"
                            >
                              <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                              <span>Falha Alterdata</span>
                            </button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              disabled={lancandoAlterdataId === vale.id}
                              onClick={() => lancarParaAlterdata(vale)}
                              title="Tentar reenviar para o Alterdata"
                            >
                              {lancandoAlterdataId === vale.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ) : vale.status === "pendente" ? (
                          <span className="text-xs text-muted-foreground">Aguardando DP</span>
                        ) : vale.status === "aprovado" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                            Aguardando depósito
                          </span>
                        ) : vale.status === "pago" || vale.status === "descontado_folha" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs gap-1.5"
                            disabled={lancandoAlterdataId === vale.id}
                            onClick={() => lancarParaAlterdata(vale)}
                          >
                            {lancandoAlterdataId === vale.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Enviar Alterdata
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Ações de Aprovação / Depósito */}
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        {vale.status === "pendente" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => abrirConfirmacao(vale, "aprovar")}
                            >
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirConfirmacao(vale, "negar")}
                            >
                              Negar
                            </Button>
                          </>
                        )}
                        {vale.status === "aprovado" && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            onClick={() => marcarComoDepositado(vale)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Confirmar Depósito
                          </Button>
                        )}
                        {(vale.status === "pago" || vale.status === "descontado_folha") && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Depositado
                          </span>
                        )}
                        {vale.status === "negado" && (
                          <span className="text-xs text-muted-foreground">Negado</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </>
    )}

        {/* ============================================================== */}
        {/* ABA 2: SOLICITAÇÕES DE AUMENTO DE LIMITE                      */}
        {/* ============================================================== */}
        {abaPrincipal === "limites" && (
          <div className="space-y-6">
            {/* Cards de Métricas de Limite */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Pendentes de Análise</span>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {contadoresLimite.pendentes}
                </p>
                <span className="text-[11px] text-muted-foreground">Aguardando decisão</span>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Aprovadas</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {contadoresLimite.aprovadas}
                </p>
                <span className="text-[11px] text-muted-foreground">Limites atualizados</span>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Recusadas</span>
                  <XCircle className="h-4 w-4 text-destructive" />
                </div>
                <p className="mt-2 text-2xl font-bold text-destructive">
                  {contadoresLimite.recusadas}
                </p>
                <span className="text-[11px] text-muted-foreground">Indeferidas</span>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Total de Pedidos</span>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {contadoresLimite.todas}
                </p>
                <span className="text-[11px] text-muted-foreground">Histórico completo</span>
              </div>
            </div>

            {/* Filtros da Lista de Limite */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant={filtroLimiteTab === "pendentes" ? "default" : "outline"}
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setFiltroLimiteTab("pendentes")}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Pendentes ({contadoresLimite.pendentes})
                </Button>
                <Button
                  size="sm"
                  variant={filtroLimiteTab === "aprovadas" ? "default" : "outline"}
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setFiltroLimiteTab("aprovadas")}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Aprovadas ({contadoresLimite.aprovadas})
                </Button>
                <Button
                  size="sm"
                  variant={filtroLimiteTab === "recusadas" ? "default" : "outline"}
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setFiltroLimiteTab("recusadas")}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Recusadas ({contadoresLimite.recusadas})
                </Button>
                <Button
                  size="sm"
                  variant={filtroLimiteTab === "todas" ? "default" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => setFiltroLimiteTab("todas")}
                >
                  Todas ({contadoresLimite.todas})
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={carregarLimites}
                disabled={carregandoLimites}
                className="gap-1.5 text-xs h-8 ml-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${carregandoLimites ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>

            {/* Tabela de Solicitações de Aumento de Limite */}
            {carregandoLimites ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Carregando solicitações de aumento de limite...</span>
              </div>
            ) : solicitacoesFiltradas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
                <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="font-semibold text-foreground">Nenhuma solicitação de limite encontrada</p>
                <p className="text-xs mt-1">
                  {filtroLimiteTab === "pendentes"
                    ? "Não há solicitações de aumento de limite pendentes de análise no momento."
                    : "Nenhum registro para o filtro selecionado."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data / Hora</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead className="text-right">Limite Atual</TableHead>
                      <TableHead className="text-right">Novo Solicitado</TableHead>
                      <TableHead>Justificativa do Colaborador</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações / Decisão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitacoesFiltradas.map((sol) => {
                      const limiteAnterior = Number(
                        (sol.metadata as any)?.limiteAnterior ?? 500,
                      );
                      const motivo = String((sol.metadata as any)?.motivo || "—");
                      const justificativaDp = (sol.metadata as any)?.justificativaDp;
                      const valorAprovadoFinal = (sol.metadata as any)?.valorAprovado;

                      return (
                        <TableRow key={sol.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {sol.createdAt
                              ? new Date(sol.createdAt).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </TableCell>

                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground text-sm leading-tight">
                                {sol.funcionarioNome || sol.funcionarioEmail}
                              </p>
                              <p className="text-xs text-muted-foreground">{sol.funcionarioEmail}</p>
                            </div>
                          </TableCell>

                          <TableCell className="text-right whitespace-nowrap text-xs text-muted-foreground font-mono">
                            R$ {limiteAnterior.toFixed(2)}
                          </TableCell>

                          <TableCell className="text-right whitespace-nowrap font-bold text-sm text-primary font-mono">
                            R$ {sol.valor.toFixed(2)}
                          </TableCell>

                          <TableCell className="max-w-[240px]">
                            <p className="text-xs text-foreground line-clamp-2" title={motivo}>
                              {motivo}
                            </p>
                            {justificativaDp && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                                DP: {justificativaDp}
                              </p>
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {sol.status === "pendente" && (
                              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs gap-1">
                                <Clock className="h-3 w-3" /> Pendente
                              </Badge>
                            )}
                            {sol.status === "aprovado" && (
                              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Aprovado
                                {valorAprovadoFinal != null && ` (R$ ${Number(valorAprovadoFinal).toFixed(2)})`}
                              </Badge>
                            )}
                            {(sol.status === "negado" || sol.status === "recusado") && (
                              <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive text-xs gap-1">
                                <XCircle className="h-3 w-3" /> Recusado
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-right whitespace-nowrap">
                            {sol.status === "pendente" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                                  onClick={() => abrirAnaliseLimite(sol, "aprovar")}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
                                  onClick={() => abrirAnaliseLimite(sol, "negar")}
                                >
                                  Recusar
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {sol.aprovadoPor ? `Por: ${sol.aprovadoPor.split("@")[0]}` : "Concluído"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog de Configuração do Token Alterdata */}
      <Dialog open={tokenModalAberto} onOpenChange={setTokenModalAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Configurar Token do Alterdata (ePlugin)
            </DialogTitle>
            <DialogDescription>
              Insira o token de integração gerado no <strong>Alterdata eContador</strong>{" "}
              (Configurações &gt; ePlugin) para habilitar o envio automático dos vales para a Folha de
              Pagamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Token de Integração (Bearer)</label>
              <Input
                type="password"
                placeholder="Cole o token da API do Alterdata aqui..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                O token será salvo nas variáveis do sistema e no navegador para que todas as aprovações
                enviem o lançamento diretamente à Folha.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setTokenModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarTokenAlterdata} disabled={salvandoToken} className="gap-2">
              {salvandoToken && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar e Ativar Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes da Integração Alterdata (Resposta e Payload) */}
      <Dialog open={Boolean(detalheVale)} onOpenChange={() => setDetalheVale(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-primary" />
                <span>Detalhes da Integração com o Alterdata</span>
              </div>
              {detalheVale && (
                <Badge
                  variant={
                    (detalheVale.metadata?.alterdata as any)?.status === "sucesso" ||
                    detalheVale.metadata?.alterdataLancado
                      ? "default"
                      : "destructive"
                  }
                >
                  {(detalheVale.metadata?.alterdata as any)?.status === "sucesso" ||
                  detalheVale.metadata?.alterdataLancado
                    ? "Sucesso"
                    : "Falha / Erro"}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {detalheVale?.funcionarioNome} ({detalheVale?.funcionarioEmail}) — Competência:{" "}
              {detalheVale?.competencia} — R$ {detalheVale?.valor.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          {detalheVale && (
            <div className="space-y-4 py-2 text-sm">
              {/* Resumo */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground">ID no Alterdata:</span>{" "}
                  <strong>
                    {(detalheVale.metadata?.alterdata as any)?.movimentoId || "Não gerado"}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Status Code HTTP:</span>{" "}
                  <strong>
                    {(detalheVale.metadata?.alterdata as any)?.statusCode || "—"}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Data/Hora:</span>{" "}
                  <span>
                    {(detalheVale.metadata?.alterdata as any)?.enviadoEm ||
                      (detalheVale.metadata?.alterdata as any)?.tentadoEm ||
                      "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Disparado por:</span>{" "}
                  <span>
                    {(detalheVale.metadata?.alterdata as any)?.enviadoPor ||
                      (detalheVale.metadata?.alterdata as any)?.tentadoPor ||
                      "sistema"}
                  </span>
                </div>
              </div>

              {/* Mensagem de Erro (se houver) */}
              {(detalheVale.metadata?.alterdata as any)?.mensagem && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                  <p className="font-semibold">Mensagem de Retorno:</p>
                  <p className="mt-1 font-mono">
                    {(detalheVale.metadata?.alterdata as any)?.mensagem}
                  </p>
                </div>
              )}

              {/* Resposta Completa da API Alterdata */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                    Resposta da API Alterdata (JSON)
                  </span>
                  {(detalheVale.metadata?.alterdata as any)?.resposta && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1"
                      onClick={() =>
                        copiarJsonResposta(
                          JSON.stringify(
                            (detalheVale.metadata?.alterdata as any)?.resposta,
                            null,
                            2
                          )
                        )
                      }
                    >
                      {copiadoJson ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      Copiar
                    </Button>
                  )}
                </div>
                <pre className="max-h-56 overflow-auto rounded-lg border bg-muted/60 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                  {JSON.stringify(
                    (detalheVale.metadata?.alterdata as any)?.resposta ||
                      (detalheVale.metadata?.alterdata as any)?.detalhes ||
                      (detalheVale.metadata?.alterdata as any) ||
                      { info: "Nenhuma resposta registrada ainda." },
                    null,
                    2
                  )}
                </pre>
              </div>

              {/* Payload Enviado */}
              {(detalheVale.metadata?.alterdata as any)?.payloadEnviado && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                    Payload JSON Enviado
                  </span>
                  <pre className="max-h-40 overflow-auto rounded-lg border bg-muted/60 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                    {JSON.stringify(
                      (detalheVale.metadata?.alterdata as any)?.payloadEnviado,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {detalheVale && (detalheVale.metadata?.alterdata as any)?.status === "erro" && (
              <Button
                variant="default"
                onClick={() => {
                  const v = detalheVale;
                  lancarParaAlterdata(v);
                }}
                disabled={lancandoAlterdataId === detalheVale?.id}
                className="gap-2 mr-auto"
              >
                {lancandoAlterdataId === detalheVale?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Tentar Enviar Novamente
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDetalheVale(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Aprovação/Negativa */}
      <AlertDialog open={Boolean(valeSelecionado && acaoSelecionada)} onOpenChange={() => setValeSelecionado(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {acaoSelecionada === "aprovar" ? "Aprovar Vale Adiantamento" : "Negar Vale Adiantamento"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {acaoSelecionada === "aprovar" ? (
                <>
                  Ao aprovar o adiantamento de{" "}
                  <strong>R$ {valeSelecionado?.valor.toFixed(2)}</strong> para{" "}
                  <strong>{valeSelecionado?.funcionarioNome}</strong>, o sistema tentará enviar
                  automaticamente o lançamento para a folha no Alterdata.
                  {!alterdataConfigurado && (
                    <span className="mt-2 block font-medium text-amber-600 dark:text-amber-400">
                      Atenção: O token do Alterdata ainda não está configurado. O vale será aprovado,
                      mas você precisará enviar ao Alterdata após configurar o token.
                    </span>
                  )}
                </>
              ) : (
                "Informe o motivo da negativa para registrar no histórico do funcionário (obrigatório)."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {acaoSelecionada === "negar" && (
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Motivo da negativa..."
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmar}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Análise e Aprovação de Aumento de Limite */}
      <Dialog
        open={Boolean(solicitacaoParaAnalisar && acaoLimite)}
        onOpenChange={(aberto) => {
          if (!aberto && !salvandoAnaliseLimite) {
            setSolicitacaoParaAnalisar(null);
            setAcaoLimite(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {acaoLimite === "aprovar" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Aprovar Aumento de Limite
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Recusar Solicitação de Limite
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {acaoLimite === "aprovar"
                ? `Defina o novo limite concedido para ${
                    solicitacaoParaAnalisar?.funcionarioNome ||
                    solicitacaoParaAnalisar?.funcionarioEmail
                  }. O limite será atualizado imediatamente no cadastro.`
                : `Informe o motivo da recusa para registrar no histórico de ${
                    solicitacaoParaAnalisar?.funcionarioNome ||
                    solicitacaoParaAnalisar?.funcionarioEmail
                  }.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Colaborador:</span>
                <strong className="text-foreground">
                  {solicitacaoParaAnalisar?.funcionarioNome || solicitacaoParaAnalisar?.funcionarioEmail}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Limite Anterior:</span>
                <span className="font-mono text-muted-foreground">
                  R$ {Number((solicitacaoParaAnalisar?.metadata as any)?.limiteAnterior ?? 300).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Solicitado:</span>
                <strong className="font-mono text-primary text-sm">
                  R$ {Number(solicitacaoParaAnalisar?.valor ?? 0).toFixed(2)}
                </strong>
              </div>
              {(solicitacaoParaAnalisar?.metadata as any)?.motivo && (
                <div className="pt-1.5 border-t border-border/60">
                  <span className="text-muted-foreground block mb-0.5">Motivo informado:</span>
                  <p className="text-foreground italic">
                    &quot;{(solicitacaoParaAnalisar?.metadata as any)?.motivo}&quot;
                  </p>
                </div>
              )}
            </div>

            {acaoLimite === "aprovar" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Novo Limite Aprovado (R$) *
                </label>
                <Input
                  type="text"
                  placeholder="Ex: 800,00"
                  value={valorAprovadoInput}
                  onChange={(e) => setValorAprovadoInput(e.target.value)}
                  className="font-bold text-base"
                />
                <p className="text-[11px] text-muted-foreground">
                  Você pode conceder o valor solicitado ou definir um valor intermediário aprovado.
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {acaoLimite === "aprovar" ? "Observação do DP (opcional)" : "Motivo da Recusa *"}
              </label>
              <Textarea
                placeholder={
                  acaoLimite === "aprovar"
                    ? "Ex: Aprovado conforme análise salarial / solicitação do colaborador..."
                    : "Ex: Limite máximo já atingido para o perfil de cargo atual..."
                }
                value={justificativaLimiteInput}
                onChange={(e) => setJustificativaLimiteInput(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSolicitacaoParaAnalisar(null);
                setAcaoLimite(null);
              }}
              disabled={salvandoAnaliseLimite}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmarAnaliseLimite}
              disabled={salvandoAnaliseLimite}
              className={
                acaoLimite === "aprovar"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              }
            >
              {salvandoAnaliseLimite ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : acaoLimite === "aprovar" ? (
                "Confirmar Aprovação e Atualizar Limite"
              ) : (
                "Confirmar Recusa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
