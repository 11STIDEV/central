import { apiUrl } from "@/lib/apiBase";

/** Modelo e persistência da Agenda CCI (reservas no navegador). */

export type TipoReservaAgenda = "chromebook" | "equipamento" | "espaco" | "composta";
export type StatusReservaAgenda = "ativa" | "cancelada";

/** Linha de equipamento em reservas compostas (vários tipos na mesma reserva). */
export type ItemEquipamentoReserva = { nome: string; quantidade: number };

/** Status derivado para exibição (agenda / admin), com base na data/hora local. */
export type StatusExibicaoReserva = "pendente" | "ativa" | "concluída" | "cancelada";

export type ReservaAgendaCCI = {
  id: string;
  tipo: TipoReservaAgenda;
  /** Obrigatório em reservas novas (`composta`); legados podem não ter. */
  titulo?: string;
  data: string;
  inicio: string;
  fim: string;
  solicitanteEmail: string;
  solicitanteNome: string;
  chromebookIds?: string[];
  /**
   * Etiqueta do ativo no Admin (ex.: ID do campo personalizado / annotated asset id) + HDMI.
   * Usado na tela admin para entrega; não exibir ao professor nas telas de reserva.
   */
  chromebooksEntrega?: { etiqueta: string; hasHdmi: boolean }[];
  /** Vários equipamentos na mesma reserva (preferencial em reservas novas). */
  equipamentos?: ItemEquipamentoReserva[];
  equipamentoNome?: string;
  equipamentoQuantidade?: number;
  espacoNome?: string;
  observacao?: string;
  /** Reservas compostas: intenção de usar checklist do evento (funcionalidade futura). */
  checklistEventoHabilitado?: boolean;
  status: StatusReservaAgenda;
  criadoEm: string;
};

/** Chromebooks vinculados (tipo `chromebook` ou `composta`). */
export function reservaChromebookIds(r: ReservaAgendaCCI): string[] {
  if (r.tipo !== "chromebook" && r.tipo !== "composta") return [];
  return r.chromebookIds ?? [];
}

/** Nome do espaço se a reserva ocupa um espaço. */
export function reservaEspacoNome(r: ReservaAgendaCCI): string | undefined {
  if (r.tipo === "espaco") return r.espacoNome;
  if (r.tipo === "composta") return r.espacoNome;
  return undefined;
}

/** Lista unificada de equipamentos (campo `equipamentos` ou legado nome/quantidade). */
export function listaEquipamentosReserva(r: ReservaAgendaCCI): ItemEquipamentoReserva[] {
  const arr = r.equipamentos;
  if (Array.isArray(arr) && arr.length > 0) {
    return arr
      .filter((x) => x && typeof x.nome === "string" && Number(x.quantidade) > 0)
      .map((x) => ({ nome: String(x.nome), quantidade: Number(x.quantidade) || 0 }));
  }
  if (r.equipamentoNome && (r.equipamentoQuantidade ?? 0) > 0) {
    return [{ nome: r.equipamentoNome, quantidade: r.equipamentoQuantidade ?? 0 }];
  }
  return [];
}

export function quantidadeEquipamentoNaReserva(r: ReservaAgendaCCI, nomeEquip: string): number {
  return listaEquipamentosReserva(r)
    .filter((x) => x.nome === nomeEquip)
    .reduce((acc, x) => acc + x.quantidade, 0);
}

/** Equipamento + quantidade quando aplicável (primeira linha; legado). */
export function reservaEquipamentoInfo(
  r: ReservaAgendaCCI,
): { nome: string; quantidade: number } | undefined {
  if (r.tipo === "equipamento" && r.equipamentoNome) {
    return { nome: r.equipamentoNome, quantidade: r.equipamentoQuantidade ?? 0 };
  }
  const lista = listaEquipamentosReserva(r);
  if (r.tipo === "composta" && lista.length > 0) return lista[0];
  return undefined;
}

export function reservaIncluiChromebookId(r: ReservaAgendaCCI, deviceId: string): boolean {
  return reservaChromebookIds(r).includes(deviceId);
}

export function reservaIncluiEspacoNome(r: ReservaAgendaCCI, espaco: string): boolean {
  const n = reservaEspacoNome(r);
  return n !== undefined && n === espaco;
}

export function reservaIncluiEquipamentoNome(r: ReservaAgendaCCI, nomeEquip: string): boolean {
  return quantidadeEquipamentoNaReserva(r, nomeEquip) > 0;
}

