import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <PageHero
        title="Funcionários Advance-CCI"
        subtitle="Dois controles por pessoa: limite de adiantamento/vales e teto de bonificações. Código referência é controle interno (sem API Alterdata)."
      />
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cci-pay"><ArrowLeft className="mr-2 h-4 w-4" />Advance-CCI</Link>
        </Button>

        {lista.map((f) => (
          <div
            key={f.email}
            className={`rounded-xl border bg-card p-4 ${f.ativo ? "border-border" : "border-dashed border-muted opacity-80"}`}
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{f.nome}</p>
                <p className="text-xs text-muted-foreground">{f.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!f.alterdataCodigo ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    Sem código referência
                  </Badge>
                ) : null}
                <Badge variant={f.ativo ? "default" : "secondary"}>
                  {f.ativo ? "Ativo" : "Inativo"}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => salvar(f, { ativo: !f.ativo })}
                >
                  {f.ativo ? "Inativar" : "Ativar"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Código referência (folha)</label>
                <Input
                  defaultValue={f.alterdataCodigo ?? ""}
                  placeholder="Ex.: 12345"
                  onBlur={(e) => salvar(f, { alterdataCodigo: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Limite adiantamento / vales</label>
                <Input
                  type="number"
                  defaultValue={f.limiteAdiantamento}
                  placeholder="Limite adiantamento"
                  onBlur={(e) => salvar(f, { limiteAdiantamento: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Teto bonificações</label>
                <Input
                  type="number"
                  defaultValue={f.limiteBonificacao ?? ""}
                  placeholder="Vazio = sem teto"
                  onBlur={(e) =>
                    salvar(f, { limiteBonificacao: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
