import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  DollarSign,
  Clock,
  TrendingUp,
  QrCode,
  CreditCard,
  ArrowRight,
  Info,
  Sparkles,
} from "lucide-react";
import { parceiroResumo } from "@/lib/parceiroApi";
import type { CcipayResumoParceiro } from "@/lib/ccipay";
import { Button } from "@/components/ui/button";
import type { ParceiroOutletContext } from "./ParceiroShell";

export default function ParceiroDashboard() {
  const { lojaId, loja, permiteVendaSemCelular } = useOutletContext<ParceiroOutletContext>();
  const [resumo, setResumo] = useState<CcipayResumoParceiro | null>(null);

  const carregar = useCallback(async () => {
    if (!lojaId) return;
    const data = await parceiroResumo(lojaId);
    setResumo(data);
  }, [lojaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="space-y-8">
      {/* Título e Boas-vindas */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Painel de vendas e controle de convênios para <strong className="text-foreground">{loja?.nome ?? "sua loja"}</strong>.
        </p>
      </div>

      {/* Ações Rápidas - Cards Destacados */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ações Rápidas • Nova Venda
          </h3>
        </div>

        <div className={`grid gap-4 ${permiteVendaSemCelular ? "sm:grid-cols-2" : "max-w-md"}`}>
          {/* Card 1: Pagar com QR Code */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <QrCode className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Pelo celular
                </span>
              </div>
              <h4 className="mt-3.5 text-base font-semibold text-foreground">Pagar com QR Code</h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Gere o código QR na tela. O colaborador abre o app Advance-CCI no celular e confirma a compra imediatamente.
              </p>
            </div>
            <Button asChild className="mt-5 w-full font-medium shadow-xs">
              <Link to="/venda?modo=qr">
                <QrCode className="mr-2 h-4 w-4" />
                Gerar venda com QR Code
                <ArrowRight className="ml-auto h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Card 2: Sem Celular (somente exibido se a loja tiver permissão) */}
          {permiteVendaSemCelular && (
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-border/80 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Sem celular
                  </span>
                </div>
                <h4 className="mt-3.5 text-base font-semibold text-foreground">Sem Celular (Matrícula / CPF)</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Colaborador sem o celular? Busque por matrícula, nome ou CPF, consulte o saldo disponível e debite em folha.
                </p>
              </div>
              <Button asChild variant="outline" className="mt-5 w-full font-medium hover:bg-muted">
                <Link to="/venda?modo=sem_celular">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Buscar Matrícula / CPF
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Resumo Financeiro do Mês - 3 Métricas */}
      {resumo && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Resumo do Mês
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Vendas Confirmadas"
              value={`R$ ${resumo.aReceber.toFixed(2)}`}
              hint="Compras feitas pelos colaboradores"
              icon={TrendingUp}
              tone="primary"
            />
            <KpiCard
              label="Já Repassado pelo CCI"
              value={`R$ ${(resumo.totalRepassado ?? 0).toFixed(2)}`}
              hint="Transferido para sua conta"
              icon={DollarSign}
              tone="emerald"
            />
            <KpiCard
              label="Saldo a Receber"
              value={`R$ ${(resumo.saldoDevendo !== undefined ? resumo.saldoDevendo : resumo.aReceber).toFixed(2)}`}
              hint="Pendente de repasse pela instituição"
              icon={Clock}
              tone="amber"
            />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-xs sm:text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p>
              Os colaboradores compram na sua loja e o valor é retido em folha de pagamento pelo <strong>Colégio CCI</strong>.
              O <strong>Saldo a Receber</strong> é o valor líquido que a instituição deve repassar para você após o fechamento.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "emerald" | "amber";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneMap[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
