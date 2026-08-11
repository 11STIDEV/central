import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LostFoundItem, LostFoundItemStatus } from "@/achadosperdidos/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<LostFoundItemStatus, string> = {
  available: "Disponível",
  claimed_pending: "Pendente",
  returned: "Devolvido",
  archived: "Arquivado",
  donation: "Doação",
};

type Props = {
  item: LostFoundItem;
  formatDate: (value: string | null) => string;
  onUpdateStatus: (itemId: string, status: LostFoundItemStatus) => void;
  onEdit: (item: LostFoundItem) => void;
};

export function AdminRegisteredItemRow({ item, formatDate, onUpdateStatus, onEdit }: Props) {
  const thumb = item.image_urls?.[0];
  const foiEditado = item.was_edited ?? false;
  const itemEntregue = item.status === "returned" || Boolean(item.returned_at);
  const itemDoacao = item.status === "donation";
  const podeEditar = !itemEntregue && !itemDoacao;

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
          {foiEditado ? (
            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400">
              Alterado
            </Badge>
          ) : null}
          {itemDoacao ? (
            <Badge variant="outline" className="border-violet-500/50 bg-violet-500/10 text-[10px] text-violet-700 dark:text-violet-400">
              Doação
            </Badge>
          ) : null}
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
        {item.returned_by_email || item.returned_at ? (
          <p className="line-clamp-1 text-xs text-emerald-700/90 dark:text-emerald-400/90">
            Entregue por: {item.returned_by_email || item.returned_by || "-"}
            {item.returned_at ? ` · ${formatDate(item.returned_at)}` : ""}
          </p>
        ) : null}
        {item.donated_at ? (
          <p className="line-clamp-1 text-xs text-violet-700/90 dark:text-violet-400/90">
            Encaminhado para doação em {formatDate(item.donated_at)}
          </p>
        ) : null}
        {foiEditado && item.edited_at ? (
          <p className="line-clamp-1 text-xs text-amber-700/80 dark:text-amber-400/80">
            Editado em {formatDate(item.edited_at)}
            {item.edited_by ? ` · ${item.edited_by}` : ""}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {podeEditar ? (
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => onEdit(item)}>
              <Pencil className="mr-1 h-3 w-3" />
              Editar
            </Button>
          ) : null}
          {!itemDoacao ? (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateStatus(item.id, "available")}>
                Disponível
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateStatus(item.id, "returned")}>
                Devolvido
              </Button>
            </>
          ) : null}
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateStatus(item.id, "archived")}>
            Arquivar
          </Button>
        </div>
      </div>
    </div>
  );
}
