import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CLAIM_PICKUP_DEADLINE_DAYS,
  DONATION_RETENTION_DAYS,
  LOST_FOUND_CLAIM_PICKUP_POLICY_MESSAGE,
  LOST_FOUND_DONATION_POLICY_MESSAGE,
} from "@/achadosperdidos/constants";

export function DonationPolicyBanner() {
  return (
    <div className="space-y-3">
      <Alert className="border-sky-500/30 bg-sky-500/5">
        <Info className="h-4 w-4 text-sky-700 dark:text-sky-400" />
        <AlertDescription className="text-sm leading-relaxed text-foreground/90">
          <span className="font-medium">Retirada após reivindicar: {CLAIM_PICKUP_DEADLINE_DAYS} dias.</span>{" "}
          {LOST_FOUND_CLAIM_PICKUP_POLICY_MESSAGE}
        </AlertDescription>
      </Alert>
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <Info className="h-4 w-4 text-amber-700 dark:text-amber-400" />
        <AlertDescription className="text-sm leading-relaxed text-foreground/90">
          <span className="font-medium">Doação após {DONATION_RETENTION_DAYS} dias do cadastro.</span>{" "}
          {LOST_FOUND_DONATION_POLICY_MESSAGE}
        </AlertDescription>
      </Alert>
    </div>
  );
}
