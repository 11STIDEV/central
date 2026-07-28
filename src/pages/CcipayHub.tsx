import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayMe,
  labelStatusMovimento,
  type CcipayMovimento,
  type CcipayResumo,
  isCcipayAdminPapel,
  isCcipayDpPapel,
  isCcipayLancadorPapel,
  isCcipayLojaPapel,
} from "@/lib/ccipay";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wallet, Store, FileText, Settings } from "lucide-react";

export default function CcipayHub() {
  const { googleIdToken, usuario } = useAuth();
  const [resumo, setResumo] = useState<CcipayResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    setCarregando(true);
    setErro(null);
    try {
      const r = await ccipayMe(googleIdToken);
      setResumo(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar CCI Pay.");
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const papeis = usuario?.papeis ?? [];

  return (
    <div className="animate-fade-in">
      <PageHero
        title="CCI Pay"
        subtitle="Adiantamentos, vales, bonificações e loja interna."
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
        {erro && (
          <Alert variant="destructive">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {carregando && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {resumo && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Limite adiantamento ({resumo.competencia})</p>
                <p className="mt-1 text-2xl font-semibold">
                  R$ {resumo.adiantamentoDisponivel.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Usado: R$ {resumo.adiantamentoUsado.toFixed(2)} / R${" "}
                  {resumo.funcionario.limiteAdiantamento.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Saldo bonificações ({resumo.competencia})</p>
                <p className="mt-1 text-2xl font-semibold">R$ {resumo.saldoBonificacao.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Alterdata</p>
                <p className="mt-1 text-lg font-medium">
                  {resumo.funcionario.alterdataCodigo || "Não vinculado"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="default">
                <Link to="/vale-adiantamento">
                  <Wallet className="mr-2 h-4 w-4" />
                  Solicitar vale
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/cci-pay/loja">
                  <Store className="mr-2 h-4 w-4" />
                  Loja
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/cci-pay/meus-pedidos">Meus pedidos</Link>
              </Button>
              {isCcipayDpPapel(papeis) && (
                <Button asChild variant="outline">
                  <Link to="/cci-pay/financeiro">Aprovar vales</Link>
                </Button>
              )}
              {isCcipayLancadorPapel(papeis) && (
                <Button asChild variant="outline">
                  <Link to="/cci-pay/lancamentos">Lançamentos</Link>
                </Button>
              )}
              {(isCcipayLojaPapel(papeis) || isCcipayDpPapel(papeis)) && (
                <Button asChild variant="outline">
                  <Link to="/cci-pay/relatorios/loja">
                    <FileText className="mr-2 h-4 w-4" />
                    Relatório loja
                  </Link>
                </Button>
              )}
              {isCcipayDpPapel(papeis) && (
                <Button asChild variant="outline">
                  <Link to="/cci-pay/relatorios/dp">Relatório DP</Link>
                </Button>
              )}
              {isCcipayAdminPapel(papeis) && (
                <Button asChild variant="outline">
                  <Link to="/cci-pay/admin/lojas">
                    <Settings className="mr-2 h-4 w-4" />
                    Admin
                  </Link>
                </Button>
              )}
            </div>

            <ExtratoTable movimentos={resumo.movimentos} />
          </>
        )}
      </div>
    </div>
  );
}

function ExtratoTable({ movimentos }: { movimentos: CcipayMovimento[] }) {
  if (movimentos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum movimento registrado ainda.</p>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movimentos.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="text-xs">{m.competencia}</TableCell>
              <TableCell className="capitalize">{m.tipo.replace("_", " ")}</TableCell>
              <TableCell>
                {m.direcao === "debito" ? "-" : "+"} R$ {m.valor.toFixed(2)}
              </TableCell>
              <TableCell>{labelStatusMovimento(m.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
