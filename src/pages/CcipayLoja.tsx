import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayCriarPedido,
  ccipayListarCatalogo,
  ccipayListarLojas,
  type CcipayCatalogoItem,
  type CcipayLoja,
} from "@/lib/ccipay";
import { ArrowLeft, Plus, Minus } from "lucide-react";

type CarrinhoItem = CcipayCatalogoItem & { quantidade: number };

export default function CcipayLoja() {
  const { googleIdToken } = useAuth();
  const [lojas, setLojas] = useState<CcipayLoja[]>([]);
  const [lojaId, setLojaId] = useState("");
  const [catalogo, setCatalogo] = useState<CcipayCatalogoItem[]>([]);
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!googleIdToken) return;
    ccipayListarLojas(googleIdToken, true)
      .then(({ lojas: l }) => {
        setLojas(l);
        if (l[0]) setLojaId(l[0].id);
      })
      .catch((e) => setErro(e.message));
  }, [googleIdToken]);

  const carregarCatalogo = useCallback(async () => {
    if (!googleIdToken || !lojaId) return;
    try {
      const { itens } = await ccipayListarCatalogo(googleIdToken, lojaId, true);
      setCatalogo(itens);
      setCarrinho([]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro no catálogo.");
    }
  }, [googleIdToken, lojaId]);

  useEffect(() => {
    void carregarCatalogo();
  }, [carregarCatalogo]);

  function addItem(item: CcipayCatalogoItem) {
    setCarrinho((prev) => {
      const ex = prev.find((p) => p.id === item.id);
      if (ex) return prev.map((p) => (p.id === item.id ? { ...p, quantidade: p.quantidade + 1 } : p));
      return [...prev, { ...item, quantidade: 1 }];
    });
  }

  function menosItem(id: string) {
    setCarrinho((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, quantidade: p.quantidade - 1 } : p))
        .filter((p) => p.quantidade > 0),
    );
  }

  const total = carrinho.reduce((a, i) => a + i.preco * i.quantidade, 0);

  async function finalizar() {
    if (!googleIdToken || carrinho.length === 0) return;
    try {
      await ccipayCriarPedido(
        googleIdToken,
        lojaId,
        carrinho.map((i) => ({
          itemId: i.id,
          nome: i.nome,
          quantidade: i.quantidade,
          precoUnitario: i.preco,
          subtotal: i.preco * i.quantidade,
        })),
      );
      setMsg("Pedido enviado! Acompanhe em Meus pedidos.");
      setCarrinho([]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao pedir.");
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHero title="Loja CCI Pay" subtitle="Catálogo interno — pedidos descontados em folha." />
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cci-pay"><ArrowLeft className="mr-2 h-4 w-4" />CCI Pay</Link>
        </Button>
        {erro && <Alert variant="destructive"><AlertDescription>{erro}</AlertDescription></Alert>}
        {msg && <Alert><AlertDescription>{msg}</AlertDescription></Alert>}

        {lojas.length > 1 && (
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={lojaId}
            onChange={(e) => setLojaId(e.target.value)}
          >
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-medium">Catálogo</h3>
            {catalogo.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{item.nome}</p>
                  <p className="text-xs text-muted-foreground">R$ {item.preco.toFixed(2)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => addItem(item)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 font-medium">Carrinho</h3>
            {carrinho.length === 0 && <p className="text-sm text-muted-foreground">Vazio</p>}
            {carrinho.map((i) => (
              <div key={i.id} className="mb-2 flex items-center justify-between text-sm">
                <span>{i.nome} × {i.quantidade}</span>
                <div className="flex items-center gap-2">
                  <span>R$ {(i.preco * i.quantidade).toFixed(2)}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => menosItem(i.id)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <p className="mt-4 font-semibold">Total: R$ {total.toFixed(2)}</p>
            <Button className="mt-3 w-full" disabled={carrinho.length === 0} onClick={finalizar}>
              Finalizar pedido
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
