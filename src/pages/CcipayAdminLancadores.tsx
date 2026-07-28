import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { ccipayListarLancadores, ccipaySalvarLancador } from "@/lib/ccipay";
import { ArrowLeft } from "lucide-react";

export default function CcipayAdminLancadores() {
  const { googleIdToken } = useAuth();
  const [lista, setLista] = useState<{ email: string; nome: string }[]>([]);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    const { lancadores } = await ccipayListarLancadores(googleIdToken);
    setLista(lancadores);
  }, [googleIdToken]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function adicionar() {
    if (!googleIdToken || !email.includes("@")) return;
    await ccipaySalvarLancador(googleIdToken, email, nome || email);
    setEmail("");
    setNome("");
    await carregar();
  }

  async function remover(e: string) {
    if (!googleIdToken) return;
    await ccipaySalvarLancador(googleIdToken, e, "", "remover");
    await carregar();
  }

  return (
    <div className="animate-fade-in">
      <PageHero title="Lançadores CCI Pay" subtitle="Quem pode lançar bonificações e deduções." />
      <div className="mx-auto max-w-xl space-y-4 px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cci-pay/admin/lojas"><ArrowLeft className="mr-2 h-4 w-4" />Lojas</Link>
        </Button>
        <div className="flex gap-2">
          <Input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Button onClick={adicionar}>Adicionar</Button>
        </div>
        {lista.map((l) => (
          <div key={l.email} className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-sm">{l.nome} — {l.email}</span>
            <Button size="sm" variant="outline" onClick={() => remover(l.email)}>Remover</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
