export type LostFoundPublicView = "painel" | "itens" | "devolvidos" | "doacao";

export type LostFoundPublicStats = {
  availableCount: number;
  returnedCount: number;
  donationCount: number;
  totalCount: number;
  thisWeekCount: number;
};
