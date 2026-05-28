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

export const LOST_FOUND_DELIVERY_METHODS = [
  { value: "secretaria" as const, label: "Retirar na secretaria" },
  { value: "sala_aula" as const, label: "Entregar na sala de aula" },
];

export const LOST_FOUND_SCHOOL_PERIODS = [
  { value: "matutino" as const, label: "Matutino" },
  { value: "vespertino" as const, label: "Vespertino" },
] as const;
