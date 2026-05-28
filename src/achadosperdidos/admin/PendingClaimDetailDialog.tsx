import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Mail, Phone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatClaimDelivery } from "@/achadosperdidos/claimDisplay";
import type { LostFoundClaimRequest } from "@/achadosperdidos/types";
import { cn } from "@/lib/utils";

function formatDate(value: string | null): string {
  if (!value) return "-";
  try {
    return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return value;
  }
}

type Props = {
  claim: LostFoundClaimRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (claim: LostFoundClaimRequest) => void;
  onReject: (claim: LostFoundClaimRequest) => void;
  reviewing: boolean;
};

export function PendingClaimDetailDialog({
  claim,
  open,
  onOpenChange,
  onApprove,
  onReject,
  reviewing,
}: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);

  if (!claim) return null;

  const item = claim.item;
  const images = item?.image_urls?.filter(Boolean) ?? [];
  const hasMultiple = images.length > 1;

  function handleOpenChange(next: boolean) {
    if (!next) setPhotoIndex(0);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
          <DialogTitle className="pr-8 text-lg leading-snug">
            {item?.title || "Item não encontrado"}
          </DialogTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">Reivindicação pendente</Badge>
            {item?.category ? <Badge variant="outline">{item.category}</Badge> : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative aspect-[4/3] w-full bg-muted">
            {images.length ? (
              <img
                src={images[photoIndex]}
                alt={`Foto de ${item?.title ?? "item"}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem foto cadastrada
              </div>
            )}
            {hasMultiple ? (
              <>
                <button
                  type="button"
                  onClick={() => setPhotoIndex((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoIndex((i) => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setPhotoIndex(index)}
                      className={cn(
                        "h-2 w-2 rounded-full transition-colors",
                        index === photoIndex ? "bg-primary" : "bg-background/70",
                      )}
                      aria-label={`Foto ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto border-b px-4 py-3">
              {images.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setPhotoIndex(index)}
                  className={cn(
                    "h-14 w-14 shrink-0 overflow-hidden rounded-md border-2",
                    index === photoIndex ? "border-primary" : "border-transparent opacity-70",
                  )}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-4 px-6 py-4">
            <section className="space-y-1 text-sm">
              <h4 className="font-medium text-foreground">Sobre o item</h4>
              <p className="text-muted-foreground">
                <span className="text-foreground">Local:</span> {item?.found_location || "-"}
              </p>
              <p className="text-muted-foreground">
                <span className="text-foreground">Encontrado em:</span> {formatDate(item?.found_at ?? null)}
              </p>
            </section>

            <section className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <h4 className="font-medium text-foreground">Solicitante</h4>
              <p className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                {claim.claimant_name}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                {claim.claimant_email || "-"}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                {claim.claimant_phone || "-"}
              </p>
              <p className="pt-1 text-muted-foreground">
                <span className="font-medium text-foreground">Entrega:</span> {formatClaimDelivery(claim)}
              </p>
              <p className="text-xs text-muted-foreground">
                Solicitado em {formatDate(claim.created_at)}
              </p>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t bg-background px-6 py-4">
          <Button
            className="flex-1"
            onClick={() => onApprove(claim)}
            disabled={reviewing}
          >
            Aprovar
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => onReject(claim)}
            disabled={reviewing}
          >
            Rejeitar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
