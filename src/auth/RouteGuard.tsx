import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { canAccessRoute, destinoPadraoAposLogin, isSomenteAluno } from "./routeAccess";

type Props = { children: React.ReactNode };

/**
 * Redireciona para uma rota permitida se o caminho atual não for acessível para os papéis do utilizador.
 */
export function RouteGuard({ children }: Props) {
  const { usuario } = useAuth();
  const location = useLocation();

  if (!usuario) {
    return <>{children}</>;
  }

  if (!canAccessRoute(usuario.papeis, location.pathname, usuario.email)) {
    if (isSomenteAluno(usuario.papeis)) {
      return <Navigate to="/reserva-espacos-equipamentos" replace />;
    }
    return <Navigate to={destinoPadraoAposLogin(usuario.papeis, usuario.email)} replace />;
  }

  return <>{children}</>;
}
