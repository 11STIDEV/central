import { Clock, Loader2, Package, RotateCcw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LostFoundItem } from "@/achadosperdidos/types";
import type { LostFoundPublicStats } from "@/achadosperdidos/public/types";
import { LostFoundItemCard } from "@/achadosperdidos/public/components/LostFoundItemCard";
import { PublicEmptyState } from "@/achadosperdidos/public/components/PublicEmptyState";
import { PublicErrorState } from "@/achadosperdidos/public/components/PublicErrorState";

const STAT_CARDS = [
  {
    key: "available" as const,
    label: "Itens achados",
    icon: Package,
    iconClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  {
    key: "returned" as const,
    label: "Itens devolvidos",
    icon: RotateCcw,
    iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "total" as const,
    label: "Total de itens",
    icon: TrendingUp,
    iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  {
    key: "week" as const,
    label: "Esta semana",
    icon: Clock,
    iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
];

type Props = {
  loading: boolean;
  error: string | null;
  stats: LostFoundPublicStats;
  recentItems: LostFoundItem[];
  onRetry: () => void;
  onViewAll: () => void;
  onClaim?: (item: LostFoundItem) => void;
};

export function PainelView({
  loading,
  error,
  stats,
  recentItems,
  onRetry,
  onViewAll,
  onClaim,
}: Props) {
  function statValue(key: (typeof STAT_CARDS)[number]["key"]) {
    switch (key) {
      case "available":
        return stats.availableCount;
      case "returned":
        return stats.returnedCount;
      case "total":
        return stats.totalCount;
      case "week":
        return stats.thisWeekCount;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Itens Achados e Perdidos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Veja o que está acontecendo com os itens perdidos e achados hoje.
        </p>
      </div>

      {error ? <PublicErrorState message={error} onRetry={onRetry} /> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAT_CARDS.map(({ key, label, icon: Icon, iconClass }, index) => (
              <Card
                key={key}
                className="animate-fade-in border-border/80 bg-card/90 shadow-sm backdrop-blur-sm"
                style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
              >
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{statValue(key)}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconClass}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <section>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-foreground">Itens recentes</h3>
              <Button type="button" variant="link" className="h-auto p-0" onClick={onViewAll}>
                Ver todos
              </Button>
            </div>
            {recentItems.length === 0 ? (
              <PublicEmptyState
                icon={Package}
                title="Nenhum item disponível"
                description="Quando a secretaria cadastrar itens encontrados, eles aparecerão aqui."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentItems.map((item, index) => (
                  <LostFoundItemCard
                    key={item.id}
                    item={item}
                    showClaimButton
                    onClaim={onClaim}
                    style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
                    className="animate-fade-in"
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
