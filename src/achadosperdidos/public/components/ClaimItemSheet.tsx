import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { LostFoundItem } from "@/achadosperdidos/types";
import {
  ClaimItemForm,
  ClaimItemFormActions,
  type ClaimFormState,
} from "@/achadosperdidos/public/components/ClaimItemForm";

type Props = {
  item: LostFoundItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ClaimFormState;
  onFormChange: (form: ClaimFormState) => void;
  onSubmit: () => void;
  sending: boolean;
};

export function ClaimItemSheet({
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="z-[100] flex max-h-[92dvh] flex-col gap-0 rounded-t-2xl border-t p-0 sm:max-h-[88vh]"
      >
        <div
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30"
          aria-hidden
        />

        <SheetHeader className="shrink-0 space-y-1 px-5 pb-2 pt-3 text-left">
          <SheetTitle>Reivindicar item</SheetTitle>
          <p className="text-sm text-muted-foreground">Preencha os dados e role até o final para enviar.</p>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          <ClaimItemForm
            item={item}
            form={form}
            onChange={onFormChange}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            sending={sending}
            showActions={false}
          />
        </div>

        <div className="shrink-0 border-t border-border bg-background px-5 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <ClaimItemFormActions
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            sending={sending}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
