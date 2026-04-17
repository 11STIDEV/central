import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { destinoAposLogin } from "@/auth/RequireAuth";
import { canAccessRoute } from "@/auth/routeAccess";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CciLogoBranca } from "@/painel/components/CciLogoBranca";
import { AlertCircle, Sparkles } from "lucide-react";

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
      to = "/";
    }
    navigate(to, { replace: true });
  }, [usuario, navigate, redirectBruto]);

  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      <div className="absolute right-4 top-4 z-10 lg:right-8 lg:top-6">
        <ThemeToggle className="border border-white/10 bg-white/5 text-white hover:bg-white/10 dark:border-border dark:bg-background/80 dark:text-foreground dark:hover:bg-muted" />
      </div>
      {/* Painel marca — alinhado ao shell da intranet */}
      <div className="intranet-login-brand relative flex min-h-[40vh] flex-1 flex-col justify-end overflow-hidden px-8 py-12 lg:min-h-screen lg:min-w-[50%] lg:justify-center lg:px-16">
        <div className="intranet-login-brand-mesh pointer-events-none absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative max-w-lg">
          <div className="mb-6">
            <CciLogoBranca height={56} className="object-left" />
          </div>
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.28em] text-cyan-200/95">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden />
            Intranet
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[2.5rem] lg:leading-tight">
            Central de Informações
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/65">
            Acesso unificado para colaboradores do Grupo CCI — chamados, agenda, documentos e
            ferramentas do dia a dia.
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 flex-col justify-center bg-background px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <h2 className="text-xl font-semibold text-foreground">Entrar</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use sua conta Google institucional.</p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/80 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <div className="mb-6 hidden text-center lg:block">
              <h2 className="text-lg font-semibold text-card-foreground">Bem-vindo de volta</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Entre com conta Google{" "}
                <strong className="font-medium text-foreground">@portalcci.com.br</strong>,{" "}
                <strong className="font-medium text-foreground">@faculdadecci.com.br</strong> ou{" "}
                <strong className="font-medium text-foreground">@tecscci.com.br</strong>.
              </p>
            </div>

            {import.meta.env.DEV && (
              <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-[12px] text-muted-foreground">
                <div>
                  <strong className="text-foreground">Origem:</strong> {origemAtual}
                </div>
                <div className="mt-1">
                  <strong className="text-foreground">URL:</strong> {urlAtual}
                </div>
                <div className="mt-1 break-all">
                  <strong className="text-foreground">Client ID:</strong>{" "}
                  {clientId ?? "(não configurado)"}
                </div>
              </div>
            )}

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
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
            Contas <strong>@portalcci.com.br</strong>, <strong>@faculdadecci.com.br</strong> e{" "}
            <strong>@tecscci.com.br</strong> são aceitas. O acesso às telas segue a unidade
            organizacional no Google Workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
