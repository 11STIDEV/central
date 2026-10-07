import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, ArrowLeft, User, Phone, Mail, Key, Sparkles } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { ccipayCriarAdiantamento, ccipayMe } from "@/lib/ccipay";

type Status = "idle" | "success" | "error";
type TipoPix = "cpf" | "telefone" | "email" | "aleatoria";

const TIPOS_PIX: { id: TipoPix; label: string; placeholder: string; icon: any }[] = [
  { id: "cpf", label: "CPF", placeholder: "000.000.000-00", icon: User },
  { id: "telefone", label: "Celular", placeholder: "(DDD) 99999-9999", icon: Phone },
  { id: "email", label: "E-mail", placeholder: "seu.email@portalcci.com.br", icon: Mail },
  { id: "aleatoria", label: "Chave Aleatória", placeholder: "Cole a chave aleatória (EVP)", icon: Key },
];

function formatarCpf(cpfStr?: string | null): string {
  if (!cpfStr) return "";
  const digits = String(cpfStr).replace(/\D/g, "").padStart(11, "0");
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export default function ValeAdiantamento() {
  const { googleIdToken } = useAuth();
  const [tipoPix, setTipoPix] = useState<TipoPix>("cpf");
  const [pix, setPix] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [erroMsg, setErroMsg] = useState("");
  const [disponivel, setDisponivel] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [meuCpf, setMeuCpf] = useState<string>("");
  const [meuEmail, setMeuEmail] = useState<string>("");

  const carregarLimite = useCallback(async () => {
    if (!googleIdToken) return;
    try {
      const r = await ccipayMe(googleIdToken);
      setDisponivel(r.adiantamentoDisponivel);
      if (r.alterdata?.cpf) setMeuCpf(formatarCpf(r.alterdata.cpf));
      if (r.funcionario?.email) setMeuEmail(r.funcionario.email);
      if (r.funcionario.pixPadrao && !pix) setPix(r.funcionario.pixPadrao);
    } catch {
      /* ignore */
    }
  }, [googleIdToken, pix]);

  useEffect(() => {
    void carregarLimite();
  }, [carregarLimite]);

  const tipoAtual = TIPOS_PIX.find((t) => t.id === tipoPix) || TIPOS_PIX[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleIdToken) return;

    if (!pix.trim() || !valor) {
      setStatus("error");
      setErroMsg("Informe a chave Pix e o valor.");
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
      await ccipayCriarAdiantamento(googleIdToken, pix.trim(), valorNumero, tipoPix);
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
        title="Solicitação de Vale / Pix / Adiantamento"
        subtitle="Preencha os dados para solicitar um vale/pix/adiantamento ao setor financeiro."
      />

      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/cci-pay">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Advance-CCI
          </Link>
        </Button>

        {disponivel != null && (
          <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4 text-sm flex items-center justify-between">
            <span>Limite disponível nesta competência:</span>
            <strong className="text-base font-bold text-primary">R$ {disponivel.toFixed(2)}</strong>
          </div>
        )}

        {status === "success" && (
          <Alert className="mb-4 border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/10 dark:text-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Solicitação enviada com sucesso!</AlertTitle>
            <AlertDescription>
              Seu pedido foi registrado com status <strong>Pendente</strong> e passará pela aprovação do DP e posterior depósito pelo Financeiro.
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
          className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-card"
        >
          {/* Seletor de Tipo de Chave Pix */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-card-foreground">
              Tipo de Chave Pix
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIPOS_PIX.map((t) => {
                const Icon = t.icon;
                const selecionado = tipoPix === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTipoPix(t.id);
                      setStatus("idle");
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                      selecionado
                        ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30 font-semibold"
                        : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campo da Chave Pix */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Chave Pix ({tipoAtual.label})
              </label>

              {/* Atalho para CPF cadastrado */}
              {tipoPix === "cpf" && meuCpf && pix !== meuCpf && (
                <button
                  type="button"
                  onClick={() => {
                    setPix(meuCpf);
                    setStatus("idle");
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  Usar meu CPF ({meuCpf})
                </button>
              )}

              {/* Atalho para E-mail cadastrado */}
              {tipoPix === "email" && meuEmail && pix !== meuEmail && (
                <button
                  type="button"
                  onClick={() => {
                    setPix(meuEmail);
                    setStatus("idle");
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  Usar meu e-mail ({meuEmail})
                </button>
              )}
            </div>

            <Input
              placeholder={tipoAtual.placeholder}
              value={pix}
              onChange={(e) => {
                setStatus("idle");
                setPix(e.target.value);
              }}
              className="font-mono text-sm"
            />
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Valor Solicitado (R$)</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Ex: 150.00"
              value={valor}
              onChange={(e) => {
                setStatus("idle");
                setValor(e.target.value);
              }}
              className="text-sm font-semibold"
            />
          </div>

          <Button type="submit" disabled={enviando} className="w-full">
            {enviando ? "Enviando solicitação..." : "Confirmar Solicitação de Vale / Pix / Adiantamento"}
          </Button>
        </form>
      </div>
    </div>
  );
}
