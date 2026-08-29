import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/auth/AuthProvider";
import {
  Sparkles,
  Calendar,
  Clock,
  User,
  Mail,
  Building,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  HeartHandshake,
  RefreshCw,
  AlertCircle,
  CalendarDays,
  Search,
  Filter,
  Trash2,
  Check,
  ChevronRight,
  Info,
  Settings,
  Edit3,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import {
  listarAgendamentos,
  criarAgendamento,
  cancelarAgendamento,
  obterConfigMassoterapia,
  salvarConfigMassoterapia,
  zerarTodosAgendamentos,
  gerarGradeHorariosPadrao,
  type AgendamentoMassoterapia,
  type ConfigMassoterapia,
} from "@/lib/massoterapia";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MassoterapiaPage() {
  const { usuario, googleIdToken } = useAuth();
  const papeis = usuario?.papeis ?? [];
  
  // Apenas a OU DP (ou admin global) pode ver e gerenciar a Gestão
  const isGestaoDP =
    papeis.includes("dp") ||
    papeis.includes("gerente_dp") ||
    papeis.includes("admin");

  // Configuração do Evento (não zera todo dia, fica vinculado à ação)
  const [configEvento, setConfigEvento] = useState<ConfigMassoterapia>({
    titulo: "Programa de Bem-Estar CCI",
    dataEventoTexto: "Data da ação a ser definida pelo DP",
    dataEventoYmd: "evento-atual",
    descricao:
      "Para que todos possam aproveitar a experiência de forma organizada, os atendimentos serão realizados mediante agendamento, com horários disponíveis a cada 15 minutos, das 9h00 às 18h00, com intervalo das 12h00 às 13h00.",
    ativo: true,
  });

  // Modal de configuração do DP
  const [modalConfigAberto, setModalConfigAberto] = useState<boolean>(false);
  const [editDataTexto, setEditDataTexto] = useState<string>("");
  const [editDescricao, setEditDescricao] = useState<string>("");
  const [salvandoConfig, setSalvandoConfig] = useState<boolean>(false);

  // Estado do formulário de inscrição
  const [nomeCompleto, setNomeCompleto] = useState<string>(usuario?.nome || "");
  const [email, setEmail] = useState<string>(usuario?.email || "");
  const [setor, setSetor] = useState<string>("");
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

  // Dados da API
  const [agendamentos, setAgendamentos] = useState<AgendamentoMassoterapia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  // Modais de confirmação
  const [modalSucessoAberto, setModalSucessoAberto] = useState<boolean>(false);
  const [agendamentoCriado, setAgendamentoCriado] = useState<AgendamentoMassoterapia | null>(null);
  const [itemParaCancelar, setItemParaCancelar] = useState<AgendamentoMassoterapia | null>(null);
  const [modalZerarAberto, setModalZerarAberto] = useState<boolean>(false);
  const [zerandoVagas, setZerandoVagas] = useState<boolean>(false);

  // Filtro na tabela de gestão
  const [termoBusca, setTermoBusca] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  // Atualiza nome/e-mail quando o usuário carregar
  useEffect(() => {
    if (usuario?.nome && !nomeCompleto) {
      setNomeCompleto(usuario.nome);
    }
    if (usuario?.email && !email) {
      setEmail(usuario.email);
    }
  }, [usuario]);

  // Carrega configuração do evento e agendamentos
  const carregarDados = async () => {
    setLoading(true);
    try {
      const [conf, lista] = await Promise.all([
        obterConfigMassoterapia(googleIdToken || undefined).catch(() => null),
        listarAgendamentos(undefined, googleIdToken || undefined),
      ]);

      if (conf) {
        setConfigEvento(conf);
        setEditDataTexto(conf.dataEventoTexto);
        setEditDescricao(conf.descricao);
      }
      setAgendamentos(lista);
    } catch (e) {
      toast.error("Não foi possível carregar os dados de massoterapia.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Grade de horários padrão (09:00 - 18:00, menos 12:00 - 13:00)
  const todosHorarios = useMemo(() => gerarGradeHorariosPadrao(), []);

  // Mapa de ocupação para o evento ativo
  const mapaOcupacao = useMemo(() => {
    const mapa = new Map<string, AgendamentoMassoterapia>();
    for (const ag of agendamentos) {
      if (ag.status === "agendado") {
        mapa.set(ag.horario, ag);
      }
    }
    return mapa;
  }, [agendamentos]);

  // Divisão em turnos (Manhã e Tarde)
  const horariosManha = useMemo(
    () => todosHorarios.filter((h) => parseInt(h.split(":")[0], 10) < 12),
    [todosHorarios],
  );

  const horariosTarde = useMemo(
    () => todosHorarios.filter((h) => parseInt(h.split(":")[0], 10) >= 13),
    [todosHorarios],
  );

  // Meus agendamentos ativos
  const meusAgendamentos = useMemo(() => {
    if (!usuario?.email) return [];
    return agendamentos.filter(
      (a) => a.email.toLowerCase() === usuario.email.toLowerCase() && a.status === "agendado",
    );
  }, [agendamentos, usuario?.email]);

  // Métricas para a gestão
  const totalSlots = todosHorarios.length;
  const slotsOcupados = mapaOcupacao.size;
  const slotsLivres = totalSlots - slotsOcupados;
  const taxaOcupacao = Math.round((slotsOcupados / totalSlots) * 100);

  // Submissão do agendamento
  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeCompleto.trim()) {
      toast.error("Por favor, preencha o Nome Completo.");
      return;
    }
    if (!email.trim()) {
      toast.error("Por favor, preencha o E-mail.");
      return;
    }
    if (!horarioSelecionado) {
      toast.error("Por favor, escolha um Horário de atendimento disponível.");
      return;
    }

    if (mapaOcupacao.has(horarioSelecionado)) {
      toast.error("Esse horário já foi reservado por outro participante.");
      return;
    }

    setSalvando(true);
    try {
      const criado = await criarAgendamento(
        {
          nomeCompleto: nomeCompleto.trim(),
          email: email.trim(),
          setor: setor.trim(),
          data: configEvento.dataEventoTexto || "Evento Atual",
          horario: horarioSelecionado,
          observacoes: observacoes.trim(),
        },
        googleIdToken || undefined,
      );

      setAgendamentoCriado(criado);
      setModalSucessoAberto(true);
      setHorarioSelecionado("");
      setObservacoes("");
      toast.success("Inscrição e agendamento realizados com sucesso!");
      await carregarDados();
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar agendamento.");
    } finally {
      setSalvando(false);
    }
  };

  // Salvar alterações de configuração feitas pelo DP
  const handleSalvarConfig = async () => {
    setSalvandoConfig(true);
    try {
      const atualizado = await salvarConfigMassoterapia(
        {
          dataEventoTexto: editDataTexto.trim() || "Data a ser definida pelo DP",
          descricao: editDescricao.trim() || configEvento.descricao,
        },
        googleIdToken || undefined,
      );
      setConfigEvento(atualizado);
      setModalConfigAberto(false);
      toast.success("Informações do evento atualizadas com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar configuração.");
    } finally {
      setSalvandoConfig(false);
    }
  };

  // Cancelamento
  const handleConfirmarCancelamento = async () => {
    if (!itemParaCancelar) return;

    setCancelandoId(itemParaCancelar.id);
    try {
      await cancelarAgendamento(itemParaCancelar.id, googleIdToken || undefined);
      toast.success(`Agendamento das ${itemParaCancelar.horario} cancelado com sucesso.`);
      setItemParaCancelar(null);
      await carregarDados();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar agendamento.");
    } finally {
      setCancelandoId(null);
    }
  };

  // Zerar/Limpar todas as vagas para iniciar nova ação
  const handleConfirmarZerar = async () => {
    setZerandoVagas(true);
    try {
      await zerarTodosAgendamentos(googleIdToken || undefined);
      toast.success("Todos os horários foram liberados para a nova ação!");
      setModalZerarAberto(false);
      await carregarDados();
    } catch (err: any) {
      toast.error(err.message || "Erro ao zerar agendamentos.");
    } finally {
      setZerandoVagas(false);
    }
  };

  // Exportar Excel
  const handleExportarExcel = () => {
    if (agendamentos.length === 0) {
      toast.error("Nenhum agendamento para exportar.");
      return;
    }

    const dadosExportar = agendamentos.map((item) => ({
      Horário: item.horario,
      "Data do Evento": configEvento.dataEventoTexto,
      "Nome Completo": item.nomeCompleto,
      "E-mail": item.email,
      Setor: item.setor || "-",
      Status: item.status.toUpperCase(),
      Observações: item.observacoes || "-",
      "Inscrito Em": item.criadoEm ? new Date(item.criadoEm).toLocaleString("pt-BR") : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inscricoes_Massoterapia");
    XLSX.writeFile(wb, `Massoterapia_Inscricoes_CCI.xlsx`);
    toast.success("Arquivo Excel baixado com sucesso!");
  };

  // Lista filtrada para o painel de gestão
  const listaFiltradaGestao = useMemo(() => {
    return agendamentos.filter((item) => {
      const matchBusca =
        !termoBusca ||
        item.nomeCompleto.toLowerCase().includes(termoBusca.toLowerCase()) ||
        item.email.toLowerCase().includes(termoBusca.toLowerCase()) ||
        (item.setor && item.setor.toLowerCase().includes(termoBusca.toLowerCase()));

      const matchStatus = filtroStatus === "todos" || item.status === filtroStatus;

      return matchBusca && matchStatus;
    });
  }, [agendamentos, termoBusca, filtroStatus]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8">
      {/* HEADER ELEGANTE ESTILO FORMULÁRIO BEM-ESTAR CCI */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        {/* Faixa decorativa superior */}
        <div className="h-3.5 w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500" />

        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
                  <HeartHandshake className="h-3.5 w-3.5" />
                  Programa de Bem-Estar CCI
                </div>

                {/* Badge da Data do Evento */}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{configEvento.dataEventoTexto}</span>
                </div>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                💆 Massoterapia e Massagem Relaxante
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {configEvento.descricao}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start">
              {isGestaoDP && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalConfigAberto(true)}
                  className="gap-1.5 text-xs border-teal-500/30 text-teal-600 hover:bg-teal-500/10 dark:text-teal-400"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Definir Data da Ação
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={carregarDados}
                disabled={loading}
                className="gap-2 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Notificação de usuário autenticado */}
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-muted bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
            <p>
              Inscrição vinculada à conta:{" "}
              <strong className="text-foreground">{usuario?.email || "Visitante"}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ABAS: FORMULÁRIO / MEUS AGENDAMENTOS / PAINEL GESTÃO DP */}
      <Tabs defaultValue="formulario" className="space-y-6">
        <TabsList className={`grid w-full ${isGestaoDP ? "grid-cols-3" : "grid-cols-2"} sm:w-auto`}>
          <TabsTrigger value="formulario" className="gap-2 text-xs md:text-sm">
            <Calendar className="h-4 w-4" />
            Agendar Horário
          </TabsTrigger>
          <TabsTrigger value="meus-agendamentos" className="gap-2 text-xs md:text-sm">
            <Clock className="h-4 w-4" />
            Meus Agendamentos
            {meusAgendamentos.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {meusAgendamentos.length}
              </Badge>
            )}
          </TabsTrigger>
          {isGestaoDP && (
            <TabsTrigger value="gestao" className="gap-2 text-xs md:text-sm">
              <FileSpreadsheet className="h-4 w-4" />
              Painel de Gestão (DP)
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── ABA 1: FORMULÁRIO DE INSCRIÇÃO ────────────────────────────────────── */}
        <TabsContent value="formulario" className="space-y-6">
          <form onSubmit={handleAgendar} className="space-y-6">
            {/* Bloco 1: Informações do Participante */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                1. Informações do Participante
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="text-xs font-medium">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nome"
                    required
                    placeholder="Seu nome completo"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">
                    E-mail Institucional <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="seu.email@portalcci.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                  <Label htmlFor="setor" className="text-xs font-medium">
                    Setor / Função (Opcional)
                  </Label>
                  <Input
                    id="setor"
                    placeholder="Ex: TI, Secretaria, Biblioteca..."
                    value={setor}
                    onChange={(e) => setSetor(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Seleção de Horário */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    2. Escolha seu horário de atendimento{" "}
                    <span className="text-destructive">*</span>
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sessões individuais de 15 minutos com o massoterapeuta.
                  </p>
                </div>

                {/* Legenda */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Livre ({slotsLivres})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="text-muted-foreground">Ocupado ({slotsOcupados})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Selecionado</span>
                  </div>
                </div>
              </div>

              {/* Turno da Manhã */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Turno da Manhã (09:00 às 11:45)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                  {horariosManha.map((h) => {
                    const ocupado = mapaOcupacao.has(h);
                    const selecionado = horarioSelecionado === h;

                    return (
                      <button
                        key={h}
                        type="button"
                        disabled={ocupado}
                        onClick={() => setHorarioSelecionado(h)}
                        className={`group relative flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                          selecionado
                            ? "border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                            : ocupado
                              ? "cursor-not-allowed border-dashed border-border/60 bg-muted/40 text-muted-foreground/50 opacity-60"
                              : "border-border/80 bg-background/50 hover:border-teal-500/50 hover:bg-teal-500/5 hover:shadow-sm"
                        }`}
                      >
                        <span className="text-sm font-bold tracking-tight">{h}</span>
                        <span className="mt-1 text-[10px] uppercase font-medium">
                          {selecionado ? "Escolhido" : ocupado ? "Ocupado" : "Disponível"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Intervalo de Almoço */}
              <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 py-2.5 text-xs text-amber-600 dark:text-amber-400">
                <Info className="h-4 w-4 shrink-0" />
                <span>Intervalo de almoço da equipe: das 12h00 às 13h00</span>
              </div>

              {/* Turno da Tarde */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Turno da Tarde (13:00 às 17:45)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                  {horariosTarde.map((h) => {
                    const ocupado = mapaOcupacao.has(h);
                    const selecionado = horarioSelecionado === h;

                    return (
                      <button
                        key={h}
                        type="button"
                        disabled={ocupado}
                        onClick={() => setHorarioSelecionado(h)}
                        className={`group relative flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                          selecionado
                            ? "border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                            : ocupado
                              ? "cursor-not-allowed border-dashed border-border/60 bg-muted/40 text-muted-foreground/50 opacity-60"
                              : "border-border/80 bg-background/50 hover:border-teal-500/50 hover:bg-teal-500/5 hover:shadow-sm"
                        }`}
                      >
                        <span className="text-sm font-bold tracking-tight">{h}</span>
                        <span className="mt-1 text-[10px] uppercase font-medium">
                          {selecionado ? "Escolhido" : ocupado ? "Ocupado" : "Disponível"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bloco 3: Observações e Confirmação */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="obs" className="text-xs font-medium">
                  Observações ou foco desejado (Opcional)
                </Label>
                <Textarea
                  id="obs"
                  rows={2}
                  placeholder="Ex: Tensão nos ombros e pescoço, foco em relaxamento lombar..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {horarioSelecionado ? (
                    <span className="text-foreground font-medium">
                      Horário selecionado: <strong>{horarioSelecionado}</strong> ({configEvento.dataEventoTexto})
                    </span>
                  ) : (
                    "Selecione um horário disponível acima para habilitar o agendamento."
                  )}
                </p>

                <Button
                  type="submit"
                  disabled={salvando || !horarioSelecionado}
                  className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 sm:w-auto"
                >
                  {salvando ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {salvando ? "Gravando Agendamento..." : "Confirmar Agendamento"}
                </Button>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* ── ABA 2: MEUS AGENDAMENTOS ────────────────────────────────────────── */}
        <TabsContent value="meus-agendamentos" className="space-y-4">
          {meusAgendamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CalendarDays className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                Nenhum agendamento ativo
              </h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Você ainda não possui horários marcados para esta ação ({configEvento.dataEventoTexto}).
                Selecione um horário na aba anterior para agendar sua massagem.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {meusAgendamentos.map((ag) => (
                <div
                  key={ag.id}
                  className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:border-teal-500/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400">
                          Confirmado
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {configEvento.dataEventoTexto}
                        </span>
                      </div>
                      <h4 className="text-xl font-bold text-foreground">
                        {ag.horario} <span className="text-xs font-normal text-muted-foreground">(15 min)</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Participante: <strong className="text-foreground">{ag.nomeCompleto}</strong>
                      </p>
                      {ag.observacoes && (
                        <p className="text-xs text-muted-foreground italic">
                          "{ag.observacoes}"
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setItemParaCancelar(ag)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Cancelar meu agendamento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ABA 3: PAINEL DE GESTÃO (EXCLUSIVO DP / ADMIN) ────────────────────── */}
        {isGestaoDP && (
          <TabsContent value="gestao" className="space-y-6">
            {/* Cards de Métricas */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">Total de Vagas</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{totalSlots}</p>
                <p className="text-[10px] text-muted-foreground">Slots de 15 minutos</p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">Inscritos / Ocupados</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {slotsOcupados}
                </p>
                <p className="text-[10px] text-muted-foreground">Agendamentos confirmados</p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">Vagas Livres</p>
                <p className="mt-1 text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {slotsLivres}
                </p>
                <p className="text-[10px] text-muted-foreground">Disponíveis para reserva</p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">Taxa de Adesão</p>
                <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {taxaOcupacao}%
                </p>
                <p className="text-[10px] text-muted-foreground">Ocupação do evento</p>
              </div>
            </div>

            {/* Barra de Ações e Filtros */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar participante, e-mail ou setor..."
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>

                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="agendado">Apenas Agendados</option>
                  <option value="cancelado">Cancelados</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalConfigAberto(true)}
                  className="gap-1.5 text-xs"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Configurar Ação
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportarExcel}
                  className="gap-2 text-xs"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Exportar Excel (.xlsx)
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalZerarAberto(true)}
                  className="gap-1.5 text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Zerar / Nova Ação
                </Button>
              </div>
            </div>

            {/* Tabela de Agendamentos */}
            <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-semibold">Horário</th>
                    <th className="p-3 font-semibold">Participante</th>
                    <th className="p-3 font-semibold">E-mail</th>
                    <th className="p-3 font-semibold">Setor</th>
                    <th className="p-3 font-semibold">Observações</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {listaFiltradaGestao.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Nenhum agendamento registrado até o momento.
                      </td>
                    </tr>
                  ) : (
                    listaFiltradaGestao.map((item) => (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="p-3 font-bold text-foreground">{item.horario}</td>
                        <td className="p-3 font-medium text-foreground">{item.nomeCompleto}</td>
                        <td className="p-3 text-muted-foreground">{item.email}</td>
                        <td className="p-3 text-muted-foreground">{item.setor || "-"}</td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">
                          {item.observacoes || "-"}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={item.status === "agendado" ? "default" : "secondary"}
                            className={
                              item.status === "agendado"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {item.status === "agendado" ? "Confirmado" : "Cancelado"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          {item.status === "agendado" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setItemParaCancelar(item)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              title="Liberar/Cancelar vaga"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* MODAL DP: CONFIGURAR DATA E DETALHES DO EVENTO */}
      <Dialog open={modalConfigAberto} onOpenChange={setModalConfigAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Configurar Data da Ação de Massoterapia
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina a data ou descrição do dia do atendimento. Os agendamentos realizados não serão apagados ao virar o dia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="data-texto" className="font-semibold">
                Texto / Data da Ação:
              </Label>
              <Input
                id="data-texto"
                placeholder="Ex.: Sexta-feira, 18/09 ou A definir pelo DP"
                value={editDataTexto}
                onChange={(e) => setEditDataTexto(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Exibido no cabeçalho do formulário e no comprovante de todos os inscritos.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc-texto" className="font-semibold">
                Instruções / Descrição:
              </Label>
              <Textarea
                id="desc-texto"
                rows={3}
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalConfigAberto(false)}
              disabled={salvandoConfig}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarConfig}
              disabled={salvandoConfig}
              className="gap-1.5 bg-teal-600 text-white hover:bg-teal-700"
            >
              {salvandoConfig ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE SUCESSO */}
      <Dialog open={modalSucessoAberto} onOpenChange={setModalSucessoAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Agendamento Confirmado!
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Sua sessão de massoterapia e relaxamento foi agendada com sucesso.
            </DialogDescription>
          </DialogHeader>

          {agendamentoCriado && (
            <div className="space-y-2 rounded-xl border border-border/80 bg-muted/40 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Participante:</span>
                <span className="font-semibold text-foreground">
                  {agendamentoCriado.nomeCompleto}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ação / Data:</span>
                <span className="font-semibold text-foreground">
                  {configEvento.dataEventoTexto}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horário Marcado:</span>
                <span className="font-semibold text-teal-600 dark:text-teal-400">
                  {agendamentoCriado.horario} (15 minutos)
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setModalSucessoAberto(false)}
              className="w-full bg-teal-600 text-white hover:bg-teal-700 sm:w-auto"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      <Dialog
        open={!!itemParaCancelar}
        onOpenChange={(open) => !open && setItemParaCancelar(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Cancelar Agendamento?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza que deseja cancelar o agendamento das{" "}
              <strong>{itemParaCancelar?.horario}</strong> ({itemParaCancelar?.nomeCompleto})? Essa vaga
              ficará livre para outro colaborador.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItemParaCancelar(null)}
              disabled={!!cancelandoId}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmarCancelamento}
              disabled={!!cancelandoId}
              className="gap-1.5"
            >
              {cancelandoId ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DP: CONFIRMAÇÃO PARA ZERAR E INICIAR NOVA AÇÃO */}
      <Dialog open={modalZerarAberto} onOpenChange={setModalZerarAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-base font-bold">
              Zerar Agendamentos e Iniciar Nova Ação?
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Esta ação liberará todos os <strong>32 horários de 15 minutos</strong> para que os colaboradores possam realizar novas inscrições.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs space-y-2">
            <p className="font-semibold text-foreground">💡 Dica de segurança:</p>
            <p className="text-muted-foreground">
              Você pode clicar em <strong>Exportar Excel</strong> antes de zerar para manter o registro histórico de quem participou da edição anterior.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportarExcel}
              className="gap-1.5 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Baixar Backup Excel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmarZerar}
              disabled={zerandoVagas}
              className="gap-1.5"
            >
              {zerandoVagas ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Confirmar e Zerar Vagas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

