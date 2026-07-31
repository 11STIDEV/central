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
import { parceiroSiteUrl } from "@/parceiro/publicHost";
import { ArrowLeft } from "lucide-react";

type OperadorLoja = {
  login?: string | null;
  nome: string;
  temSenha?: boolean;
};

export default function CcipayAdminLojas() {
  const { googleIdToken } = useAuth();
  const [lojas, setLojas] = useState<CcipayLoja[]>([]);
  const [nomeNova, setNomeNova] = useState("");
  const [loginOp, setLoginOp] = useState("");
  const [senhaOp, setSenhaOp] = useState("");
  const [nomeOp, setNomeOp] = useState("");
  const [lojaSel, setLojaSel] = useState("");
  const [operadores, setOperadores] = useState<OperadorLoja[]>([]);
  const [itemNome, setItemNome] = useState("");
  const [itemPreco, setItemPreco] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    const { lojas: l } = await ccipayListarLojas(googleIdToken);
    setLojas(l);
  }, [googleIdToken]);

  const carregarOperadores = useCallback(async () => {
    if (!googleIdToken || !lojaSel) return;
    const { usuarios } = await ccipayLojaUsuarios(googleIdToken, lojaSel, "listar");
    setOperadores(usuarios.filter((u) => u.login));
  }, [googleIdToken, lojaSel]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    void carregarOperadores();
  }, [carregarOperadores]);

  async function criarLoja() {
    if (!googleIdToken || !nomeNova.trim()) return;
    await ccipaySalvarLoja(googleIdToken, { nome: nomeNova.trim() });
    setNomeNova("");
    await carregar();
  }

  async function vincularOperador() {
    if (!googleIdToken || !lojaSel || !loginOp.trim() || !senhaOp) return;
    setMsg(null);
    try {
      await ccipayLojaUsuarios(googleIdToken, lojaSel, "vincular", {
        login: loginOp.trim(),
        senha: senhaOp,
        nome: nomeOp.trim() || loginOp.trim(),
      });
      setLoginOp("");
      setSenhaOp("");
      setNomeOp("");
      setMsg(`Operador "${loginOp}" cadastrado. Acesso em ${parceiroSiteUrl()}`);
      await carregarOperadores();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao cadastrar.");
    }
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
      <PageHero
        title="Lojas Advance-CCI"
        subtitle="Cadastro de lojas e operadores do portal parceiro."
      />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cci-pay">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Advance-CCI
          </Link>
        </Button>

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <p className="font-medium">Portal parceiro</p>
          <p className="text-muted-foreground">
            Operadores acessam em{" "}
            <a href={parceiroSiteUrl()} className="underline" target="_blank" rel="noreferrer">
              {parceiroSiteUrl()}
            </a>{" "}
            com usuário e senha cadastrados abaixo.
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Nome da nova loja"
            value={nomeNova}
            onChange={(e) => setNomeNova(e.target.value)}
          />
          <Button onClick={criarLoja}>Criar</Button>
        </div>

        {lojas.map((l) => (
          <div key={l.id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">{l.nome}</p>
            <p className="text-xs text-muted-foreground">{l.id}</p>
          </div>
        ))}

        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-medium">Cadastrar operador (login + senha)</p>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={lojaSel}
            onChange={(e) => setLojaSel(e.target.value)}
          >
            <option value="">Selecione a loja</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
          <Input
            placeholder="Usuário (ex.: lanchonete)"
            value={loginOp}
            onChange={(e) => setLoginOp(e.target.value)}
          />
          <Input
            placeholder="Senha (mín. 6 caracteres)"
            type="password"
            value={senhaOp}
            onChange={(e) => setSenhaOp(e.target.value)}
          />
          <Input
            placeholder="Nome exibido (opcional)"
            value={nomeOp}
            onChange={(e) => setNomeOp(e.target.value)}
          />
          <Button onClick={vincularOperador}>Cadastrar operador</Button>
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </div>

        {operadores.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-sm font-medium">Operadores da loja selecionada</p>
            {operadores.map((op) => (
              <div key={op.login ?? op.nome} className="text-sm">
                <span className="font-medium">{op.login}</span> — {op.nome}
                {op.temSenha ? " · senha OK" : " · sem senha"}
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-medium">Adicionar item ao catálogo</p>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={lojaSel}
            onChange={(e) => setLojaSel(e.target.value)}
          >
            <option value="">Selecione a loja</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
          <Input
            placeholder="Nome do item"
            value={itemNome}
            onChange={(e) => setItemNome(e.target.value)}
          />
          <Input
            placeholder="Preço"
            type="number"
            step="0.01"
            value={itemPreco}
            onChange={(e) => setItemPreco(e.target.value)}
          />
          <Button onClick={adicionarItem}>Adicionar item</Button>
        </div>

        <Button asChild variant="outline">
          <Link to="/cci-pay/admin/lancadores">Gerenciar lançadores</Link>
        </Button>
      </div>
    </div>
  );
}
