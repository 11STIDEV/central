import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminRegisteredItemRow } from "@/achadosperdidos/admin/AdminRegisteredItemRow";
import type { LostFoundItem, LostFoundItemStatus } from "@/achadosperdidos/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | LostFoundItemStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Disponíveis" },
  { value: "claimed_pending", label: "Pendentes" },
  { value: "returned", label: "Devolvidos" },
  { value: "archived", label: "Arquivados" },
];

type Props = {
  items: LostFoundItem[];
  formatDate: (value: string | null) => string;
  onUpdateStatus: (itemId: string, status: LostFoundItemStatus) => void;
};

export function AdminItemsTab({ items, formatDate, onUpdateStatus }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return [item.title, item.category ?? "", item.found_location ?? "", item.registered_by_email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, search, statusFilter]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    for (const item of items) {
      map[item.status] = (map[item.status] ?? 0) + 1;
    }
    return map;
  }, [items]);

  return (
    <Card className="flex h-full w-full min-h-0 flex-col">
      <CardHeader className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Itens cadastrados</CardTitle>
            <CardDescription>Gerencie status e consulte o histórico de itens.</CardDescription>
          </div>
          <Badge variant="secondary">{items.length} item(ns)</Badge>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, categoria ou local..."
            className="pl-9"
          />
        </div>
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {label}
              <span className="ml-1 opacity-80">({counts[value] ?? 0})</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item cadastrado ainda.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item encontrado com os filtros atuais.</p>
        ) : (
          <div className="max-h-[min(70vh,720px)] space-y-2 overflow-y-auto overscroll-contain pr-1">
            {filtered.map((item) => (
              <AdminRegisteredItemRow
                key={item.id}
                item={item}
                formatDate={formatDate}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
