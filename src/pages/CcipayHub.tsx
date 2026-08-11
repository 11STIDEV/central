import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayMe,
  descricaoMovimento,
  formatarDataMovimento,
  labelStatusMovimento,
  type CcipayMovimento,
  type CcipayResumo,
} from "@/lib/ccipay";
import { CcipayQrScannerDialog } from "@/components/ccipay/CcipayQrScannerDialog";
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
import { QrCode, Wallet } from "lucide-react";

export default function CcipayHub() {
  const navigate = useNavigate();
  const { googleIdToken } = useAuth();
  const [resumo, setResumo] = useState<CcipayResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [scannerAberto, setScannerAberto] = useState(false);

  const carregar = useCallback(async () => {
    if (!googleIdToken) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const r = await ccipayMe(googleIdToken);
      setResumo(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar Advance-CCI.");
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function aoDetectarToken(token: string) {
    navigate(`/cci-pay/pagar/${encodeURIComponent(token)}`);
  }

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Advance-CCI"
        subtitle="Seu extrato, saldos e pagamentos na loja parceira."
      />

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-8">
        {erro && (
          <Alert variant="destructive">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {carregando && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {!carregando && !resumo && !erro && (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar seus dados. Tente recarregar a página.
          </p>
        )}

        {resumo && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <SaldoCard
                titulo="Adiantamento / vales"
                subtitulo={`Competência ${resumo.competencia}`}
                valor={resumo.adiantamentoDisponivel}
                detalhe={`Usado R$ ${resumo.adiantamentoUsado.toFixed(2)} de R$ ${resumo.funcionario.limiteAdiantamento.toFixed(2)}`}
              />
              <SaldoCard
                titulo="Bonificações"
                subtitulo="Saldo para pagar com QR"
                valor={resumo.saldoBonificacao}
                detalhe={
                  resumo.bonificacaoTeto != null
                    ? `Teto R$ ${resumo.bonificacaoTeto.toFixed(2)}${
                        resumo.bonificacaoDisponivelCreditar != null
                          ? ` · pode receber mais R$ ${resumo.bonificacaoDisponivelCreditar.toFixed(2)}`
                          : ""
                      }`
                    : "Sem teto definido pelo DP"
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild size="lg" className="h-auto py-4">
                <Link to="/vale-adiantamento">
                  <Wallet className="mr-2 h-5 w-5" />
                  Solicitar vale
                </Link>
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="h-auto py-4"
                onClick={() => setScannerAberto(true)}
              >
                <QrCode className="mr-2 h-5 w-5" />
                Pagar com QR
              </Button>
            </div>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Seus movimentos</h2>
              <ExtratoTable movimentos={resumo.movimentos} />
            </section>
          </>
        )}
      </div>

      <CcipayQrScannerDialog
        open={scannerAberto}
        onOpenChange={setScannerAberto}
        onTokenDetected={aoDetectarToken}
      />
    </div>
  );
}

function SaldoCard({
  titulo,
  subtitulo,
  valor,
  detalhe,
}: {
  titulo: string;
  subtitulo: string;
  valor: number;
  detalhe: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">R$ {valor.toFixed(2)}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detalhe}</p>
    </div>
  );
}

function ExtratoTable({ movimentos }: { movimentos: CcipayMovimento[] }) {
  if (movimentos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Nenhum movimento registrado ainda nesta competência.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movimentos.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="whitespace-nowrap text-xs">{formatarDataMovimento(m)}</TableCell>
              <TableCell className="max-w-[200px] truncate text-sm">{descricaoMovimento(m)}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-medium">
                <span className={m.direcao === "debito" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}>
                  {m.direcao === "debito" ? "−" : "+"} R$ {m.valor.toFixed(2)}
                </span>
              </TableCell>
              <TableCell className="text-xs">{labelStatusMovimento(m.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
