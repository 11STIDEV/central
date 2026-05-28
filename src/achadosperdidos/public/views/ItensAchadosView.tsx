import { useMemo, useState } from "react";
import { Loader2, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LOST_FOUND_CATEGORIES } from "@/achadosperdidos/constants";
import type { LostFoundItem } from "@/achadosperdidos/types";
import { LostFoundItemCard } from "@/achadosperdidos/public/components/LostFoundItemCard";
import { PublicEmptyState } from "@/achadosperdidos/public/components/PublicEmptyState";
import { PublicErrorState } from "@/achadosperdidos/public/components/PublicErrorState";
import { cn } from "@/lib/utils";

type Props = {
  items: LostFoundItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClaim: (item: LostFoundItem) => void;
};

export function ItensAchadosView({ items, loading, error, onRetry, onClaim }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = !category || item.category === category;
      if (!matchesCategory) return false;
      if (!query) return true;
      return [item.title, item.description ?? "", item.category ?? "", item.found_location ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [items, search, category]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Itens achados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Procure por itens encontrados. Se for seu, toque em &quot;Este item é meu&quot;.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, categoria ou local"
            className="pl-9"
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              !category ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            Todas
          </button>
          {LOST_FOUND_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                category === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error ? <PublicErrorState message={error} onRetry={onRetry} /> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <PublicEmptyState
          icon={Package}
          title="Nenhum item encontrado"
          description={
            items.length === 0
              ? "Não há itens disponíveis no momento. Volte mais tarde."
              : "Tente outra busca ou categoria."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((item, index) => (
            <LostFoundItemCard
              key={item.id}
              item={item}
              showClaimButton
              onClaim={onClaim}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(index, 8) * 50}ms`, animationFillMode: "both" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