/** Conta linhas `…: COM HDMI` / `…: SEM HDMI` no texto (bloco técnico gravado em `observacao`). */
export function contagemHdmiDoBlocoTecnicoObservacao(obs: string): { com: number; sem: number } {
  let com = 0;
  let sem = 0;
  for (const line of obs.split(/\r?\n/)) {
    if (/:\s*COM\s*HDMI\s*$/i.test(line)) com += 1;
    else if (/:\s*SEM\s*HDMI\s*$/i.test(line)) sem += 1;
  }
  return { com, sem };
}

/** Texto genérico para professor (sem IDs): quantidades com/sem HDMI. */
export function textoChromebooksParaSolicitante(r: ReservaAgendaCCI): string | null {
  const n = reservaChromebookIds(r).length;
  if (n === 0) return null;
  if (r.chromebooksEntrega?.length) {
    const c = r.chromebooksEntrega.filter((x) => x.hasHdmi).length;
    const s = r.chromebooksEntrega.length - c;
    const parts: string[] = [];
    if (c) parts.push(`${c} Chromebook${c !== 1 ? "s" : ""} com HDMI`);
    if (s) parts.push(`${s} Chromebook${s !== 1 ? "s" : ""} sem HDMI`);
    return parts.join(" · ");
  }
  const { com, sem } = contagemHdmiDoBlocoTecnicoObservacao(r.observacao ?? "");
  if (com + sem > 0) {
    const parts: string[] = [];
    if (com) parts.push(`${com} Chromebook${com !== 1 ? "s" : ""} com HDMI`);
    if (sem) parts.push(`${sem} Chromebook${sem !== 1 ? "s" : ""} sem HDMI`);
    return parts.join(" · ");
  }
  return `${n} Chromebook${n !== 1 ? "s" : ""}`;
}

/** Lista para entrega (admin): etiqueta + HDMI; infere do bloco técnico em `observacao` se faltar campo. */
export function chromebooksParaEntregaAdmin(r: ReservaAgendaCCI): { etiqueta: string; hasHdmi: boolean }[] {
  if (r.chromebooksEntrega?.length) return r.chromebooksEntrega;
  const out: { etiqueta: string; hasHdmi: boolean }[] = [];
  const obs = r.observacao ?? "";
  for (const line of obs.split(/\r?\n/)) {
    const m = line.match(/^(.+?):\s*(COM HDMI|SEM HDMI)\s*$/i);
    if (m) {
      out.push({
        etiqueta: m[1].trim(),
        hasHdmi: /^COM\b/i.test(m[2]),
      });
    }
  }
  if (out.length) return out;
  return (r.chromebookIds ?? []).map((id) => ({ etiqueta: id, hasHdmi: false }));
}

/** Remove do topo de `observacao` as linhas técnicas de HDMI (para exibir só texto livre ao solicitante). */
export function observacaoSomenteTextoLivre(obs?: string): string | undefined {
  if (!obs?.trim()) return undefined;
  const lines = obs.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && /^.+:\s*(COM HDMI|SEM HDMI)\s*$/i.test(lines[i].trim())) {
    i += 1;
  }
  const t = lines.slice(i).join("\n").trim();
  return t || undefined;
}

export function labelStatusExibicao(s: StatusExibicaoReserva): string {
  if (s === "pendente") return "Pendente";
  if (s === "ativa") return "Ativa";
  if (s === "concluída") return "Concluída";
  return "Cancelada";
}

export function classeBadgeStatusExibicao(s: StatusExibicaoReserva): string {
  if (s === "cancelada") {
    return "bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground rounded-full";
  }
  if (s === "concluída") {
    return "bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground rounded-full";
  }
  if (s === "pendente") {
    return "bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-950 dark:text-amber-100 rounded-full";
  }
  return "bg-success/15 px-2 py-0.5 text-xs font-medium text-success rounded-full";
}

/** Uma linha legível para agenda / listagens (inclui legado e composta). */
export function textoResumoAgenda(r: ReservaAgendaCCI): string {
  if (r.tipo === "composta") {
    const p: string[] = [];
    const txCb = textoChromebooksParaSolicitante(r);
    if (txCb) p.push(txCb);
    for (const eq of listaEquipamentosReserva(r)) {
      p.push(`${eq.nome} × ${eq.quantidade}`);
    }
    if (r.espacoNome) p.push(r.espacoNome);
    return p.length ? p.join(" · ") : "Reserva composta";
  }
  if (r.tipo === "chromebook") {
    return textoChromebooksParaSolicitante(r) ?? "Chromebook";
  }
  if (r.tipo === "equipamento") {
    return `${r.equipamentoNome ?? "Equipamento"} · ${r.equipamentoQuantidade ?? 0} un.`;
  }
  return r.espacoNome ?? "Espaço";
}

