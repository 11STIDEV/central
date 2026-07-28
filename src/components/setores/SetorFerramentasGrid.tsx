import { ArrowUpRight, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { hasRoleAccessToRoute } from "@/auth/routeAccess";
import { isRotaBloqueadaParaUsuario } from "@/auth/routesTemporarilyBlocked";
import { getSetorNavItemsBySlug } from "@/navigation/setoresConfig";

type SetorFerramentasGridProps = {
  setorSlug: string;
};

export function SetorFerramentasGrid({ setorSlug }: SetorFerramentasGridProps) {
  const { usuario } = useAuth();
  const papeis = usuario?.papeis ?? [];
  const items = getSetorNavItemsBySlug(setorSlug);

  const visiveis = items.filter((item) => hasRoleAccessToRoute(papeis, item.url, usuario?.email));

  if (visiveis.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Ferramentas do setor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesso rápido às áreas de trabalho deste setor.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((item) => {
          const locked = isRotaBloqueadaParaUsuario(papeis, item.url);
          const Icon = item.icon;
          if (locked) {
            return (
              <div
                key={item.url}
                className="flex min-h-[120px] flex-col justify-between rounded-xl border border-dashed border-border bg-muted/20 p-4 opacity-70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Em breve</p>
                </div>
              </div>
            );
          }
          return (
            <Link
              key={item.url}
              to={item.url}
              className="group flex min-h-[120px] flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100" />
              </div>
              <p className="font-semibold leading-snug text-card-foreground group-hover:text-primary">
                {item.title}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
