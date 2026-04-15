import { useState } from "react";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

type Status = "idle" | "success" | "error";

export default function ValeAdiantamento() {
  const { usuario } = useAuth();
  const [pix, setPix] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!pix.trim() || !valor) {
      setStatus("error");
      return;
    }

    const valorNumero = Number(valor.replace(",", "."));
    if (Number.isNaN(valorNumero) || valorNumero <= 0) {
      setStatus("error");
      return;
    }

    const dataSolicitacao = new Date().toISOString().slice(0, 10);

    // Aqui futuramente vamos enviar para a API / banco
    // e registrar para o financeiro avaliar.
    console.log("Solicitação de vale-adiantamento:", {
      nome: usuario?.nome ?? "",
      email: usuario?.email ?? "",
      dataSolicitacao,
      pix,
      valor: valorNumero,
    });

    setStatus("success");
    setPix("");
    setValor("");
  };

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Solicitação de Vale-Adiantamento"
        subtitle="Preencha os dados para solicitar um vale-adiantamento ao setor financeiro."
      />

      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
        <div className="mb-6 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p>
            Informe a <strong>chave Pix</strong> de recebimento e o <strong>valor</strong> desejado.
            Seu nome, e-mail e a data da solicitação são registrados automaticamente com base na
            sua conta e na data de envio.
          </p>
        </div>

        {status === "success" && (
          <Alert className="mb-4 border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/10 dark:text-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Solicitação enviada</AlertTitle>
            <AlertDescription>
              Seu pedido de vale-adiantamento foi registrado e será analisado pelo setor financeiro.
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Verifique os dados</AlertTitle>
            <AlertDescription>
              Informe uma chave Pix válida e um valor maior que zero.
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Chave Pix para recebimento
            </label>
            <Input
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              value={pix}
              onChange={(e) => {
                setStatus("idle");
                setPix(e.target.value);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Valor do vale-adiantamento (R$)
            </label>
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

          <div className="pt-2">
            <Button type="submit">
              Enviar solicitação
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

