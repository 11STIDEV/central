import { useCallback, useEffect, useMemo, useState } from "react";
import { listPublicAvailableItems, listPublicReturnedItems } from "@/achadosperdidos/repository";
import { getLostFoundSchoolId } from "@/achadosperdidos/school";
import { isLostFoundSupabaseConfigured } from "@/achadosperdidos/supabaseClient";
import type { LostFoundItem } from "@/achadosperdidos/types";
import { toLostFoundError } from "@/achadosperdidos/errors";
import { computePublicStats } from "@/achadosperdidos/public/utils";
import type { LostFoundPublicStats } from "@/achadosperdidos/public/types";

export function useLostFoundPublicData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableItems, setAvailableItems] = useState<LostFoundItem[]>([]);
  const [returnedItems, setReturnedItems] = useState<LostFoundItem[]>([]);
  const schoolId = getLostFoundSchoolId();

  const refresh = useCallback(async () => {
    if (!isLostFoundSupabaseConfigured()) {
      setLoading(false);
      setError(null);
      setAvailableItems([]);
      setReturnedItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [available, returned] = await Promise.all([
        listPublicAvailableItems(schoolId),
        listPublicReturnedItems(schoolId),
      ]);
      setAvailableItems(available);
      setReturnedItems(returned);
    } catch (err) {
      setError(toLostFoundError(err, "Erro ao carregar."));
      setAvailableItems([]);
      setReturnedItems([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stats: LostFoundPublicStats = useMemo(
    () => computePublicStats(availableItems, returnedItems),
    [availableItems, returnedItems],
  );

  const recentAvailable = useMemo(() => availableItems.slice(0, 6), [availableItems]);

  return {
    loading,
    error,
    availableItems,
    returnedItems,
    recentAvailable,
    stats,
    refresh,
    schoolId,
    configured: isLostFoundSupabaseConfigured(),
  };
}
