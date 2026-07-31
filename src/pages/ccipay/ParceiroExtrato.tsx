import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parceiroCancelarVenda, parceiroListarVendasQr } from "@/lib/parceiroApi";
import { labelStatusVendaQr, type CcipayVendaQr } from "@/lib/ccipay";
import type { ParceiroOutletContext } from "./ParceiroShell";

export default function ParceiroExtrato() {
  const { lojaId } = useOutletContext<ParceiroOutletContext>();
  const [vendas, setVendas] = useState<CcipayVendaQr[]>([]);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const carregar = useCallback(async () => {
    if (!lojaId) return;
    const { vendas: lista } = await parceiroListarVendasQr(lojaId, {
      de: de || undefined,
      ate: ate || undefined,
    });
    setVendas(lista);
  }, [lojaId, de, ate]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function cancelar(id: string) {
    await parceiroCancelarVenda(id);
    await carregar();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Extrato de vendas</h2>
        <p className="text-sm text-muted-foreground">Histórico completo de vendas via QR code.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-auto" />
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-auto" />
        <Button variant="outline" onClick={() => void carregar()}>
          Filtrar
        </Button>
      </div>

      <div className="space-y-3">
        {vendas.map((v) => (
          <div key={v.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">R$ {v.valor.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {v.createdAt?.slice(0, 16).replace("T", " ") ?? "—"}
                  {v.descricao ? ` · ${v.descricao}` : ""}
                </p>
                {v.status === "pago" && v.funcionarioNome && (
                  <p className="mt-1 text-sm">
                    Pago por: {v.funcionarioNome}
                  </p>
                )}
              </div>
              <Badge variant={v.status === "pago" ? "default" : "secondary"}>
                {labelStatusVendaQr(v.status)}
              </Badge>
            </div>
            {v.status === "pendente" && (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => void cancelar(v.id)}>
                Cancelar venda
              </Button>
            )}
          </div>
        ))}
        {vendas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma venda encontrada no período.</p>
        )}
      </div>
    </div>
  );
}
