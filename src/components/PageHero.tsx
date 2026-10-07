import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { IntranetHero } from "@/components/IntranetHero";

/** Linha de marca para heróis com conteúdo customizado (`children`). */
export function PageHeroEyebrow({ text = "Central de Informações · Grupo CCI" }: { text?: string }) {
  return (
    <p className="mb-3 flex max-w-full flex-wrap items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-hero-eyebrow sm:text-[11px] sm:tracking-[0.22em]">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-300" aria-hidden />
      <span className="break-words">{text}</span>
    </p>
  );
}

export type PageHeroProps = {
  title?: string;
  subtitle?: string;
  /** Texto acima do título (mono). Padrão alinhado à home. */
  eyebrow?: string;
  /** Se definido, substitui o bloco título/subtítulo (badges, botões, layouts especiais). */
  children?: ReactNode;
};

/**
 * Hero de página interna — mesmo padrão visual da home (`/`): tokens em `index.css`.
 */
export function PageHero({ title, subtitle, eyebrow = "Central de Informações · Grupo CCI", children }: PageHeroProps) {
  return (
    <IntranetHero>
      {children ?? (
        <>
          <PageHeroEyebrow text={eyebrow} />
          {title ? (
            <h1 className="text-2xl font-bold tracking-tight text-hero-foreground md:text-3xl lg:text-4xl">{title}</h1>
          ) : null}
          {subtitle ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-hero-muted md:text-lg">{subtitle}</p>
          ) : null}
        </>
      )}
    </IntranetHero>
  );
}
