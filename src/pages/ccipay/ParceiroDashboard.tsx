import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { DollarSign, Clock, TrendingUp, QrCode } from "lucide-react";
import { parceiroResumo } from "@/lib/parceiroApi";
import type { CcipayResumoParceiro } from "@/lib/ccipay";
import { Button } from "@/components/ui/button";
import type { ParceiroOutletContext } from "./ParceiroShell";

export default function ParceiroDashboard() {
  const { lojaId, loja } = useOutletContext<ParceiroOutletContext>();
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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Resumo de vendas de {loja?.nome ?? "sua loja"} no mês atual.
        </p>
      </div>

      {resumo && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="A receber (pagas)"
              value={`R$ ${resumo.aReceber.toFixed(2)}`}
              hint="Vendas confirmadas pelo colaborador"
              icon={DollarSign}
            />
            <KpiCard
              label="Aguardando pagamento"
              value={`R$ ${resumo.pendente.toFixed(2)}`}
              hint={`${resumo.qtdPendentes} QR code(s) pendente(s)`}
              icon={Clock}
            />
            <KpiCard
              label="Total do mês"
              value={`R$ ${resumo.totalMes.toFixed(2)}`}
              hint={`${resumo.vendasMes} venda(s) no mês`}
              icon={TrendingUp}
            />
            <div className="flex flex-col justify-center rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Ação rápida</p>
              <Button asChild className="mt-2">
                <Link to="/venda">
                  <QrCode className="mr-2 h-4 w-4" />
                  Gerar venda QR
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              O valor <strong>a receber</strong> corresponde às vendas em que o colaborador já
              escaneou o QR code e confirmou o pagamento (desconto em folha / saldo de
              bonificações).
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
