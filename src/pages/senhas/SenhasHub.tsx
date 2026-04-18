import { Link } from "react-router-dom";
import { Hash, MonitorSpeaker, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { PageHero, PageHeroEyebrow } from "@/components/PageHero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { podePainelAdmin } from "@/painel/painelWorkspaceAccess";
import { isPainelSupabaseConfigured } from "@/painel/supabaseClient";
import { cn } from "@/lib/utils";

/** Totem e Painel TV não aparecem aqui — use a URL direta (favoritos / QR) nos equipamentos fixos. */
const linkAtendente = {
  to: "/senhas/atendente",
  title: "Atendente",
  description: "Chamar senhas e gerenciar o guichê.",
  icon: MonitorSpeaker,
};

const linkAdmin = {
  to: "/senhas/admin",
  title: "Administração",
  description: "Filas, guichês, atendentes e relatórios.",
  icon: LayoutDashboard,
};

export default function SenhasHub() {
  const { usuario } = useAuth();
  const papeis = usuario?.papeis ?? [];
  const mostrarAdmin = podePainelAdmin(papeis);
  const links = mostrarAdmin ? [linkAtendente, linkAdmin] : [linkAtendente];
  const supabaseOk = isPainelSupabaseConfigured();

  return (
    <div className="animate-fade-in">
      <PageHero>
        <>
          <PageHeroEyebrow />
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/80 ring-1 ring-border">
              <Hash className="h-5 w-5 text-amber-600 dark:text-amber-300" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-hero-foreground md:text-3xl lg:text-4xl">
                Painel de senhas
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-hero-muted md:text-lg">
                Escolha o modo de uso
              </p>
            </div>
          </div>
        </>
      </PageHero>

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        {!supabaseOk && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Painel sem conexão ao Supabase</p>
            <p className="mt-1 text-amber-800/90">
              Defina <code className="rounded bg-amber-100/80 px-1">VITE_SUPABASE_URL</code> e{" "}
              <code className="rounded bg-amber-100/80 px-1">VITE_SUPABASE_ANON_KEY</code> no arquivo{" "}
              <code className="rounded bg-amber-100/80 px-1">.env.local</code> na raiz do projeto e reinicie o{" "}
              <code className="rounded bg-amber-100/80 px-1">npm run dev</code>.
            </p>
          </div>
        )}

        <div
          className={cn(
            "gap-4",
            mostrarAdmin ? "grid sm:grid-cols-2" : "flex justify-center",
          )}
        >
          {links.map(({ to, title, description, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "block rounded-xl transition-shadow hover:shadow-md",
                !mostrarAdmin && "w-full max-w-md",
              )}
            >
              <Card className="h-full border-slate-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                  </div>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm font-medium text-blue-600">Abrir →</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
