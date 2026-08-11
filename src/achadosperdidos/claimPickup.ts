import { CLAIM_PICKUP_DEADLINE_DAYS } from "@/achadosperdidos/constants";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Reivindicações pendentes criadas antes disso ultrapassaram o prazo de retirada. */
export function claimPickupCutoff(now = new Date()): Date {
  return new Date(now.getTime() - CLAIM_PICKUP_DEADLINE_DAYS * MS_PER_DAY);
}

export function claimPickupDeadline(claimCreatedAt: string): Date {
  return new Date(new Date(claimCreatedAt).getTime() + CLAIM_PICKUP_DEADLINE_DAYS * MS_PER_DAY);
}

export function daysUntilClaimPickupExpires(claimCreatedAt: string, now = new Date()): number {
  const deadline = claimPickupDeadline(claimCreatedAt).getTime();
  return Math.max(0, Math.ceil((deadline - now.getTime()) / MS_PER_DAY));
}

export function isClaimPickupExpired(claimCreatedAt: string, now = new Date()): boolean {
  return new Date(claimCreatedAt).getTime() <= claimPickupCutoff(now).getTime();
}
