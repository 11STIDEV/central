import { useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LostFoundItem } from "@/achadosperdidos/types";
import { formatPublicDate } from "@/achadosperdidos/public/utils";

type Props = {
  item: LostFoundItem;
  showClaimButton?: boolean;
  onClaim?: (item: LostFoundItem) => void;
  className?: string;
  style?: CSSProperties;
};

export function LostFoundItemCard({ item, showClaimButton, onClaim, className, style }: Props) {
  const images = item.image_urls?.filter(Boolean) ?? [];
  const [photoIndex, setPhotoIndex] = useState(0);
  const hasMultiple = images.length > 1;

  function prevPhoto() {
    setPhotoIndex((i) => (i - 1 + images.length) % images.length);
  }

  function nextPhoto() {
    setPhotoIndex((i) => (i + 1) % images.length);
  }

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/80 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
      style={style}
    >
      <div className="relative aspect-[4/3] w-full bg-muted">
        {images.length ? (
          <img
            src={images[photoIndex]}
            alt={`Foto de ${item.title}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem foto</div>
        )}
        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow"
              aria-label="Próxima foto"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    index === photoIndex ? "bg-primary" : "bg-background/60",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
        <div className="flex flex-wrap gap-2">
          {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
          <Badge variant="outline">{item.status === "returned" ? "Devolvido" : "Disponível"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="line-clamp-2 text-muted-foreground">{item.description || "Sem descrição."}</p>
        <p>
          <span className="font-medium text-foreground">Local:</span> {item.found_location || "-"}
        </p>
        <p>
          <span className="font-medium text-foreground">Encontrado em:</span> {formatPublicDate(item.found_at)}
        </p>
        {showClaimButton && onClaim ? (
          <Button type="button" className="mt-2 w-full" onClick={() => onClaim(item)}>
            Este item é meu
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
