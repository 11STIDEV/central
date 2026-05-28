import LostFoundAdminPage from "@/achadosperdidos/admin/LostFoundAdminPage";
import { useOutletContext } from "react-router-dom";
import type { PainelAdminOutletContext } from "./SenhasAdminShell";

export default function SenhasAdminAchadosPerdidos() {
  const { profile } = useOutletContext<PainelAdminOutletContext>();
  const registeredByEmail = profile.email?.trim() ?? "";
  const reviewerIdentity = profile.full_name || registeredByEmail || "secretaria";
  return (
    <LostFoundAdminPage
      schoolId={profile.school_id}
      reviewerIdentity={reviewerIdentity}
      registeredByEmail={registeredByEmail}
    />
  );
}
