import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayMe,
  ccipayObterVendaQr,
  ccipayPagarVendaQr,
  labelStatusVendaQr,
  type CcipayVendaQr,
} from "@/lib/ccipay";

export default function CcipayPagarQr() {
  const { token } = useParams<{ token: string }>();
  const { googleIdToken } = useAuth();
  const [venda, setVenda] = useState<CcipayVendaQr | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [pagando, setPagando] = useState(false);

  const carregar = useCallback(async () => {
    if (!googleIdToken || !token) return;
    setCarregando(true);
    setErro(null);
    try {
      const [{ venda: v }, resumo] = await Promise.all([
        ccipayObterVendaQr(googleIdToken, token),
        ccipayMe(googleIdToken),
      ]);
      setVenda(v);
      setSaldo(resumo.saldoBonificacao);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Venda não encontrada.");
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken, token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function confirmarPagamento() {
    if (!googleIdToken || !token) return;
    setPagando(true);
    setErro(null);
    try {
      await ccipayPagarVendaQr(googleIdToken, token);
      setSucesso(true);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao pagar.");
    } finally {
      setPagando(false);
    }
  }

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
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Pagamento confirmado! O valor será descontado em folha.</AlertDescription>
          </Alert>
        )}

        {venda && !carregando && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Loja parceira</p>
              <p className="font-medium">{venda.lojaNome}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-3xl font-bold">R$ {venda.valor.toFixed(2)}</p>
              {venda.descricao && (
                <p className="text-sm text-muted-foreground">{venda.descricao}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium">{labelStatusVendaQr(venda.status)}</p>
            </div>
            {saldo !== null && venda.status === "pendente" && (
              <p className="text-sm text-muted-foreground">
                Seu saldo disponível: <strong>R$ {saldo.toFixed(2)}</strong>
              </p>
            )}
            {venda.status === "pendente" && !sucesso && (
              <Button className="w-full" onClick={() => void confirmarPagamento()} disabled={pagando}>
                {pagando ? "Processando..." : "Confirmar pagamento"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
