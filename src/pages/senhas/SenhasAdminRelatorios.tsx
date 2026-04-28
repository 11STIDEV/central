import RelatoriosPage from "@/painel/admin/RelatoriosPage";
import { useOutletContext } from "react-router-dom";
import type { PainelAdminOutletContext } from "./SenhasAdminShell";

export default function SenhasAdminRelatorios() {
  const { profile } = useOutletContext<PainelAdminOutletContext>();
  return <RelatoriosPage schoolId={profile.school_id} />;
}
