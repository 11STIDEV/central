import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, Loader2, Package, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminItemsTab } from "@/achadosperdidos/admin/AdminItemsTab";
import { AdminPendingTab } from "@/achadosperdidos/admin/AdminPendingTab";
import { AdminRegisterTab } from "@/achadosperdidos/admin/AdminRegisterTab";
import { PendingClaimDetailDialog } from "@/achadosperdidos/admin/PendingClaimDetailDialog";
import {
  createAdminItem,
  listAdminItems,
  listPendingClaimRequests,
  reviewClaimRequest,
  updateAdminItem,
} from "@/achadosperdidos/repository";
import { toLostFoundError } from "@/achadosperdidos/errors";
import { isLostFoundSupabaseConfigured } from "@/achadosperdidos/supabaseClient";
import type { LostFoundClaimRequest, LostFoundItemStatus } from "@/achadosperdidos/types";

type AdminTab = "pendencias" | "cadastro" | "itens";

type Props = {
  schoolId: string;
  reviewerIdentity: string;
  registeredByEmail: string;
};

function toBrDate(value: string | null): string {
  if (!value) return "-";
  try {
    return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return value;
  }
}

export default function LostFoundAdminPage({ schoolId, reviewerIdentity, registeredByEmail }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Awaited<ReturnType<typeof listAdminItems>>>([]);
  const [pendingClaims, setPendingClaims] = useState<LostFoundClaimRequest[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("pendencias");
  const [selectedClaim, setSelectedClaim] = useState<LostFoundClaimRequest | null>(null);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [reviewingClaim, setReviewingClaim] = useState(false);

  const canRegister = Boolean(registeredByEmail.trim());
  const pendingCount = pendingClaims.length;

  async function loadData() {
    setLoading(true);
    try {
      const [itemsData, pendingData] = await Promise.all([
        listAdminItems(schoolId),
        listPendingClaimRequests(schoolId),
      ]);
      setItems(itemsData);
      setPendingClaims(pendingData);
    } catch (error) {
      toast.error(toLostFoundError(error, "Não foi possível carregar dados de Achados e Perdidos."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLostFoundSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    void loadData();
  }, [schoolId]);

  const [tabInitialized, setTabInitialized] = useState(false);

  useEffect(() => {
    if (!loading && !tabInitialized) {
      setActiveTab(pendingCount > 0 ? "pendencias" : "cadastro");
      setTabInitialized(true);
    }
  }, [loading, pendingCount, tabInitialized]);

  async function onCreateItem(data: {
    title: string;
    category: string;
    location: string;
    description: string;
    foundAt: string;
    imageFiles: File[];
  }) {
    if (!registeredByEmail.trim()) {
      toast.error("É necessário estar logado com e-mail para cadastrar itens.");
      return;
    }
    if (!data.title.trim()) {
      toast.error("Informe o título do item.");
      return;
    }
    if (!data.foundAt.trim()) {
      toast.error("Informe a data em que o item foi encontrado.");
      return;
    }
    if (!data.category.trim()) {
      toast.error("Selecione a categoria.");
      return;
    }
    if (data.imageFiles.length < 1) {
      toast.error("Adicione pelo menos uma foto do item.");
      return;
    }
    setSaving(true);
    try {
      await createAdminItem({
        schoolId,
        title: data.title,
        category: data.category,
        foundLocation: data.location,
        description: data.description,
        imageFiles: data.imageFiles,
        foundAt: data.foundAt,
        registeredByEmail: registeredByEmail.trim(),
        createdBy: reviewerIdentity,
      });
      toast.success("Item cadastrado.");
      setActiveTab("itens");
      await loadData();
    } catch (error) {
      toast.error(toLostFoundError(error, "Não foi possível cadastrar o item."));
    } finally {
      setSaving(false);
    }
  }

  async function onUpdateStatus(itemId: string, status: LostFoundItemStatus) {
    try {
      await updateAdminItem(itemId, { status, createdBy: reviewerIdentity });
      toast.success("Status atualizado.");
      await loadData();
    } catch (error) {
      toast.error(toLostFoundError(error, "Não foi possível atualizar o status."));
    }
  }

  function openClaimDetail(claim: LostFoundClaimRequest) {
    setSelectedClaim(claim);
    setClaimDialogOpen(true);
  }

  async function onReviewClaim(claim: LostFoundClaimRequest, decision: "approved" | "rejected") {
    setReviewingClaim(true);
    try {
      await reviewClaimRequest({
        requestId: claim.id,
        itemId: claim.item_id,
        reviewedBy: reviewerIdentity,
        decision,
      });
      toast.success(decision === "approved" ? "Reivindicação aprovada." : "Reivindicação rejeitada.");
      setClaimDialogOpen(false);
      setSelectedClaim(null);
      await loadData();
    } catch (error) {
      toast.error(toLostFoundError(error, "Não foi possível revisar a solicitação."));
    } finally {
      setReviewingClaim(false);
    }
  }

  if (!isLostFoundSupabaseConfigured()) {
    return (
      <div className="flex justify-center p-6 md:p-8">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Configure `VITE_LF_SUPABASE_URL` e `VITE_LF_SUPABASE_ANON_KEY` no frontend para habilitar o módulo.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <PendingClaimDetailDialog
        claim={selectedClaim}
        open={claimDialogOpen}
        onOpenChange={(open) => {
          setClaimDialogOpen(open);
          if (!open) setSelectedClaim(null);
        }}
        onApprove={(claim) => void onReviewClaim(claim, "approved")}
        onReject={(claim) => void onReviewClaim(claim, "rejected")}
        reviewing={reviewingClaim}
      />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 md:max-w-4xl md:px-6 lg:max-w-5xl">
      <div className="border-b border-border py-4 text-center sm:text-left">
        <h1 className="text-xl font-bold text-foreground md:text-2xl">Achados e Perdidos — Administração</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Gerencie reivindicações, cadastre itens e acompanhe o estoque da secretaria.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as AdminTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 border-b border-border py-2">
          <TabsList className="mx-auto grid h-auto w-full max-w-2xl grid-cols-3 gap-1 bg-transparent p-0">
            <TabsTrigger
              value="pendencias"
              className="gap-1.5 rounded-lg py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Pendências</span>
              <span className="sm:hidden">Pend.</span>
              {pendingCount > 0 ? (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center px-1 text-[10px] data-[state=active]:bg-primary-foreground/20 data-[state=active]:text-primary-foreground">
                  {pendingCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="cadastro"
              className="gap-1.5 rounded-lg py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <PackagePlus className="h-4 w-4 shrink-0" />
              Cadastro
            </TabsTrigger>
            <TabsTrigger
              value="itens"
              className="gap-1.5 rounded-lg py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Package className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Itens cadastrados</span>
              <span className="sm:hidden">Itens</span>
              <Badge variant="secondary" className="ml-1 hidden h-5 min-w-5 justify-center px-1 text-[10px] sm:flex data-[state=active]:bg-primary-foreground/20 data-[state=active]:text-primary-foreground">
                {items.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden py-4 md:py-6">
          <TabsContent value="pendencias" className="mt-0 h-full focus-visible:outline-none">
            <AdminPendingTab claims={pendingClaims} onOpenClaim={openClaimDetail} />
          </TabsContent>

          <TabsContent value="cadastro" className="mt-0 h-full focus-visible:outline-none">
            <AdminRegisterTab canRegister={canRegister} saving={saving} onSubmit={onCreateItem} />
          </TabsContent>

          <TabsContent value="itens" className="mt-0 h-full focus-visible:outline-none">
            <AdminItemsTab items={items} formatDate={toBrDate} onUpdateStatus={(id, s) => void onUpdateStatus(id, s)} />
          </TabsContent>
        </div>
      </Tabs>
      </div>
    </div>
  );
}
