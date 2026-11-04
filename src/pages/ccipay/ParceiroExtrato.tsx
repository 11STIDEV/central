import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parceiroCancelarVenda, parceiroListarVendasQr } from "@/lib/parceiroApi";
import { labelStatusVendaQr, type CcipayVendaQr } from "@/lib/ccipay";
import type { ParceiroOutletContext } from "./ParceiroShell";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

export default function ParceiroExtrato() {
  const { lojaId } = useOutletContext<ParceiroOutletContext>();
  const [vendas, setVendas] = useState<CcipayVendaQr[]>([]);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Modal de Cancelamento / Estorno
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState<CcipayVendaQr | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [cancelando, setCancelando] = useState(false);

  const carregar = useCallback(async () => {
    if (!lojaId) return;
    setCarregando(true);
    try {
      const { vendas: lista } = await parceiroListarVendasQr(lojaId, {
        de: de || undefined,
        ate: ate || undefined,
      });
      setVendas(lista || []);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar extrato de vendas.");
    } finally {
      setCarregando(false);
    }
  }, [lojaId, de, ate]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function executarCancelamento() {
    if (!confirmandoCancelamento) return;
    setCancelando(true);
    try {
      await parceiroCancelarVenda(confirmandoCancelamento.id, motivoCancelamento);
      toast.success(
        confirmandoCancelamento.status === "pago"
          ? "Venda cancelada e valor estornado com sucesso!"
          : "Cobrança QR Code cancelada com sucesso!",
      );
      setConfirmandoCancelamento(null);
      setMotivoCancelamento("");
      await carregar();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao cancelar venda.");
    } finally {
      setCancelando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Extrato de vendas</h2>
          <p className="text-sm text-muted-foreground">
            Histórico completo de vendas da loja conveniada no Advance-CCI.
          </p>
        </div>
      </div>

      {/* Filtros de data */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={de}
          onChange={(e) => setDe(e.target.value)}
          className="w-auto h-9 text-xs"
        />
        <Input
          type="date"
          value={ate}
          onChange={(e) => setAte(e.target.value)}
          className="w-auto h-9 text-xs"
        />
        <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando} className="h-9 text-xs">
          {carregando ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          Filtrar
        </Button>
      </div>

      {/* Listagem de Vendas */}
      <div className="space-y-3">
        {vendas.map((v) => {
          const isPago = v.status === "pago";
          const isCancelado = v.status === "cancelado";
          const isPendente = v.status === "pendente";

          return (
            <div key={v.id} className="rounded-xl border border-border bg-card p-4 transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-base font-bold ${isCancelado ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      R$ {v.valor.toFixed(2)}
                    </p>
                    {isCancelado && (
                      <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        (Estornado / Cancelado)
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {v.createdAt ? new Date(v.createdAt).toLocaleString("pt-BR") : "—"}
                    {v.descricao ? ` · ${v.descricao}` : ""}
                  </p>

                  {v.funcionarioNome && (
                    <p className="mt-1.5 text-xs text-foreground font-medium flex items-center gap-1.5">
                      <span className="text-muted-foreground font-normal">Colaborador:</span>
                      <strong>{v.funcionarioNome}</strong>
                      {v.funcionarioEmail && (
                        <span className="text-[11px] text-muted-foreground font-normal">
                          ({v.funcionarioEmail})
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  {isPago ? (
                    <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Pago
                    </Badge>
                  ) : isCancelado ? (
                    <Badge variant="outline" className="gap-1 border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs">
                      <XCircle className="h-3 w-3 text-rose-500" /> Cancelado
                    </Badge>
                  ) : isPendente ? (
                    <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs">
                      <Clock className="h-3 w-3 text-amber-500" /> Aguardando pagamento
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {labelStatusVendaQr(v.status)}
                    </Badge>
                  )}

                  {isPago && v.repasseId && (
                    <span className="text-[10px] text-emerald-600 font-medium">
                      Já repassado pelo CCI
                    </span>
                  )}
                </div>
              </div>

              {/* Ações de Cancelamento */}
              <div className="mt-3 pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-muted-foreground">
                  ID: #{v.id.slice(0, 8)}
                </span>

                <div className="flex items-center gap-2">
                  {isPendente && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setConfirmandoCancelamento(v)}
                    >
                      Cancelar QR pendente
                    </Button>
                  )}

                  {isPago && !v.repasseId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                      onClick={() => setConfirmandoCancelamento(v)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancelar / Estornar Venda
                    </Button>
                  )}

                  {isPago && Boolean(v.repasseId) && (
                    <span className="text-[11px] text-muted-foreground italic">
                      Venda já repassada. Para estorno, solicite ao DP.
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {vendas.length === 0 && !carregando && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhuma venda encontrada no período.
          </div>
        )}
      </div>

      {/* DIÁLOGO: Confirmar Cancelamento / Estorno */}
      <Dialog
        open={Boolean(confirmandoCancelamento)}
        onOpenChange={(open) => !open && setConfirmandoCancelamento(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              Confirmar Cancelamento de Venda
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {confirmandoCancelamento?.status === "pago"
                ? "Esta ação estornará a compra. O débito na folha de pagamento do colaborador será cancelado e o saldo dele liberado na hora."
                : "Esta ação cancelará a cobrança QR Code pendente."}
            </DialogDescription>
          </DialogHeader>

          {confirmandoCancelamento && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/30">
                {confirmandoCancelamento.funcionarioNome && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Colaborador:</span>
                    <strong className="text-foreground">{confirmandoCancelamento.funcionarioNome}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data da Venda:</span>
                  <span className="text-foreground">
                    {confirmandoCancelamento.createdAt
                      ? new Date(confirmandoCancelamento.createdAt).toLocaleString("pt-BR")
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border/50">
                  <span className="font-semibold text-rose-600 dark:text-rose-400">Valor a Estornar:</span>
                  <strong className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                    R$ {confirmandoCancelamento.valor.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Motivo do cancelamento (opcional):
                </label>
                <Input
                  placeholder="Ex: Erro no valor digitado, teste, desistência do cliente..."
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmandoCancelamento(null)}
              disabled={cancelando}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={executarCancelamento}
              disabled={cancelando}
              className="gap-1.5"
            >
              {cancelando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
