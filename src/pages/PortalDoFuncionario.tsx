import { Users } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { PortalColaboradorLinksSection } from "@/components/portal/PortalColaboradorLinksSection";

export default function PortalDoFuncionario() {
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
        </div>

        <PortalColaboradorLinksSection />
      </div>
    </div>
  );
}
