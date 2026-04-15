import { Outlet } from "react-router-dom";
import { PainelSupabaseAuthProvider } from "@/painel/PainelSupabaseAuthContext";

/** Provider sincroniza Google → Supabase antes de atendente/admin usarem a sessão. */
export default function PainelSenhasLayout() {
  return (
    <PainelSupabaseAuthProvider>
      <Outlet />
    </PainelSupabaseAuthProvider>
  );
}
