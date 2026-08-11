import type { Papel } from "@/auth/AuthProvider";
import type { Chamado } from "@/lib/chamados";

/** Papéis por slug (espelha setoresConfig — evita import circular). */
const PAPEIS_POR_SLUG: Record<string, Papel[]> = {
  ti: ["setape", "gerente_setape"],
  secretaria: ["secretaria", "gerente_secretaria"],
  "dp-financeiro": ["dp", "financeiro", "gerente_dp", "gerente_financeiro"],
  direcao: ["direcao", "gerente_direcao"],
  disciplinar: ["disciplinar", "gerente_disciplinar"],
  biblioteca: ["biblioteca", "gerente_biblioteca"],
  "servicos-gerais": ["servicosgerais", "gerente_servicosgerais"],
  almoxarifado: ["almoxarifado", "gerente_almoxarifado"],
  "primeiros-socorros": ["primeirossocorros", "gerente_primeirossocorros"],
  clat: ["clat", "gerente_clat"],
  publicidade: ["publicidade", "gerente_publicidade"],
};

/** Setor destino ao abrir/gestão de chamados (chaves em `setorDestino` no banco). */
export type ChamadosSetorDestino = {
  value: string;
  label: string;
};

/** Mapeamento intranet (slug do setor) → destinos de chamado. */
export type ChamadosSetorConfig = {
  slug: string;
  label: string;
  destinos: string[];
};

export const CHAMADOS_DESTINOS: ChamadosSetorDestino[] = [
  { value: "setape", label: "TI / Setape" },
  { value: "secretaria", label: "Secretaria" },
  { value: "dp", label: "DP / Financeiro" },
  { value: "direcao", label: "Direção" },
  { value: "disciplinar", label: "Disciplinar" },
  { value: "biblioteca", label: "Biblioteca" },
  { value: "servicosgerais", label: "Serviços Gerais" },
  { value: "almoxarifado", label: "Almoxarifado" },
  { value: "primeirossocorros", label: "Primeiros Socorros" },
  { value: "clat", label: "CLAT" },
  { value: "publicidade", label: "Publicidade" },
];

/** Slugs de setor na intranet que recebem chamados (exclui professores/faculdade). */
export const CHAMADOS_SETORES: ChamadosSetorConfig[] = [
  { slug: "ti", label: "TI / Setape", destinos: ["setape"] },
  { slug: "secretaria", label: "Secretaria", destinos: ["secretaria"] },
  { slug: "dp-financeiro", label: "DP e Financeiro", destinos: ["dp", "financeiro"] },
  { slug: "direcao", label: "Direção", destinos: ["direcao"] },
  { slug: "disciplinar", label: "Disciplinar", destinos: ["disciplinar"] },
  { slug: "biblioteca", label: "Biblioteca", destinos: ["biblioteca"] },
  { slug: "servicos-gerais", label: "Serviços Gerais", destinos: ["servicosgerais"] },
  { slug: "almoxarifado", label: "Almoxarifado", destinos: ["almoxarifado"] },
  { slug: "primeiros-socorros", label: "Primeiros Socorros", destinos: ["primeirossocorros"] },
  { slug: "clat", label: "CLAT", destinos: ["clat"] },
  { slug: "publicidade", label: "Publicidade", destinos: ["publicidade"] },
];

const CHAMADOS_SETORES_BY_SLUG = new Map(CHAMADOS_SETORES.map((s) => [s.slug, s]));

const DESTINO_LABEL = new Map(CHAMADOS_DESTINOS.map((d) => [d.value, d.label]));

export function getChamadosSetorBySlug(slug: string): ChamadosSetorConfig | undefined {
  return CHAMADOS_SETORES_BY_SLUG.get(slug);
}

export function urlGestaoChamadosSetor(slug: string): string {
  return `/chamados/gestao/${slug}`;
}

export function obterNomeAmigavelDestinoChamado(destino?: string): string {
  return DESTINO_LABEL.get(destino ?? "") || destino || "TI / Setape";
}

export function chamadoPertenceAoSetor(chamado: Chamado, setorSlug: string): boolean {
  const cfg = getChamadosSetorBySlug(setorSlug);
  if (!cfg) return false;
  const dests = chamado.setorDestino ?? ["setape"];
  return dests.some((d) => cfg.destinos.includes(d));
}

/** Usuário pode abrir gestão filtrada deste setor (admin ou papel do setor). */
export function canAccessGestaoChamadosSetor(papeis: Papel[], setorSlug: string): boolean {
  if (papeis.includes("admin")) return true;
  const required = PAPEIS_POR_SLUG[setorSlug];
  if (!required) return false;
  return required.some((p) => papeis.includes(p));
}

/** Slugs de setor com gestão de chamados cujo usuário tem acesso. */
export function getChamadosSetoresAcessiveis(papeis: Papel[]): ChamadosSetorConfig[] {
  if (papeis.includes("admin")) return CHAMADOS_SETORES;
  return CHAMADOS_SETORES.filter((cs) => canAccessGestaoChamadosSetor(papeis, cs.slug));
}

/** Destinos disponíveis ao abrir chamado (rótulos para UI). */
export function getDestinosParaAbrirChamado(): ChamadosSetorDestino[] {
  return CHAMADOS_DESTINOS;
}

/** Papéis de setor com gestão de chamados (para activePrefixes / hub). */
export function buildChamadosGestaoActivePrefixes(): string[] {
  return ["/chamados/gestao", ...CHAMADOS_SETORES.map((s) => urlGestaoChamadosSetor(s.slug))];
}

/** Slugs de setor na intranet com gestão de chamados. */
export function setorSlugRecebeChamados(slug: string): boolean {
  return CHAMADOS_SETORES_BY_SLUG.has(slug);
}
