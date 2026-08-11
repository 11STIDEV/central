import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayRelatorioDp,
  labelStatusMovimento,
  type CcipayMovimento,
  type CcipayResumoFuncionarioDp,
} from "@/lib/ccipay";
import { ArrowLeft, Download } from "lucide-react";

const STATUS_OPCOES = [
  { value: "", label: "Todos os status" },
  { value: "pendente", label: "Pendente" },
  { value: "aprovado", label: "Aprovado" },
  { value: "negado", label: "Negado" },
  { value: "descontado_folha", label: "Descontado em folha" },
  { value: "cancelado", label: "Cancelado" },
];

export default function CcipayRelatoriosDp() {
  const { googleIdToken } = useAuth();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [status, setStatus] = useState("");
  const [linhas, setLinhas] = useState<CcipayMovimento[]>([]);
  const [resumo, setResumo] = useState<CcipayResumoFuncionarioDp[]>([]);

  async function carregar() {
    if (!googleIdToken) return;
    const { movimentos, resumoPorFuncionario } = await ccipayRelatorioDp(
      googleIdToken,
      competencia,
      false,
      { status: status || undefined },
    );
    setLinhas(movimentos);
    setResumo(resumoPorFuncionario ?? []);
  }

  async function exportarCsv() {
    if (!googleIdToken) return;
    const { csv } = await ccipayRelatorioDp(googleIdToken, competencia, true, {
      status: status || undefined,
    });
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `advance-cci-controle-interno-${competencia}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Relatório DP"
        subtitle="Controle interno de movimentos — exportação CSV para conferência mensal (sem integração Alterdata)."
      />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cci-pay"><ArrowLeft className="mr-2 h-4 w-4" />Advance-CCI</Link>
        </Button>

        <div className="flex flex-wrap gap-2">
          <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPCOES.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Button onClick={carregar}>Carregar</Button>
          <Button variant="outline" onClick={exportarCsv}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV (controle interno)
          </Button>
        </div>

        {resumo.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Resumo por funcionário</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="p-3">Nome</th>
                    <th className="p-3">Cód. ref.</th>
                    <th className="p-3">Adiant. usado</th>
                    <th className="p-3">Adiant. disp.</th>
                    <th className="p-3">Saldo bonif.</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.map((r) => (
                    <tr key={r.email} className="border-b border-border/60">
                      <td className="p-3">
                        <p className="font-medium">{r.nome}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </td>
                      <td className="p-3">{r.codigoReferencia || "—"}</td>
                      <td className="p-3">R$ {r.adiantamentoUsado.toFixed(2)}</td>
                      <td className="p-3">R$ {r.adiantamentoDisponivel.toFixed(2)}</td>
                      <td className="p-3">R$ {r.saldoBonificacao.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Movimentos</h2>
          {linhas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum movimento para os filtros selecionados.</p>
          ) : (
            linhas.map((m) => (
              <div key={m.id} className="rounded-lg border border-border p-3 text-sm">
                {m.funcionarioNome} · {m.tipo} · R$ {m.valor.toFixed(2)} ·{" "}
                {labelStatusMovimento(m.status)}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
