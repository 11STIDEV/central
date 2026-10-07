import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayAtualizarFuncionario,
  ccipayListarFuncionarios,
  ccipaySincronizarAlterdata,
  type CcipayFuncionario,
} from "@/lib/ccipay";
import { ArrowLeft, RefreshCw, Search, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function CcipayAdminFuncionarios() {
  const { googleIdToken } = useAuth();
  const [lista, setLista] = useState<CcipayFuncionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "inativos">("todos");

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    setCarregando(true);
    try {
      const { funcionarios } = await ccipayListarFuncionarios(googleIdToken);
      setLista(funcionarios || []);
    } catch (e: any) {
      toast.error(`Erro ao carregar colaboradores: ${e.message}`);
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(f: CcipayFuncionario, patch: Partial<CcipayFuncionario>) {
    if (!googleIdToken) return;
    try {
      await ccipayAtualizarFuncionario(googleIdToken, f.email, patch);
      toast.success("Dados salvos com sucesso.");
      await carregar();
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e.message}`);
    }
  }

  async function handleSincronizarComAlterdata() {
    if (!googleIdToken) return;
    setSincronizando(true);
    try {
      const res = await ccipaySincronizarAlterdata(googleIdToken);
      if (res.ok) {
        toast.success(
          `Sincronização concluída! ${res.novosCadastros} novos cadastrados, ${res.atualizadosComCodigo} códigos vinculados.`
        );
        if (res.funcionarios) {
          setLista(res.funcionarios);
        } else {
          await carregar();
        }
      }
    } catch (e: any) {
      toast.error(`Erro ao sincronizar com Alterdata: ${e.message}`);
    } finally {
      setSincronizando(false);
    }
  }

  const filtrados = useMemo(() => {
    return lista.filter((f) => {
      if (filtroStatus === "ativos" && !f.ativo) return false;
      if (filtroStatus === "inativos" && f.ativo) return false;
      if (!busca.trim()) return true;
      const b = busca.toLowerCase().trim();
      return (
        f.nome?.toLowerCase().includes(b) ||
        f.email?.toLowerCase().includes(b) ||
        f.alterdataCodigo?.toLowerCase().includes(b)
      );
    });
  }, [lista, busca, filtroStatus]);

  const stats = useMemo(() => {
    const total = lista.length;
    const ativos = lista.filter((f) => f.ativo).length;
    const comCodigo = lista.filter((f) => f.alterdataCodigo && f.alterdataCodigo.trim()).length;
    return { total, ativos, comCodigo, semCodigo: total - comCodigo };
  }, [lista]);

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Funcionários Advance-CCI"
        subtitle="Gestão de limites de adiantamento, tetos e vínculo automático de matrículas do Alterdata via Supabase."
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/cci-pay">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Advance-CCI
            </Link>
          </Button>

          <Button
            onClick={handleSincronizarComAlterdata}
            disabled={sincronizando || carregando}
            variant="default"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} />
            {sincronizando ? "Sincronizando com Alterdata..." : "Sincronizar com Alterdata (Supabase)"}
          </Button>
        </div>

        {/* Painel de Estatísticas Rápidas */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Total Cadastrados</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-xl border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Ativos no Advance</p>
            <p className="text-xl font-bold text-emerald-600">{stats.ativos}</p>
          </div>
          <div className="rounded-xl border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Com Matrícula Alterdata</p>
            <p className="text-xl font-bold text-primary">{stats.comCodigo}</p>
          </div>
          <div className="rounded-xl border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Sem Código Folha</p>
            <p className="text-xl font-bold text-amber-600">{stats.semCodigo}</p>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail ou código de folha..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 text-xs">
            <Button
              variant={filtroStatus === "todos" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFiltroStatus("todos")}
            >
              Todos ({lista.length})
            </Button>
            <Button
              variant={filtroStatus === "ativos" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFiltroStatus("ativos")}
            >
              Ativos ({stats.ativos})
            </Button>
            <Button
              variant={filtroStatus === "inativos" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFiltroStatus("inativos")}
            >
              Inativos ({lista.length - stats.ativos})
            </Button>
          </div>
        </div>

        {carregando ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando colaboradores...</p>
        ) : filtrados.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            <p>Nenhum colaborador encontrado com os filtros aplicados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((f) => (
              <div
                key={f.email}
                className={`rounded-xl border bg-card p-4 transition-colors ${
                  f.ativo ? "border-border" : "border-dashed border-muted opacity-75"
                }`}
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{f.nome}</p>
                    <p className="text-xs text-muted-foreground">{f.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {f.alterdataCodigo ? (
                      <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
                        Folha: #{f.alterdataCodigo}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                        Sem matrícula
                      </Badge>
                    )}
                    <Badge variant={f.ativo ? "default" : "secondary"}>
                      {f.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => salvar(f, { ativo: !f.ativo })}
                    >
                      {f.ativo ? "Inativar" : "Ativar"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Código referência (folha)
                    </label>
                    <Input
                      defaultValue={f.alterdataCodigo ?? ""}
                      placeholder="Ex.: 303104"
                      onBlur={(e) => salvar(f, { alterdataCodigo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Limite adiantamento / vales (R$)
                    </label>
                    <Input
                      type="number"
                      defaultValue={f.limiteAdiantamento}
                      placeholder="500.00"
                      onBlur={(e) => salvar(f, { limiteAdiantamento: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Teto bonificações (R$)
                    </label>
                    <Input
                      type="number"
                      defaultValue={f.limiteBonificacao ?? ""}
                      placeholder="Vazio = sem teto"
                      onBlur={(e) =>
                        salvar(f, {
                          limiteBonificacao: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Chave PIX padrão
                    </label>
                    <Input
                      defaultValue={f.pixPadrao ?? ""}
                      placeholder="Chave PIX (CPF/Email/Tel)"
                      onBlur={(e) => salvar(f, { pixPadrao: e.target.value || null })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
