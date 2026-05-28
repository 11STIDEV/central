import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PendingClaimCard } from "@/achadosperdidos/admin/PendingClaimCard";
import type { LostFoundClaimRequest } from "@/achadosperdidos/types";

type Props = {
  claims: LostFoundClaimRequest[];
  onOpenClaim: (claim: LostFoundClaimRequest) => void;
};

export function AdminPendingTab({ claims, onOpenClaim }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return claims;
    return claims.filter((claim) =>
      [
        claim.claimant_name,
        claim.claimant_email ?? "",
        claim.claimant_phone ?? "",
        claim.item?.title ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [claims, search]);

  return (
    <Card className="flex h-full w-full min-h-0 flex-col">
      <CardHeader className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Pendências</CardTitle>
            <CardDescription>Reivindicações aguardando análise da secretaria.</CardDescription>
          </div>
          <Badge variant={claims.length > 0 ? "default" : "secondary"}>{claims.length} pendente(s)</Badge>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por item, nome ou telefone..."
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        {claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma reivindicação pendente no momento.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum resultado para &quot;{search}&quot;.</p>
        ) : (
          <div className="max-h-[min(70vh,720px)] space-y-2 overflow-y-auto overscroll-contain pr-1">
            <p className="sticky top-0 z-10 bg-background/95 py-1 text-xs text-muted-foreground backdrop-blur-sm">
              Toque para ver fotos e aprovar ou rejeitar · {filtered.length} de {claims.length}
            </p>
            {filtered.map((claim) => (
              <PendingClaimCard key={claim.id} claim={claim} onClick={() => onOpenClaim(claim)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
