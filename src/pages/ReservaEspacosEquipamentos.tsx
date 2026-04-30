import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Calendar, Check, Laptop, Package, MapPin, Plus, Trash2 } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type ChromebookAgendaItem,
  type ReservaAgendaCCI,
  CHROMEBOOKS_CATALOGO_FALLBACK,
  EQUIPAMENTOS_CATALOGO,
  ESPACOS_CATALOGO,
  STORAGE_KEY_AGENDA_CCI,
  TOLERANCIA_FIM_RESERVA_MIN,
  carregarReservasAgenda,
  dataReservaDentroDaSemanaPermitida,
  formatarYmdParaBR,
  horaMinimaInicioParaData,
  inicioReservaNaoEstaNoPassado,
  limitesDatasReservaSemanaCorrente,
  listaEquipamentosReserva,
  observacaoSomenteTextoLivre,
  obterReservasDoServidor,
  quantidadeEquipamentoNaReserva,
  reservaIncluiChromebookId,
  reservaIncluiEquipamentoNome,
  reservaIncluiEspacoNome,
  reservaChromebookIds,
  salvarReservasAgenda,
  reservasChromebookConflitam,
  toMinutes,
  textoChromebooksParaSolicitante,
  toYmdLocal,
  rangesOverlap,
} from "@/lib/agendaCci";
import { apiUrl } from "@/lib/apiBase";
import { toast } from "@/components/ui/sonner";

type LinhaEquipamento = { key: string; nome: string; quantidade: number };

