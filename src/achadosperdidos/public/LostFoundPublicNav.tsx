import { LayoutDashboard, Package, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LostFoundPublicView } from "@/achadosperdidos/public/types";

const NAV_ITEMS: { id: LostFoundPublicView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "painel", label: "Painel", icon: LayoutDashboard },
  { id: "itens", label: "Itens Achados", icon: Package },
  { id: "devolvidos", label: "Devolvidos", icon: RotateCcw },
];

type Props = {
  activeView: LostFoundPublicView;
  onViewChange: (view: LostFoundPublicView) => void;
  hideMobileNav?: boolean;
};

export function LostFoundPublicNav({ activeView, onViewChange, hideMobileNav }: Props) {
  return (
    <>
      <nav className="hidden gap-2 sm:flex" aria-label="Navegação principal">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onViewChange(id)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
              activeView === id
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-md sm:hidden",
          hideMobileNav && "pointer-events-none invisible",
        )}
        aria-label="Navegação principal"
        aria-hidden={hideMobileNav}
      >
        <div className="mx-auto flex max-w-lg justify-around">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onViewChange(id)}
              className={cn(
                "flex min-h-11 min-w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors",
                activeView === id ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", activeView === id && "text-primary")} />
              <span className="leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
