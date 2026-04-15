import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

/** Linha “Intranet · Grupo CCI” para heróis com conteúdo customizado (`children`). */
export function PageHeroEyebrow({ text = "Intranet · Grupo CCI" }: { text?: string }) {
  return (
    <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.25em] text-cyan-300/90">
      <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden />
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
 * Hero de página interna — mesmo padrão visual da home (`/`): cartão escuro, mesh e tipografia.
 */
export function PageHero({ title, subtitle, eyebrow = "Intranet · Grupo CCI", children }: PageHeroProps) {
  return (
    <section className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 shadow-2xl shadow-slate-900/20 md:mx-8 md:mt-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `
              radial-gradient(ellipse 80% 60% at 20% 40%, hsl(210, 90%, 45%, 0.35), transparent 55%),
              radial-gradient(ellipse 60% 50% at 85% 20%, hsl(199, 85%, 48%, 0.25), transparent 50%),
              linear-gradient(135deg, hsl(222, 47%, 6%) 0%, hsl(215, 45%, 10%) 50%, hsl(222, 40%, 8%) 100%)
            `,
        }}
      />
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative px-6 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-6xl">
          {children ?? (
            <>
              <PageHeroEyebrow text={eyebrow} />
              {title ? (
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">{title}</h1>
              ) : null}
              {subtitle ? (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">{subtitle}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
