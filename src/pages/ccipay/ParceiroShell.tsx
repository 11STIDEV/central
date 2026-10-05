import { Link, NavLink, Outlet } from "react-router-dom";
import { LogOut, Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParceiroAuth } from "@/parceiro/ParceiroAuthProvider";
import { cn } from "@/lib/utils";
import type { CcipayLoja } from "@/lib/ccipay";

export type ParceiroOutletContext = {
  lojaId: string;
  loja: CcipayLoja | null;
};

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/venda", label: "Nova venda" },
  { to: "/extrato", label: "Extrato" },
];

export default function ParceiroShell() {
  const { operador, logout } = useParceiroAuth();

  if (!operador) return null;

  const loja: CcipayLoja = {
    id: operador.lojaId,
    nome: operador.lojaNome,
    descricao: "",
    ativa: true,
  };

  const ctx: ParceiroOutletContext = {
    lojaId: operador.lojaId,
    loja,
  };

  return (
    <div className="min-h-screen animate-fade-in bg-background">
      <div className="border-b border-border bg-card/60 backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Advance-CCI
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {operador.lojaNome}
              </span>
            </div>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Store className="h-5 w-5 text-primary" />
              Portal Parceiro
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-2xs">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{operador.nome}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()} className="h-8">
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-3 md:px-8">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Outlet context={ctx} />
      </div>
    </div>
  );
}
