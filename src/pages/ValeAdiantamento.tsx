import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { ccipayCriarAdiantamento, ccipayMe } from "@/lib/ccipay";

type Status = "idle" | "success" | "error";

export default function ValeAdiantamento() {
  const { googleIdToken } = useAuth();
  const [pix, setPix] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [erroMsg, setErroMsg] = useState("");
  const [disponivel, setDisponivel] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregarLimite = useCallback(async () => {
    if (!googleIdToken) return;
    try {
      const r = await ccipayMe(googleIdToken);
      setDisponivel(r.adiantamentoDisponivel);
      if (r.funcionario.pixPadrao && !pix) setPix(r.funcionario.pixPadrao);
    } catch {
      /* ignore */
    }
  }, [googleIdToken, pix]);

  useEffect(() => {
    void carregarLimite();
  }, [carregarLimite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleIdToken) return;

    if (!pix.trim() || !valor) {
      setStatus("error");
      setErroMsg("Informe Pix e valor.");
      return;
    }

    const valorNumero = Number(valor.replace(",", "."));
    if (Number.isNaN(valorNumero) || valorNumero <= 0) {
      setStatus("error");
      setErroMsg("Valor inválido.");
      return;
    }

    setEnviando(true);
    setStatus("idle");
    try {
      await ccipayCriarAdiantamento(googleIdToken, pix.trim(), valorNumero);
      setStatus("success");
      setPix("");
      setValor("");
      void carregarLimite();
    } catch (err) {
      setStatus("error");
      setErroMsg(err instanceof Error ? err.message : "Falha ao enviar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Solicitação de Vale-Adiantamento"
        subtitle="Preencha os dados para solicitar um vale-adiantamento ao setor financeiro."
      />

      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/cci-pay">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao CCI Pay
          </Link>
        </Button>

        {disponivel != null && (
          <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4 text-sm">
            Limite disponível nesta competência:{" "}
            <strong>R$ {disponivel.toFixed(2)}</strong>
          </div>
        )}

        {status === "success" && (
          <Alert className="mb-4 border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/10 dark:text-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Solicitação enviada</AlertTitle>
            <AlertDescription>
              Seu pedido foi registrado e será analisado pelo financeiro.
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{erroMsg}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Chave Pix</label>
            <Input
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              value={pix}
              onChange={(e) => {
                setStatus("idle");
                setPix(e.target.value);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={valor}
              onChange={(e) => {
                setStatus("idle");
                setValor(e.target.value);
              }}
            />
          </div>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </form>
      </div>
    </div>
  );
}
