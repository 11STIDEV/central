import { Link } from "react-router-dom";
import { Hash, ArrowRight } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { IntranetHero } from "@/components/IntranetHero";
import { PageHeroEyebrow } from "@/components/PageHero";
import { Button } from "@/components/ui/button";

function primeiroNome(nome: string | undefined): string {
  if (!nome?.trim()) return "visitante";
  return nome.trim().split(/\s+/)[0] ?? "visitante";
}

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Home da branch produção: login Google, mapeamento de OUs e painel de senhas.
 */
export default function Index() {
  const { usuario } = useAuth();
  const nome = primeiroNome(usuario?.nome);

  return (
    <div className="animate-fade-in min-h-full">
      <IntranetHero padding="comfortable">
        <div className="max-w-2xl">
          <PageHeroEyebrow text="Produção · Painel de senhas" />
          <h1 className="text-3xl font-bold tracking-tight text-hero-foreground md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {saudacao()}, {nome}.
          </h1>
          <p className="mt-4 text-base text-hero-foreground/85 md:text-lg">
            Acesse o hub do painel de senhas (totem, TV, atendimento e administração).
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/senhas">
                <Hash className="h-4 w-4" />
                Ir para o painel de senhas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </IntranetHero>
    </div>
  );
}
