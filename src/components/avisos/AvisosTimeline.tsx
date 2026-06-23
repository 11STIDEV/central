import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AvisoCard } from "@/components/avisos/AvisoCard";
import type { Aviso } from "@/lib/avisos";

type AvisosTimelineProps = {
  avisos: Aviso[];
  titulo?: string;
  linkVerTodos?: boolean;
};

export function AvisosTimeline({
  avisos,
  titulo = "Avisos",
  linkVerTodos = true,
}: AvisosTimelineProps) {
  return (
    <section className="mt-14 md:mt-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          <h2 className="shrink-0 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {titulo}
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        {linkVerTodos ? (
          <Link
            to="/avisos"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Ver todos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>

      {avisos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
          Nenhum aviso publicado no momento.
        </p>
      ) : (
        <div className="relative">
          <div
            className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-primary/40 via-border to-transparent md:left-1/2 md:-translate-x-px"
            aria-hidden
          />

          <ul className="space-y-6">
            {avisos.map((aviso, i) => (
              <li key={aviso.id} className="relative">
                <div className="space-y-3 pl-10 md:hidden">
                  <div className="absolute left-0 top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-primary shadow-sm" />
                  <time className="font-mono text-xs text-muted-foreground">{aviso.data}</time>
                  <AvisoCard aviso={aviso} />
                </div>

                <div className="hidden min-w-0 md:grid md:grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] md:items-center md:gap-0">
                  {i % 2 === 0 ? (
                    <>
                      <div className="flex min-w-0 justify-end pr-8">
                        <AvisoCard aviso={aviso} />
                      </div>
                      <div className="flex items-center justify-center">
                        <div
                          className="z-10 h-4 w-4 shrink-0 rounded-full border-2 border-background bg-primary shadow-sm"
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0 pl-8">
                        <time className="font-mono text-xs text-muted-foreground">{aviso.data}</time>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex min-w-0 justify-end pr-8">
                        <time className="text-right font-mono text-xs text-muted-foreground">{aviso.data}</time>
                      </div>
                      <div className="flex items-center justify-center">
                        <div
                          className="z-10 h-4 w-4 shrink-0 rounded-full border-2 border-background bg-primary shadow-sm"
                          aria-hidden
                        />
                      </div>
                      <div className="flex min-w-0 justify-start pl-8">
                        <AvisoCard aviso={aviso} />
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
