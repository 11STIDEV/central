import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IntranetHeroProps = {
  children: ReactNode;
  className?: string;
  /** Padding interno (home usa mais espaço). */
  padding?: "default" | "comfortable";
};

/**
 * Faixa hero institucional — cores via tokens em `index.css` (claro/escuro).
 */
export function IntranetHero({ children, className, padding = "default" }: IntranetHeroProps) {
  const pad =
    padding === "comfortable" ? "px-4 py-8 sm:px-6 sm:py-10 md:px-12 md:py-14" : "px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10";

  return (
    <section
      className={cn(
        "intranet-hero relative mx-3 mt-3 overflow-hidden rounded-2xl border sm:mx-4 sm:mt-4 md:mx-8 md:mt-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="intranet-hero-mesh absolute inset-0" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl dark:bg-primary/20" />
        <div className="absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-400/10" />
      </div>

      <div className={cn("relative min-w-0", pad)}>
        <div className="mx-auto max-w-6xl min-w-0">{children}</div>
      </div>
    </section>
  );
}
