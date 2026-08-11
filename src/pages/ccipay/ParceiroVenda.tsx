import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import QRCode from "react-qr-code";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { parceiroCriarVendaQr } from "@/lib/parceiroApi";
import { centralPagamentoQrUrl } from "@/parceiro/parceiroSessionApi";
import type { CcipayVendaQr } from "@/lib/ccipay";
import type { ParceiroOutletContext } from "./ParceiroShell";

export default function ParceiroVenda() {
  const { lojaId, loja } = useOutletContext<ParceiroOutletContext>();
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [venda, setVenda] = useState<CcipayVendaQr | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  async function gerarQr(e: React.FormEvent) {
    e.preventDefault();
    if (!lojaId) return;
    setErro(null);
    setVenda(null);
    const v = Number(valor.replace(",", "."));
    if (Number.isNaN(v) || v <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    setGerando(true);
    try {
      const { venda: nova } = await parceiroCriarVendaQr(lojaId, v, descricao.trim());
      setVenda(nova);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao gerar QR.");
    } finally {
      setGerando(false);
    }
  }

  function novaVenda() {
    setVenda(null);
    setValor("");
    setDescricao("");
  }

  const payUrl = venda ? centralPagamentoQrUrl(venda.token) : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Nova venda</h2>
        <p className="text-sm text-muted-foreground">
          Informe o valor da compra e exiba o QR code para o colaborador escanear em {loja?.nome}.
        </p>
      </div>

      {!venda ? (
        <form
          onSubmit={gerarQr}
          className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-card p-6"
        >
          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
          <div>
            <label className="text-sm font-medium">Valor (R$)</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium">Descrição (opcional)</label>
            <Input
              placeholder="Ex.: Almoço, lanche..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={gerando}>
            {gerando ? "Gerando..." : "Gerar QR code"}
          </Button>
        </form>
      ) : (
        <div className="mx-auto max-w-sm space-y-4 text-center">
          <div className="mx-auto inline-block rounded-xl border border-border bg-white p-6">
            <QRCode value={payUrl} size={220} />
          </div>
          <div>
            <p className="text-3xl font-bold">R$ {venda.valor.toFixed(2)}</p>
            {venda.descricao && <p className="text-sm text-muted-foreground">{venda.descricao}</p>}
            <p className="mt-2 text-xs text-muted-foreground">
              Válido por 30 minutos · {loja?.nome}
            </p>
          </div>
          <p className="break-all text-xs text-muted-foreground">{payUrl}</p>
          <Button variant="outline" onClick={novaVenda}>
            Nova venda
          </Button>
        </div>
      )}
    </div>
  );
}
