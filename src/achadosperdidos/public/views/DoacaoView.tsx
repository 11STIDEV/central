import { Gift, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DONATION_RETENTION_DAYS, LOST_FOUND_DONATION_POLICY_MESSAGE } from "@/achadosperdidos/constants";
import { DonationPolicyBanner } from "@/achadosperdidos/public/components/DonationPolicyBanner";
import { PublicErrorState } from "@/achadosperdidos/public/components/PublicErrorState";

type Props = {
  loading: boolean;
  error: string | null;
  donationCount: number;
  onRetry: () => void;
};

export function DoacaoView({ loading, error, donationCount, onRetry }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Doação</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Itens não retirados dentro do prazo são encaminhados para doação institucional.
        </p>
      </div>

      <DonationPolicyBanner />

      {error ? <PublicErrorState message={error} onRetry={onRetry} /> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Gift className="h-7 w-7" />
            </div>
            <div className="max-w-lg space-y-2">
              <p className="text-3xl font-bold tabular-nums text-foreground">{donationCount}</p>
              <p className="text-sm font-medium text-foreground">
                {donationCount === 1
                  ? "item encaminhado para doação"
                  : "itens encaminhados para doação"}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Por privacidade, os objetos encaminhados à doação não são exibidos nesta vitrine.
                Após {DONATION_RETENTION_DAYS} dias do cadastro sem retirada, o item sai de &quot;Itens
                achados&quot; e passa a constar apenas aqui, de forma agregada.
              </p>
              <p className="text-xs text-muted-foreground">{LOST_FOUND_DONATION_POLICY_MESSAGE}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
