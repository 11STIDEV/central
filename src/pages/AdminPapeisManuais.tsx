import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, UserCog } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { PAPEIS_ATRIBUICAO_MANUAL } from "@/lib/papeisManuais";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

export default function AdminPapeisManuais() {
  const { googleIdToken } = useAuth();
  const [atribuicoes, setAtribuicoes] = useState<Record<string, string[]>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [emailNovo, setEmailNovo] = useState("");
  const [adminNovo, setAdminNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/papeis-manuais/listar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: googleIdToken }),
      });
      const text = await res.text();
      let data: { atribuicoes?: Record<string, string[]>; error?: string } = {};
      try {
        if (text) data = JSON.parse(text) as typeof data;
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        setErro(typeof data.error === "string" ? data.error : `Erro HTTP ${res.status}`);
        return;
      }
      if (data.atribuicoes && typeof data.atribuicoes === "object") {
        setAtribuicoes(data.atribuicoes);
      }
    } catch {
      setErro("Não foi possível carregar as atribuições. Verifique se a API está em execução.");
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvarEmail(emailAlvo: string, papeisManuais: string[]) {
    if (!googleIdToken) return;
    setSalvando(true);
    setMensagem(null);
    setErro(null);
    try {
      const res = await fetch("/api/papeis-manuais/atualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: googleIdToken, emailAlvo, papeisManuais }),
      });
      const text = await res.text();
      let data: { atribuicoes?: Record<string, string[]>; error?: string } = {};
      try {
        if (text) data = JSON.parse(text) as typeof data;
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        setErro(typeof data.error === "string" ? data.error : `Erro HTTP ${res.status}`);
        return;
      }
      if (data.atribuicoes) setAtribuicoes(data.atribuicoes);
      setMensagem(
        "Alteração salva. O usuário precisará entrar novamente para que os novos papéis manuais tenham efeito.",
      );
      setEmailNovo("");
      setAdminNovo(false);
    } catch {
      setErro("Falha ao salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  function handleAdicionar(e: FormEvent) {
    e.preventDefault();
    const email = emailNovo.trim().toLowerCase();
    if (!email.includes("@")) {
      setErro("Informe um e-mail válido.");
      return;
    }
    const papeisManuais = adminNovo ? ["admin"] : [];
    if (papeisManuais.length === 0) {
      setErro("Selecione ao menos um papel manual.");
      return;
    }
    void salvarEmail(email, papeisManuais);
  }

  const linhas = Object.entries(atribuicoes).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="animate-fade-in">
      <div className="gradient-hero px-8 py-12">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium text-primary-foreground">
              <Shield className="h-3.5 w-3.5" />
              Administrador
            </div>
            <h1 className="text-3xl font-bold text-primary-foreground">Papéis manuais</h1>
            <p className="mt-2 max-w-2xl text-primary-foreground/70">
              Atribua papéis que não vêm da unidade organizacional do Google Workspace. Apenas o
              papel <strong>admin</strong> existe por enquanto; outros serão adicionados depois.
            </p>
          </div>
          <Button
            asChild
            variant="secondary"
            className="shrink-0 border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <Link to="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar à Central
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-8 px-8 py-8">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Nova atribuição</h2>
          </div>
          <form onSubmit={handleAdicionar} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email-novo">E-mail (domínio permitido)</Label>
              <Input
                id="email-novo"
                type="email"
                autoComplete="email"
                placeholder="nome@portalcci.com.br"
                value={emailNovo}
                onChange={(e) => setEmailNovo(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="chk-admin"
                checked={adminNovo}
                onCheckedChange={(v) => setAdminNovo(v === true)}
              />
              <Label htmlFor="chk-admin" className="cursor-pointer font-normal">
                Administrador
              </Label>
            </div>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Papéis disponíveis para marcação:{" "}
            {PAPEIS_ATRIBUICAO_MANUAL.map((p) => p.label).join(", ")}.
          </p>
        </section>

        {erro && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erro}
          </div>
        )}
        {mensagem && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100">
            {mensagem}
          </div>
        )}

        <section className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-card-foreground">Contas com papéis manuais</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papéis manuais</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carregando && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                )}
                {!carregando && linhas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      Nenhuma atribuição manual cadastrada.
                    </TableCell>
                  </TableRow>
                )}
                {linhas.map(([email, papeis]) => (
                  <TableRow key={email}>
                    <TableCell className="font-mono text-sm">{email}</TableCell>
                    <TableCell>
                      {papeis.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="inline-flex flex-wrap gap-1">
                          {papeis.map((p) => (
                            <span
                              key={p}
                              className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              {p}
                            </span>
                          ))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={salvando}
                        onClick={() => void salvarEmail(email, [])}
                      >
                        Remover papéis
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}
