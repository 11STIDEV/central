import { useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import QRCode from "react-qr-code";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  parceiroCriarVendaQr,
  parceiroListarVendasQr,
  parceiroBuscarColaborador,
  parceiroLancarVendaDireta,
  type ColaboradorConvenioBusca,
} from "@/lib/parceiroApi";
import { centralPagamentoQrUrl } from "@/parceiro/parceiroSessionApi";
import type { CcipayVendaQr } from "@/lib/ccipay";
import type { ParceiroOutletContext } from "./ParceiroShell";
import { toast } from "sonner";
import {
  QrCode,
  CreditCard,
  Search,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Receipt,
  User,
  Hash,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Link2,
} from "lucide-react";

export default function ParceiroVenda() {
  const { lojaId, loja } = useOutletContext<ParceiroOutletContext>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Modo da venda: "qr" (colaborador escaneia) | "sem_celular" (busca por matrícula/CPF)
  const modoParam = searchParams.get("modo");
  const [modoVenda, setModoVenda] = useState<"qr" | "sem_celular">(
    modoParam === "sem_celular" ? "sem_celular" : "qr"
  );

  useEffect(() => {
    if (modoParam === "sem_celular" || modoParam === "qr") {
      setModoVenda(modoParam);
    }
  }, [modoParam]);

  const alternarModo = (novoModo: "qr" | "sem_celular") => {
    setModoVenda(novoModo);
    setSearchParams({ modo: novoModo }, { replace: true });
  };

  // --- Estados do Modo QR Code ---
  const [valorQr, setValorQr] = useState("");
  const [descricaoQr, setDescricaoQr] = useState("");
  const [vendaQr, setVendaQr] = useState<CcipayVendaQr | null>(null);
  const [erroQr, setErroQr] = useState<string | null>(null);
  const [gerandoQr, setGerandoQr] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // --- Estados do Modo Sem Celular (Matrícula / CPF) ---
  const [termoBusca, setTermoBusca] = useState("");
  const [buscandoColaborador, setBuscandoColaborador] = useState(false);
  const [colaboradorEncontrado, setColaboradorEncontrado] = useState<ColaboradorConvenioBusca | null>(null);
  const [erroBusca, setErroBusca] = useState<string | null>(null);

  const [valorDireto, setValorDireto] = useState("");
  const [descricaoDireta, setDescricaoDireta] = useState("");
  const [lancandoDireto, setLancandoDireto] = useState(false);
  const [vendaConcluida, setVendaConcluida] = useState<{
    valor: number;
    colaboradorNome: string;
    colaboradorMatricula: string;
    movimentoId?: string;
    dataHora: string;
  } | null>(null);

  // Handlers Modo QR Code
  async function gerarQr(e: React.FormEvent) {
    e.preventDefault();
    if (!lojaId) return;
    setErroQr(null);
    setVendaQr(null);
    const v = Number(valorQr.replace(",", "."));
    if (Number.isNaN(v) || v <= 0) {
      setErroQr("Informe um valor válido.");
      return;
    }
    setGerandoQr(true);
    try {
      const { venda: nova } = await parceiroCriarVendaQr(lojaId, v, descricaoQr.trim());
      setVendaQr(nova);
    } catch (err) {
      setErroQr(err instanceof Error ? err.message : "Erro ao gerar QR code.");
    } finally {
      setGerandoQr(false);
    }
  }

  function novaVendaQr() {
    setVendaQr(null);
    setValorQr("");
    setDescricaoQr("");
    setErroQr(null);
    setLinkCopiado(false);
  }

  // Handlers Modo Sem Celular
  async function buscarColaborador(e: React.FormEvent) {
    e.preventDefault();
    if (!lojaId) return;
    const t = termoBusca.trim();
    if (!t) {
      setErroBusca("Informe a matrícula, CPF ou e-mail do colaborador.");
      return;
    }
    setBuscandoColaborador(true);
    setErroBusca(null);
    setColaboradorEncontrado(null);
    try {
      const resp = await parceiroBuscarColaborador(lojaId, t);
      if (resp.colaborador) {
        setColaboradorEncontrado(resp.colaborador);
      } else {
        setErroBusca("Colaborador não encontrado.");
      }
    } catch (err) {
      setErroBusca(err instanceof Error ? err.message : "Colaborador não encontrado.");
    } finally {
      setBuscandoColaborador(false);
    }
  }

  async function confirmarVendaDireta(e: React.FormEvent) {
    e.preventDefault();
    if (!lojaId || !colaboradorEncontrado) return;

    const v = Number(valorDireto.replace(",", "."));
    if (Number.isNaN(v) || v <= 0) {
      toast.error("Informe um valor de compra válido.");
      return;
    }

    if (v > colaboradorEncontrado.saldoDisponivel) {
      toast.error(
        `Saldo insuficiente no convênio. Disponível: R$ ${colaboradorEncontrado.saldoDisponivel.toFixed(2)}`
      );
      return;
    }

    setLancandoDireto(true);
    try {
      const resp = await parceiroLancarVendaDireta(
        lojaId,
        colaboradorEncontrado.email,
        v,
        descricaoDireta.trim() || "Compra no convênio (sem celular)"
      );

      setVendaConcluida({
        valor: v,
        colaboradorNome: colaboradorEncontrado.nome,
        colaboradorMatricula: colaboradorEncontrado.matricula,
        movimentoId: resp.movimento?.id,
        dataHora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      });

      toast.success("Venda lançada com sucesso no convênio!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao lançar venda.");
    } finally {
      setLancandoDireto(false);
    }
  }

  function reiniciarVendaSemCelular() {
    setColaboradorEncontrado(null);
    setTermoBusca("");
    setValorDireto("");
    setDescricaoDireta("");
    setErroBusca(null);
    setVendaConcluida(null);
  }

  const payUrl = vendaQr ? centralPagamentoQrUrl(vendaQr.token) : "";

  // Polling para detectar pagamento do QR Code em tempo real
  useEffect(() => {
    if (!lojaId || !vendaQr || vendaQr.status !== "pendente") return;

    const interval = setInterval(async () => {
      try {
        const resp = await parceiroListarVendasQr(lojaId, { limite: 10 });
        const atual = resp.vendas?.find((v) => v.id === vendaQr.id || v.token === vendaQr.token);
        if (atual && atual.status !== "pendente") {
          setVendaQr(atual);
          if (atual.status === "pago") {
            toast.success("Pagamento recebido com sucesso!");
          }
        }
      } catch {
        // Silencioso em caso de erro transitório de rede
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [lojaId, vendaQr?.id, vendaQr?.status, vendaQr?.token]);

  async function copiarLinkPagamento() {
    if (!payUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payUrl);
      } else {
        const input = document.createElement("textarea");
        input.value = payUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setLinkCopiado(true);
      toast.success("Link de pagamento copiado!");
      setTimeout(() => setLinkCopiado(false), 2500);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  function compartilharWhatsApp() {
    if (!payUrl || !vendaQr) return;
    const msg = `Olá! Segue o link para confirmação do pagamento no valor de R$ ${vendaQr.valor.toFixed(2)}${
      vendaQr.descricao ? ` (${vendaQr.descricao})` : ""
    }:\n${payUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Registro de Venda</h2>
          <p className="text-sm text-muted-foreground">
            Lançamento de compras conveniadas em <strong className="text-foreground">{loja?.nome}</strong>.
          </p>
        </div>

        {/* Alternador de Modo de Venda */}
        <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => alternarModo("qr")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              modoVenda === "qr"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>Pagar com QR Code</span>
          </button>
          <button
            type="button"
            onClick={() => alternarModo("sem_celular")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              modoVenda === "sem_celular"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Sem Celular (Matrícula / CPF)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODO 1: QR CODE (Colaborador lê com celular)             */}
      {/* ========================================================= */}
      {modoVenda === "qr" && (
        <>
          {!vendaQr ? (
            <form
              onSubmit={gerarQr}
              className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="border-b border-border/60 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cobrança por QR Code
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Informe o valor para gerar o QR code na tela para o colaborador escanear.
                </p>
              </div>

              {erroQr && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{erroQr}</AlertDescription>
                </Alert>
              )}

              <div>
                <label className="text-xs font-semibold text-card-foreground">Valor da Venda (R$) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={valorQr}
                  onChange={(e) => setValorQr(e.target.value)}
                  className="mt-1 text-lg font-bold"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-card-foreground">Descrição (opcional)</label>
                <Input
                  placeholder="Ex.: Almoço, lanche, medicamentos..."
                  value={descricaoQr}
                  onChange={(e) => setDescricaoQr(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>

              <Button type="submit" className="w-full py-5 text-base gap-2" disabled={gerandoQr}>
                {gerandoQr ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando QR code...
                  </>
                ) : (
                  <>
                    <QrCode className="h-5 w-5" />
                    Gerar QR Code na Tela
                  </>
                )}
              </Button>
            </form>
          ) : vendaQr.status === "pago" ? (
            <div className="mx-auto max-w-sm space-y-4 rounded-xl border border-emerald-500/30 bg-card p-6 text-center shadow-md animate-fade-in">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">Pagamento Confirmado!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  O colaborador concluiu o pagamento com sucesso.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between items-center border-b border-border/60 pb-2">
                  <span className="text-xs text-muted-foreground">Valor:</span>
                  <strong className="text-lg font-bold text-foreground">
                    R$ {vendaQr.valor.toFixed(2)}
                  </strong>
                </div>
                {vendaQr.colaboradorNome && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Colaborador:</span>
                    <span className="font-semibold text-foreground">{vendaQr.colaboradorNome}</span>
                  </div>
                )}
                {vendaQr.descricao && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Descrição:</span>
                    <span className="text-foreground">{vendaQr.descricao}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button className="w-full gap-2" onClick={novaVendaQr}>
                  <RotateCcw className="h-4 w-4" />
                  Nova Venda
                </Button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 text-center shadow-md">
              <div className="mx-auto inline-block rounded-2xl border-4 border-primary/20 bg-white p-5 shadow-xs">
                <QRCode value={payUrl} size={220} />
              </div>

              <div>
                <p className="text-3xl font-extrabold text-foreground tracking-tight">
                  R$ {vendaQr.valor.toFixed(2)}
                </p>
                {vendaQr.descricao && (
                  <p className="text-sm font-medium text-muted-foreground mt-1">{vendaQr.descricao}</p>
                )}
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Aguardando leitura do colaborador...
                </div>
              </div>

              {/* Seção Link de Pagamento */}
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                    Link de Pagamento
                  </span>
                  <span className="text-[11px] text-muted-foreground">Copie ou envie</span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={payUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="text-xs font-mono bg-background text-muted-foreground h-9 selection:bg-primary/20"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={linkCopiado ? "default" : "secondary"}
                    onClick={copiarLinkPagamento}
                    className="shrink-0 h-9 gap-1.5 px-3"
                    title="Copiar link de pagamento"
                  >
                    {linkCopiado ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => window.open(payUrl, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir Link
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-500/30 dark:hover:bg-emerald-950/30"
                    onClick={compartilharWhatsApp}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="outline" className="w-full gap-2" onClick={novaVendaQr}>
                  <RotateCcw className="h-4 w-4" />
                  Nova Venda
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* MODO 2: VENDA SEM CELULAR (Busca por Matrícula / CPF)      */}
      {/* ========================================================= */}
      {modoVenda === "sem_celular" && (
        <div className="mx-auto max-w-lg space-y-5">
          {/* Se a venda já foi concluída, exibe comprovante de sucesso */}
          {vendaConcluida ? (
            <div className="rounded-xl border border-emerald-500/30 bg-card p-6 text-center shadow-md space-y-4 animate-fade-in">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">Venda Concluída com Sucesso!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Débito registrado no convênio do colaborador.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between items-center border-b border-border/60 pb-2">
                  <span className="text-xs text-muted-foreground">Valor Cobrado:</span>
                  <strong className="text-lg font-bold text-foreground">
                    R$ {vendaConcluida.valor.toFixed(2)}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Colaborador:</span>
                  <span className="font-semibold text-foreground">{vendaConcluida.colaboradorNome}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Matrícula:</span>
                  <span className="font-mono text-foreground">{vendaConcluida.colaboradorMatricula}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Horário:</span>
                  <span>{vendaConcluida.dataHora}</span>
                </div>
              </div>

              <Button onClick={reiniciarVendaSemCelular} className="w-full gap-2 py-5">
                <RotateCcw className="h-4 w-4" />
                Realizar Nova Venda
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-base text-foreground">
                    Venda sem Celular — Convênio CCI
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Identifique o colaborador pela matrícula institucional ou CPF para lançar a compra diretamente.
                </p>
              </div>

              {/* Etapa 1: Busca do Colaborador */}
              <form onSubmit={buscarColaborador} className="space-y-3">
                <label className="text-xs font-semibold text-card-foreground">
                  1. Localizar Colaborador (CPF, Matrícula ou Nome)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Digite o CPF, matrícula ou nome..."
                      value={termoBusca}
                      onChange={(e) => {
                        setTermoBusca(e.target.value);
                        setErroBusca(null);
                      }}
                      className="pl-9 text-sm"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" disabled={buscandoColaborador} className="shrink-0 gap-1.5 font-medium">
                    {buscandoColaborador ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Buscar
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Dica: você pode digitar o CPF com ou sem pontuação (ex: 000.000.000-00), a matrícula ou o nome completo.
                </p>

                {erroBusca && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{erroBusca}</AlertDescription>
                  </Alert>
                )}
              </form>

              {/* Etapa 2: Confirmação e Dados do Colaborador */}
              {colaboradorEncontrado && (
                <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{colaboradorEncontrado.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono">
                          <span>Matrícula: {colaboradorEncontrado.matricula}</span>
                          {colaboradorEncontrado.cpfMascarado && (
                            <span>· CPF: {colaboradorEncontrado.cpfMascarado}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant={colaboradorEncontrado.ativo ? "default" : "destructive"} className="text-[10px]">
                      {colaboradorEncontrado.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  {/* Saldo Disponível de Convênio */}
                  <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Limite disponível para compras (folha):</span>
                    <strong
                      className={`text-base font-bold ${
                        colaboradorEncontrado.saldoDisponivel > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      }`}
                    >
                      R$ {colaboradorEncontrado.saldoDisponivel.toFixed(2)}
                    </strong>
                  </div>

                  {/* Formulário de Lançamento de Compra */}
                  <form onSubmit={confirmarVendaDireta} className="space-y-3 pt-2 border-t border-border/60">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-card-foreground">Valor da Compra (R$) *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={colaboradorEncontrado.saldoDisponivel}
                        placeholder="Ex: 18.50"
                        value={valorDireto}
                        onChange={(e) => setValorDireto(e.target.value)}
                        className="text-base font-bold"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-card-foreground">Descrição (opcional)</label>
                      <Input
                        placeholder="Ex: Almoço / Lanche..."
                        value={descricaoDireta}
                        onChange={(e) => setDescricaoDireta(e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setColaboradorEncontrado(null)}
                        className="w-1/3"
                      >
                        Trocar
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          lancandoDireto ||
                          !valorDireto ||
                          Number(valorDireto) <= 0 ||
                          Number(valorDireto) > colaboradorEncontrado.saldoDisponivel
                        }
                        className="w-2/3 py-5 text-sm gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {lancandoDireto ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Confirmando...
                          </>
                        ) : (
                          <>
                            <Receipt className="h-4 w-4" />
                            Confirmar e Cobrar
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
