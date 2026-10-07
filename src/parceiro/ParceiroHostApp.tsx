import { Navigate, Route, Routes } from "react-router-dom";
import { ParceiroAuthProvider, useParceiroAuth } from "./ParceiroAuthProvider";
import ParceiroLoginPage from "./ParceiroLoginPage";
import ParceiroRedefinirSenhaPage from "./ParceiroRedefinirSenhaPage";
import ParceiroShell from "@/pages/ccipay/ParceiroShell";
import ParceiroDashboard from "@/pages/ccipay/ParceiroDashboard";
import ParceiroExtrato from "@/pages/ccipay/ParceiroExtrato";
import ParceiroVenda from "@/pages/ccipay/ParceiroVenda";
import { Loader2 } from "lucide-react";

function RequireParceiroAuth({ children }: { children: React.ReactNode }) {
  const { operador, carregando } = useParceiroAuth();
  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!operador) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ParceiroRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<ParceiroLoginPage />} />
      <Route path="/redefinir-senha" element={<ParceiroRedefinirSenhaPage />} />
      <Route
        path="/"
        element={
          <RequireParceiroAuth>
            <ParceiroShell />
          </RequireParceiroAuth>
        }
      >
        <Route index element={<ParceiroDashboard />} />
        <Route path="venda" element={<ParceiroVenda />} />
        <Route path="extrato" element={<ParceiroExtrato />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function ParceiroHostApp({ isSubpath = false }: { isSubpath?: boolean } = {}) {
  return (
    <ParceiroAuthProvider>
      <ParceiroRoutes />
      {import.meta.env.DEV && !isSubpath && (
        <a
          href="/?parceiroHost=0"
          className="fixed bottom-3 right-3 z-50 rounded-full bg-slate-900/90 text-white px-3.5 py-1.5 text-xs font-medium shadow-lg hover:bg-slate-800 transition flex items-center gap-1.5 border border-slate-700 backdrop-blur-sm"
          title="Voltar para a Intranet Central em modo de desenvolvimento"
        >
          ← Voltar à Intranet (Dev)
        </a>
      )}
      {isSubpath && (
        <a
          href="/"
          className="fixed bottom-3 right-3 z-50 rounded-full bg-slate-900/90 text-white px-3.5 py-1.5 text-xs font-medium shadow-lg hover:bg-slate-800 transition flex items-center gap-1.5 border border-slate-700 backdrop-blur-sm"
          title="Voltar para a Central"
        >
          ← Voltar à Central
        </a>
      )}
    </ParceiroAuthProvider>
  );
}