export type EquipamentoCatalogo = {
  nome: string;
  total: number;
};

export const STORAGE_KEY_AGENDA_CCI = "central-connect-agenda-cci-v1";

/** Minutos após o fim oficial da reserva em que o equipamento ainda conta como ocupado (não reservável). */
export const TOLERANCIA_FIM_RESERVA_MIN = 10;

export type ChromebookAgendaItem = {
  id: string;
  label: string;
  hasHdmi: boolean;
  serialNumber?: string;
  /**
   * ID do recurso no Admin (ex.: annotatedAssetId).
   * Quando não vier, usamos o próprio `id` como fallback na UI.
   */
  annotatedAssetId?: string;
  /** Status no Admin (ex.: ACTIVE, DISABLED) quando vem da API. */
  adminStatus?: string;
};

/** Lista estática usada só se a API do Workspace não responder (desenvolvimento / fallback). */
export const CHROMEBOOKS_CATALOGO_FALLBACK: ChromebookAgendaItem[] = Array.from(
  { length: 16 },
  (_, i) => ({
    id: `CB-${String(i + 1).padStart(2, "0")}`,
    label: `CB-${String(i + 1).padStart(2, "0")}`,
    hasHdmi: i % 2 === 0,
    annotatedAssetId: `CB-${String(i + 1).padStart(2, "0")}`,
  }),
);

export const EQUIPAMENTOS_CATALOGO: EquipamentoCatalogo[] = [
  { nome: "Projetor", total: 6 },
  { nome: "Caixa de Som", total: 4 },
  { nome: "Microfone sem fio", total: 8 },
  { nome: "Notebook", total: 10 },
];

export const ESPACOS_CATALOGO = [
  "Auditório",
  "Sala de Reunião 1",
  "Sala de Reunião 2",
  "Laboratório CCI",
];

/** Data local no formato YYYY-MM-DD (evita deslocamento UTC de `toISOString`). */
export function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Semana civil domingo → sábado que contém `ref`. */
export function limitesSemanaDomingoSabado(ref: Date): { domingo: Date; sabado: Date } {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = d.getDay();
  const domingo = new Date(d);
  domingo.setDate(d.getDate() - dow);
  const sabado = new Date(domingo);
  sabado.setDate(domingo.getDate() + 6);
  return { domingo, sabado };
}

/**
 * Reservas só na semana corrente: de hoje até o sábado desta semana.
 * No domingo seguinte recomeça o período (nova semana).
 */
export function limitesDatasReservaSemanaCorrente(agora: Date = new Date()): {
  min: string;
  max: string;
} {
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const { sabado } = limitesSemanaDomingoSabado(agora);
  return {
    min: toYmdLocal(hoje),
    max: toYmdLocal(sabado),
  };
}

export function dataReservaDentroDaSemanaPermitida(
  dataYmd: string,
  agora: Date = new Date(),
): boolean {
  const { min, max } = limitesDatasReservaSemanaCorrente(agora);
  return dataYmd >= min && dataYmd <= max;
}

function parseReservaLocalDateTimes(
  dataYmd: string,
  inicioHhmm: string,
  fimHhmm: string,
): { inicio: Date; fim: Date } | null {
  const [y, m, d] = dataYmd.split("-").map(Number);
  const [hi, mi] = inicioHhmm.split(":").map(Number);
  const [hf, mf] = fimHhmm.split(":").map(Number);
  if (![y, m, d, hi, mi, hf, mf].every((n) => Number.isFinite(n))) return null;
  return {
    inicio: new Date(y, m - 1, d, hi, mi, 0, 0),
    fim: new Date(y, m - 1, d, hf, mf, 0, 0),
  };
}

/**
 * Status para exibição: cancelada (persistido); senão, concluída / pendente / ativa pelo relógio local.
 */
export function statusExibicaoReserva(r: ReservaAgendaCCI, agora: Date = new Date()): StatusExibicaoReserva {
  if (r.status === "cancelada") return "cancelada";
  const parsed = parseReservaLocalDateTimes(r.data, r.inicio, r.fim);
  if (!parsed) return "pendente";
  const t = agora.getTime();
  if (t >= parsed.fim.getTime()) return "concluída";
  if (t < parsed.inicio.getTime()) return "pendente";
  return "ativa";
}

/** Não permite agendar início no passado (data/hora local). */
export function inicioReservaNaoEstaNoPassado(
  dataYmd: string,
  inicioHhmm: string,
  agora: Date = new Date(),
): boolean {
  const [y, m, d] = dataYmd.split("-").map(Number);
  const [hi, mi] = inicioHhmm.split(":").map(Number);
  if (![y, m, d, hi, mi].every((n) => Number.isFinite(n))) return false;
  const inicio = new Date(y, m - 1, d, hi, mi, 0, 0);
  return inicio.getTime() >= agora.getTime();
}

