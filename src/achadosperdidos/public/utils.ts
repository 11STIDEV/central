import { format, isThisWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LostFoundItem } from "@/achadosperdidos/types";
import type { LostFoundPublicStats } from "@/achadosperdidos/public/types";

export function formatPublicDate(value: string | null): string {
  if (!value) return "-";
  try {
    return format(parseISO(value), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    try {
      return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return value;
    }
  }
}

function isInCurrentWeek(iso: string): boolean {
  try {
    return isThisWeek(parseISO(iso), { weekStartsOn: 1 });
  } catch {
    return isThisWeek(new Date(iso), { weekStartsOn: 1 });
  }
}

export function computePublicStats(
  available: LostFoundItem[],
  returned: LostFoundItem[],
): LostFoundPublicStats {
  const thisWeekCount =
    available.filter((item) => isInCurrentWeek(item.created_at)).length +
    returned.filter((item) => isInCurrentWeek(item.updated_at)).length;

  return {
    availableCount: available.length,
    returnedCount: returned.length,
    totalCount: available.length + returned.length,
    thisWeekCount,
  };
}
