import { Ticket, MapPin, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { canAccessRoute } from "@/auth/routeAccess";
import { IntranetHero } from "@/components/IntranetHero";
import { PageHeroEyebrow } from "@/components/PageHero";

/** Atalhos exibidos na home (ordem fixa; demais rotas ficam só no menu lateral). */
const highlightedShortcuts = [
  {
    name: "Reserva de Equipamentos e Espaços",
    url: "/reserva-espacos-equipamentos",
    icon: MapPin,
    description: "Chromebooks, equipamentos e espaços",
  },
  { name: "Abrir Chamado", url: "/chamados/novo", icon: Ticket, description: "Solicitar suporte de TI" },
];

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function primeiroNome(nome: string | undefined): string {
  if (!nome?.trim()) return "visitante";
  return nome.trim().split(/\s+/)[0] ?? "visitante";
}

export default function Index() {
  const { usuario } = useAuth();
  const papeis = usuario?.papeis ?? [];
  const visiveis = highlightedShortcuts.filter((a) =>
    canAccessRoute(papeis, a.url, usuario?.email),
  );

  const nome = primeiroNome(usuario?.nome);

  return (
    <div className="animate-fade-in min-h-full">
      <IntranetHero padding="comfortable">
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-12">
          <div className="max-w-2xl">
            <PageHeroEyebrow text="Intranet · Grupo CCI" />
            <h1 className="text-3xl font-bold tracking-tight text-hero-foreground md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              {saudacao()}, {nome}.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-hero-muted md:text-lg">
              Um só lugar para dúvidas, reservas, chamados e o que mais você precisar no dia a dia — rápido, organizado,
              feito para quem trabalha junto.
            </p>
          </div>
          <div className="mt-8 hidden shrink-0 lg:mt-0 lg:block">
            <div className="rounded-xl border border-border/60 bg-background/55 px-5 py-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-hero-muted">Status</p>
              <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300/95">Sistemas operacionais</p>
              <p className="mt-2 text-xs text-hero-muted">Atualizado em tempo real ao acessar os serviços</p>
            </div>
          </div>
        </div>
      </IntranetHero>

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        {visiveis.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-muted-foreground">
            Nenhum atalho disponível para o seu perfil. Entre em contato com a TI se precisar de acesso.
          </p>
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Em destaque</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Atalhos rápidos; o menu lateral reúne todas as ferramentas.
                </p>
              </div>
              {visiveis.length > 0 ? (
                <span className="font-mono text-xs text-muted-foreground/80">
                  {visiveis.length} {visiveis.length === 1 ? "atalho" : "atalhos"}
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visiveis.map((action) => (
                <Link
                  key={action.url}
                  to={action.url}
                  className="group relative overflow-hidden rounded-xl border border-border/90 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                >
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Destaque
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-primary ring-1 ring-border/60 transition-colors group-hover:bg-primary/10 group-hover:ring-primary/20">
                      <action.icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug text-card-foreground group-hover:text-primary">{action.name}</p>
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{action.description}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <p className="mt-12 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">
          Uso interno · Grupo CCI
        </p>
      </div>
    </div>
  );
}
