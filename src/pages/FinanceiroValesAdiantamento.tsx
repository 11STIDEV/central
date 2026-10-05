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
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayAprovarAdiantamento,
  ccipayDepositarAdiantamento,
  ccipayLancarFolhaAlterdata,
  ccipayListarAdiantamentos,
  ccipayObterAlterdataStatus,
  ccipaySalvarAlterdataToken,
  labelStatusMovimento,
  type CcipayMovimento,
} from "@/lib/ccipay";

export default function FinanceiroValesAdiantamento() {
  const { googleIdToken } = useAuth();
  const [vales, setVales] = useState<CcipayMovimento[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [justificativa, setJustificativa] = useState("");
  const [acaoSelecionada, setAcaoSelecionada] = useState<"aprovar" | "negar" | null>(null);
  const [valeSelecionado, setValeSelecionado] = useState<CcipayMovimento | null>(null);
  const [lancandoAlterdataId, setLancandoAlterdataId] = useState<string | null>(null);

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

  useEffect(() => {
    void carregar();
    void carregarStatusAlterdata();
  }, [carregar, carregarStatusAlterdata]);

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

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Controle de Vales — Financeiro"
        subtitle="Análise, aprovação e integração automática com a Folha de Pagamento Alterdata."
      />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Barra Superior de Ações e Status */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/cci-pay">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Advance-CCI
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-3">
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
        </div>

        {erro && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

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
    </div>
  );
}
