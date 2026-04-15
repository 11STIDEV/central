import { Link } from "react-router-dom";
import { MonitorSpeaker, Ticket, Tv, LayoutDashboard, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isPainelSupabaseConfigured } from "@/painel/supabaseClient";

const links = [
  {
    to: "/senhas/totem",
    title: "Totem",
    description: "Emissão de senhas na entrada (tablet / quiosque).",
    icon: Ticket,
  },
  {
    to: "/senhas/painel",
    title: "Painel TV",
    description: "Chamadas em tela cheia com vídeo.",
    icon: Tv,
  },
  {
    to: "/senhas/atendente",
    title: "Atendente",
    description: "Chamar senhas e gerenciar o guichê.",
    icon: MonitorSpeaker,
  },
  {
    to: "/senhas/admin",
    title: "Administração",
    description: "Filas, guichês, atendentes e relatórios.",
    icon: LayoutDashboard,
  },
];

export default function SenhasHub() {
  const supabaseOk = isPainelSupabaseConfigured();

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
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
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Painel de senhas</h1>
            <p className="text-slate-500 text-sm mt-1">Escolha o modo de uso</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à Central
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {links.map(({ to, title, description, icon: Icon }) => (
            <Link key={to} to={to} className="block rounded-xl transition-shadow hover:shadow-md">
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
