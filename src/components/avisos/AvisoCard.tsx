import { Clock } from "lucide-react";
import { labelTipoAviso } from "@/lib/avisos";
import type { Aviso } from "@/lib/avisos";

const tipoBadgeClass: Record<Aviso["tipo"], string> = {
  aviso: "bg-secondary/80 text-secondary-foreground",
  informativo: "bg-primary/10 text-primary",
  urgente: "bg-destructive/10 text-destructive",
  tutorial: "bg-success/10 text-success",
  atualizacao: "bg-warning/10 text-warning",
};

type AvisoCardProps = {
  aviso: Aviso;
  /** Exibe trecho do conteúdo abaixo do título. */
  showResumo?: boolean;
};

export function AvisoCard({ aviso, showResumo = false }: AvisoCardProps) {
  return (
    <div className="w-full max-w-lg rounded-xl border border-border/80 bg-muted/20 px-4 py-3 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium text-foreground">{aviso.titulo}</span>
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tipoBadgeClass[aviso.tipo]}`}
        >
          {labelTipoAviso(aviso.tipo)}
        </span>
      </div>
      {showResumo && aviso.conteudo ? (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{aviso.conteudo}</p>
      ) : null}
    </div>
  );
}
