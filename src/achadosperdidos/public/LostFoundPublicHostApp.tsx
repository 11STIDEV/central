import { Navigate, Route, Routes } from "react-router-dom";
import AchadosPerdidosPublicPage from "@/pages/AchadosPerdidosPublicPage";

/**
 * SPA mínima para achadoseperdidos.portalcci.com.br — vitrine na raiz, sem intranet.
 */
export function LostFoundPublicHostApp() {
  return (
    <Routes>
      <Route path="/" element={<AchadosPerdidosPublicPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
