import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/auth/AuthProvider";
import { ccipayLancarBonificacao, ccipayLancarDeducao } from "@/lib/ccipay";
import { ArrowLeft } from "lucide-react";

export default function CcipayLancamentos() {
  const { googleIdToken } = useAuth();
  const [email, setEmail] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function lancar(tipo: "bonificacao" | "deducao") {
    if (!googleIdToken) return;
    setErro(null);
    setMsg(null);
    const v = Number(valor.replace(",", "."));
    if (!email.includes("@") || Number.isNaN(v) || v <= 0) {
      setErro("Preencha e-mail e valor válidos.");
      return;
    }
    try {
      if (tipo === "bonificacao") {
        await ccipayLancarBonificacao(googleIdToken, email, v, descricao);
      } else {
        await ccipayLancarDeducao(googleIdToken, email, v, descricao);
      }
      setMsg(`${tipo === "bonificacao" ? "Bonificação" : "Dedução"} lançada com sucesso.`);
      setValor("");
      setDescricao("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao lançar.");
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHero title="Lançamentos Advance-CCI" subtitle="Bonificações e deduções manuais." />
      <div className="mx-auto max-w-xl space-y-4 px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cci-pay"><ArrowLeft className="mr-2 h-4 w-4" />Advance-CCI</Link>
        </Button>
        {erro && <Alert variant="destructive"><AlertDescription>{erro}</AlertDescription></Alert>}
        {msg && <Alert><AlertDescription>{msg}</AlertDescription></Alert>}
        <div className="space-y-3 rounded-xl border border-border bg-card p-6">
          <Input placeholder="E-mail do funcionário" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Valor (R$)" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
          <Input placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={() => lancar("bonificacao")}>Bonificação (+)</Button>
            <Button variant="outline" onClick={() => lancar("deducao")}>Dedução (-)</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
