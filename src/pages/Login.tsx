import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { destinoAposLogin } from "@/auth/RequireAuth";
import { canAccessRoute } from "@/auth/routeAccess";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Login() {
  const { renderGoogleButton, erro, carregando, carregandoGoogle, usuario } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectBruto = destinoAposLogin(
    (location.state as { from?: string } | null)?.from,
  );
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const origemAtual =
    typeof window !== "undefined" ? window.location.origin : "";
  const urlAtual = typeof window !== "undefined" ? window.location.href : "";
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (carregando || carregandoGoogle || !googleButtonRef.current) return;
    renderGoogleButton(googleButtonRef.current);
  }, [carregando, carregandoGoogle, renderGoogleButton]);

  useEffect(() => {
    if (!usuario) return;
    let to = redirectBruto;
    if (!canAccessRoute(usuario.papeis, to)) {
      to = "/agenda-cci";
    }
    navigate(to, { replace: true });
  }, [usuario, navigate, redirectBruto]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-card-foreground">
            Central de Sistemas CCI
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse com conta Google{" "}
            <strong>@portalcci.com.br</strong>, <strong>@faculdadecci.com.br</strong> ou{" "}
            <strong>@tecscci.com.br</strong>.
          </p>
        </div>

        <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-[12px] text-muted-foreground">
          <div>
            <strong className="text-foreground">Origem atual:</strong> {origemAtual}
          </div>
          <div className="mt-1">
            <strong className="text-foreground">URL atual:</strong> {urlAtual}
          </div>
          <div className="mt-1 break-all">
            <strong className="text-foreground">Client ID:</strong>{" "}
            {clientId ?? "(não configurado)"}
          </div>
        </div>

        {erro && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Não foi possível entrar</AlertTitle>
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <div
          ref={googleButtonRef}
          className="flex min-h-[44px] w-full items-center justify-center [&>div]:!mx-auto"
          aria-label="Botão Entrar com Google"
        />
        {carregandoGoogle && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Carregando Google…
          </p>
        )}

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Contas <strong>@portalcci.com.br</strong>, <strong>@faculdadecci.com.br</strong> e{" "}
          <strong>@tecscci.com.br</strong> são aceitas. O acesso às telas segue a unidade
          organizacional no Google Workspace.
        </p>
      </div>
    </div>
  );
}

