import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { createClaimRequest } from "@/achadosperdidos/repository";
import { toLostFoundError } from "@/achadosperdidos/errors";
import { LostFoundPublicShell } from "@/achadosperdidos/public/LostFoundPublicShell";
import { useLostFoundPublicData } from "@/achadosperdidos/public/hooks/useLostFoundPublicData";
import type { LostFoundPublicView } from "@/achadosperdidos/public/types";
import type { LostFoundItem } from "@/achadosperdidos/types";
import { PainelView } from "@/achadosperdidos/public/views/PainelView";
import { ItensAchadosView } from "@/achadosperdidos/public/views/ItensAchadosView";
import { DevolvidosView } from "@/achadosperdidos/public/views/DevolvidosView";
import { ClaimItemSheet } from "@/achadosperdidos/public/components/ClaimItemSheet";
import { ClaimItemDialog } from "@/achadosperdidos/public/components/ClaimItemDialog";
import type { ClaimFormState } from "@/achadosperdidos/public/components/ClaimItemForm";

const CLAIM_COOLDOWN_KEY = "lf_last_claim_at";
const CLAIM_COOLDOWN_MS = 60_000;

const EMPTY_CLAIM_FORM: ClaimFormState = {
  name: "",
  email: "",
  phone: "",
  deliveryMethod: "",
  studentName: "",
  studentClass: "",
  schoolPeriod: "",
};

export default function LostFoundPublicPage() {
  const isMobile = useIsMobile();
  const { configured, loading, error, availableItems, returnedItems, recentAvailable, stats, refresh } =
    useLostFoundPublicData();

  const [activeView, setActiveView] = useState<LostFoundPublicView>("painel");
  const [claimItem, setClaimItem] = useState<LostFoundItem | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimForm, setClaimForm] = useState<ClaimFormState>(EMPTY_CLAIM_FORM);
  const [sendingClaim, setSendingClaim] = useState(false);

  function openClaim(item: LostFoundItem) {
    setClaimItem(item);
    setClaimForm(EMPTY_CLAIM_FORM);
    setClaimOpen(true);
  }

  function closeClaim() {
    setClaimOpen(false);
    setClaimItem(null);
    setClaimForm(EMPTY_CLAIM_FORM);
  }

  async function onSubmitClaim() {
    if (!claimItem) return;
    if (!claimForm.name.trim()) {
      toast.error("Informe seu nome.");
      return;
    }
    if (!claimForm.email.trim()) {
      toast.error("Informe seu e-mail.");
      return;
    }
    if (!claimForm.email.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (!claimForm.phone.trim()) {
      toast.error("Informe seu telefone.");
      return;
    }
    if (!claimForm.deliveryMethod) {
      toast.error("Escolha como deseja receber o item.");
      return;
    }
    if (claimForm.deliveryMethod === "sala_aula") {
      if (!claimForm.studentName.trim()) {
        toast.error("Informe o nome do aluno.");
        return;
      }
      if (!claimForm.studentClass.trim()) {
        toast.error("Informe a turma.");
        return;
      }
      if (!claimForm.schoolPeriod) {
        toast.error("Selecione o período (matutino ou vespertino).");
        return;
      }
    }
    const lastClaimAt = Number(localStorage.getItem(CLAIM_COOLDOWN_KEY) || "0");
    if (Date.now() - lastClaimAt < CLAIM_COOLDOWN_MS) {
      toast.error("Aguarde 1 minuto antes de enviar outra solicitação.");
      return;
    }
    setSendingClaim(true);
    try {
      await createClaimRequest({
        itemId: claimItem.id,
        claimantName: claimForm.name,
        claimantEmail: claimForm.email,
        claimantPhone: claimForm.phone,
        deliveryMethod: claimForm.deliveryMethod,
        studentName: claimForm.deliveryMethod === "sala_aula" ? claimForm.studentName : undefined,
        studentClass: claimForm.deliveryMethod === "sala_aula" ? claimForm.studentClass : undefined,
        schoolPeriod:
          claimForm.deliveryMethod === "sala_aula" ? claimForm.schoolPeriod || undefined : undefined,
      });
      localStorage.setItem(CLAIM_COOLDOWN_KEY, String(Date.now()));
      toast.success("Solicitação enviada. A secretaria vai analisar sua reivindicação.");
      closeClaim();
      await refresh();
    } catch (err) {
      toast.error(toLostFoundError(err, "Não foi possível enviar a solicitação."));
    } finally {
      setSendingClaim(false);
    }
  }

  if (!configured) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8">
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Configure `VITE_LF_SUPABASE_URL` e `VITE_LF_SUPABASE_ANON_KEY` para habilitar Achados e Perdidos.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <LostFoundPublicShell
      activeView={activeView}
      onViewChange={setActiveView}
      hideMobileNav={claimOpen}
    >
      {activeView === "painel" ? (
        <PainelView
          loading={loading}
          error={error}
          stats={stats}
          recentItems={recentAvailable}
          onRetry={() => void refresh()}
          onViewAll={() => setActiveView("itens")}
          onClaim={openClaim}
        />
      ) : null}

      {activeView === "itens" ? (
        <ItensAchadosView
          items={availableItems}
          loading={loading}
          error={error}
          onRetry={() => void refresh()}
          onClaim={openClaim}
        />
      ) : null}

      {activeView === "devolvidos" ? (
        <DevolvidosView items={returnedItems} loading={loading} error={error} onRetry={() => void refresh()} />
      ) : null}

      {isMobile ? (
        <ClaimItemSheet
          item={claimItem}
          open={claimOpen}
          onOpenChange={(open) => {
            if (!open) closeClaim();
            else setClaimOpen(true);
          }}
          form={claimForm}
          onFormChange={setClaimForm}
          onSubmit={() => void onSubmitClaim()}
          sending={sendingClaim}
        />
      ) : (
        <ClaimItemDialog
          item={claimItem}
          open={claimOpen}
          onOpenChange={(open) => {
            if (!open) closeClaim();
            else setClaimOpen(true);
          }}
          form={claimForm}
          onFormChange={setClaimForm}
          onSubmit={() => void onSubmitClaim()}
          sending={sendingClaim}
        />
      )}
    </LostFoundPublicShell>
  );
}
