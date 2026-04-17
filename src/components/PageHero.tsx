import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { IntranetHero } from "@/components/IntranetHero";

/** Linha “Intranet · Grupo CCI” para heróis com conteúdo customizado (`children`). */
export function PageHeroEyebrow({ text = "Intranet · Grupo CCI" }: { text?: string }) {
  return (
    <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.25em] text-hero-eyebrow">
      <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" aria-hidden />
      {text}
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
export function PageHero({ title, subtitle, eyebrow = "Intranet · Grupo CCI", children }: PageHeroProps) {
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
