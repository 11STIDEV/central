import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LostFoundItem } from "@/achadosperdidos/types";
import { ClaimItemForm, type ClaimFormState } from "@/achadosperdidos/public/components/ClaimItemForm";

type Props = {
  item: LostFoundItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ClaimFormState;
  onFormChange: (form: ClaimFormState) => void;
  onSubmit: () => void;
  sending: boolean;
};

export function ClaimItemDialog({
  item,
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  sending,
}: Props) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Reivindicar item</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <ClaimItemForm
          item={item}
          form={form}
          onChange={onFormChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          sending={sending}
        />
        </div>
      </DialogContent>
    </Dialog>
  );
}
