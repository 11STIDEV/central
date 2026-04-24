import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { canAccessRoute, isApenasAtendenteSecretaria, isSomenteAluno } from "./routeAccess";

type Props = { children: React.ReactNode };

/**
 * Redireciona para a rota “home” permitida se o path atual não puder ser acedido:
 * atendente só secretaria → `/senhas/atendente`; aluno → `/agenda-cci`; resto (legado) → `/agenda-cci`.
 */
export function RouteGuard({ children }: Props) {
  const { usuario } = useAuth();
  const location = useLocation();

  if (!usuario) {
    return <>{children}</>;
  }

  if (!canAccessRoute(usuario.papeis, location.pathname)) {
    if (isApenasAtendenteSecretaria(usuario.papeis)) {
      return <Navigate to="/senhas/atendente" replace />;
    }
    if (isSomenteAluno(usuario.papeis)) {
      return <Navigate to="/agenda-cci" replace />;
    }
    return <Navigate to="/agenda-cci" replace />;
  }

  return <>{children}</>;
}
