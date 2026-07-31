import { Navigate, Route, Routes } from "react-router-dom";
import { ParceiroAuthProvider, useParceiroAuth } from "./ParceiroAuthProvider";
import ParceiroLoginPage from "./ParceiroLoginPage";
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

export function ParceiroHostApp() {
  return (
    <ParceiroAuthProvider>
      <ParceiroRoutes />
    </ParceiroAuthProvider>
  );
}
