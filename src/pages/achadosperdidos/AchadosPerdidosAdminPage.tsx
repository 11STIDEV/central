import LostFoundAdminPage from "@/achadosperdidos/admin/LostFoundAdminPage";
import { getLostFoundSchoolId } from "@/achadosperdidos/school";
import { useAuth } from "@/auth/AuthProvider";

export default function AchadosPerdidosAdminPage() {
  const { usuario } = useAuth();
  const registeredByEmail = usuario?.email?.trim() ?? "";
  const reviewerIdentity = usuario?.nome || registeredByEmail || "secretaria";
  const schoolId = getLostFoundSchoolId();
  return (
    <LostFoundAdminPage
      schoolId={schoolId}
      reviewerIdentity={reviewerIdentity}
      registeredByEmail={registeredByEmail}
    />
  );
}
