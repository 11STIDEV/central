import { useCallback, useEffect, useMemo, useState } from "react";
import {
  countDonationItems,
  listPublicAvailableItems,
  listPublicReturnedItems,
  promoteExpiredItemsToDonation,
  releaseExpiredClaimReservations,
} from "@/achadosperdidos/repository";
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
  const [donationCount, setDonationCount] = useState(0);
  const schoolId = getLostFoundSchoolId();

  const refresh = useCallback(async () => {
    if (!isLostFoundSupabaseConfigured()) {
      setLoading(false);
      setError(null);
      setAvailableItems([]);
      setReturnedItems([]);
      setDonationCount(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      try {
        await promoteExpiredItemsToDonation(schoolId);
      } catch {
        // Migration de doação pendente — a vitrine segue com filtro de 90 dias na listagem.
      }
      try {
        await releaseExpiredClaimReservations(schoolId);
      } catch {
        // Não bloqueia a vitrine se a rotina de expiração falhar.
      }
      const [available, returned, donations] = await Promise.all([
        listPublicAvailableItems(schoolId),
        listPublicReturnedItems(schoolId),
        countDonationItems(schoolId),
      ]);
      setAvailableItems(available);
      setReturnedItems(returned);
      setDonationCount(donations);
    } catch (err) {
      setError(toLostFoundError(err, "Erro ao carregar."));
      setAvailableItems([]);
      setReturnedItems([]);
      setDonationCount(0);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stats: LostFoundPublicStats = useMemo(
    () => computePublicStats(availableItems, returnedItems, donationCount),
    [availableItems, returnedItems, donationCount],
  );

  const recentAvailable = useMemo(() => availableItems.slice(0, 6), [availableItems]);

  return {
    loading,
    error,
    availableItems,
    returnedItems,
    donationCount,
    recentAvailable,
    stats,
    refresh,
    schoolId,
    configured: isLostFoundSupabaseConfigured(),
  };
}
