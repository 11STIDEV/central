import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { ccipayAtualizarFuncionario, ccipayListarFuncionarios, type CcipayFuncionario } from "@/lib/ccipay";
import { ArrowLeft } from "lucide-react";

export default function CcipayAdminFuncionarios() {
  const { googleIdToken } = useAuth();
  const [lista, setLista] = useState<CcipayFuncionario[]>([]);

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    const { funcionarios } = await ccipayListarFuncionarios(googleIdToken);
    setLista(funcionarios);
  }, [googleIdToken]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(f: CcipayFuncionario, patch: Partial<CcipayFuncionario>) {
    if (!googleIdToken) return;
    await ccipayAtualizarFuncionario(googleIdToken, f.email, patch);
    await carregar();
  }

  return (
    <div className="animate-fade-in">
      <PageHero title="Funcionários Advance-CCI" subtitle="Limites e vínculo Alterdata." />
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cci-pay"><ArrowLeft className="mr-2 h-4 w-4" />Advance-CCI</Link>
        </Button>
        {lista.map((f) => (
          <div key={f.email} className="grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
            <div>
              <p className="font-medium">{f.nome}</p>
              <p className="text-xs text-muted-foreground">{f.email}</p>
            </div>
            <Input
              defaultValue={f.alterdataCodigo ?? ""}
              placeholder="Código Alterdata"
              onBlur={(e) => salvar(f, { alterdataCodigo: e.target.value })}
            />
            <Input
              type="number"
              defaultValue={f.limiteAdiantamento}
              placeholder="Limite adiantamento"
              onBlur={(e) => salvar(f, { limiteAdiantamento: Number(e.target.value) })}
            />
            <Input
              type="number"
              defaultValue={f.limiteBonificacao ?? ""}
              placeholder="Limite bonificação"
              onBlur={(e) =>
                salvar(f, { limiteBonificacao: e.target.value ? Number(e.target.value) : null })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
