import { DONATION_RETENTION_DAYS } from "@/achadosperdidos/constants";
import type { LostFoundItem } from "@/achadosperdidos/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Data-limite: itens cadastrados antes disso já passaram dos 90 dias. */
export function donationRetentionCutoff(now = new Date()): Date {
  return new Date(now.getTime() - DONATION_RETENTION_DAYS * MS_PER_DAY);
}

export function isItemPastDonationDeadline(item: Pick<LostFoundItem, "created_at">, now = new Date()): boolean {
  return new Date(item.created_at).getTime() <= donationRetentionCutoff(now).getTime();
}

/** Item visível na vitrine pública "Itens achados". */
export function isPubliclyListedAvailable(item: LostFoundItem, now = new Date()): boolean {
  return item.status === "available" && !isItemPastDonationDeadline(item, now);
}

export function daysUntilDonation(item: Pick<LostFoundItem, "created_at">, now = new Date()): number {
  const created = new Date(item.created_at).getTime();
  const deadline = created + DONATION_RETENTION_DAYS * MS_PER_DAY;
  return Math.max(0, Math.ceil((deadline - now.getTime()) / MS_PER_DAY));
}
