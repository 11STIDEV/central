import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { canAccessRoute } from "./routeAccess";

type Props = { children: React.ReactNode };

/**
 * Redireciona para `/` quando o papel não permite a rota atual (branch produção: ver `routeAccess`).
 */
export function RouteGuard({ children }: Props) {
  const { usuario } = useAuth();
  const location = useLocation();

  if (!usuario) {
    return <>{children}</>;
  }

  if (!canAccessRoute(usuario.papeis, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
