export type LostFoundItemStatus = "available" | "claimed_pending" | "returned" | "archived" | "donation";
export type LostFoundClaimStatus = "pending" | "approved" | "rejected";
export type LostFoundDeliveryMethod = "secretaria" | "sala_aula";
export type LostFoundSchoolPeriod = "matutino" | "vespertino";

export type LostFoundItem = {
  id: string;
  school_id: string;
  title: string;
  description: string | null;
  category: string | null;
  found_at: string | null;
  found_location: string | null;
  image_urls: string[] | null;
  status: LostFoundItemStatus;
  created_by: string | null;
  registered_by_email: string | null;
  was_edited: boolean;
  edited_at: string | null;
  edited_by: string | null;
  returned_by_email: string | null;
  returned_by: string | null;
  returned_at: string | null;
  donated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LostFoundClaimRequest = {
  id: string;
  item_id: string;
  claimant_name: string;
  claimant_email: string | null;
  claimant_phone: string | null;
  claim_reason: string | null;
  delivery_method: LostFoundDeliveryMethod | null;
  student_name: string | null;
  student_class: string | null;
  school_period: LostFoundSchoolPeriod | null;
  status: LostFoundClaimStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  item?: Pick<
    LostFoundItem,
    "id" | "title" | "category" | "status" | "found_location" | "found_at" | "image_urls"
  > | null;
};
