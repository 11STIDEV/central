import { LOST_FOUND_SCHOOL_PERIODS } from "@/achadosperdidos/constants";
import type { LostFoundClaimRequest } from "@/achadosperdidos/types";

export function formatClaimDelivery(claim: LostFoundClaimRequest): string {
  if (claim.delivery_method === "secretaria") {
    return "Retirada na secretaria";
  }
  if (claim.delivery_method === "sala_aula") {
    const periodLabel =
      LOST_FOUND_SCHOOL_PERIODS.find((p) => p.value === claim.school_period)?.label ??
      claim.school_period ??
      "-";
    return `Entrega na sala de aula — Aluno: ${claim.student_name || "-"}, Turma: ${claim.student_class || "-"}, Período: ${periodLabel}`;
  }
  if (claim.claim_reason?.trim()) {
    return claim.claim_reason.trim();
  }
  return "Forma de entrega não informada";
}
