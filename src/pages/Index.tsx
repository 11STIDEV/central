import { Ticket, CalendarDays, MapPin, CircleDollarSign, Clock, ArrowUpRight } from "lucide-react";
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
  {
    name: "Agenda CCI",
    url: "/agenda-cci",
    icon: CalendarDays,
    description: "Calendário semanal de reservas",
  },
  {
    name: "Solicitar Vale-Adiantamento",
    url: "/vale-adiantamento",
    icon: CircleDollarSign,
    description: "Pedido de vale para o financeiro",
  },
];

const recentNews = [
  { title: "Manutenção programada do servidor", date: "25/02/2026", type: "Aviso" },
  { title: "Novo tutorial: Como usar o VPN", date: "24/02/2026", type: "Tutorial" },
  { title: "Atualização do sistema de e-mail", date: "23/02/2026", type: "Atualização" },
];

type NoticeItem = (typeof recentNews)[number];

function NoticeCard({ news }: { news: NoticeItem }) {
  return (
    <div className="w-full max-w-lg rounded-xl border border-border/80 bg-muted/20 px-4 py-3 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium text-foreground">{news.title}</span>
        <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
          {news.type}
        </span>
      </div>
    </div>
  );
}

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
  const visiveis = highlightedShortcuts.filter((a) => canAccessRoute(papeis, a.url));

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

        {/* Avisos — timeline editorial */}
        <section className="mt-14 md:mt-16">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <h2 className="shrink-0 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Avisos</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-transparent md:left-1/2 md:-translate-x-px"
              aria-hidden
            />

            <ul className="space-y-6">
              {recentNews.map((news, i) => (
                <li key={i} className="relative">
                  {/* Mobile: linha à esquerda + empilhado */}
                  <div className="space-y-3 pl-10 md:hidden">
                    <div className="absolute left-0 top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-primary shadow-sm" />
                    <time className="font-mono text-xs text-muted-foreground">{news.date}</time>
                    <NoticeCard news={news} />
                  </div>

                  {/* Desktop: grid simétrico — mesma folga em relação ao eixo (pr-8 / pl-8 na coluna central de 1.5rem) */}
                  <div className="hidden min-w-0 md:grid md:grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] md:items-center md:gap-0">
                    {i % 2 === 0 ? (
                      <>
                        <div className="flex min-w-0 justify-end pr-8">
                          <NoticeCard news={news} />
                        </div>
                        <div className="flex items-center justify-center">
                          <div
                            className="z-10 h-4 w-4 shrink-0 rounded-full border-2 border-background bg-primary shadow-sm"
                            aria-hidden
                          />
                        </div>
                        <div className="min-w-0 pl-8">
                          <time className="font-mono text-xs text-muted-foreground">{news.date}</time>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex min-w-0 justify-end pr-8">
                          <time className="text-right font-mono text-xs text-muted-foreground">{news.date}</time>
                        </div>
                        <div className="flex items-center justify-center">
                          <div
                            className="z-10 h-4 w-4 shrink-0 rounded-full border-2 border-background bg-primary shadow-sm"
                            aria-hidden
                          />
                        </div>
                        <div className="flex min-w-0 justify-start pl-8">
                          <NoticeCard news={news} />
                        </div>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <p className="mt-12 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">
          Uso interno · Grupo CCI
        </p>
      </div>
    </div>
  );
}
