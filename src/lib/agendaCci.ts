/** Modelo e persistência da Agenda CCI (reservas no navegador). */

export type TipoReservaAgenda = "chromebook" | "equipamento" | "espaco";
export type StatusReservaAgenda = "ativa" | "cancelada";

export type ReservaAgendaCCI = {
  id: string;
  tipo: TipoReservaAgenda;
  data: string;
  inicio: string;
  fim: string;
  solicitanteEmail: string;
  solicitanteNome: string;
  chromebookIds?: string[];
  equipamentoNome?: string;
  equipamentoQuantidade?: number;
  espacoNome?: string;
  observacao?: string;
  status: StatusReservaAgenda;
  criadoEm: string;
};

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

export function salvarReservasAgenda(lista: ReservaAgendaCCI[], idToken?: string | null) {
  localStorage.setItem(STORAGE_KEY_AGENDA_CCI, JSON.stringify(lista));
  if (idToken) {
    void enviarReservasParaServidor(lista, idToken);
  }
}

export async function enviarReservasParaServidor(
  lista: ReservaAgendaCCI[],
  idToken: string,
): Promise<boolean> {
  try {
    const res = await fetch("/api/agenda-cci/reservas", {
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
    const res = await fetch("/api/agenda-cci/reservas/obter", {
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
        r.tipo === "chromebook" &&
        r.status === "ativa" &&
        r.data === dataSelecionada &&
        (r.chromebookIds ?? []).includes(deviceId),
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
