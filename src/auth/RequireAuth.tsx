import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { isDevOnlyPath, isPublicSenhasKioskPath } from "./routeAccess";

/** Evita open redirect: só caminhos relativos internos. */
function destinoAposLogin(path: string | undefined): string {
  if (!path || path === "/login") return "/";
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

type Props = { children: React.ReactNode };

/**
 * Exige login Google para qualquer rota, exceto `/login` e o painel de senhas público (`/senhas`, `/senhas/totem`, `/senhas/painel`).
 * Enquanto a sessão é restaurada (localStorage), exibe estado de carregamento.
 */
export function RequireAuth({ children }: Props) {
  const { usuario, carregando } = useAuth();
  const location = useLocation();

  if (isPublicSenhasKioskPath(location.pathname)) {
    return <>{children}</>;
  }

  if (isDevOnlyPath(location.pathname)) {
    return <>{children}</>;
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!usuario && location.pathname !== "/login") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <>{children}</>;
}

export { destinoAposLogin };
