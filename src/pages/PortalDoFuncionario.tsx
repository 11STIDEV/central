import { CircleDollarSign, ExternalLink, Link2, Lock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { canAccessRoute } from "@/auth/routeAccess";
import { isRotaBloqueadaParaUsuario } from "@/auth/routesTemporarilyBlocked";
import { PageHero } from "@/components/PageHero";

/** Serviço interno da intranet (em revisão — visível com cadeado para quem não é setape / painel_admin). */
const PORTAL_INTRANET_SERVICES = [
  {
    title: "Solicitar Vale-Adiantamento",
    description: "Pedido de vale para o financeiro",
    url: "/vale-adiantamento",
    icon: CircleDollarSign,
  },
] as const;

const PORTAL_LINKS = [
  {
    title: "Atestados, Ausência e declarações",
    url: "https://docs.google.com/forms/d/e/1FAIpQLScQ0iBckCsZZsZGQcNzmGW02neefgDycHpcb740n2NLALhv7g/viewform",
  },
  {
    title: "Serviços e pedidos ao DP e Financeiro",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfjT8H5IaComOcE64EBubTzVmRpaV98-rSeuST7QcvkyZYtNg/viewform",
  },
  {
    title: "Registro de certificados e históricos",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSdCnxgk1CDoyhpB1iTt_sqOTFH9KZxfCRElgEqmgd0G6r2dNw/viewform",
  },
  {
    title: "Registro de atividade de capacitação sem certificado",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSf-G3ge11lB0XTnU848cMz6Em0pc79hyLYp_9hdsRzASoBHWQ/viewform",
  },
  {
    title: "Autoavaliação",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSdZQ_Y-0AV5KJXMLqpkauLL8Qd2pOurq7yJFsvUNUSYtDA77g/viewform",
  },
] as const;

export default function PortalDoFuncionario() {
  const { usuario } = useAuth();
  const papeis = usuario?.papeis ?? [];
  const totalLinks = PORTAL_LINKS.length + PORTAL_INTRANET_SERVICES.length;

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Portal do Funcionário"
        subtitle="Formulários e serviços do DP e Financeiro disponíveis para todos os colaboradores."
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/80 px-4 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-medium text-card-foreground">
                Acesso aberto a todos os funcionários autenticados na intranet.
              </p>
              <p className="text-xs text-muted-foreground">
                Os links abrem os formulários oficiais em uma nova aba.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            {totalLinks} {totalLinks === 1 ? "link" : "links"}
          </span>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Serviços ao colaborador
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha uma opção para acessar o recurso externo ou interno.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {PORTAL_INTRANET_SERVICES.map((service) => {
              const podeAbrir = canAccessRoute(papeis, service.url, usuario?.email);
              const bloqueado = isRotaBloqueadaParaUsuario(papeis, service.url);

              if (podeAbrir) {
                return (
                  <Link
                    key={service.url}
                    to={service.url}
                    className="group flex min-h-[132px] flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                        <service.icon className="h-5 w-5 text-primary" aria-hidden />
                      </div>
                    </div>
                    <div className="mt-5">
                      <h3 className="text-base font-semibold leading-snug text-card-foreground">{service.title}</h3>
                      <p className="mt-2 text-xs text-muted-foreground">{service.description}</p>
                    </div>
                  </Link>
                );
              }

              return (
                <button
                  key={service.url}
                  type="button"
                  disabled={bloqueado}
                  aria-disabled={bloqueado}
                  title={bloqueado ? "Em breve — funcionalidade em revisão" : undefined}
                  className={`group flex min-h-[132px] flex-col justify-between rounded-xl border p-5 text-left ${
                    bloqueado
                      ? "cursor-not-allowed border-dashed border-border bg-muted/30 opacity-80"
                      : "border-border bg-card shadow-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <service.icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                    </div>
                    {bloqueado ? (
                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    ) : null}
                  </div>
                  <div className="mt-5">
                    <h3 className="text-base font-semibold leading-snug text-card-foreground">{service.title}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">{service.description}</p>
                    {bloqueado ? (
                      <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                        Em breve
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
            {PORTAL_LINKS.map((link) => (
              <a
                key={link.title}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="group flex min-h-[132px] flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <ExternalLink className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <div className="mt-5">
                  <h3 className="text-base font-semibold leading-snug text-card-foreground">{link.title}</h3>
                  <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{link.url}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
