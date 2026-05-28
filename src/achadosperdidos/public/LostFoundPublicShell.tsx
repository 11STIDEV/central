import type { ReactNode } from "react";
import { SidebarBrandLogo } from "@/components/SidebarBrandLogo";
import { LostFoundPublicNav } from "@/achadosperdidos/public/LostFoundPublicNav";
import type { LostFoundPublicView } from "@/achadosperdidos/public/types";

type Props = {
  activeView: LostFoundPublicView;
  onViewChange: (view: LostFoundPublicView) => void;
  hideMobileNav?: boolean;
  children: ReactNode;
};

export function LostFoundPublicShell({ activeView, onViewChange, hideMobileNav, children }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarBrandLogo compact className="shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">Grupo CCI</p>
              <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">Achados e Perdidos</h1>
            </div>
          </div>
          <LostFoundPublicNav
            activeView={activeView}
            onViewChange={onViewChange}
            hideMobileNav={hideMobileNav}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:pb-8">{children}</main>
    </div>
  );
}
