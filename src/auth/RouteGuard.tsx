import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { canAccessRoute } from "./routeAccess";

type Props = { children: React.ReactNode };

/**
 * Redireciona usuários com papel exclusivo de aluno para `/agenda-cci` se tentarem rota não permitida
 * (alunos podem acessar `/agenda-cci` e `/reserva-espacos-equipamentos`).
 */
export function RouteGuard({ children }: Props) {
  const { usuario } = useAuth();
  const location = useLocation();

  if (!usuario) {
    return <>{children}</>;
  }

  if (!canAccessRoute(usuario.papeis, location.pathname)) {
    return <Navigate to="/agenda-cci" replace />;
  }

  return <>{children}</>;
}
