import { Loader2, RotateCcw } from "lucide-react";
import type { LostFoundItem } from "@/achadosperdidos/types";
import { LostFoundItemCard } from "@/achadosperdidos/public/components/LostFoundItemCard";
import { PublicEmptyState } from "@/achadosperdidos/public/components/PublicEmptyState";
import { PublicErrorState } from "@/achadosperdidos/public/components/PublicErrorState";

type Props = {
  items: LostFoundItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function DevolvidosView({ items, loading, error, onRetry }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Itens devolvidos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Itens que já foram devolvidos aos donos. Esta lista é apenas para consulta.
        </p>
      </div>

      {error ? <PublicErrorState message={error} onRetry={onRetry} /> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <PublicEmptyState
          icon={RotateCcw}
          title="Nenhum item devolvido ainda"
          description="Quando um item for devolvido pela secretaria, ele aparecerá nesta galeria."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <LostFoundItemCard
              key={item.id}
              item={item}
              showClaimButton={false}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(index, 8) * 50}ms`, animationFillMode: "both" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
