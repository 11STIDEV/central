import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  message: string;
  onRetry?: () => void;
};

export function PublicErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center">
      <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
