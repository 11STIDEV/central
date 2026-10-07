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
    padding === "comfortable" ? "px-6 py-10 md:px-12 md:py-14" : "px-6 py-8 md:px-10 md:py-10";

  return (
    <section
      className={cn(
        "intranet-hero relative mx-4 mt-4 overflow-hidden rounded-2xl border md:mx-8 md:mt-6",
        className,
      )}
    >
      <div className="intranet-hero-mesh pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl dark:bg-primary/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-400/10"
        aria-hidden
      />

      <div className={cn("relative", pad)}>
        <div className="mx-auto max-w-6xl">{children}</div>
      </div>
    </section>
  );
}
