import { ArrowUpRight, Landmark } from "lucide-react";
import { Link } from "react-router-dom";
import type { SetorConfig } from "@/navigation/setoresConfig";
import { getSetorHubUrl } from "@/navigation/setoresConfig";

type SetoresCardsGridProps = {
  setores: SetorConfig[];
  columns?: "two" | "three";
};

export function SetoresCardsGrid({ setores, columns = "three" }: SetoresCardsGridProps) {
  if (setores.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
        Nenhum setor disponível para o seu perfil.
      </p>
    );
  }

  const gridClass =
    columns === "two"
      ? "grid gap-4 sm:grid-cols-2"
      : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={gridClass}>
      {setores.map((setor) => (
        <Link
          key={setor.id}
          to={getSetorHubUrl(setor)}
          className="group flex min-h-[140px] flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
              <Landmark className="h-5 w-5 text-primary" />
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
          </div>
          <div className="mt-4">
            <h2 className="text-lg font-semibold leading-snug text-card-foreground group-hover:text-primary">
              {setor.label}
            </h2>
            {setor.descricao ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{setor.descricao}</p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
