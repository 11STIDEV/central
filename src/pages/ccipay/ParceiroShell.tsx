import { Link, NavLink, Outlet } from "react-router-dom";
import { LogOut, Store } from "lucide-react";
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
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Advance-CCI
            </p>
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Store className="h-5 w-5" />
              Portal Parceiro
            </h1>
            <p className="text-sm text-muted-foreground">{operador.lojaNome}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{operador.nome}</span>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />
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
