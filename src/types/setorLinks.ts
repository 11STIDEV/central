export type SectorLink = {
  title: string;
  url: string;
};

export type SectorLinkGroup = {
  title: string;
  links: SectorLink[];
};

export type SectorPageMeta = {
  title: string;
  subtitle: string;
  restrictedLabel: string;
  groups: SectorLinkGroup[];
};

export type SectorPageKey =
  | "professores"
  | "disciplinar"
  | "secretaria"
  | "servicos-gerais"
  | "publicidade"
  | "dp-financeiro"
  | "primeiros-socorros"
  | "direcao"
  | "clat";

export const SETOR_LINK_KEYS: SectorPageKey[] = [
  "professores",
  "disciplinar",
  "secretaria",
  "servicos-gerais",
  "publicidade",
  "dp-financeiro",
  "primeiros-socorros",
  "direcao",
  "clat",
];
