import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayListarLojas,
  ccipayLojaUsuarios,
  ccipaySalvarCatalogoItem,
  ccipaySalvarLoja,
  type CcipayLoja,
} from "@/lib/ccipay";
import { ArrowLeft } from "lucide-react";

export default function CcipayAdminLojas() {
  const { googleIdToken } = useAuth();
  const [lojas, setLojas] = useState<CcipayLoja[]>([]);
  const [nomeNova, setNomeNova] = useState("");
  const [emailOp, setEmailOp] = useState("");
  const [lojaSel, setLojaSel] = useState("");
  const [itemNome, setItemNome] = useState("");
  const [itemPreco, setItemPreco] = useState("");

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    const { lojas: l } = await ccipayListarLojas(googleIdToken);
    setLojas(l);
  }, [googleIdToken]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function criarLoja() {
    if (!googleIdToken || !nomeNova.trim()) return;
    await ccipaySalvarLoja(googleIdToken, { nome: nomeNova.trim() });
    setNomeNova("");
    await carregar();
  }

  async function vincularOperador() {
    if (!googleIdToken || !lojaSel || !emailOp.includes("@")) return;
    await ccipayLojaUsuarios(googleIdToken, lojaSel, "vincular", emailOp);
    setEmailOp("");
  }

  async function adicionarItem() {
    if (!googleIdToken || !lojaSel || !itemNome.trim()) return;
    await ccipaySalvarCatalogoItem(googleIdToken, {
      lojaId: lojaSel,
      nome: itemNome.trim(),
      preco: Number(itemPreco) || 0,
    });
    setItemNome("");
    setItemPreco("");
  }

  return (
    <div className="animate-fade-in">
      <PageHero title="Lojas CCI Pay" subtitle="Cadastro de lojas e operadores." />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cci-pay"><ArrowLeft className="mr-2 h-4 w-4" />CCI Pay</Link>
        </Button>
        <div className="flex gap-2">
          <Input placeholder="Nome da nova loja" value={nomeNova} onChange={(e) => setNomeNova(e.target.value)} />
          <Button onClick={criarLoja}>Criar</Button>
        </div>
        {lojas.map((l) => (
          <div key={l.id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">{l.nome}</p>
            <p className="text-xs text-muted-foreground">{l.id}</p>
          </div>
        ))}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-medium">Vincular operador</p>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={lojaSel}
            onChange={(e) => setLojaSel(e.target.value)}
          >
            <option value="">Selecione a loja</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
          <Input placeholder="E-mail do operador" value={emailOp} onChange={(e) => setEmailOp(e.target.value)} />
          <Button onClick={vincularOperador}>Vincular</Button>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-medium">Adicionar item ao catálogo</p>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={lojaSel}
            onChange={(e) => setLojaSel(e.target.value)}
          >
            <option value="">Selecione a loja</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
          <Input placeholder="Nome do item" value={itemNome} onChange={(e) => setItemNome(e.target.value)} />
          <Input placeholder="Preço" type="number" step="0.01" value={itemPreco} onChange={(e) => setItemPreco(e.target.value)} />
          <Button onClick={adicionarItem}>Adicionar item</Button>
        </div>
        <Button asChild variant="outline">
          <Link to="/cci-pay/admin/lancadores">Gerenciar lançadores</Link>
        </Button>
      </div>
    </div>
  );
}
