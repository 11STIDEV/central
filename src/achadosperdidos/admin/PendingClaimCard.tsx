import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatClaimDelivery } from "@/achadosperdidos/claimDisplay";
import type { LostFoundClaimRequest } from "@/achadosperdidos/types";
import { cn } from "@/lib/utils";

type Props = {
  claim: LostFoundClaimRequest;
  onClick: () => void;
};

export function PendingClaimCard({ claim, onClick }: Props) {
  const item = claim.item;
  const thumb = item?.image_urls?.[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full gap-3 rounded-lg border border-border p-3 text-left transition-all",
        "hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
            Sem foto
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-snug text-foreground">{item?.title || "Item não encontrado"}</p>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {claim.claimant_name} · {claim.claimant_phone || claim.claimant_email || "sem contato"}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{formatClaimDelivery(claim)}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px]">
            Aguardando análise
          </Badge>
          {item?.image_urls && item.image_urls.length > 1 ? (
            <Badge variant="secondary" className="text-[10px]">
              {item.image_urls.length} fotos
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  );
}
