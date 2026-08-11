import { LOST_FOUND_CATEGORIES } from "@/achadosperdidos/constants";
import { claimPickupCutoff } from "@/achadosperdidos/claimPickup";
import { donationRetentionCutoff } from "@/achadosperdidos/donation";
import { throwLostFoundError } from "@/achadosperdidos/errors";
import { getLostFoundSchoolId } from "@/achadosperdidos/school";
import { getLostFoundSupabase } from "@/achadosperdidos/supabaseClient";
import type {
  LostFoundClaimRequest,
  LostFoundClaimStatus,
  LostFoundItem,
  LostFoundItemStatus,
} from "@/achadosperdidos/types";

type ClaimInput = {
  itemId: string;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string;
  deliveryMethod: "secretaria" | "sala_aula";
  studentName?: string;
  studentClass?: string;
  schoolPeriod?: "matutino" | "vespertino";
};

function validateClaimInput(input: ClaimInput): void {
  if (!input.claimantName.trim()) throw new Error("Informe seu nome.");
  if (!input.claimantEmail.trim()) throw new Error("Informe seu e-mail.");
  if (!input.claimantEmail.includes("@")) throw new Error("Informe um e-mail válido.");
  if (!input.claimantPhone.trim()) throw new Error("Informe seu telefone.");
  if (!input.deliveryMethod) throw new Error("Escolha como deseja receber o item.");
  if (input.deliveryMethod === "sala_aula") {
    if (!input.studentName?.trim()) throw new Error("Informe o nome do aluno.");
    if (!input.studentClass?.trim()) throw new Error("Informe a turma.");
    if (!input.schoolPeriod) throw new Error("Selecione o período (matutino ou vespertino).");
  }
}

type ItemInput = {
  schoolId: string;
  title: string;
  category: string;
  foundAt: string;
  registeredByEmail: string;
  description?: string;
  foundLocation?: string;
  imageFiles: File[];
  createdBy?: string;
};

function dateOnlyToIso(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Data encontrada inválida.");
  }
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

type ItemUpdateInput = Partial<Omit<ItemInput, "schoolId">> & {
  status?: LostFoundItemStatus;
  imageUrls?: string[];
  returnedByEmail?: string;
  returnedBy?: string;
};

function applyReturnTracking(payload: Record<string, unknown>, input: ItemUpdateInput): void {
  if (typeof input.status === "undefined") return;

  if (input.status === "returned") {
    const email = input.returnedByEmail?.trim();
    if (!email) {
      throw new Error("É necessário estar logado com e-mail para registrar a entrega do item.");
    }
    payload.returned_by_email = email;
    payload.returned_by = input.returnedBy?.trim() || email;
    payload.returned_at = new Date().toISOString();
    return;
  }

  if (input.status === "available") {
    payload.returned_by_email = null;
    payload.returned_by = null;
    payload.returned_at = null;
  }
}

const LOST_FOUND_BUCKET = "lf-items";

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-]/g, "_").toLowerCase();
}

async function uploadItemImages(schoolId: string, files: File[]): Promise<string[]> {
  if (!files.length) return [];
  const supabase = getLostFoundSupabase();
  const uploaded: string[] = [];
  for (const file of files) {
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const path = `${schoolId}/${unique}-${safeFileName(file.name || `foto.${ext}`)}`;
    const { error: uploadError } = await supabase.storage.from(LOST_FOUND_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || "image/jpeg",
    });
    if (uploadError) throwLostFoundError(uploadError, "Não foi possível enviar a foto.");
    const { data } = supabase.storage.from(LOST_FOUND_BUCKET).getPublicUrl(path);
    uploaded.push(data.publicUrl);
  }
  return uploaded;
}

type ListPublicItemsParams = {
  statuses: LostFoundItemStatus[];
  schoolId?: string;
};

export async function listPublicItems(params: ListPublicItemsParams): Promise<LostFoundItem[]> {
  const supabase = getLostFoundSupabase();
  const schoolId = params.schoolId ?? getLostFoundSchoolId();
  let query = supabase
    .from("lf_items")
    .select("*")
    .eq("school_id", schoolId)
    .in("status", params.statuses)
    .order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throwLostFoundError(error);
  return (data ?? []) as LostFoundItem[];
}

export async function listPublicAvailableItems(schoolId?: string): Promise<LostFoundItem[]> {
  const supabase = getLostFoundSupabase();
  const sid = schoolId ?? getLostFoundSchoolId();
  const cutoff = donationRetentionCutoff().toISOString();
  const { data, error } = await supabase
    .from("lf_items")
    .select("*")
    .eq("school_id", sid)
    .eq("status", "available")
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false });
  if (error) throwLostFoundError(error);
  return (data ?? []) as LostFoundItem[];
}

export async function countDonationItems(schoolId?: string): Promise<number> {
  const supabase = getLostFoundSupabase();
  const sid = schoolId ?? getLostFoundSchoolId();
  const { count, error } = await supabase
    .from("lf_items")
    .select("*", { count: "exact", head: true })
    .eq("school_id", sid)
    .eq("status", "donation");
  if (error) throwLostFoundError(error);
  return count ?? 0;
}

