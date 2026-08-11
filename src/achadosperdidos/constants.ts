export const LOST_FOUND_CATEGORIES = [
  "Eletrônicos",
  "Roupas",
  "Livros",
  "Acessórios",
  "Equipamentos esportivos",
  "Chaves",
  "Outros",
] as const;

export type LostFoundCategory = (typeof LOST_FOUND_CATEGORIES)[number];

export const MAX_ITEM_PHOTOS = 4;

/** Prazo para retirada antes de encaminhar o item à doação. */
export const DONATION_RETENTION_DAYS = 90;

/** Prazo para retirar o item após reivindicar na vitrine pública. */
export const CLAIM_PICKUP_DEADLINE_DAYS = 7;

export const LOST_FOUND_DONATION_POLICY_MESSAGE =
  "Itens cadastrados e não retirados em até 90 dias serão encaminhados para doação, sem identificação pública dos objetos.";

export const LOST_FOUND_CLAIM_PICKUP_POLICY_MESSAGE =
  "Ao reivindicar um item como seu, você tem até 7 dias para retirá-lo (secretaria ou entrega combinada). Passado esse prazo sem retirada, o item volta a ficar disponível para outras pessoas.";

export const LOST_FOUND_DELIVERY_METHODS = [
  { value: "secretaria" as const, label: "Retirar na secretaria" },
  { value: "sala_aula" as const, label: "Entregar na sala de aula" },
];

export const LOST_FOUND_SCHOOL_PERIODS = [
  { value: "matutino" as const, label: "Matutino" },
  { value: "vespertino" as const, label: "Vespertino" },
] as const;
