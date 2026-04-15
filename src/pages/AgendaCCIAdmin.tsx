import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Laptop,
  MapPin,
  Package,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import {
  type ReservaAgendaCCI,
  type StatusReservaAgenda,
  type TipoReservaAgenda,
  carregarReservasAgenda,
  obterReservasDoServidor,
  salvarReservasAgenda,
  STORAGE_KEY_AGENDA_CCI,
} from "@/lib/agendaCci";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function labelTipo(t: TipoReservaAgenda): string {
  if (t === "chromebook") return "Chromebooks";
  if (t === "equipamento") return "Equipamento";
  return "Espaço";
}

function detalheReserva(r: ReservaAgendaCCI): string {
  if (r.tipo === "chromebook") {
    return `${r.chromebookIds?.length ?? 0} unid.: ${(r.chromebookIds ?? []).join(", ") || "—"}`;
  }
  if (r.tipo === "equipamento") {
    return `${r.equipamentoNome ?? "—"} × ${r.equipamentoQuantidade ?? 0}`;
  }
  return r.espacoNome ?? "—";
}

export default function AgendaCCIAdmin() {
  const { googleIdToken, usuario } = useAuth();
  const [reservas, setReservas] = useState<ReservaAgendaCCI[]>(() => carregarReservasAgenda());
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoReservaAgenda>("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusReservaAgenda>("todos");

  useEffect(() => {
    setReservas(carregarReservasAgenda());
  }, []);

  useEffect(() => {
    if (!googleIdToken || !usuario) return;
    let cancelado = false;
    (async () => {
      const r = await obterReservasDoServidor(googleIdToken);
      if (cancelado || !r) return;
      try {
        localStorage.setItem(STORAGE_KEY_AGENDA_CCI, JSON.stringify(r));
      } catch {
        /* ignore */
      }
      setReservas(r);
    })();
    return () => {
      cancelado = true;
    };
  }, [googleIdToken, usuario]);

  const stats = useMemo(() => {
    const ativas = reservas.filter((r) => r.status === "ativa").length;
    const canceladas = reservas.filter((r) => r.status === "cancelada").length;
    return { total: reservas.length, ativas, canceladas };
  }, [reservas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return reservas
      .filter((r) => {
        if (filtroTipo !== "todos" && r.tipo !== filtroTipo) return false;
        if (filtroStatus !== "todos" && r.status !== filtroStatus) return false;
        if (!q) return true;
        return (
          r.id.toLowerCase().includes(q) ||
          r.solicitanteEmail.toLowerCase().includes(q) ||
          r.solicitanteNome.toLowerCase().includes(q) ||
          detalheReserva(r).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [busca, filtroStatus, filtroTipo, reservas]);

  function persistir(lista: ReservaAgendaCCI[]) {
    setReservas(lista);
    salvarReservasAgenda(lista, googleIdToken);
  }

  function cancelar(id: string) {
    persistir(
      reservas.map((r) => (r.id === id ? { ...r, status: "cancelada" as const } : r)),
    );
  }

  function exportarCsv() {
    const headers = [
      "id",
      "tipo",
      "status",
      "data",
      "inicio",
      "fim",
      "solicitanteEmail",
      "solicitanteNome",
      "detalhe",
      "observacao",
      "criadoEm",
    ];
    const linhas = [headers.join(";")];
    for (const r of reservas) {
      linhas.push(
        [
          r.id,
          r.tipo,
          r.status,
          r.data,
          r.inicio,
          r.fim,
          r.solicitanteEmail,
          `"${(r.solicitanteNome || "").replace(/"/g, '""')}"`,
          `"${detalheReserva(r).replace(/"/g, '""')}"`,
          `"${(r.observacao || "").replace(/"/g, '""')}"`,
          r.criadoEm,
        ].join(";"),
      );
    }
    const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agenda-cci-reservas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in">
      <div className="gradient-hero px-8 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium text-primary-foreground">
              <Shield className="h-3.5 w-3.5" />
              Somente Setape
            </div>
            <h1 className="text-3xl font-bold text-primary-foreground">Admin — Agenda CCI</h1>
            <p className="mt-2 max-w-2xl text-primary-foreground/70">
              Visualize e cancele reservas de Chromebooks, equipamentos e espaços. Os dados ficam no
              navegador (mesmo armazenamento da Agenda CCI).
            </p>
          </div>
          <Button
            asChild
            variant="secondary"
            className="shrink-0 border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <Link to="/agenda-cci" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar à Agenda
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-8 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total de registros
            </p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ativas
            </p>
            <p className="mt-1 text-2xl font-bold text-success">{stats.ativas}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Canceladas
            </p>
            <p className="mt-1 text-2xl font-bold text-muted-foreground">{stats.canceladas}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-end sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, nome, e-mail ou detalhe..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={filtroTipo}
              onValueChange={(v) => setFiltroTipo(v as typeof filtroTipo)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="chromebook">Chromebooks</SelectItem>
                <SelectItem value="equipamento">Equipamentos</SelectItem>
                <SelectItem value="espaco">Espaços</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filtroStatus}
              onValueChange={(v) => setFiltroStatus(v as typeof filtroStatus)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={exportarCsv}>
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-card-foreground">Todas as reservas</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data / horário</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Detalhe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhuma reserva encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {filtradas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm">
                        {r.tipo === "chromebook" && <Laptop className="h-3.5 w-3.5 text-muted-foreground" />}
                        {r.tipo === "equipamento" && <Package className="h-3.5 w-3.5 text-muted-foreground" />}
                        {r.tipo === "espaco" && <MapPin className="h-3.5 w-3.5 text-muted-foreground" />}
                        {labelTipo(r.tipo)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.data}
                      <br />
                      <span className="text-muted-foreground">
                        {r.inicio} — {r.fim}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{r.solicitanteNome}</div>
                      <div className="text-xs text-muted-foreground">{r.solicitanteEmail}</div>
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                      {detalheReserva(r)}
                      {r.observacao && (
                        <span className="mt-1 block text-xs italic">Obs: {r.observacao}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          r.status === "ativa"
                            ? "rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
                            : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "ativa" ? (
                        <button
                          type="button"
                          onClick={() => cancelar(r.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