function novaLinhaEquipamento(): LinhaEquipamento {
  return {
    key: `eq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    nome: EQUIPAMENTOS_CATALOGO[0].nome,
    quantidade: 0,
  };
}

function consolidarEquipamentosLinhas(linhas: LinhaEquipamento[]): ItemEquipamentoReserva[] {
  const map = new Map<string, number>();
  for (const l of linhas) {
    if (l.quantidade <= 0) continue;
    map.set(l.nome, (map.get(l.nome) ?? 0) + l.quantidade);
  }
  return [...map.entries()].map(([nome, quantidade]) => ({ nome, quantidade }));
}

type Feedback = { tipo: "erro" | "sucesso"; texto: string } | null;

export default function ReservaEspacosEquipamentos() {
  const location = useLocation();
  const { usuario, googleIdToken } = useAuth();
  const papelAluno = usuario?.papeis.includes("aluno") ?? false;
  const [titulo, setTitulo] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"chromebook" | "equipamento" | "espaco">("chromebook");
  const [data, setData] = useState<string>(() => toYmdLocal(new Date()));
  const [inicio, setInicio] = useState("08:00");
  const [fim, setFim] = useState("08:50");
  const [somenteHdmi, setSomenteHdmi] = useState(false);
  const [chromebooksSelecionados, setChromebooksSelecionados] = useState<string[]>([]);
  const [equipamentoLinhas, setEquipamentoLinhas] = useState<LinhaEquipamento[]>(() => [
    novaLinhaEquipamento(),
  ]);
  const [espacoNome, setEspacoNome] = useState("");
  const [observacao, setObservacao] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [reservas, setReservas] = useState<ReservaAgendaCCI[]>(() => carregarReservasAgenda());
  const [chromebooksCatalogo, setChromebooksCatalogo] = useState<ChromebookAgendaItem[]>(
    CHROMEBOOKS_CATALOGO_FALLBACK,
  );
  const [carregandoChromebooks, setCarregandoChromebooks] = useState(false);
  const [avisoChromebooks, setAvisoChromebooks] = useState<string | null>(null);
  const [dialogConfirmarAberto, setDialogConfirmarAberto] = useState(false);
  const [reservaPendente, setReservaPendente] = useState<ReservaAgendaCCI | null>(null);

  useEffect(() => {
    if (!googleIdToken || !usuario || location.pathname !== "/reserva-espacos-equipamentos") return;
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
  }, [googleIdToken, usuario, location.pathname]);

  useEffect(() => {
    if (!googleIdToken || !usuario) return;
    let cancelado = false;
    setCarregandoChromebooks(true);
    setAvisoChromebooks(null);
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/chromebooks"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: googleIdToken }),
        });
        const text = await res.text();
        let body: {
          devices?: ChromebookAgendaItem[];
          error?: string;
          detalhe?: string;
        } = {};
        try {
          if (text) body = JSON.parse(text) as typeof body;
        } catch {
          /* ignore */
        }
        if (!res.ok) {
          const detalhe =
            typeof body.detalhe === "string" && body.detalhe.trim() !== ""
              ? body.detalhe.trim()
              : "";
          const base =
            typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
          const msg = detalhe ? `${base} — ${detalhe}` : base;
          if (!cancelado) {
            setChromebooksCatalogo(CHROMEBOOKS_CATALOGO_FALLBACK);
            setAvisoChromebooks(
              `Não foi possível carregar Chromebooks do Google Workspace (${msg}). Exibindo lista de exemplo.`,
            );
          }
          return;
        }
        const list = body.devices;
        if (!cancelado && Array.isArray(list) && list.length > 0) {
          setChromebooksCatalogo(list);
        } else if (!cancelado) {
          setChromebooksCatalogo(CHROMEBOOKS_CATALOGO_FALLBACK);
          setAvisoChromebooks(
            "Nenhum Chromebook retornado pelo Workspace (ativos ou desativados). Confira o inventário no Admin Console ou a OU em GOOGLE_CHROMEBOOK_ORG_UNIT. Exibindo lista de exemplo.",
          );
        }
      } catch {
        if (!cancelado) {
          setChromebooksCatalogo(CHROMEBOOKS_CATALOGO_FALLBACK);
          setAvisoChromebooks(
            "Falha de rede ao buscar Chromebooks. Verifique se a API em server/ está rodando. Exibindo lista de exemplo.",
          );
        }
      } finally {
        if (!cancelado) setCarregandoChromebooks(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [googleIdToken, usuario]);

  useEffect(() => {
    const ids = new Set(chromebooksCatalogo.map((c) => c.id));
    setChromebooksSelecionados((prev) => prev.filter((id) => ids.has(id)));
  }, [chromebooksCatalogo]);

  const minHoraInicio = useMemo(() => horaMinimaInicioParaData(data), [data]);

  useEffect(() => {
    const m = horaMinimaInicioParaData(data);
    if (!m) return;
    if (toMinutes(inicio) < toMinutes(m)) setInicio(m);
  }, [data]);

  const reservasAtivas = useMemo(
    () => reservas.filter((r) => r.status === "ativa"),
    [reservas],
  );

  const disponiveisChromebook = useMemo(() => {
    return chromebooksCatalogo.filter((cb) => {
      if (somenteHdmi && !cb.hasHdmi) return false;
      const conflita = reservasAtivas.some((r) => {
        if (r.data !== data) return false;
        if (!reservaIncluiChromebookId(r, cb.id)) return false;
        return reservasChromebookConflitam(inicio, fim, r.inicio, r.fim);
      });
      return !conflita;
    });
  }, [chromebooksCatalogo, data, fim, inicio, reservasAtivas, somenteHdmi]);

  const maxDisponivelEquip = useCallback(
    (nome: string, rowKey: string) => {
      const def = EQUIPAMENTOS_CATALOGO.find((e) => e.nome === nome);
      if (!def) return 0;
      const outrasLinhas = equipamentoLinhas
        .filter((l) => l.key !== rowKey && l.nome === nome)
        .reduce((a, l) => a + l.quantidade, 0);
      const reservado = reservasAtivas
        .filter((r) => r.data === data && reservaIncluiEquipamentoNome(r, nome))
        .filter((r) => rangesOverlap(inicio, fim, r.inicio, r.fim))
        .reduce((acc, r) => acc + quantidadeEquipamentoNaReserva(r, nome), 0);
      return Math.max(0, def.total - reservado - outrasLinhas);
    },
    [data, equipamentoLinhas, fim, inicio, reservasAtivas],
  );

  const espacosDisponiveis = useMemo(() => {
    return ESPACOS_CATALOGO.filter((esp) => {
      const conflita = reservasAtivas.some((r) => {
        if (r.data !== data) return false;
        if (!reservaIncluiEspacoNome(r, esp)) return false;
        return reservasChromebookConflitam(inicio, fim, r.inicio, r.fim);
      });
      return !conflita;
    });
  }, [data, fim, inicio, reservasAtivas]);

  const alunoJaTemReservaAtivaChromebook = useMemo(() => {
    if (!usuario || !papelAluno) return false;
    return reservas.some(
      (r) =>
        r.status === "ativa" &&
        r.solicitanteEmail === usuario.email &&
        reservaChromebookIds(r).length > 0,
    );
  }, [reservas, usuario, papelAluno]);

  const { min: dataMin, max: dataMax } = limitesDatasReservaSemanaCorrente(new Date());

  useEffect(() => {
    const { min, max } = limitesDatasReservaSemanaCorrente(new Date());
    setData((d) => (d < min || d > max ? min : d));
  }, []);

  useEffect(() => {
    if (!usuario?.papeis.includes("aluno")) return;
    setAbaAtiva("chromebook");
    setEspacoNome("");
    setFeedback(null);
  }, [usuario]);

  function resetAposSucesso() {
    setTitulo("");
    setChromebooksSelecionados([]);
    setEquipamentoLinhas([novaLinhaEquipamento()]);
    setEspacoNome("");
    setObservacao("");
  }

  function mostrarErro(texto: string) {
    setFeedback({ tipo: "erro", texto });
    toast.error(texto, { duration: 6000 });
  }

  function montarReservaOuErro(): ReservaAgendaCCI | string {
    if (!usuario) return "Faça login para reservar.";
    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) return "Informe um título para a reserva.";
    if (!data || !inicio || !fim || toMinutes(fim) <= toMinutes(inicio)) {
      return "Informe data e horário válidos (o fim deve ser depois do início).";
    }

    if (!inicioReservaNaoEstaNoPassado(data, inicio)) {
      return "Não é possível reservar um horário de início que já passou. Ajuste a data ou o horário de início.";
    }

    if (!dataReservaDentroDaSemanaPermitida(data)) {
      return "Só é possível reservar até o sábado da semana corrente. A próxima semana (domingo a sábado) fica disponível a partir do próximo domingo.";
    }

    const temChromebooks = chromebooksSelecionados.length > 0;
    const equipamentosConsolidados = consolidarEquipamentosLinhas(equipamentoLinhas);
    const temEquipamento = equipamentosConsolidados.length > 0;
    const temEspaco = Boolean(espacoNome.trim());

    if (papelAluno && (temEspaco || temEquipamento)) {
      return "Contas com papel aluno só podem reservar Chromebooks.";
    }

    if (!temChromebooks && !temEspaco && !temEquipamento) {
      return "Inclua ao menos um Chromebook, um equipamento ou um espaço (use as abas).";
    }

    if (papelAluno) {
      const jaTemOutraAtiva = reservas.some(
        (r) =>
          r.status === "ativa" &&
          r.solicitanteEmail === usuario.email &&
          reservaChromebookIds(r).length > 0,
      );
      if (jaTemOutraAtiva) {
        return "Você já possui uma reserva ativa de Chromebook. Cancele-a em Minhas reservas antes de criar outra.";
      }
    }

    if (temChromebooks && papelAluno && chromebooksSelecionados.length > 1) {
      return "Contas de aluno podem reservar apenas um Chromebook (e uma reserva ativa por vez).";
    }

    if (temEquipamento) {
      for (const linha of equipamentoLinhas) {
        if (linha.quantidade <= 0) continue;
        const max = maxDisponivelEquip(linha.nome, linha.key);
        if (linha.quantidade > max) {
          return `Quantidade indisponível para “${linha.nome}”: no máximo ${max} unidade(s) neste horário.`;
        }
      }
    }

    if (temEspaco && !espacosDisponiveis.includes(espacoNome.trim())) {
      return "Este espaço não está disponível nesse horário (já existe reserva sobreposta, incluindo tolerância após o término).";
    }

    const linhasHdmi = chromebooksSelecionados
      .map((deviceId) => {
        const cb = chromebooksCatalogo.find((x) => x.id === deviceId);
        const recursoId = cb?.annotatedAssetId ?? cb?.id ?? deviceId;
        return cb?.hasHdmi ? `${recursoId}: COM HDMI` : `${recursoId}: SEM HDMI`;
      })
      .filter((s): s is string => Boolean(s));

    const chromebooksEntrega = temChromebooks
      ? chromebooksSelecionados.map((deviceId) => {
          const cb = chromebooksCatalogo.find((x) => x.id === deviceId);
          return {
            etiqueta: String(cb?.annotatedAssetId ?? cb?.id ?? deviceId),
            hasHdmi: Boolean(cb?.hasHdmi),
          };
        })
      : undefined;

    const partesObs = [linhasHdmi.length ? linhasHdmi.join("\n") : undefined, observacao.trim() || undefined].filter(
      Boolean,
    ) as string[];
    const observacaoFinal = partesObs.length ? partesObs.join("\n\n") : undefined;

    const primeiroEq = equipamentosConsolidados[0];

    const nova: ReservaAgendaCCI = {
      id: `RSV-${Date.now()}`,
      tipo: "composta",
      titulo: tituloLimpo,
      data,
      inicio,
      fim,
      solicitanteEmail: usuario.email,
      solicitanteNome: usuario.nome,
      chromebookIds: temChromebooks ? chromebooksSelecionados : undefined,
      chromebooksEntrega,
      equipamentos: temEquipamento ? equipamentosConsolidados : undefined,
      equipamentoNome: primeiroEq?.nome,
      equipamentoQuantidade: primeiroEq?.quantidade,
      espacoNome: temEspaco ? espacoNome.trim() : undefined,
      observacao: observacaoFinal,
      status: "ativa",
      criadoEm: new Date().toISOString(),
    };

    return nova;
  }

  function abrirConfirmacaoReserva() {
    setFeedback(null);
    const resultado = montarReservaOuErro();
    if (typeof resultado === "string") {
      mostrarErro(resultado);
      return;
    }
    setReservaPendente(resultado);
    setDialogConfirmarAberto(true);
  }

  async function confirmarReservaNoDialog() {
    if (!reservaPendente) return;
    const next = [reservaPendente, ...reservas];
    setReservas(next);
    const ok = await salvarReservasAgenda(next, googleIdToken);
    setDialogConfirmarAberto(false);
    setReservaPendente(null);
    resetAposSucesso();
    const msgOk =
      "Reserva registrada com sucesso. Você pode acompanhar em Minhas reservas.";
    setFeedback({ tipo: "sucesso", texto: msgOk });
    toast.success(msgOk);
    if (!ok) {
      toast.warning(
        "A reserva foi salva neste navegador, mas não foi possível sincronizar com o servidor. Verifique a conexão ou tente novamente.",
        { duration: 8000 },
      );
    }
  }

  const resumoLinhas = useMemo(() => {
    const lines: string[] = [];
    if (titulo.trim()) lines.push(`Título: ${titulo.trim()}`);
    if (chromebooksSelecionados.length > 0) {
      let com = 0;
      let sem = 0;
      for (const id of chromebooksSelecionados) {
        const cb = chromebooksCatalogo.find((x) => x.id === id);
        if (cb?.hasHdmi) com += 1;
        else sem += 1;
      }
      const partes: string[] = [];
      if (com) partes.push(`${com} Chromebook${com !== 1 ? "s" : ""} com HDMI`);
      if (sem) partes.push(`${sem} Chromebook${sem !== 1 ? "s" : ""} sem HDMI`);
      lines.push(partes.join(" · "));
    }
    const eqs = consolidarEquipamentosLinhas(equipamentoLinhas);
    for (const e of eqs) {
      lines.push(`Equipamento: ${e.nome} × ${e.quantidade}`);
    }
    if (espacoNome.trim()) {
      lines.push(`Espaço: ${espacoNome.trim()}`);
    }
    return lines;
  }, [titulo, chromebooksSelecionados, chromebooksCatalogo, equipamentoLinhas, espacoNome]);

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Reserva de Equipamentos e Espaços"
        subtitle={
          papelAluno
            ? "Reserva de Chromebooks da CCI."
            : "Chromebooks, equipamentos e espaços. A agenda da semana fica em Agenda CCI."
        }
      />

      <Dialog open={dialogConfirmarAberto} onOpenChange={setDialogConfirmarAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar reserva</DialogTitle>
            <DialogDescription>
              Revise os dados abaixo. Após confirmar, a reserva será registrada e ficará visível para o setor
              responsável.
            </DialogDescription>
          </DialogHeader>
          {reservaPendente && (
            <ul className="space-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-card-foreground">
              <li>
                <span className="font-medium">Título:</span> {reservaPendente.titulo}
              </li>
              <li>
                <span className="font-medium">Data:</span> {formatarYmdParaBR(reservaPendente.data)} ·{" "}
                {reservaPendente.inicio} — {reservaPendente.fim}
              </li>
              {(() => {
                const tx = textoChromebooksParaSolicitante(reservaPendente);
                return tx ? (
                  <li>
                    <span className="font-medium">Chromebooks:</span> {tx}
                  </li>
                ) : null;
              })()}
              {listaEquipamentosReserva(reservaPendente).map((e) => (
                <li key={e.nome}>
                  <span className="font-medium">Equipamento:</span> {e.nome} × {e.quantidade}
                </li>
              ))}
              {reservaPendente.espacoNome ? (
                <li>
                  <span className="font-medium">Espaço:</span> {reservaPendente.espacoNome}
                </li>
              ) : null}
              {observacaoSomenteTextoLivre(reservaPendente.observacao) ? (
                <li className="whitespace-pre-wrap text-muted-foreground">
                  <span className="font-medium text-card-foreground">Observação:</span>{" "}
                  {observacaoSomenteTextoLivre(reservaPendente.observacao)}
                </li>
              ) : null}
            </ul>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogConfirmarAberto(false)}>
              Voltar
            </Button>
            <Button type="button" onClick={() => void confirmarReservaNoDialog()}>
              Confirmar e salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Nova Reserva</h2>
          </div>

          {!usuario && (
            <div className="mb-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Entre com sua conta para criar reservas.
            </div>
          )}

          <div className="mb-4 space-y-2">
            <label className="text-sm font-medium text-card-foreground" htmlFor="titulo-reserva">
              Título da reserva
            </label>
            <Input
              id="titulo-reserva"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Aula de reforço, reunião pedagógica, evento…"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Data</span>
              <input
                type="date"
                min={dataMin}
                max={dataMax}
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Início</span>
              <input
                type="time"
                value={inicio}
                min={minHoraInicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Fim</span>
              <input
                type="time"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Período liberado para novas reservas:{" "}
            <strong>
              {formatarYmdParaBR(dataMin)} a {formatarYmdParaBR(dataMax)}
            </strong>{" "}
            (semana domingo a sábado; no próximo domingo abre a próxima semana).
            {minHoraInicio ? (
              <>
                {" "}
                Para <strong>hoje</strong>, o início não pode ser anterior a{" "}
                <strong>{minHoraInicio}</strong>.
              </>
            ) : null}
          </p>

          <Tabs
            value={papelAluno ? "chromebook" : abaAtiva}
            onValueChange={(v) => {
              if (!papelAluno) {
                setAbaAtiva(v as "chromebook" | "equipamento" | "espaco");
              }
            }}
            className="mt-4"
          >
            {!papelAluno && (
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1">
                <TabsTrigger value="chromebook" className="gap-1.5 text-xs sm:text-sm">
                  <Laptop className="h-4 w-4 shrink-0" />
                  Chromebooks
                </TabsTrigger>
                <TabsTrigger value="equipamento" className="gap-1.5 text-xs sm:text-sm">
                  <Package className="h-4 w-4 shrink-0" />
                  Equipamentos
                </TabsTrigger>
                <TabsTrigger value="espaco" className="gap-1.5 text-xs sm:text-sm">
                  <MapPin className="h-4 w-4 shrink-0" />
                  Espaços
                </TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="chromebook" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Use as abas para montar <strong>uma única reserva</strong> (Chromebooks, equipamentos
                e/ou espaço no mesmo horário). Reservas consideram{" "}
                <strong>{TOLERANCIA_FIM_RESERVA_MIN} minutos</strong> após o fim. Aparelhos já
                reservados no intervalo não aparecem abaixo.
              </p>
              {papelAluno && (
                <p className="text-xs text-amber-800 dark:text-amber-100">
                  <strong>Papel aluno:</strong> apenas Chromebooks — uma reserva ativa por vez, um
                  aparelho.
                </p>
              )}
              {papelAluno && alunoJaTemReservaAtivaChromebook && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                  Você já possui uma reserva ativa de Chromebook. Cancele-a em{" "}
                  <strong>Minhas reservas</strong> para criar outra.
                </div>
              )}
              {avisoChromebooks && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                  {avisoChromebooks}
                </div>
              )}
              {carregandoChromebooks && (
                <p className="text-xs text-muted-foreground">Carregando Chromebooks do Workspace…</p>
              )}
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={somenteHdmi}
                  onChange={(e) => setSomenteHdmi(e.target.checked)}
                />
                Apenas Chromebooks com HDMI
              </label>
              <div className="grid max-h-52 grid-cols-1 gap-2 overflow-auto rounded-lg border border-border p-3 sm:grid-cols-2 md:grid-cols-3">
                {disponiveisChromebook.map((cb) => {
                  const checked = chromebooksSelecionados.includes(cb.id);
                  return (
                    <div key={cb.id} className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (checked) {
                            setChromebooksSelecionados((prev) => prev.filter((id) => id !== cb.id));
                          } else if (papelAluno) {
                            setChromebooksSelecionados([cb.id]);
                          } else {
                            setChromebooksSelecionados((prev) => [...prev, cb.id]);
                          }
                        }}
                        className={`relative flex min-h-[3.5rem] flex-col items-start justify-center gap-2 rounded-lg border-2 px-3 py-2.5 pr-10 text-left text-xs font-medium transition-shadow ${
                          checked
                            ? "border-primary bg-primary/15 text-foreground shadow-md ring-2 ring-primary/40"
                            : "border-border text-foreground hover:border-primary/40 hover:bg-muted/30"
                        }`}
                      >
                        {checked && (
                          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                          </span>
                        )}
                        <span className="text-sm font-semibold text-card-foreground">Chromebook</span>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            cb.hasHdmi
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {cb.hasHdmi ? "Com HDMI" : "Sem HDMI"}
                        </span>
                      </button>
                    </div>
                  );
                })}
                {disponiveisChromebook.length === 0 && !carregandoChromebooks && (
                  <p className="col-span-full text-sm text-muted-foreground">
                    Nenhum Chromebook disponível nesse horário.
                  </p>
                )}
              </div>
            </TabsContent>

            {!papelAluno && (
              <>
                <TabsContent value="equipamento" className="mt-4 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Adicione quantas linhas precisar para incluir <strong>vários equipamentos</strong> na mesma
                    reserva. A disponibilidade considera outras reservas no mesmo horário.
                  </p>
                  {equipamentoLinhas.map((linha) => {
                    const max = maxDisponivelEquip(linha.nome, linha.key);
                    return (
                      <div
                        key={linha.key}
                        className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 md:flex-row md:items-end"
                      >
                        <label className="text-sm md:flex-1">
                          <span className="mb-1 block text-muted-foreground">Equipamento</span>
                          <select
                            value={linha.nome}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEquipamentoLinhas((prev) =>
                                prev.map((l) => (l.key === linha.key ? { ...l, nome: v } : l)),
                              );
                            }}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2"
                          >
                            {EQUIPAMENTOS_CATALOGO.map((e) => (
                              <option key={e.nome} value={e.nome}>
                                {e.nome}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm md:w-48">
                          <span className="mb-1 block text-muted-foreground">
                            Quantidade (máx. {max} neste horário)
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={max}
                            value={linha.quantidade}
                            onChange={(e) => {
                              const n = Number(e.target.value || "0");
                              setEquipamentoLinhas((prev) =>
                                prev.map((l) =>
                                  l.key === linha.key ? { ...l, quantidade: Math.max(0, n) } : l,
                                ),
                              );
                            }}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2"
                          />
                        </label>
                        <div className="flex gap-2 md:pb-0.5">
                          {equipamentoLinhas.length > 1 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                              onClick={() =>
                                setEquipamentoLinhas((prev) => prev.filter((l) => l.key !== linha.key))
                              }
                              aria-label="Remover linha de equipamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2"
                    onClick={() => setEquipamentoLinhas((prev) => [...prev, novaLinhaEquipamento()])}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar equipamento
                  </Button>
                </TabsContent>

                <TabsContent value="espaco" className="mt-4">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Espaços ocupados no mesmo horário ficam indisponíveis (mesma regra de sobreposição dos
                    Chromebooks, incluindo tolerância após o término).
                  </p>
                  <label className="text-sm">
                    <span className="mb-1 block text-muted-foreground">Espaço</span>
                    <select
                      value={espacoNome}
                      onChange={(e) => setEspacoNome(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2"
                    >
                      <option value="">— Nenhum —</option>
                      {ESPACOS_CATALOGO.map((esp) => (
                        <option key={esp} value={esp} disabled={!espacosDisponiveis.includes(esp)}>
                          {esp} {!espacosDisponiveis.includes(esp) ? "(indisponível)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </TabsContent>
              </>
            )}
          </Tabs>

          <div className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-medium text-card-foreground">Resumo da reserva</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {resumoLinhas.length === 0 ? (
                <li>Preencha o título e selecione ao menos um recurso nas abas.</li>
              ) : (
                resumoLinhas.map((line, i) => (
                  <li key={`${line}-${i}`}>{line}</li>
                ))
              )}
            </ul>
          </div>

          <div className="mt-4">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Observação (opcional)</span>
              <textarea
                rows={3}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                placeholder="Detalhes adicionais para o setor responsável…"
              />
            </label>
          </div>

          {feedback && (
            <div
              role="alert"
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                feedback.tipo === "erro"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-success/50 bg-success/10 text-green-900 dark:text-green-100"
              }`}
            >
              {feedback.texto}
            </div>
          )}

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={abrirConfirmacaoReserva}
              disabled={!usuario || alunoJaTemReservaAtivaChromebook}
              className="rounded-lg gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              Revisar e confirmar reserva
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
