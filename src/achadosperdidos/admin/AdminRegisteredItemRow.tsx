import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LostFoundItem, LostFoundItemStatus } from "@/achadosperdidos/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<LostFoundItemStatus, string> = {
  available: "Disponível",
  claimed_pending: "Pendente",
  returned: "Devolvido",
  archived: "Arquivado",
};

type Props = {
  item: LostFoundItem;
  formatDate: (value: string | null) => string;
  onUpdateStatus: (itemId: string, status: LostFoundItemStatus) => void;
};

export function AdminRegisteredItemRow({ item, formatDate, onUpdateStatus }: Props) {
  const thumb = item.image_urls?.[0];

  return (
    <div className="flex gap-3 rounded-lg border border-border p-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">—</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium leading-snug">{item.title}</p>
          <Badge
            variant={item.status === "claimed_pending" ? "default" : "secondary"}
            className={cn("text-[10px]", item.status === "claimed_pending" && "animate-pulse")}
          >
            {STATUS_LABELS[item.status]}
          </Badge>
          {item.category ? (
            <Badge variant="outline" className="text-[10px]">
              {item.category}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {item.found_location || "Sem local"} · {formatDate(item.found_at)}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          Cadastrado por: {item.registered_by_email || item.created_by || "-"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateStatus(item.id, "available")}>
            Disponível
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateStatus(item.id, "returned")}>
            Devolvido
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateStatus(item.id, "archived")}>
            Arquivar
          </Button>
        </div>
      </div>
    </div>
  );
}
