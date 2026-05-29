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

  if (!canAccessRoute(usuario.papeis, location.pathname, usuario.email)) {
    const from = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to="/"
        replace
        state={{
          accessDenied: from,
          accessDeniedHint:
            from === "/admin/papeis-manuais"
              ? "Esta página exige o papel administrador. Peça inclusão em Admin — Papéis manuais, em server/data/papeis-manuais.json ou em VITE_CENTRAL_ADMIN_EMAILS no .env.local (reinicie o Vite e faça login de novo)."
              : undefined,
        }}
      />
    );
  }

  return <>{children}</>;
}
