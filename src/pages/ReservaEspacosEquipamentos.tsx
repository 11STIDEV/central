import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Calendar, Check, Clock3, Laptop, Package, MapPin, XCircle } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/auth/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  limitesDatasReservaSemanaCorrente,
  obterReservasDoServidor,
  reservaIncluiChromebookId,
  reservaIncluiEquipamentoNome,
  reservaIncluiEspacoNome,
  reservaChromebookIds,
  salvarReservasAgenda,
  reservasChromebookConflitam,
  toMinutes,
  toYmdLocal,
  rangesOverlap,
} from "@/lib/agendaCci";
import { apiUrl } from "@/lib/apiBase";

export default function ReservaEspacosEquipamentos() {
  const location = useLocation();
  const { usuario, googleIdToken } = useAuth();
  /** Papéis de faculdade/tecs: reserva de no máximo 1 Chromebook por vez. */
  const papelAluno = usuario?.papeis.includes("aluno") ?? false;
  const [titulo, setTitulo] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"chromebook" | "equipamento" | "espaco">("chromebook");
  const [data, setData] = useState<string>(() => toYmdLocal(new Date()));
  const [inicio, setInicio] = useState("08:00");
  const [fim, setFim] = useState("08:50");
  const [somenteHdmi, setSomenteHdmi] = useState(false);
  const [chromebooksSelecionados, setChromebooksSelecionados] = useState<string[]>([]);
  const [equipamentoNome, setEquipamentoNome] = useState(EQUIPAMENTOS_CATALOGO[0].nome);
  const [equipamentoQuantidade, setEquipamentoQuantidade] = useState(0);
  const [espacoNome, setEspacoNome] = useState("");
  const [observacao, setObservacao] = useState("");
  const [checklistEventoHabilitado, setChecklistEventoHabilitado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [reservas, setReservas] = useState<ReservaAgendaCCI[]>(() => carregarReservasAgenda());
  const [chromebooksCatalogo, setChromebooksCatalogo] = useState<ChromebookAgendaItem[]>(
    CHROMEBOOKS_CATALOGO_FALLBACK,
  );
  const [carregandoChromebooks, setCarregandoChromebooks] = useState(false);
  const [avisoChromebooks, setAvisoChromebooks] = useState<string | null>(null);

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

  const maxEquipamentoDisponivel = useMemo(() => {
    const def = EQUIPAMENTOS_CATALOGO.find((e) => e.nome === equipamentoNome);
    if (!def) return 1;
    const reservadoNoHorario = reservasAtivas
      .filter((r) => r.data === data && reservaIncluiEquipamentoNome(r, equipamentoNome))
      .filter((r) => rangesOverlap(inicio, fim, r.inicio, r.fim))
      .reduce((acc, r) => acc + (r.equipamentoQuantidade ?? 0), 0);
    return Math.max(0, def.total - reservadoNoHorario);
  }, [data, equipamentoNome, fim, inicio, reservasAtivas]);

  const espacosDisponiveis = useMemo(() => {
    return ESPACOS_CATALOGO.filter((esp) => {
      const conflita = reservasAtivas.some((r) => {
        if (r.data !== data) return false;
        if (!reservaIncluiEspacoNome(r, esp)) return false;
        return rangesOverlap(inicio, fim, r.inicio, r.fim);
      });
      return !conflita;
    });
  }, [data, fim, inicio, reservasAtivas]);

  const minhasReservas = useMemo(() => {
    if (!usuario) return [];
    return reservas
      .filter((r) => r.solicitanteEmail === usuario.email)
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [reservas, usuario]);

  /** Aluno: no máximo uma reserva ativa de Chromebook no total (não só por agendamento). */
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

  /** Papel aluno: só aba Chromebooks. */
  useEffect(() => {
    if (!usuario?.papeis.includes("aluno")) return;
    setAbaAtiva("chromebook");
    setEspacoNome("");
    setMensagem(null);
  }, [usuario]);

  function resetAposSucesso() {
    setTitulo("");
    setChromebooksSelecionados([]);
    setEquipamentoQuantidade(0);
    setEspacoNome("");
    setObservacao("");
    setChecklistEventoHabilitado(false);
  }

  function criarReserva() {
    setMensagem(null);
    if (!usuario) {
      setMensagem("Faça login para reservar.");
      return;
    }
    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) {
      setMensagem("Informe um título para a reserva.");
      return;
    }
    if (!data || !inicio || !fim || toMinutes(fim) <= toMinutes(inicio)) {
      setMensagem("Informe data e horário válidos.");
      return;
    }

    if (!dataReservaDentroDaSemanaPermitida(data)) {
      setMensagem(
        "Só é possível reservar até o sábado da semana corrente. A próxima semana (domingo a sábado) fica disponível a partir do próximo domingo.",
      );
      return;
    }

    const temChromebooks = chromebooksSelecionados.length > 0;
    const temEspaco = Boolean(espacoNome.trim());
    const temEquipamento = equipamentoQuantidade > 0;

    if (papelAluno && (temEspaco || temEquipamento)) {
      setMensagem("Contas com papel aluno só podem reservar Chromebooks.");
      return;
    }

    if (!temChromebooks && !temEspaco && !temEquipamento) {
      setMensagem("Inclua ao menos um Chromebook, um equipamento ou um espaço (use as abas).");
      return;
    }

    if (papelAluno) {
      const jaTemOutraAtiva = reservas.some(
        (r) =>
          r.status === "ativa" &&
          r.solicitanteEmail === usuario.email &&
          reservaChromebookIds(r).length > 0,
      );
      if (jaTemOutraAtiva) {
        setMensagem(
          "Você já possui uma reserva ativa de Chromebook. Cancele-a em Minhas reservas antes de criar outra.",
        );
        return;
      }
    }

    if (temChromebooks && papelAluno && chromebooksSelecionados.length > 1) {
      setMensagem(
        "Contas de aluno podem reservar apenas um Chromebook (e uma reserva ativa por vez).",
      );
      return;
    }
    if (temEquipamento) {
      if (equipamentoQuantidade > maxEquipamentoDisponivel) {
        setMensagem(`Só há ${maxEquipamentoDisponivel} unidade(s) disponível(is) nesse horário.`);
        return;
      }
    }
    if (temEspaco && !espacosDisponiveis.includes(espacoNome)) {
      setMensagem("Este espaço não está disponível nesse horário.");
      return;
    }

    const linhasHdmi = chromebooksSelecionados
      .map((deviceId) => {
        const cb = chromebooksCatalogo.find((x) => x.id === deviceId);
        const recursoId = cb?.annotatedAssetId ?? cb?.id ?? deviceId;
        return cb?.hasHdmi ? `${recursoId}: COM HDMI` : `${recursoId}: SEM HDMI`;
      })
      .filter((s): s is string => Boolean(s));

    const partesObs = [linhasHdmi.length ? linhasHdmi.join("\n") : undefined, observacao.trim() || undefined].filter(
      Boolean,
    ) as string[];
    const observacaoFinal = partesObs.length ? partesObs.join("\n\n") : undefined;

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
      equipamentoNome: temEquipamento ? equipamentoNome : undefined,
      equipamentoQuantidade: temEquipamento ? equipamentoQuantidade : undefined,
      espacoNome: temEspaco ? espacoNome.trim() : undefined,
      observacao: observacaoFinal,
      checklistEventoHabilitado,
      status: "ativa",
      criadoEm: new Date().toISOString(),
    };

    const next = [nova, ...reservas];
    setReservas(next);
    salvarReservasAgenda(next, googleIdToken);
    setMensagem("Reserva criada com sucesso.");
    resetAposSucesso();
  }

  function cancelarReserva(id: string) {
    const next = reservas.map((r) => (r.id === id ? { ...r, status: "cancelada" as const } : r));
    setReservas(next);
    salvarReservasAgenda(next, googleIdToken);
  }

  const resumoLinhas = useMemo(() => {
    const lines: string[] = [];
    if (titulo.trim()) lines.push(`Título: ${titulo.trim()}`);
    if (chromebooksSelecionados.length > 0) {
      lines.push(`Chromebooks: ${chromebooksSelecionados.length} selecionado(s)`);
    }
    if (equipamentoQuantidade > 0) {
      lines.push(`Equipamento: ${equipamentoNome} × ${equipamentoQuantidade}`);
    }
    if (espacoNome.trim()) {
      lines.push(`Espaço: ${espacoNome.trim()}`);
    }
    if (checklistEventoHabilitado) {
      lines.push("Checklist para o evento: sim — Em desenvolvimento");
    }
    return lines;
  }, [
    titulo,
    chromebooksSelecionados.length,
    equipamentoNome,
    equipamentoQuantidade,
    espacoNome,
    checklistEventoHabilitado,
  ]);

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

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 md:px-8 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-6 shadow-card xl:col-span-2">
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
          </p>

          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Switch
                  id="checklist-evento"
                  checked={checklistEventoHabilitado}
                  onCheckedChange={setChecklistEventoHabilitado}
                />
                <Label htmlFor="checklist-evento" className="cursor-pointer text-sm font-medium text-card-foreground">
                  Checklist para o Evento
                </Label>
                <Badge
                  className="shrink-0 border-amber-500/60 bg-amber-500/20 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow-sm dark:border-amber-400/50 dark:bg-amber-500/25 dark:text-amber-100"
                  aria-label="Funcionalidade em desenvolvimento"
                >
                  Em desenvolvimento
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground sm:pl-11">
                Marque se este evento deve ter um checklist de tarefas para a equipe. A preferência fica salva na
                reserva.
              </p>
            </div>
          </div>

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
                        className={`relative flex min-h-[3.5rem] flex-col items-start gap-1 rounded-lg border-2 px-3 py-2.5 pr-10 text-left text-xs font-medium transition-shadow ${
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
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {cb.annotatedAssetId ?? cb.id}
                        </span>

                        <span
                          className={`mt-1 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            cb.hasHdmi
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {cb.hasHdmi ? "COM HDMI" : "SEM HDMI"}
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
                <TabsContent value="equipamento" className="mt-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block text-muted-foreground">Equipamento</span>
                      <select
                        value={equipamentoNome}
                        onChange={(e) => setEquipamentoNome(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2"
                      >
                        {EQUIPAMENTOS_CATALOGO.map((e) => (
                          <option key={e.nome} value={e.nome}>
                            {e.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-muted-foreground">
                        Quantidade (disponível: {maxEquipamentoDisponivel})
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={equipamentoQuantidade}
                        onChange={(e) => setEquipamentoQuantidade(Number(e.target.value || "0"))}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2"
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Use quantidade 0 se não quiser incluir equipamento nesta reserva.
                  </p>
                </TabsContent>

                <TabsContent value="espaco" className="mt-4">
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

          {mensagem && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm text-card-foreground">
              {mensagem}
            </div>
          )}

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={criarReserva}
              disabled={!usuario || alunoJaTemReservaAtivaChromebook}
              className="rounded-lg gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirmar reserva
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Minhas Reservas</h2>
          </div>
          <div className="space-y-3">
            {minhasReservas.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Você ainda não possui reservas.
              </div>
            )}
            {minhasReservas.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-background p-3">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {r.tipo === "composta"
                      ? "Reserva composta"
                      : r.tipo === "chromebook"
                        ? "Chromebooks"
                        : r.tipo === "equipamento"
                          ? "Equipamento"
                          : "Espaço"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      r.status === "ativa"
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                {r.titulo && (
                  <p className="text-sm font-medium text-card-foreground">{r.titulo}</p>
                )}
                <p className="text-sm text-card-foreground">
                  {r.data} • {r.inicio} às {r.fim}
                </p>
                {r.tipo === "composta" && (
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    {(r.chromebookIds?.length ?? 0) > 0 && (
                      <p>
                        Chromebooks ({r.chromebookIds?.length}): {(r.chromebookIds ?? []).join(", ")}
                      </p>
                    )}
                    {r.equipamentoNome && r.equipamentoQuantidade ? (
                      <p>
                        {r.equipamentoNome} × {r.equipamentoQuantidade}
                      </p>
                    ) : null}
                    {r.espacoNome ? <p>Espaço: {r.espacoNome}</p> : null}
                    {r.checklistEventoHabilitado ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">Checklist para o evento: habilitado</span>
                        <Badge
                          className="border-amber-500/60 bg-amber-500/20 text-[10px] font-bold uppercase tracking-wide text-amber-950 dark:border-amber-400/50 dark:bg-amber-500/25 dark:text-amber-100"
                          aria-hidden
                        >
                          Em desenvolvimento
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                )}
                {r.tipo === "chromebook" && (
                  <p className="text-xs text-muted-foreground">
                    {r.chromebookIds?.length ?? 0} unidade(s): {(r.chromebookIds ?? []).join(", ")}
                  </p>
                )}
                {r.tipo === "equipamento" && (
                  <p className="text-xs text-muted-foreground">
                    {r.equipamentoNome} • {r.equipamentoQuantidade} unidade(s)
                  </p>
                )}
                {r.tipo === "espaco" && (
                  <p className="text-xs text-muted-foreground">{r.espacoNome}</p>
                )}
                {r.status === "ativa" && (
                  <button
                    type="button"
                    onClick={() => cancelarReserva(r.id)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancelar reserva
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
