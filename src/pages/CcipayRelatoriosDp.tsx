import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { ccipayRelatorioDp, labelStatusMovimento } from "@/lib/ccipay";
import { ArrowLeft, Download } from "lucide-react";

export default function CcipayRelatoriosDp() {
  const { googleIdToken } = useAuth();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [linhas, setLinhas] = useState<{ tipo: string; valor: number; status: string; email: string; nome: string }[]>([]);

  async function carregar() {
    if (!googleIdToken) return;
    const { movimentos } = await ccipayRelatorioDp(googleIdToken, competencia);
    setLinhas(
      movimentos.map((m) => ({
        tipo: m.tipo,
        valor: m.valor,
        status: labelStatusMovimento(m.status),
        email: m.funcionarioEmail,
        nome: m.funcionarioNome,
      })),
    );
  }

  async function exportarCsv() {
    if (!googleIdToken) return;
    const { csv } = await ccipayRelatorioDp(googleIdToken, competencia, true);
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ccipay-alterdata-${competencia}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in">
      <PageHero title="Relatório DP" subtitle="Movimentos e exportação para Alterdata." />
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cci-pay"><ArrowLeft className="mr-2 h-4 w-4" />Advance-CCI</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
          <Button onClick={carregar}>Carregar</Button>
          <Button variant="outline" onClick={exportarCsv}>
            <Download className="mr-2 h-4 w-4" />Export CSV Alterdata
          </Button>
        </div>
        <div className="space-y-2">
          {linhas.map((l, i) => (
            <div key={i} className="rounded-lg border border-border p-3 text-sm">
              {l.nome} · {l.tipo} · R$ {l.valor.toFixed(2)} · {l.status}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
