import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/auth/AuthProvider";
import { ccipayConfirmarPedido, ccipayListarLojas, ccipayListarPedidos, type CcipayPedido } from "@/lib/ccipay";
import { isCcipayLojaPapel, isCcipayAdminPapel, isCcipayDpPapel } from "@/lib/ccipay";
import { ArrowLeft } from "lucide-react";

export default function CcipayMeusPedidos() {
  const { googleIdToken, usuario } = useAuth();
  const [pedidos, setPedidos] = useState<CcipayPedido[]>([]);
  const [lojaId, setLojaId] = useState("");
  const papeis = usuario?.papeis ?? [];
  const modoOperador = isCcipayLojaPapel(papeis) || isCcipayAdminPapel(papeis) || isCcipayDpPapel(papeis);

  useEffect(() => {
    if (!googleIdToken || !modoOperador) return;
    ccipayListarLojas(googleIdToken).then(({ lojas }) => {
      if (lojas[0]) setLojaId(lojas[0].id);
    });
  }, [googleIdToken, modoOperador]);

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    const { pedidos: p } = await ccipayListarPedidos(
      googleIdToken,
      modoOperador && lojaId ? lojaId : undefined,
    );
    setPedidos(p);
  }, [googleIdToken, lojaId, modoOperador]);

  useEffect(() => {
    void carregar().catch(() => undefined);
  }, [carregar]);

  async function confirmar(id: string, acao: "entregar" | "cancelar") {
    if (!googleIdToken) return;
    await ccipayConfirmarPedido(googleIdToken, id, acao);
    await carregar();
  }

  return (
    <div className="animate-fade-in">
      <PageHero
        title={modoOperador ? "Pedidos da loja" : "Meus pedidos"}
        subtitle="Histórico e confirmação de entrega."
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cci-pay"><ArrowLeft className="mr-2 h-4 w-4" />Advance-CCI</Link>
        </Button>
        {pedidos.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{p.funcionarioNome}</p>
                <p className="text-xs text-muted-foreground">{p.createdAt?.slice(0, 10)}</p>
              </div>
              <Badge>{p.status}</Badge>
            </div>
            <ul className="mt-2 text-sm text-muted-foreground">
              {p.itens.map((i) => (
                <li key={i.id ?? i.nome}>{i.nome} × {i.quantidade} — R$ {i.subtotal.toFixed(2)}</li>
              ))}
            </ul>
            <p className="mt-2 font-semibold">Total: R$ {p.valorTotal.toFixed(2)}</p>
            {modoOperador && p.status === "pendente" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => confirmar(p.id, "entregar")}>Confirmar entrega</Button>
                <Button size="sm" variant="outline" onClick={() => confirmar(p.id, "cancelar")}>Cancelar</Button>
              </div>
            )}
          </div>
        ))}
        {pedidos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido.</p>}
      </div>
    </div>
  );
}