function isDonationMigrationPending(error: unknown): boolean {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message ?? "")
      : error instanceof Error
        ? error.message
        : "";
  return /donated_at|PGRST204|23514|status_check|donation/i.test(message);
}

/** Move itens disponíveis há mais de 90 dias para doação (uso admin / rotina). */
export async function promoteExpiredItemsToDonation(schoolId: string): Promise<number> {
  const supabase = getLostFoundSupabase();
  const cutoff = donationRetentionCutoff().toISOString();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("lf_items")
    .update({ status: "donation", donated_at: now })
    .eq("school_id", schoolId)
    .eq("status", "available")
    .lte("created_at", cutoff)
    .select("id");
  if (error) {
    if (isDonationMigrationPending(error)) return 0;
    throwLostFoundError(error, "Não foi possível atualizar itens para doação.");
  }
  return data?.length ?? 0;
}

const SYSTEM_CLAIM_EXPIRY_REVIEWER = "sistema (prazo 7 dias)";

/**
 * Reivindicações pendentes há mais de 7 dias: rejeita a solicitação e libera o item.
 */
export async function releaseExpiredClaimReservations(schoolId: string): Promise<number> {
  const supabase = getLostFoundSupabase();
  const cutoff = claimPickupCutoff().toISOString();
  const now = new Date().toISOString();

  const { data: claims, error } = await supabase
    .from("lf_claim_requests")
    .select("id, item_id, item:lf_items!inner(id, status, school_id)")
    .eq("status", "pending")
    .lte("created_at", cutoff)
    .eq("item.school_id", schoolId)
    .eq("item.status", "claimed_pending");
  if (error) throwLostFoundError(error, "Não foi possível verificar reivindicações expiradas.");

  const expired = (claims ?? []).filter(
    (row) => row.item && (row.item as { status?: string }).status === "claimed_pending",
  );
  if (!expired.length) return 0;

  let released = 0;
  for (const claim of expired) {
    const { error: reqError } = await supabase
      .from("lf_claim_requests")
      .update({
        status: "rejected",
        reviewed_at: now,
        reviewed_by: SYSTEM_CLAIM_EXPIRY_REVIEWER,
      })
      .eq("id", claim.id)
      .eq("status", "pending");
    if (reqError) throwLostFoundError(reqError);

    const { error: itemError } = await supabase
      .from("lf_items")
      .update({
        status: "available",
        returned_by_email: null,
        returned_by: null,
        returned_at: null,
      })
      .eq("id", claim.item_id)
      .eq("status", "claimed_pending");
    if (itemError) throwLostFoundError(itemError);

    released += 1;
  }
  return released;
}

export async function listPublicReturnedItems(schoolId?: string): Promise<LostFoundItem[]> {
  return listPublicItems({ statuses: ["returned"], schoolId });
}

export async function createClaimRequest(input: ClaimInput): Promise<void> {
  validateClaimInput(input);
  const supabase = getLostFoundSupabase();
  const isClassroom = input.deliveryMethod === "sala_aula";
  const { error } = await supabase.from("lf_claim_requests").insert({
    item_id: input.itemId,
    claimant_name: input.claimantName.trim(),
    claimant_email: input.claimantEmail.trim(),
    claimant_phone: input.claimantPhone.trim(),
    delivery_method: input.deliveryMethod,
    student_name: isClassroom ? input.studentName?.trim() || null : null,
    student_class: isClassroom ? input.studentClass?.trim() || null : null,
    school_period: isClassroom ? input.schoolPeriod ?? null : null,
    status: "pending",
  });
  if (error) throwLostFoundError(error);

  const { error: itemError } = await supabase
    .from("lf_items")
    .update({ status: "claimed_pending" })
    .eq("id", input.itemId)
    .eq("status", "available");
  if (itemError) throwLostFoundError(itemError);
}

export async function listAdminItems(schoolId: string): Promise<LostFoundItem[]> {
  const supabase = getLostFoundSupabase();
  const { data, error } = await supabase
    .from("lf_items")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) throwLostFoundError(error);
  return (data ?? []) as LostFoundItem[];
}

