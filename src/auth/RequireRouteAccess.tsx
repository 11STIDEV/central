import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { canAccessRoute } from "./routeAccess";

type Props = { children: React.ReactNode };

/**
 * Exige usuário logado e um dos papéis necessários para a rota atual
 * (definidos em `routeAccess.ts`).
 */
export function RequireRouteAccess({ children }: Props) {
  const { usuario } = useAuth();
  const location = useLocation();

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessRoute(usuario.papeis, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
