import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import { AvisosTimeline } from "@/components/avisos/AvisosTimeline";
import { IntranetHero } from "@/components/IntranetHero";
import { IntranetQuickLinksGrid } from "@/components/IntranetQuickLinksGrid";
import { PageHeroEyebrow } from "@/components/PageHero";
import { obterUltimosAvisos, type Aviso } from "@/lib/avisos";
import { podeAcessarAvisos } from "@/lib/avisosAccess";

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
  const { usuario, googleIdToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const papeis = usuario?.papeis ?? [];
  const [ultimosAvisos, setUltimosAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    const state = location.state as { accessDeniedHint?: string } | null;
    if (state?.accessDeniedHint) {
      toast.error("Acesso negado", { description: state.accessDeniedHint, duration: 12_000 });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const exibeAvisos = podeAcessarAvisos(papeis);

  useEffect(() => {
    if (!exibeAvisos || !googleIdToken || location.pathname !== "/") return;
    let cancelado = false;
    void obterUltimosAvisos(googleIdToken, 3)
      .then((lista) => {
        if (!cancelado) setUltimosAvisos(lista);
      })
      .catch(() => {
        if (!cancelado) setUltimosAvisos([]);
      });
    return () => {
      cancelado = true;
    };
  }, [exibeAvisos, googleIdToken, location.pathname, location.key]);

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
        <IntranetQuickLinksGrid
          title="Em destaque"
          subtitle="Atalhos rápidos; use Ctrl+K ou o menu lateral para ver tudo."
        />

        {exibeAvisos ? <AvisosTimeline avisos={ultimosAvisos} titulo="Últimos avisos" /> : null}

        <p className="mt-12 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">
          Uso interno · Grupo CCI
        </p>
      </div>
    </div>
  );
}
