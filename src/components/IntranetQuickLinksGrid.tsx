import { ArrowUpRight, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { hasRoleAccessToRoute } from "@/auth/routeAccess";
import { isRotaBloqueadaParaUsuario } from "@/auth/routesTemporarilyBlocked";
import { INTRANET_QUICK_LINKS, type IntranetQuickLink } from "@/lib/intranetQuickLinks";

type IntranetQuickLinksGridProps = {
  title?: string;
  subtitle?: string;
  excludeUrls?: string[];
  links?: IntranetQuickLink[];
  columns?: "home" | "portal";
};

export function IntranetQuickLinksGrid({
  title = "Atalhos rápidos",
  subtitle = "Acesso direto às ferramentas mais usadas.",
  excludeUrls = [],
  links = INTRANET_QUICK_LINKS,
  columns = "home",
}: IntranetQuickLinksGridProps) {
  const { usuario } = useAuth();
  const papeis = usuario?.papeis ?? [];
  const exclude = new Set(excludeUrls);

  const visiveis = links.filter(
    (link) => !exclude.has(link.url) && hasRoleAccessToRoute(papeis, link.url, usuario?.email),
  );

  if (visiveis.length === 0) return null;

  const gridClass =
    columns === "portal"
      ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className={gridClass}>
        {visiveis.map((action) => {
          const locked = isRotaBloqueadaParaUsuario(papeis, action.url);
          const Icon = action.icon;

          if (locked) {
            return (
              <div
                key={action.url}
                title="Em breve — funcionalidade em revisão"
                className="relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/30 p-4 opacity-80"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border/60">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-card-foreground">{action.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {action.description}
                    </p>
                    <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                      Em breve
                    </p>
                  </div>
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </div>
              </div>
            );
          }

          return (
            <Link
              key={action.url}
              to={action.url}
              className="group relative overflow-hidden rounded-xl border border-border/90 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-primary ring-1 ring-border/60 transition-colors group-hover:bg-primary/10 group-hover:ring-primary/20">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug text-card-foreground group-hover:text-primary">
                    {action.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
