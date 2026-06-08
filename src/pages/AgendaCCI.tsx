import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Laptop,
  Layers,
  MapPin,
  Package,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  FileText,
  User,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { PageHero, PageHeroEyebrow } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReservaAgendaCCI, TipoReservaAgenda } from "@/lib/agendaCci";
import {
  STORAGE_KEY_AGENDA_CCI,
  carregarReservasAgenda,
  formatarYmdParaBR,
  limitesDatasReservaSemanaCorrente,
  limitesSemanaDomingoSabado,
  obterReservasDoServidor,
  obterEventosGoogleCalendar,
  textoResumoAgenda,
  toMinutes,
  toYmdLocal,
  listaEquipamentosReserva,
} from "@/lib/agendaCci";

/** Dias do período liberado para reservas (hoje até sábado da semana corrente). */
function diasPeriodoReserva(agora = new Date()): string[] {
  const { min, max } = limitesDatasReservaSemanaCorrente(agora);
  const [y1, m1, d1] = min.split("-").map(Number);
  const [y2, m2, d2] = max.split("-").map(Number);
  const out: string[] = [];
  const cur = new Date(y1, m1 - 1, d1);
  const fim = new Date(y2, m2 - 1, d2);
  while (cur <= fim) {
    out.push(toYmdLocal(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function tituloDia(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const base = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
  return base.charAt(0).toUpperCase() + base.slice(1);
}

interface ItemAgendaUnificado {
  id: string;
  origem: "local" | "google";
  tipo: TipoReservaAgenda | "google_event";
  titulo?: string;
  data: string;
  inicio: string;
  fim: string;
  solicitanteNome: string;
  solicitanteEmail: string;
  resumo: string;
  isAllDay?: boolean;
  location?: string;
  description?: string;
  attendees?: any[];
  organizer?: any;
  chromebookIds?: string[];
  equipamentos?: { nome: string; quantidade: number }[];
  calendarId?: string;
}

const SALAS_CALENDAR_ID = "cciweb.com.br_78jjv15nj0fogh0tlsnucp3v5c@group.calendar.google.com";

function isSalasCalendar(calId?: string, organizerEmail?: string): boolean {
  const normCalId = calId?.toLowerCase().trim();
  const normOrgEmail = organizerEmail?.toLowerCase().trim();
  return normCalId === SALAS_CALENDAR_ID || normOrgEmail === SALAS_CALENDAR_ID;
}

function isSalasRecurso(item: ItemAgendaUnificado): boolean {
  if (item.origem === "local") return true;
  return isSalasCalendar(item.calendarId, item.solicitanteEmail);
}

function obterDiasNoPeriodo(startStr: string, endStr: string): string[] {
  if (!startStr || !endStr || startStr > endStr) return [];
  const [y1, m1, d1] = startStr.split("-").map(Number);
  const [y2, m2, d2] = endStr.split("-").map(Number);
  
  const cur = new Date(y1, m1 - 1, d1);
  const fim = new Date(y2, m2 - 1, d2);
  
  const out: string[] = [];
  let count = 0;
  while (cur <= fim && count < 90) {
    out.push(toYmdLocal(cur));
    cur.setDate(cur.getDate() + 1);
    count++;
  }
  return out;
}

export default function AgendaCCI() {
  const location = useLocation();
  const { usuario, googleIdToken } = useAuth();
  const [reservas, setReservas] = useState<ReservaAgendaCCI[]>(() => carregarReservasAgenda());
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [filtroAgenda, setFiltroAgenda] = useState<"todos" | "agenda_cci" | "salas_labs">("todos");
  
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const hoje = new Date();
    return toYmdLocal(hoje);
  });
  const [dataFim, setDataFim] = useState<string>(() => {
    const { sabado } = limitesSemanaDomingoSabado(new Date());
    return toYmdLocal(sabado);
  });

  // Estado para controle do modal
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<ItemAgendaUnificado | null>(null);

  // 1. Buscar reservas locais
  useEffect(() => {
    if (!googleIdToken || !usuario || location.pathname !== "/agenda-cci") return;
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

  // 2. Buscar eventos do Google Calendar ao mudar o período
  useEffect(() => {
    if (!googleIdToken || !usuario || location.pathname !== "/agenda-cci") return;
    if (!dataInicio || !dataFim || dataInicio > dataFim) return;
    let cancelado = false;
    
    (async () => {
      const tMin = `${dataInicio}T00:00:00Z`;
      const tMax = `${dataFim}T23:59:59Z`;
      const evs = await obterEventosGoogleCalendar(googleIdToken, tMin, tMax);
      if (cancelado || !evs) return;
      setGoogleEvents(evs);
    })();

    return () => {
      cancelado = true;
    };
  }, [googleIdToken, usuario, location.pathname, dataInicio, dataFim]);

  const aplicarPreset = (tipo: "hoje" | "semana_corrente" | "proxima_semana" | "mes_corrente") => {
    const hoje = new Date();
    if (tipo === "hoje") {
      const hojeStr = toYmdLocal(hoje);
      setDataInicio(hojeStr);
      setDataFim(hojeStr);
    } else if (tipo === "semana_corrente") {
      const { min, max } = limitesDatasReservaSemanaCorrente(hoje);
      setDataInicio(min);
      setDataFim(max);
    } else if (tipo === "proxima_semana") {
      const { sabado } = limitesSemanaDomingoSabado(hoje);
      const proxDomingo = new Date(sabado);
      proxDomingo.setDate(sabado.getDate() + 1);
      const proxSabado = new Date(proxDomingo);
      proxSabado.setDate(proxDomingo.getDate() + 6);
      
      setDataInicio(toYmdLocal(proxDomingo));
      setDataFim(toYmdLocal(proxSabado));
    } else if (tipo === "mes_corrente") {
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      setDataInicio(toYmdLocal(primeiroDia));
      setDataFim(toYmdLocal(ultimoDia));
    }
  };

  const dias = useMemo(() => obterDiasNoPeriodo(dataInicio, dataFim), [dataInicio, dataFim]);

  const reservasAtivas = useMemo(
    () => reservas.filter((r) => r.status === "ativa"),
    [reservas],
  );

  const porDia = useMemo(() => {
    const map = new Map<string, ItemAgendaUnificado[]>();
    
    const parseLocalDate = (ymdStr: string) => {
      const [y, m, d] = ymdStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    const localGoogleEventIds = new Set(
      reservasAtivas
        .map((r) => r.googleEventId)
        .filter(Boolean)
    );

    for (const ymd of dias) {
      const dayDate = parseLocalDate(ymd);

      // 1. Mapeia reservas locais
      const locais: ItemAgendaUnificado[] = reservasAtivas
        .filter((r) => r.data === ymd)
        .map((r) => ({
          id: r.id,
          origem: "local",
          tipo: r.tipo,
          titulo: r.titulo,
          data: r.data,
          inicio: r.inicio,
          fim: r.fim,
          solicitanteNome: r.solicitanteNome,
          solicitanteEmail: r.solicitanteEmail,
          resumo: textoResumoAgenda(r),
          location: r.espacoNome,
          description: r.observacao,
          chromebookIds: r.chromebookIds,
          equipamentos: listaEquipamentosReserva(r),
        }));

      // 2. Mapeia eventos da Google Calendar
      const googles: ItemAgendaUnificado[] = googleEvents
        .filter((e) => {
          if (localGoogleEventIds.has(e.id)) return false;
          if (e.start.dateTime) {
            const evStart = new Date(e.start.dateTime);
            const evEnd = new Date(e.end.dateTime);
            const evStartDay = new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate());
            const evEndDay = new Date(evEnd.getFullYear(), evEnd.getMonth(), evEnd.getDate());
            return dayDate >= evStartDay && dayDate <= evEndDay;
          } else if (e.start.date && e.end.date) {
            const evStartDay = parseLocalDate(e.start.date);
            const evEndDay = parseLocalDate(e.end.date);
            return dayDate >= evStartDay && dayDate < evEndDay;
          }
          return false;
        })
        .map((e) => {
          const isAllDay = !!e.start.date;
          let inicio = "Dia inteiro";
          let fim = "Dia inteiro";
          if (!isAllDay && e.start.dateTime && e.end.dateTime) {
            const dIni = new Date(e.start.dateTime);
            const dFim = new Date(e.end.dateTime);
            inicio = `${String(dIni.getHours()).padStart(2, "0")}:${String(dIni.getMinutes()).padStart(2, "0")}`;
            fim = `${String(dFim.getHours()).padStart(2, "0")}:${String(dFim.getMinutes()).padStart(2, "0")}`;
          }
          return {
            id: e.id,
            origem: "google",
            tipo: "google_event",
            titulo: e.summary || "Sem título",
            data: ymd,
            inicio,
            fim,
            solicitanteNome: e.organizer?.displayName || e.organizer?.email || "Google Calendar",
            solicitanteEmail: e.organizer?.email || "",
            resumo: e.description || "Evento sincronizado com a agenda do Google.",
            location: e.location,
            description: e.description,
            attendees: e.attendees,
            organizer: e.organizer,
            isAllDay,
            calendarId: e.calendarId,
          };
        });

      // 3. Combina e ordena
      const combinados = [...locais, ...googles].sort((a, b) => {
        if (a.inicio === "Dia inteiro" && b.inicio !== "Dia inteiro") return -1;
        if (a.inicio !== "Dia inteiro" && b.inicio === "Dia inteiro") return 1;
        if (a.inicio === "Dia inteiro" && b.inicio === "Dia inteiro") return 0;
        return toMinutes(a.inicio) - toMinutes(b.inicio);
      });

      map.set(ymd, combinados);
    }
    return map;
  }, [dias, reservasAtivas, googleEvents]);

  const abrirDetalhe = (item: ItemAgendaUnificado) => {
    setItemSelecionado(item);
    setDetalheAberto(true);
  };

  return (
    <div className="animate-fade-in">
      <PageHero>
        <>
          <PageHeroEyebrow />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <CalendarDays className="h-5 w-5 text-amber-300" strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">Agenda CCI</h1>
                <p className="mt-2 max-w-2xl text-slate-300">
                  Visão da semana: eventos da Google Agenda e reservas ativas de Chromebooks, equipamentos e espaços.
                  Para criar ou cancelar uma reserva, use{" "}
                  <strong className="text-white font-semibold">Reserva de Equipamentos e Espaços</strong>.
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="secondary"
              className="shrink-0 border border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <Link to="/reserva-espacos-equipamentos">Ir para reservas</Link>
            </Button>
          </div>
        </>
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Painel de Controle de Filtros e Datas */}
        <div className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {/* Presets de Período */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Período Quick-select</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: "hoje", label: "Hoje" },
                  { id: "semana_corrente", label: "Esta Semana" },
                  { id: "proxima_semana", label: "Próxima Semana" },
                  { id: "mes_corrente", label: "Este Mês" }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => aplicarPreset(preset.id as any)}
                    className="rounded-md border border-border bg-muted/20 hover:bg-muted/60 px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro de Categoria de Evento */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtrar Agenda</span>
              <div className="flex rounded-lg border border-border bg-muted/40 p-1 shrink-0 w-fit">
                <button
                  onClick={() => setFiltroAgenda("todos")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    filtroAgenda === "todos"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroAgenda("agenda_cci")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    filtroAgenda === "agenda_cci"
                      ? "bg-background text-cyan-600 dark:text-cyan-400 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Agenda CCI
                </button>
                <button
                  onClick={() => setFiltroAgenda("salas_labs")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    filtroAgenda === "salas_labs"
                      ? "bg-background text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Salas, Labs e Equipamentos
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-border/60 w-full" />

          {/* Seleção Customizada de Data */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">De:</span>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Até:</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground sm:ml-auto">
              Período exibido: <strong>{formatarYmdParaBR(dataInicio)}</strong> a <strong>{formatarYmdParaBR(dataFim)}</strong> (Limite de 90 dias)
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {dias.map((ymd) => {
            const listaOriginal = porDia.get(ymd) ?? [];
            const lista = listaOriginal.filter((item) => {
              if (filtroAgenda === "agenda_cci") {
                return !isSalasRecurso(item);
              }
              if (filtroAgenda === "salas_labs") {
                return isSalasRecurso(item);
              }
              return true;
            });
            const hoje = toYmdLocal(new Date()) === ymd;
            return (
              <section key={ymd}>
                <h2
                  className={`mb-3 border-b border-border pb-2 text-lg font-semibold ${
                    hoje ? "text-primary" : "text-foreground"
                  }`}
                >
                  {tituloDia(ymd)}
                  {hoje && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">(hoje)</span>
                  )}
                </h2>
                {lista.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                    Nenhum evento ou reserva ativo neste dia.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {lista.map((r) => {
                      const isSalas = isSalasRecurso(r);
                      const corCard = r.origem === "local"
                        ? "border-border bg-card hover:border-primary/50"
                        : isSalas
                          ? "border-purple-200/50 bg-purple-500/5 dark:border-purple-500/20 dark:bg-purple-500/5 hover:border-purple-300 hover:bg-purple-500/10"
                          : "border-cyan-200/50 bg-cyan-500/5 dark:border-cyan-500/20 dark:bg-cyan-500/5 hover:border-cyan-300 hover:bg-cyan-500/10";
                      return (
                        <li
                          key={r.id}
                          onClick={() => abrirDetalhe(r)}
                          className={`flex flex-col gap-1 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:scale-[1.01] hover:shadow-md transition-all duration-200 ${corCard}`}
                        >
                          <div className="flex items-center gap-3">
                            {r.tipo === "composta" && (
                              <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            {r.tipo === "chromebook" && (
                              <Laptop className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            {r.tipo === "equipamento" && (
                              <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            {r.tipo === "espaco" && (
                              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            {r.tipo === "google_event" && (
                              <CalendarDays className={`h-4 w-4 shrink-0 ${isSalas ? "text-purple-500" : "text-cyan-500"}`} />
                            )}
                            <div>
                              {r.titulo && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-card-foreground">{r.titulo}</p>
                                  {r.origem === "google" && (
                                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                      isSalas
                                        ? "bg-purple-500/15 text-purple-700 dark:text-purple-400"
                                        : "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400"
                                    }`}>
                                      {isSalas ? "Salas, Labs e Equipamentos" : "Agenda CCI"}
                                    </span>
                                  )}
                                </div>
                              )}
                              <p className="font-medium text-card-foreground">
                                {r.inicio === "Dia inteiro" ? "Dia inteiro" : `${r.inicio} – ${r.fim}`}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-2 max-w-xl">{r.resumo}</p>
                            </div>
                          </div>
                          <div className="text-left text-sm text-muted-foreground sm:text-right shrink-0">
                            <p className="font-medium text-foreground">{r.solicitanteNome}</p>
                            {r.solicitanteEmail && (
                              <p className="text-xs text-muted-foreground">{r.solicitanteEmail}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {/* Modal de Detalhes do Evento / Reserva */}
      <Dialog open={detalheAberto} onOpenChange={setDetalheAberto}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto p-5 rounded-xl border border-border bg-card shadow-lg">
          {itemSelecionado && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {itemSelecionado.origem === "google" ? (
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      isSalasCalendar(itemSelecionado.calendarId, itemSelecionado.solicitanteEmail)
                        ? "bg-purple-500/15 text-purple-700 dark:text-purple-400"
                        : "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400"
                    }`}>
                      {isSalasCalendar(itemSelecionado.calendarId, itemSelecionado.solicitanteEmail)
                        ? "Google: Salas, Labs e Equipamentos"
                        : "Google: Agenda CCI"}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/15 text-primary">
                      Reserva Local
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    ID: {itemSelecionado.id.substring(0, 8)}...
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-card-foreground leading-tight break-words">
                  {itemSelecionado.titulo || "Sem título"}
                </DialogTitle>
                <div className="mt-1.5 text-xs text-muted-foreground font-medium flex flex-col gap-0.5">
                  <span>{tituloDia(itemSelecionado.data)} ({formatarYmdParaBR(itemSelecionado.data)})</span>
                  <span className="text-foreground font-semibold text-sm">
                    {itemSelecionado.inicio === "Dia inteiro" ? "Dia inteiro" : `${itemSelecionado.inicio} – ${itemSelecionado.fim}`}
                  </span>
                </div>
              </div>

              {/* Localização */}
              {itemSelecionado.location && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Local</h4>
                    <p className="text-sm text-foreground mt-0.5 break-words">{itemSelecionado.location}</p>
                  </div>
                </div>
              )}

              {/* Descrição */}
              {itemSelecionado.description && (
                <div className="flex items-start gap-2.5">
                  <FileText className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Descrição</h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap mt-0.5 leading-relaxed break-words">
                      {itemSelecionado.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Recursos de reserva local */}
              {itemSelecionado.origem === "local" && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recursos Reservados</h4>
                  
                  {itemSelecionado.chromebookIds && itemSelecionado.chromebookIds.length > 0 && (
                    <div className="flex items-start gap-2.5">
                      <Laptop className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {itemSelecionado.chromebookIds.length} Chromebooks
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 break-all">
                          {itemSelecionado.chromebookIds.join(", ")}
                        </p>
                      </div>
                    </div>
                  )}

                  {itemSelecionado.equipamentos && itemSelecionado.equipamentos.length > 0 && (
                    <div className="flex items-start gap-2.5">
                      <Package className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground mb-0.5">Equipamentos</p>
                        <ul className="text-sm text-foreground list-disc pl-5 space-y-0.5 break-words">
                          {itemSelecionado.equipamentos.map((eq, i) => (
                            <li key={i}>{eq.nome} × {eq.quantidade}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Convidados (Google Agenda) */}
              {itemSelecionado.origem === "google" && itemSelecionado.attendees && itemSelecionado.attendees.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4.5 w-4.5 text-muted-foreground" />
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {itemSelecionado.attendees.length} Convidado{itemSelecionado.attendees.length !== 1 ? "s" : ""}
                    </h4>
                  </div>
                  
                  <ul className="space-y-2">
                    {itemSelecionado.attendees.map((guest: any, i: number) => {
                      const isOrganizer = guest.organizer;
                      const status = guest.responseStatus;
                      return (
                        <li key={i} className="flex items-center justify-between gap-2 text-sm py-0.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                              {(guest.displayName || guest.email || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground break-all flex items-center gap-1 flex-wrap leading-none">
                                {guest.displayName || guest.email}
                                {isOrganizer && (
                                  <span className="text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1 py-0.2 rounded shrink-0">
                                    Organizador
                                  </span>
                                )}
                              </p>
                              {guest.displayName && <p className="text-[11px] text-muted-foreground break-all mt-0.5">{guest.email}</p>}
                            </div>
                          </div>
                          
                          <div className="shrink-0 pl-1">
                            {status === "accepted" && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" title="Confirmado" />
                            )}
                            {status === "declined" && (
                              <XCircle className="h-4 w-4 text-red-500" title="Recusado" />
                            )}
                            {(status === "needsAction" || status === "tentative" || !status) && (
                              <HelpCircle className="h-4 w-4 text-muted-foreground" title="Pendente / Talvez" />
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Solicitante / Organizador */}
              <div className="flex items-start gap-2.5 pt-3 border-t border-border">
                <User className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {itemSelecionado.origem === "google" ? "Organizador" : "Solicitante"}
                  </h4>
                  <p className="text-sm font-semibold text-foreground mt-0.5 break-all">
                    {itemSelecionado.solicitanteNome}
                  </p>
                  {itemSelecionado.solicitanteEmail && (
                    <p className="text-xs text-muted-foreground mt-0.5 break-all">{itemSelecionado.solicitanteEmail}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
