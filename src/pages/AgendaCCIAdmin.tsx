import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero, PageHeroEyebrow } from "@/components/PageHero";
import {
  ArrowLeft,
  Calendar,
  Laptop,
  Layers,
  MapPin,
  Package,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import {
  type ReservaAgendaCCI,
  type StatusExibicaoReserva,
  type TipoReservaAgenda,
  carregarReservasAgenda,
  chromebooksParaEntregaAdmin,
  classeBadgeStatusExibicao,
  labelStatusExibicao,
  listaEquipamentosReserva,
  obterReservasDoServidor,
  salvarReservasAgenda,
  statusExibicaoReserva,
  STORAGE_KEY_AGENDA_CCI,
  textoResumoAgenda,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";

function labelTipo(t: TipoReservaAgenda): string {
  if (t === "composta") return "Composta";
  if (t === "chromebook") return "Chromebooks";
  if (t === "equipamento") return "Equipamento";
  return "Espaço";
}

function detalheReserva(r: ReservaAgendaCCI): string {
  const base = textoResumoAgenda(r);
  if (r.titulo?.trim()) {
    return `${r.titulo.trim()} — ${base}`;
  }
  return base;
}

type FiltroStatusAdmin = "todos" | StatusExibicaoReserva;

export default function AgendaCCIAdmin() {
  const { googleIdToken, usuario } = useAuth();
  const [reservas, setReservas] = useState<ReservaAgendaCCI[]>(() => carregarReservasAgenda());
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoReservaAgenda>("todos");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusAdmin>("todos");
  const [agoraTick, setAgoraTick] = useState(() => Date.now());

  const [detalheAberto, setDetalheAberto] = useState(false);
  const [reservaDetalhe, setReservaDetalhe] = useState<ReservaAgendaCCI | null>(null);

  const [cancelDialogAberto, setCancelDialogAberto] = useState(false);
  const [idCancelar, setIdCancelar] = useState<string | null>(null);

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

  useEffect(() => {
    const t = window.setInterval(() => setAgoraTick(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const agora = new Date(agoraTick);
    let canceladas = 0;
    let pendentes = 0;
    let ativas = 0;
    let concluidas = 0;
    for (const r of reservas) {
      const sx = statusExibicaoReserva(r, agora);
      if (sx === "cancelada") canceladas += 1;
      else if (sx === "pendente") pendentes += 1;
      else if (sx === "ativa") ativas += 1;
      else concluidas += 1;
    }
    return { total: reservas.length, canceladas, pendentes, ativas, concluidas };
  }, [reservas, agoraTick]);

  const filtradas = useMemo(() => {
    const agora = new Date(agoraTick);
    const q = busca.trim().toLowerCase();
    return reservas
      .filter((r) => {
        if (filtroTipo !== "todos" && r.tipo !== filtroTipo) return false;
        if (filtroStatus !== "todos") {
          const sx = statusExibicaoReserva(r, agora);
          if (sx !== filtroStatus) return false;
        }
        if (!q) return true;
        return (
          r.id.toLowerCase().includes(q) ||
          r.solicitanteEmail.toLowerCase().includes(q) ||
          r.solicitanteNome.toLowerCase().includes(q) ||
          (r.titulo?.toLowerCase().includes(q) ?? false) ||
          detalheReserva(r).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [agoraTick, busca, filtroStatus, filtroTipo, reservas]);

  async function persistir(lista: ReservaAgendaCCI[]) {
    setReservas(lista);
    const ok = await salvarReservasAgenda(lista, googleIdToken);
    if (!ok) {
      toast.warning(
        "Alteração salva neste navegador, mas a sincronização com o servidor falhou. Tente novamente.",
        { duration: 8000 },
      );
    }
  }

  function abrirCancelar(id: string) {
    setIdCancelar(id);
    setCancelDialogAberto(true);
  }

  async function confirmarCancelar() {
    if (!idCancelar) return;
    const lista = reservas.map((r) =>
      r.id === idCancelar ? { ...r, status: "cancelada" as const } : r,
    );
    await persistir(lista);
    setCancelDialogAberto(false);
    setIdCancelar(null);
    toast.success("Reserva cancelada.");
    if (reservaDetalhe?.id === idCancelar) {
      setReservaDetalhe((prev) => (prev ? { ...prev, status: "cancelada" } : null));
    }
  }

  function exportarCsv() {
    const headers = [
      "id",
      "tipo",
      "statusPersistido",
      "statusExibicao",
      "data",
      "inicio",
      "fim",
      "solicitanteEmail",
      "solicitanteNome",
      "detalhe",
      "observacao",
      "criadoEm",
    ];
    const agora = new Date();
    const linhas = [headers.join(";")];
    for (const r of reservas) {
      linhas.push(
        [
          r.id,
          r.tipo,
          r.status,
          statusExibicaoReserva(r, agora),
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

  function podeCancelar(r: ReservaAgendaCCI): boolean {
    const agora = new Date(agoraTick);
    const sx = statusExibicaoReserva(r, agora);
    return r.status === "ativa" && sx !== "concluída";
  }

  return (
    <div className="animate-fade-in">
      <PageHero>
        <>
          <PageHeroEyebrow />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                <Shield className="h-3.5 w-3.5 text-amber-300" />
                Somente Setape
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
                Admin — Agenda CCI
              </h1>
              <p className="mt-2 max-w-2xl text-slate-300">
                Visualize reservas de Chromebooks, equipamentos e espaços. Clique em uma linha para ver todos os
                detalhes. Os dados são sincronizados com o servidor quando disponível.
              </p>
            </div>
            <Button
              asChild
              variant="secondary"
              className="shrink-0 border border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <Link to="/agenda-cci" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar à Agenda
              </Link>
            </Button>
          </div>
        </>
      </PageHero>

      <AlertDialog open={cancelDialogAberto} onOpenChange={setCancelDialogAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              A reserva será marcada como cancelada e os recursos poderão ser liberados para outros usuários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmarCancelar()}
            >
              Sim, cancelar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={detalheAberto} onOpenChange={setDetalheAberto}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da reserva</DialogTitle>
            <DialogDescription>Informações completas registradas pelo solicitante.</DialogDescription>
          </DialogHeader>
          {reservaDetalhe && (
            <div className="space-y-3 text-sm text-card-foreground">
              <p>
                <span className="font-medium">ID:</span>{" "}
                <span className="font-mono text-xs">{reservaDetalhe.id}</span>
              </p>
              <p>
                <span className="font-medium">Status (exibição):</span>{" "}
                {labelStatusExibicao(statusExibicaoReserva(reservaDetalhe, new Date(agoraTick)))}
              </p>
              <p>
                <span className="font-medium">Status no cadastro:</span> {reservaDetalhe.status}
              </p>
              <p>
                <span className="font-medium">Tipo:</span> {labelTipo(reservaDetalhe.tipo)}
              </p>
              <p>
                <span className="font-medium">Título:</span> {reservaDetalhe.titulo ?? "—"}
              </p>
              <p>
                <span className="font-medium">Data / horário:</span> {reservaDetalhe.data} · {reservaDetalhe.inicio} —{" "}
                {reservaDetalhe.fim}
              </p>
              <p>
                <span className="font-medium">Solicitante:</span> {reservaDetalhe.solicitanteNome} (
                {reservaDetalhe.solicitanteEmail})
              </p>
              {chromebooksParaEntregaAdmin(reservaDetalhe).length > 0 && (
                <div>
                  <span className="font-medium">Chromebooks (ID recurso / entrega):</span>
                  <ul className="mt-1 list-disc pl-5 font-mono text-xs">
                    {chromebooksParaEntregaAdmin(reservaDetalhe).map((c, i) => (
                      <li key={`${c.etiqueta}-${i}`}>
                        {c.etiqueta} · {c.hasHdmi ? "com HDMI" : "sem HDMI"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {listaEquipamentosReserva(reservaDetalhe).length > 0 && (
                <div>
                  <span className="font-medium">Equipamentos:</span>
                  <ul className="mt-1 list-disc pl-5">
                    {listaEquipamentosReserva(reservaDetalhe).map((e) => (
                      <li key={e.nome}>
                        {e.nome} × {e.quantidade}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {reservaDetalhe.espacoNome ? (
                <p>
                  <span className="font-medium">Espaço:</span> {reservaDetalhe.espacoNome}
                </p>
              ) : null}
              {reservaDetalhe.observacao ? (
                <p className="whitespace-pre-wrap">
                  <span className="font-medium">Observação:</span>
                  <br />
                  {reservaDetalhe.observacao}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-card-foreground">Criado em:</span> {reservaDetalhe.criadoEm}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="mt-1 text-xl font-bold text-card-foreground">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pendentes</p>
            <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">{stats.pendentes}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ativas (agora)</p>
            <p className="mt-1 text-xl font-bold text-success">{stats.ativas}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Concluídas</p>
            <p className="mt-1 text-xl font-bold text-muted-foreground">{stats.concluidas}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Canceladas</p>
            <p className="mt-1 text-xl font-bold text-muted-foreground">{stats.canceladas}</p>
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
                <SelectItem value="composta">Composta</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filtroStatus}
              onValueChange={(v) => setFiltroStatus(v as FiltroStatusAdmin)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="ativa">Ativa (em horário)</SelectItem>
                <SelectItem value="concluída">Concluída</SelectItem>
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
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma reserva encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {filtradas.map((r) => {
                  const sx = statusExibicaoReserva(r, new Date(agoraTick));
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setReservaDetalhe(r);
                        setDetalheAberto(true);
                      }}
                    >
                      <TableCell>
                        <div className="text-sm font-medium">{r.solicitanteNome}</div>
                        <div className="text-xs text-muted-foreground">{r.solicitanteEmail}</div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          {r.tipo === "composta" && <Layers className="h-3.5 w-3.5 text-muted-foreground" />}
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <span className={classeBadgeStatusExibicao(sx)}>{labelStatusExibicao(sx)}</span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {podeCancelar(r) ? (
                          <button
                            type="button"
                            onClick={() => abrirCancelar(r.id)}
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
