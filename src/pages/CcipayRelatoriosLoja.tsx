import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { ccipayListarLojas, ccipayRelatorioLoja, type CcipayPedido } from "@/lib/ccipay";
import { ArrowLeft } from "lucide-react";

export default function CcipayRelatoriosLoja() {
  const { googleIdToken } = useAuth();
  const [lojaId, setLojaId] = useState("");
  const [lojas, setLojas] = useState<{ id: string; nome: string }[]>([]);
  const [totais, setTotais] = useState<{ pedidos: number; valorTotal: number; entregues: number } | null>(null);
  const [pedidos, setPedidos] = useState<CcipayPedido[]>([]);

  useEffect(() => {
    if (!googleIdToken) return;
    ccipayListarLojas(googleIdToken).then(({ lojas: l }) => {
      setLojas(l);
      if (l[0]) setLojaId(l[0].id);
    });
  }, [googleIdToken]);

  async function carregar() {
    if (!googleIdToken || !lojaId) return;
    const { totais: t, pedidos: p } = await ccipayRelatorioLoja(googleIdToken, lojaId);
    setTotais(t);
    setPedidos(p);
  }

  useEffect(() => {
    if (lojaId) void carregar();
  }, [lojaId, googleIdToken]);

  return (
    <div className="animate-fade-in">
      <PageHero title="Relatório Loja" subtitle="Pedidos, entregas e vendas por loja." />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cci-pay"><ArrowLeft className="mr-2 h-4 w-4" />Advance-CCI</Link>
        </Button>

        {lojas.length > 1 && (
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={lojaId}
            onChange={(e) => setLojaId(e.target.value)}
          >
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
        )}

        {totais && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Pedidos</p>
              <p className="text-2xl font-semibold">{totais.pedidos}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Entregues</p>
              <p className="text-2xl font-semibold">{totais.entregues}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Valor total</p>
              <p className="text-2xl font-semibold">R$ {totais.valorTotal.toFixed(2)}</p>
            </div>
          </div>
        )}

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Pedidos</h2>
          {pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido registrado.</p>
          ) : (
            pedidos.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{p.funcionarioNome}</p>
                <p className="text-xs text-muted-foreground">{p.funcionarioEmail}</p>
                <p className="mt-1">
                  R$ {p.valorTotal.toFixed(2)} · {p.status} ·{" "}
                  {p.itens.length} item(ns)
                </p>
                {p.observacao ? (
                  <p className="mt-1 text-xs text-muted-foreground">{p.observacao}</p>
                ) : null}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
