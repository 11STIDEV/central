import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayMe,
  ccipaySolicitarAumentoLimite,
  descricaoMovimento,
  formatarDataMovimento,
  labelStatusMovimento,
  type CcipayMovimento,
  type CcipayResumo,
} from "@/lib/ccipay";
import { useTrilhaProgress } from "@/hooks/useTrilhaProgress";
import { parceiroSiteUrl } from "@/parceiro/publicHost";
import { CcipayQrScannerDialog } from "@/components/ccipay/CcipayQrScannerDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  QrCode,
  Wallet,
  UserCheck,
  ShieldCheck,
  Hash,
  TrendingUp,
  Loader2,
  Check,
  Info,
  Store,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export default function CcipayHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { googleIdToken, usuario } = useAuth();
  const { progress: trilhaProgress } = useTrilhaProgress();
  const [resumo, setResumo] = useState<CcipayResumo | null>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [metodoScanner, setMetodoScanner] = useState<"adiantamento" | "bonificacao">("adiantamento");

  // Modal para Solicitar Aumento de Limite nos Convênios
  const [modalLimiteAberto, setModalLimiteAberto] = useState(false);
  const [novoLimiteInput, setNovoLimiteInput] = useState("");
  const [motivoInput, setMotivoInput] = useState("");
  const [enviandoLimite, setEnviandoLimite] = useState(false);

  const carregar = useCallback(async () => {
    if (!usuario && !googleIdToken) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const r = await ccipayMe(googleIdToken);
      setResumo(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar Advance-CCI.");
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken, usuario]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Se a rota contiver ?scan=1 ou ?qr=1, abre a câmera imediatamente
  useEffect(() => {
    const scanParam = searchParams.get("scan") || searchParams.get("qr");
    if (scanParam === "1" || scanParam === "true") {
      setMetodoScanner("adiantamento");
      setScannerAberto(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("scan");
      nextParams.delete("qr");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  function abrirScanner(metodo: "adiantamento" | "bonificacao" = "adiantamento") {
    setMetodoScanner(metodo);
    if (metodo === "bonificacao" && (resumo?.saldoBonificacao ?? 0) <= 0) {
      toast.info("Seu saldo de bonificação atual é R$ 0,00. As bonificações são creditadas pelo DP.");
    }
    setScannerAberto(true);
  }

  function aoDetectarToken(token: string) {
    navigate(`/cci-pay/pagar/${encodeURIComponent(token)}?metodo=${metodoScanner}`);
  }

  const xpTotalCalculado = resumo?.xpTotalTrilha ?? trilhaProgress?.xpTotal ?? 0;
  const xpValorCalculado = resumo?.xpValorMonetario ?? xpTotalCalculado * 1.0;
  const saldoBonificacaoFinal =
    resumo?.xpTotalTrilha !== undefined
      ? (resumo?.saldoBonificacao ?? 0)
      : (resumo?.saldoBonificacao ?? 0) + xpValorCalculado;

  const handleSolicitarAumentoLimite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario && !googleIdToken) return;

    const valorNum = Number(novoLimiteInput.replace(",", "."));
    if (Number.isNaN(valorNum) || valorNum <= 0) {
      toast.error("Informe um valor de limite pretendido válido.");
      return;
    }

    setEnviandoLimite(true);
    try {
      const resp = await ccipaySolicitarAumentoLimite(googleIdToken, {
        novoLimite: valorNum,
        motivo: motivoInput.trim(),
      });
      toast.success(resp.mensagem || "Solicitação enviada ao DP com sucesso!");
      setModalLimiteAberto(false);
      setNovoLimiteInput("");
      setMotivoInput("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar solicitação ao DP.");
    } finally {
      setEnviandoLimite(false);
    }
  };


  return (
    <div className="animate-fade-in">
      <PageHero
        title="Advance-CCI"
        subtitle="Seu extrato, saldos e pagamentos em convênios e lojas parceiras."
      />

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-8">
        {erro && (
          <Alert variant="destructive">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {carregando && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {!carregando && !resumo && !erro && (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar seus dados. Tente recarregar a página.
          </p>
        )}

        {resumo && (
          <>
            {/* Card de Identificação do Colaborador (Alterdata) */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-card-foreground">
                        {resumo.alterdata?.nomeCompleto || resumo.funcionario.nome}
                      </p>
                      {resumo.alterdata ? (
                        <Badge variant="secondary" className="gap-1 text-[11px] font-normal border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <ShieldCheck className="h-3 w-3 text-emerald-500" /> Alterdata Conectado
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{resumo.funcionario.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2 sm:border-0 sm:pt-0">
                  <div className="flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground">
                    <Hash className="h-3.5 w-3.5 text-primary" />
                    <span>Matrícula: {resumo.alterdata?.codigoContratoVigente || resumo.funcionario.alterdataCodigo || "Pendente"}</span>
                  </div>
                  <Badge variant={resumo.funcionario.ativo ? "default" : "destructive"} className="text-xs">
                    {resumo.funcionario.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SaldoCard
                titulo="Adiantamento / vales"
                subtitulo={`Competência ${resumo.competencia}`}
                valor={resumo.adiantamentoDisponivel}
                detalhe={`Usado R$ ${resumo.adiantamentoUsado.toFixed(2)} de R$ ${resumo.funcionario.limiteAdiantamento.toFixed(2)}`}
              />
              <SaldoCard
                titulo="Bonificações"
                subtitulo="Saldo de premiações e bonificações"
                valor={saldoBonificacaoFinal}
                badge={
                  xpTotalCalculado > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      <Sparkles className="h-3 w-3" />
                      +{xpTotalCalculado} XP (R$ {xpValorCalculado.toFixed(2)})
                    </span>
                  ) : undefined
                }
                detalhe={
                  <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    {resumo.bonificacaoTeto != null && (
                      <p>
                        Teto R$ {resumo.bonificacaoTeto.toFixed(2)}
                        {resumo.bonificacaoDisponivelCreditar != null
                          ? ` · pode receber mais R$ ${resumo.bonificacaoDisponivelCreditar.toFixed(2)}`
                          : ""}
                      </p>
                    )}
                    {xpTotalCalculado > 0 ? (
                      <p className="flex flex-wrap items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <span>✨</span>
                        <span>
                          Inclui <strong>R$ {xpValorCalculado.toFixed(2)}</strong> via <strong>{xpTotalCalculado} XP</strong> da Trilha de Conhecimento.
                        </span>
                        <Link
                          to="/trilha-conhecimento"
                          className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground ml-1"
                        >
                          Ver Trilha <ArrowRight className="h-3 w-3" />
                        </Link>
                      </p>
                    ) : (
                      <p>
                        Ganhe bonificações concluindo trilhas na{" "}
                        <Link
                          to="/trilha-conhecimento"
                          className="font-medium underline underline-offset-2 hover:text-foreground"
                        >
                          Trilha de Conhecimento
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                }
              />

            </div>

            {/* Ações principais */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild size="lg" className="h-auto py-4 text-center justify-center">
                <Link to="/vale-adiantamento">
                  <Wallet className="mr-2 h-5 w-5" />
                  Adiantamento Financeiro
                </Link>
              </Button>

              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="relative h-auto py-4 text-center justify-center border border-primary/20 bg-primary/10 hover:bg-primary/20 text-foreground group transition-all"
                onClick={() => abrirScanner("adiantamento")}
              >
                <div className="flex items-center">
                  <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs group-hover:scale-105 transition-transform">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm leading-tight">Pagar com QR Code</div>
                    <div className="text-[11px] text-muted-foreground font-normal">Abre a câmera automaticamente</div>
                  </div>
                </div>
              </Button>

              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="relative h-auto py-4 text-center justify-center border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-foreground group transition-all"
                onClick={() => abrirScanner("bonificacao")}
              >
                <div className="flex items-center">
                  <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs group-hover:scale-105 transition-transform">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm leading-tight">Pagar com Bonificação</div>
                    <div className="text-[11px] text-muted-foreground font-normal">Pagar com saldo de premiações (QR)</div>
                  </div>
                </div>
              </Button>

              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-auto py-4 border-primary/30 hover:bg-primary/5 hover:border-primary text-foreground font-medium text-center justify-center"
                onClick={() => setModalLimiteAberto(true)}
              >
                <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                Solicitar aumento de limite
              </Button>
            </div>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Seus movimentos</h2>
              <ExtratoTable movimentos={resumo.movimentos} />
            </section>
          </>
        )}
      </div>

      {/* Modal para Solicitar Aumento de Limite nos Convênios */}
      <Dialog open={modalLimiteAberto} onOpenChange={setModalLimiteAberto}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSolicitarAumentoLimite}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Aumento de Limite — Convênios CCI
              </DialogTitle>
              <DialogDescription>
                Sua solicitação de aumento de limite para compras nos convênios será enviada diretamente ao Departamento Pessoal (DP) e passará por análise.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs flex justify-between items-center">
                <span className="text-muted-foreground">Limite / Saldo atual para convênios:</span>
                <strong className="text-sm font-semibold text-primary">
                  R$ {(resumo?.saldoBonificacao ?? 0).toFixed(2)}
                </strong>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-card-foreground">
                  Novo limite pretendido (R$) *
                </label>
                <Input
                  type="text"
                  placeholder="Ex: 500,00"
                  value={novoLimiteInput}
                  onChange={(e) => setNovoLimiteInput(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-card-foreground">
                  Motivo / Justificativa da solicitação
                </label>
                <Textarea
                  placeholder="Ex: Necessidade de compra de materiais/medicamentos nos convênios credenciados..."
                  value={motivoInput}
                  onChange={(e) => setMotivoInput(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-blue-50/70 p-3 text-xs text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <p>
                  O DP receberá a notificação imediatamente. Após a análise do setor, você poderá acompanhar o status pelo seu extrato.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalLimiteAberto(false)}
                disabled={enviandoLimite}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={enviandoLimite}>
                {enviandoLimite ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando ao DP...
                  </>
                ) : (
                  "Enviar Solicitação ao DP"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CcipayQrScannerDialog
        open={scannerAberto}
        onOpenChange={setScannerAberto}
        onTokenDetected={aoDetectarToken}
      />
    </div>
  );
}

function SaldoCard({
  titulo,
  subtitulo,
  valor,
  detalhe,
  badge,
}: {
  titulo: string;
  subtitulo: string;
  valor: number;
  detalhe: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
        {badge}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">R$ {valor.toFixed(2)}</p>
      <div className="mt-2">{typeof detalhe === "string" ? <p className="text-xs leading-relaxed text-muted-foreground">{detalhe}</p> : detalhe}</div>
    </div>
  );
}

function ExtratoTable({ movimentos }: { movimentos: CcipayMovimento[] }) {
  if (movimentos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Nenhum movimento registrado ainda nesta competência.
      </p>
    );
  }

  function getBadgeClass(status: string, isBonificacao: boolean) {
    if (status === "pendente") {
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    } else if (status === "aprovado") {
      return "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    } else if (status === "pago") {
      return isBonificacao
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    } else if (status === "descontado_folha") {
      return "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300";
    } else if (status === "negado") {
      return "border-destructive/40 bg-destructive/10 text-destructive";
    }
    return "border-border text-foreground";
  }

  return (
    <>
      {/* Visualização Mobile: Cards limpos 100% na tela sem cortes */}
      <div className="divide-y divide-border/60 rounded-xl border border-border bg-card shadow-xs md:hidden">
        {movimentos.map((m) => {
          const isLancamentoBonificacao = m.tipo === "bonificacao" || m.tipo === "deducao";
          const isCompraBonificacao =
            m.tipo === "compra_loja" &&
            ((m.metadata as any)?.metodoPagamento === "bonificacao" ||
              (m.metadata as any)?.metodo_pagamento === "bonificacao");

          const statusLabel =
            isCompraBonificacao && (m.status === "pago" || m.status === "aprovado")
              ? "Pago (Bonificação)"
              : isLancamentoBonificacao
              ? null
              : labelStatusMovimento(m.status, m.tipo);
          const badgeClass = getBadgeClass(m.status, isCompraBonificacao);

          return (
            <div key={m.id} className="p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  {m.lojaNome && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      <Store className="h-3 w-3 shrink-0" />
                      {m.lojaNome}
                    </span>
                  )}
                  <p className="font-medium text-sm text-foreground leading-snug break-words">
                    {descricaoMovimento(m)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatarDataMovimento(m)}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-bold text-sm ${
                    m.direcao === "debito"
                      ? "text-destructive"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {m.direcao === "debito" ? "−" : "+"} R$ {m.valor.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="min-w-0 flex-1">
                  {Boolean(
                    (m.metadata as any)?.alterdataLancado ||
                      m.status === "descontado_folha",
                  ) &&
                    !isCompraBonificacao &&
                    !isLancamentoBonificacao && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <Check className="h-3 w-3 shrink-0" /> Contracheque
                      </span>
                    )}
                  {isCompraBonificacao && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      <Sparkles className="h-3 w-3 shrink-0 text-amber-500" /> Bonificação
                    </span>
                  )}
                </div>
                {statusLabel && (
                  <span
                    className={`inline-block shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}
                  >
                    {statusLabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visualização Desktop: Tabela completa */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição / Loja</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimentos.map((m) => {
              const isLancamentoBonificacao = m.tipo === "bonificacao" || m.tipo === "deducao";
              const isCompraBonificacao =
                m.tipo === "compra_loja" &&
                ((m.metadata as any)?.metodoPagamento === "bonificacao" ||
                  (m.metadata as any)?.metodo_pagamento === "bonificacao");

              const statusLabel =
                isCompraBonificacao && (m.status === "pago" || m.status === "aprovado")
                  ? "Pago (Bonificação)"
                  : isLancamentoBonificacao
                  ? null
                  : labelStatusMovimento(m.status, m.tipo);
              const badgeClass = getBadgeClass(m.status, isCompraBonificacao);

              return (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatarDataMovimento(m)}
                  </TableCell>
                  <TableCell className="max-w-[340px] text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {m.lojaNome && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                            <Store className="h-3 w-3" />
                            {m.lojaNome}
                          </span>
                        )}
                        <p className="font-medium text-foreground leading-snug">
                          {descricaoMovimento(m)}
                        </p>
                      </div>
                      {Boolean(
                        (m.metadata as any)?.alterdataLancado ||
                          m.status === "descontado_folha",
                      ) &&
                        !isCompraBonificacao &&
                        !isLancamentoBonificacao && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" /> Lançado no contracheque (Alterdata)
                          </span>
                        )}
                      {isCompraBonificacao && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          <Sparkles className="h-3 w-3 text-amber-500" /> Saldo de Bonificação
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium">
                    <span
                      className={
                        m.direcao === "debito"
                          ? "text-destructive"
                          : "text-emerald-600 dark:text-emerald-400"
                      }
                    >
                      {m.direcao === "debito" ? "−" : "+"} R$ {m.valor.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {statusLabel ? (
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}
                      >
                        {statusLabel}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