/** `min` para `<input type="time">` quando a data selecionada é hoje (hora local). */
export function horaMinimaInicioParaData(dataYmd: string, agora: Date = new Date()): string | undefined {
  if (dataYmd !== toYmdLocal(agora)) return undefined;
  return `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
}

export function formatarYmdParaBR(ymd: string): string {
  const p = ymd.split("-").map(Number);
  if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return ymd;
  const [a, b, c] = p;
  return `${String(c).padStart(2, "0")}/${String(b).padStart(2, "0")}/${a}`;
}

export function carregarReservasAgenda(): ReservaAgendaCCI[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AGENDA_CCI);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReservaAgendaCCI[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function salvarReservasAgenda(
  lista: ReservaAgendaCCI[],
  idToken?: string | null,
): Promise<boolean> {
  localStorage.setItem(STORAGE_KEY_AGENDA_CCI, JSON.stringify(lista));
  if (idToken) return enviarReservasParaServidor(lista, idToken);
  return true;
}

export async function enviarReservasParaServidor(
  lista: ReservaAgendaCCI[],
  idToken: string,
): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/api/agenda-cci/reservas"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, reservas: lista }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Substitui o localStorage pelas reservas do servidor (fonte de verdade para o worker). */
export async function obterReservasDoServidor(
  idToken: string,
): Promise<ReservaAgendaCCI[] | null> {
  try {
    const res = await fetch(apiUrl("/api/agenda-cci/reservas/obter"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { reservas?: ReservaAgendaCCI[] };
    if (!Array.isArray(j.reservas)) return null;
    return j.reservas;
  } catch {
    return null;
  }
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

/** Fim do slot incluindo tolerância (ex.: 12:00 + 10 min → 12:10). Limitado ao mesmo dia (até 24:00). */
export function fimReservaComTolerancia(
  fim: string,
  toleranciaMin: number = TOLERANCIA_FIM_RESERVA_MIN,
): string {
  let total = toMinutes(fim) + toleranciaMin;
  const max = 24 * 60;
  if (total > max) total = max;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Conflito entre duas reservas de Chromebook: cada uma bloqueia até fim + tolerância.
 */
export function reservasChromebookConflitam(
  inicioA: string,
  fimA: string,
  inicioB: string,
  fimB: string,
): boolean {
  return rangesOverlap(
    inicioA,
    fimReservaComTolerancia(fimA),
    inicioB,
    fimReservaComTolerancia(fimB),
  );
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function minutosAgoraLocal(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export type EstadoChromebookTempo = "em_uso" | "bloqueado" | "livre";

/**
 * Estado operacional do aparelho no **dia e horário locais** atuais (só faz sentido se `dataSelecionada` for hoje).
 * - **em_uso**: dentro de [início, fim + tolerância] de alguma reserva ativa.
 * - **bloqueado**: entre o fim+tolerância de uma reserva e o início da próxima no mesmo dia.
 * - **livre**: antes da primeira reserva do dia ou depois da última (fim+tolerância).
 */
export function estadoChromebookNoHorarioLocal(
  deviceId: string,
  dataSelecionada: string,
  reservasAtivas: ReservaAgendaCCI[],
  agora: Date = new Date(),
): EstadoChromebookTempo | null {
  if (dataSelecionada !== ymdLocal(agora)) return null;

  const doDia = reservasAtivas
    .filter(
      (r) =>
        (r.tipo === "chromebook" || r.tipo === "composta") &&
        r.status === "ativa" &&
        r.data === dataSelecionada &&
        reservaIncluiChromebookId(r, deviceId),
    )
    .map((r) => ({
      inicio: r.inicio,
      fim: r.fim,
      iniMin: toMinutes(r.inicio),
      fimTolMin: toMinutes(fimReservaComTolerancia(r.fim)),
    }))
    .sort((a, b) => a.iniMin - b.iniMin);

  if (doDia.length === 0) return "livre";

  const n = minutosAgoraLocal(agora);

  for (const slot of doDia) {
    if (n >= slot.iniMin && n < slot.fimTolMin) return "em_uso";
  }

  for (let i = 0; i < doDia.length - 1; i++) {
    const a = doDia[i];
    const b = doDia[i + 1];
    if (n >= a.fimTolMin && n < b.iniMin) return "bloqueado";
  }

  if (n < doDia[0].iniMin) return "livre";
  if (n >= doDia[doDia.length - 1].fimTolMin) return "livre";

  return "bloqueado";
}
