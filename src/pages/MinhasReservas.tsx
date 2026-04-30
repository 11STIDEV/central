import { useEffect, useMemo, useState } from "react";
import { Clock3, XCircle } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import {
  type ReservaAgendaCCI,
  STORAGE_KEY_AGENDA_CCI,
  carregarReservasAgenda,
  classeBadgeStatusExibicao,
  formatarYmdParaBR,
  labelStatusExibicao,
  listaEquipamentosReserva,
  observacaoSomenteTextoLivre,
  obterReservasDoServidor,
  salvarReservasAgenda,
  statusExibicaoReserva,
  textoChromebooksParaSolicitante,
} from "@/lib/agendaCci";
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

function tipoLabel(r: ReservaAgendaCCI): string {
  if (r.tipo === "composta") return "Reserva composta";
  if (r.tipo === "chromebook") return "Chromebooks";
  if (r.tipo === "equipamento") return "Equipamento";
  return "Espaço";
}

export default function MinhasReservas() {
  const { usuario, googleIdToken } = useAuth();
  const [reservas, setReservas] = useState<ReservaAgendaCCI[]>(() => carregarReservasAgenda());
  const [agoraTick, setAgoraTick] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [cancelDialogAberto, setCancelDialogAberto] = useState(false);
  const [idCancelar, setIdCancelar] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setAgoraTick(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!googleIdToken || !usuario) return;
    let cancelado = false;
    (async () => {
      const listaServidor = await obterReservasDoServidor(googleIdToken);
      if (cancelado || !listaServidor) return;
      try {
        localStorage.setItem(STORAGE_KEY_AGENDA_CCI, JSON.stringify(listaServidor));
      } catch {
        /* ignore */
      }
      setReservas(listaServidor);
    })();
    return () => {
      cancelado = true;
    };
  }, [googleIdToken, usuario]);

  const minhasReservas = useMemo(() => {
    if (!usuario) return [];
    return reservas
      .filter((r) => r.solicitanteEmail.toLowerCase() === usuario.email.toLowerCase())
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [reservas, usuario]);

  function podeCancelarReserva(r: ReservaAgendaCCI): boolean {
    const agora = new Date(agoraTick);
    const sx = statusExibicaoReserva(r, agora);
    return r.status === "ativa" && sx !== "concluída";
  }

  function abrirCancelar(id: string) {
    setIdCancelar(id);
    setCancelDialogAberto(true);
  }

  async function confirmarCancelar() {
    if (!idCancelar) return;
    const next = reservas.map((r) => (r.id === idCancelar ? { ...r, status: "cancelada" as const } : r));
    setReservas(next);
    const ok = await salvarReservasAgenda(next, googleIdToken);
    setCancelDialogAberto(false);
    setIdCancelar(null);
    const msg = "Reserva cancelada com sucesso.";
    setFeedback({ tipo: "sucesso", texto: msg });
    toast.success(msg);
    if (!ok) {
      toast.warning(
        "Cancelamento salvo neste navegador, mas não foi possível sincronizar com o servidor. Tente novamente.",
        { duration: 8000 },
      );
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Minhas Reservas"
        subtitle="Visualize e gerencie as reservas feitas com o seu usuário."
      />

      <AlertDialog open={cancelDialogAberto} onOpenChange={setCancelDialogAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Os recursos ficarão disponíveis para outros usuários após o
              cancelamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmarCancelar()}
            >
              Sim, cancelar reserva
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Reservas do usuário logado</h2>
          </div>

          {feedback && (
            <div
              role="status"
              className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                feedback.tipo === "erro"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-success/50 bg-success/10 text-green-900 dark:text-green-100"
              }`}
            >
              {feedback.texto}
            </div>
          )}

          <div className="space-y-3">
            {minhasReservas.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Você ainda não possui reservas.
              </div>
            )}

            {minhasReservas.map((r) => {
              const agora = new Date(agoraTick);
              const sx = statusExibicaoReserva(r, agora);
              const txChrome = textoChromebooksParaSolicitante(r);
              return (
              <div key={r.id} className="rounded-lg border border-border bg-background p-3">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {tipoLabel(r)}
                  </span>
                  <span className={classeBadgeStatusExibicao(sx)}>
                    {labelStatusExibicao(sx)}
                  </span>
                </div>

                {r.titulo && (
                  <p className="text-sm font-medium text-card-foreground">{r.titulo}</p>
                )}
                <p className="text-sm text-card-foreground">
                  {formatarYmdParaBR(r.data)} • {r.inicio} às {r.fim}
                </p>

                {r.tipo === "composta" && (
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    {txChrome ? <p>Chromebooks: {txChrome}</p> : null}
                    {listaEquipamentosReserva(r).map((e) => (
                      <p key={e.nome}>
                        {e.nome} × {e.quantidade}
                      </p>
                    ))}
                    {r.espacoNome ? <p>Espaço: {r.espacoNome}</p> : null}
                    {observacaoSomenteTextoLivre(r.observacao) ? (
                      <p className="whitespace-pre-wrap pt-1 text-muted-foreground">
                        Obs.: {observacaoSomenteTextoLivre(r.observacao)}
                      </p>
                    ) : null}
                  </div>
                )}

                {r.tipo === "chromebook" && (
                  <p className="text-xs text-muted-foreground">{txChrome ?? "—"}</p>
                )}
                {r.tipo === "equipamento" && (
                  <p className="text-xs text-muted-foreground">
                    {listaEquipamentosReserva(r)
                      .map((e) => `${e.nome} × ${e.quantidade}`)
                      .join(", ") || "—"}
                  </p>
                )}
                {r.tipo === "espaco" && (
                  <p className="text-xs text-muted-foreground">{r.espacoNome}</p>
                )}

                {podeCancelarReserva(r) && (
                  <Button
                    type="button"
                    variant="link"
                    className="mt-2 h-auto p-0 text-xs font-medium text-destructive"
                    onClick={() => abrirCancelar(r.id)}
                  >
                    <span className="inline-flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" />
                      Cancelar reserva
                    </span>
                  </Button>
                )}
              </div>
            );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