export async function createAdminItem(input: ItemInput): Promise<void> {
  if (!input.title.trim()) throw new Error("Informe o título do item.");
  const category = input.category.trim();
  if (!category) throw new Error("Selecione a categoria.");
  if (!(LOST_FOUND_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error("Categoria inválida.");
  }
  if (!input.foundAt.trim()) throw new Error("Informe a data em que o item foi encontrado.");
  if (!input.registeredByEmail.trim()) throw new Error("E-mail do cadastrante não identificado.");
  if (input.imageFiles.length < 1) throw new Error("Adicione pelo menos uma foto do item.");
  if (input.imageFiles.length > 4) throw new Error("Máximo de 4 fotos por item.");

  const supabase = getLostFoundSupabase();
  const imageUrls = await uploadItemImages(input.schoolId, input.imageFiles);
  const email = input.registeredByEmail.trim();
  const { error } = await supabase.from("lf_items").insert({
    school_id: input.schoolId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    category,
    found_at: dateOnlyToIso(input.foundAt),
    found_location: input.foundLocation?.trim() || null,
    image_urls: imageUrls,
    status: "available",
    created_by: input.createdBy?.trim() || email,
    registered_by_email: email,
  });
  if (error) throwLostFoundError(error, "Não foi possível cadastrar o item.");
}

type ItemEditInput = {
  schoolId: string;
  title: string;
  keptImageUrls: string[];
  newImageFiles: File[];
  editedBy: string;
};

export async function editAdminItem(itemId: string, input: ItemEditInput): Promise<void> {
  if (!input.title.trim()) throw new Error("Informe o título do item.");
  const kept = input.keptImageUrls.filter(Boolean);
  const totalPhotos = kept.length + input.newImageFiles.length;
  if (totalPhotos < 1) throw new Error("O item precisa de pelo menos uma foto.");
  if (totalPhotos > 4) throw new Error("Máximo de 4 fotos por item.");

  const uploaded = input.newImageFiles.length
    ? await uploadItemImages(input.schoolId, input.newImageFiles)
    : [];
  const imageUrls = [...kept, ...uploaded];

  const supabase = getLostFoundSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from("lf_items")
    .select("status, returned_at")
    .eq("id", itemId)
    .maybeSingle();
  if (fetchError) throwLostFoundError(fetchError);
  if (!existing) throw new Error("Item não encontrado.");
  if (existing.status === "returned" || existing.returned_at) {
    throw new Error("Itens já entregues não podem ser editados.");
  }
  if (existing.status === "donation") {
    throw new Error("Itens encaminhados para doação não podem ser editados.");
  }

  const { error } = await supabase
    .from("lf_items")
    .update({
      title: input.title.trim(),
      image_urls: imageUrls,
      was_edited: true,
      edited_at: new Date().toISOString(),
      edited_by: input.editedBy.trim() || null,
    })
    .eq("id", itemId);
  if (error) throwLostFoundError(error, "Não foi possível salvar as alterações.");
}

export async function updateAdminItem(itemId: string, input: ItemUpdateInput): Promise<void> {
  const supabase = getLostFoundSupabase();
  const payload: Record<string, unknown> = {};
  if (typeof input.title !== "undefined") payload.title = input.title?.trim() || null;
  if (typeof input.description !== "undefined") payload.description = input.description?.trim() || null;
  if (typeof input.category !== "undefined") payload.category = input.category?.trim() || null;
  if (typeof input.foundAt !== "undefined") payload.found_at = input.foundAt || null;
  if (typeof input.foundLocation !== "undefined") payload.found_location = input.foundLocation?.trim() || null;
  if (typeof input.imageUrls !== "undefined") payload.image_urls = input.imageUrls;
  if (typeof input.status !== "undefined") payload.status = input.status;
  if (typeof input.createdBy !== "undefined") payload.created_by = input.createdBy?.trim() || null;
  applyReturnTracking(payload, input);

  const { error } = await supabase.from("lf_items").update(payload).eq("id", itemId);
  if (error) throwLostFoundError(error);
}

export async function listPendingClaimRequests(schoolId: string): Promise<LostFoundClaimRequest[]> {
  const supabase = getLostFoundSupabase();
  const { data, error } = await supabase
    .from("lf_claim_requests")
    .select(
      "*, item:lf_items!inner(id, title, category, status, found_location, found_at, image_urls, school_id)",
    )
    .eq("status", "pending")
    .eq("item.school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) throwLostFoundError(error);
  return ((data ?? []) as Array<LostFoundClaimRequest & { item?: { school_id?: string } | null }>).map((row) => ({
    ...row,
    item: row.item ?? null,
  }));
}

export async function reviewClaimRequest(params: {
  requestId: string;
  itemId: string;
  reviewedBy: string;
  returnedByEmail?: string;
  decision: LostFoundClaimStatus;
}): Promise<void> {
  const supabase = getLostFoundSupabase();
  const nextItemStatus: LostFoundItemStatus = params.decision === "approved" ? "returned" : "available";
  const { error: reqError } = await supabase
    .from("lf_claim_requests")
    .update({
      status: params.decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: params.reviewedBy,
    })
    .eq("id", params.requestId)
    .eq("status", "pending");
  if (reqError) throwLostFoundError(reqError);

  const itemPayload: Record<string, unknown> = { status: nextItemStatus };
  if (params.decision === "approved") {
    const email = params.returnedByEmail?.trim();
    if (!email) {
      throw new Error("É necessário estar logado com e-mail para registrar a entrega do item.");
    }
    itemPayload.returned_by_email = email;
    itemPayload.returned_by = params.reviewedBy.trim() || email;
    itemPayload.returned_at = new Date().toISOString();
  } else {
    itemPayload.returned_by_email = null;
    itemPayload.returned_by = null;
    itemPayload.returned_at = null;
  }

  const { error: itemError } = await supabase.from("lf_items").update(itemPayload).eq("id", params.itemId);
  if (itemError) throwLostFoundError(itemError);
}
