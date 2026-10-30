import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, Wallet } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayMe,
  ccipayObterVendaQr,
  ccipayPagarVendaQr,
  labelStatusVendaQr,
  type CcipayResumo,
  type CcipayVendaQr,
} from "@/lib/ccipay";

export default function CcipayPagarQr() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const { googleIdToken, usuario } = useAuth();
  const [venda, setVenda] = useState<CcipayVendaQr | null>(null);
  const [resumo, setResumo] = useState<CcipayResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<{ mensagem: string } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [metodo, setMetodo] = useState<"adiantamento" | "bonificacao">(
    searchParams.get("metodo") === "bonificacao" ? "bonificacao" : "adiantamento",
  );

  const carregar = useCallback(async () => {
    if (!token || (!usuario && !googleIdToken)) {
      console.warn("[CcipayPagarQr] Aguardando autenticação ou token...", { temToken: Boolean(token), temIdToken: Boolean(googleIdToken) });
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      console.log(`[CcipayPagarQr] Carregando venda QR (${token})...`);
      const [{ venda: v }, res] = await Promise.all([
        ccipayObterVendaQr(googleIdToken, token),
        ccipayMe(googleIdToken),
      ]);
      console.log("[CcipayPagarQr] Venda e limites obtidos:", { venda: v, resumo: res });
      setVenda(v);
      setResumo(res);
    } catch (e) {
      console.error("[CcipayPagarQr] Erro ao carregar venda QR:", e);
      setErro(e instanceof Error ? e.message : "Venda não encontrada ou expirada.");
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken, token, usuario]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function confirmarPagamento() {
    if (!token) return;
    setPagando(true);
    setErro(null);
    try {
      console.log(`[CcipayPagarQr] Confirmando pagamento do token ${token} via ${metodo}...`);
      await ccipayPagarVendaQr(googleIdToken, token, metodo);
      console.log("[CcipayPagarQr] Pagamento confirmado com sucesso!");
      setSucesso({
        mensagem:
          metodo === "bonificacao"
            ? "Pagamento confirmado com Saldo de Bonificação! O valor foi deduzido das suas premiações."
            : "Pagamento confirmado! O valor será descontado em folha.",
      });
      await carregar();
    } catch (e) {
      console.error("[CcipayPagarQr] Falha ao confirmar pagamento:", e);
      setErro(e instanceof Error ? e.message : "Falha ao pagar.");
    } finally {
      setPagando(false);
    }
  }

  const saldoInsuficiente =
    Boolean(venda && resumo) &&
    ((metodo === "bonificacao" && (resumo?.saldoBonificacao ?? 0) < (venda?.valor ?? 0)) ||
      (metodo === "adiantamento" && (resumo?.adiantamentoDisponivel ?? 0) < (venda?.valor ?? 0)));

  return (
    <div className="animate-fade-in">
      <PageHero title="Pagamento Advance-CCI" subtitle="Confirme a compra escaneada via QR code." />

      <div className="mx-auto max-w-md space-y-4 px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cci-pay">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Advance-CCI
          </Link>
        </Button>

        {carregando && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        )}

        {erro && (
          <Alert variant="destructive">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {sucesso && (
          <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription>{sucesso.mensagem}</AlertDescription>
          </Alert>
        )}

        {venda && !carregando && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <p className="text-xs text-muted-foreground">Loja parceira</p>
              <p className="font-medium text-base text-foreground">{venda.lojaNome}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Valor a pagar</p>
              <p className="text-3xl font-bold text-foreground">R$ {venda.valor.toFixed(2)}</p>
              {venda.descricao && (
                <p className="text-sm text-muted-foreground mt-0.5">{venda.descricao}</p>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium text-foreground">{labelStatusVendaQr(venda.status)}</p>
            </div>

            {/* Seleção do Método de Pagamento */}
            {venda.status === "pendente" && resumo && (
              <div className="space-y-2 pt-1 border-t border-border/60">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Escolha a origem do pagamento
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodo("bonificacao")}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      metodo === "bonificacao"
                        ? "border-amber-500 bg-amber-500/10 text-foreground ring-1 ring-amber-500"
                        : "border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Bonificação
                    </div>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      R$ {resumo.saldoBonificacao.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Saldo do DP</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodo("adiantamento")}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      metodo === "adiantamento"
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                        : "border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs">
                      <Wallet className="h-3.5 w-3.5 text-primary" />
                      Adiantamento
                    </div>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      R$ {resumo.adiantamentoDisponivel.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Desconto em folha</p>
                  </button>
                </div>

                {/* Alertas de saldo insuficiente */}
                {metodo === "bonificacao" && resumo.saldoBonificacao < venda.valor && (
                  <p className="text-xs text-destructive font-medium pt-1">
                    Saldo de bonificação insuficiente (R$ {resumo.saldoBonificacao.toFixed(2)}) para esta compra de R$ {venda.valor.toFixed(2)}.
                  </p>
                )}
                {metodo === "adiantamento" && resumo.adiantamentoDisponivel < venda.valor && (
                  <p className="text-xs text-destructive font-medium pt-1">
                    Limite disponível insuficiente (R$ {resumo.adiantamentoDisponivel.toFixed(2)}) para esta compra de R$ {venda.valor.toFixed(2)}.
                  </p>
                )}
              </div>
            )}

            {venda.status === "pendente" && !sucesso && (
              <Button
                className="w-full"
                onClick={() => void confirmarPagamento()}
                disabled={pagando || saldoInsuficiente}
              >
                {pagando
                  ? "Processando..."
                  : metodo === "bonificacao"
                  ? "Confirmar pagamento com Bonificação"
                  : "Confirmar pagamento com Adiantamento"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
