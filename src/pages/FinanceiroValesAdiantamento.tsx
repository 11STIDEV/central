import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayAprovarAdiantamento,
  ccipayListarAdiantamentos,
  labelStatusMovimento,
  type CcipayMovimento,
} from "@/lib/ccipay";

export default function FinanceiroValesAdiantamento() {
  const { googleIdToken } = useAuth();
  const [vales, setVales] = useState<CcipayMovimento[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [justificativa, setJustificativa] = useState("");
  const [acaoSelecionada, setAcaoSelecionada] = useState<"aprovar" | "negar" | null>(null);
  const [valeSelecionado, setValeSelecionado] = useState<CcipayMovimento | null>(null);

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    setCarregando(true);
    setErro(null);
    try {
      const { movimentos } = await ccipayListarAdiantamentos(googleIdToken);
      setVales(movimentos);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar vales.");
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const abrirConfirmacao = (vale: CcipayMovimento, acao: "aprovar" | "negar") => {
    setValeSelecionado(vale);
    setAcaoSelecionada(acao);
    setJustificativa("");
  };

  const confirmar = async () => {
    if (!googleIdToken || !valeSelecionado || !acaoSelecionada) return;
    if (acaoSelecionada === "negar" && !justificativa.trim()) {
      setErro("Informe a justificativa para negar.");
      return;
    }
    try {
      await ccipayAprovarAdiantamento(
        googleIdToken,
        valeSelecionado.id,
        acaoSelecionada,
        justificativa,
      );
      setValeSelecionado(null);
      setAcaoSelecionada(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao processar.");
    }
  };

  const pendentes = vales.filter((v) => v.status === "pendente").length;

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Controle de Vales — Financeiro"
        subtitle="Análise, aprovação e negativa de vales-adiantamento."
      />

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/cci-pay">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Advance-CCI
          </Link>
        </Button>

        {erro && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <p className="mb-4 text-sm text-muted-foreground">
          Pendentes: <strong>{pendentes}</strong> · Total: <strong>{vales.length}</strong>
        </p>

        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : vales.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma solicitação.</p>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Pix</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vales.map((vale) => (
                  <TableRow key={vale.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{vale.funcionarioNome}</span>
                        <span className="text-xs text-muted-foreground">{vale.funcionarioEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{String(vale.metadata?.pix ?? "—")}</TableCell>
                    <TableCell>{vale.competencia}</TableCell>
                    <TableCell>R$ {vale.valor.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={vale.status === "pendente" ? "secondary" : "outline"}>
                        {labelStatusMovimento(vale.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        disabled={vale.status !== "pendente"}
                        onClick={() => abrirConfirmacao(vale, "aprovar")}
                      >
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={vale.status !== "pendente"}
                        onClick={() => abrirConfirmacao(vale, "negar")}
                      >
                        Negar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(valeSelecionado && acaoSelecionada)} onOpenChange={() => setValeSelecionado(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {acaoSelecionada === "aprovar" ? "Aprovar vale" : "Negar vale"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {acaoSelecionada === "negar" &&
                "Informe o motivo da negativa (obrigatório)."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {acaoSelecionada === "negar" && (
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Motivo da negativa"
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmar}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
