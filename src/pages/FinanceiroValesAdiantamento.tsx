import { useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { CircleDollarSign, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
type StatusVale = "pendente" | "aprovado" | "negado";

type Vale = {
  id: number;
  nome: string;
  email: string;
  dataSolicitacao: string;
  pix: string;
  valor: number;
  status: StatusVale;
  justificativaNegacao?: string;
};

export default function FinanceiroValesAdiantamento() {
  const [vales, setVales] = useState<Vale[]>([
    {
      id: 1,
      nome: "Colaborador Exemplo",
      email: "colaborador@exemplo.com",
      dataSolicitacao: "2026-03-11",
      pix: "chave-pix-exemplo@exemplo.com",
      valor: 500,
      status: "pendente",
    },
  ]);

  const [mensagem, setMensagem] = useState<{
    tipo: "sucesso" | "erro" | null;
    texto: string;
  }>({
    tipo: null,
    texto: "",
  });

  const [dialogAberto, setDialogAberto] = useState(false);
  const [acaoSelecionada, setAcaoSelecionada] = useState<Exclude<StatusVale, "pendente"> | null>(
    null,
  );
  const [valeSelecionado, setValeSelecionado] = useState<Vale | null>(null);
  const [justificativa, setJustificativa] = useState("");

  const abrirConfirmacao = (vale: Vale, acao: Exclude<StatusVale, "pendente">) => {
    setValeSelecionado(vale);
    setAcaoSelecionada(acao);
    setJustificativa("");
    setDialogAberto(true);
    setMensagem({ tipo: null, texto: "" });
  };

  const confirmarAcao = () => {
    if (!valeSelecionado || !acaoSelecionada) return;

    if (acaoSelecionada === "negado" && !justificativa.trim()) {
      setMensagem({
        tipo: "erro",
        texto: "Para negar um vale é obrigatório informar uma justificativa.",
      });
      return;
    }

    const id = valeSelecionado.id;
    const justificativaFinal =
      acaoSelecionada === "negado" ? justificativa.trim() : undefined;

    setVales((prev) =>
      prev.map((vale) =>
        vale.id === id
          ? { ...vale, status: acaoSelecionada, justificativaNegacao: justificativaFinal }
          : vale,
      ),
    );

    const vale = vales.find((v) => v.id === id);
    if (!vale) {
      setDialogAberto(false);
      return;
    }

    console.log("Disparar e-mail para colaborador:", {
      email: vale.email,
      nome: vale.nome,
      resultado: acaoSelecionada === "aprovado" ? "APROVADO" : "NEGADO",
      valor: vale.valor,
      justificativa: justificativaFinal,
    });

    setMensagem({
      tipo: "sucesso",
      texto:
        acaoSelecionada === "aprovado"
          ? `Vale de R$ ${vale.valor.toFixed(2)} para ${vale.nome} marcado como aprovado.`
          : `Vale de R$ ${vale.valor.toFixed(2)} para ${vale.nome} marcado como negado.`,
    });

    setDialogAberto(false);
  };

  const totalPendentes = vales.filter((v) => v.status === "pendente").length;

  return (
    <div className="animate-fade-in">
      <div className="gradient-hero px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <CircleDollarSign className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary-foreground">
                Controle de Vales - Financeiro
              </h1>
              <p className="text-primary-foreground/70">
                Tela interna do financeiro para análise, aprovação e negativa de vales-adiantamento.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        {mensagem.tipo === "sucesso" && (
          <Alert className="mb-4 border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/10 dark:text-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Ação registrada</AlertTitle>
            <AlertDescription>{mensagem.texto}</AlertDescription>
          </Alert>
        )}
        {mensagem.tipo === "erro" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>{mensagem.texto}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            Total de solicitações: <strong>{vales.length}</strong>
          </span>
          <span>
            Pendentes: <strong>{totalPendentes}</strong>
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          {vales.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma solicitação de vale-adiantamento cadastrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Pix</TableHead>
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead className="w-28 text-right">Valor (R$)</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-40 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vales.map((vale) => (
                  <TableRow key={vale.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-card-foreground">
                          {vale.nome}
                        </span>
                        <span className="text-xs text-muted-foreground">{vale.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{vale.pix}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {vale.dataSolicitacao}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {vale.valor.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          vale.status === "pendente"
                            ? "secondary"
                            : vale.status === "aprovado"
                              ? "default"
                              : "outline"
                        }
                      >
                        {vale.status === "pendente"
                          ? "Pendente"
                          : vale.status === "aprovado"
                            ? "Aprovado"
                            : "Negado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={vale.status !== "pendente"}
                          onClick={() => abrirConfirmacao(vale, "aprovado")}
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={vale.status !== "pendente"}
                          onClick={() => abrirConfirmacao(vale, "negado")}
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          Negar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>
                Tela interna de controle — futuramente integrada com o envio de e-mails e banco de dados.
              </TableCaption>
            </Table>
          )}
        </div>

        <AlertDialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {acaoSelecionada === "aprovado"
                  ? "Confirmar aprovação"
                  : "Confirmar negativa"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {acaoSelecionada === "aprovado"
                  ? "Tem certeza de que deseja aprovar este vale-adiantamento?"
                  : "Tem certeza de que deseja negar este vale-adiantamento? Informe abaixo o motivo da negativa."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {acaoSelecionada === "negado" && (
              <div className="mt-3 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Justificativa da negativa
                </label>
                <Textarea
                  rows={3}
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Ex: Solicitação fora da política de adiantamentos, inconsistência nos dados, etc."
                />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmarAcao}>
                {acaoSelecionada === "aprovado"
                  ? "Confirmar aprovação"
                  : "Confirmar negativa"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

