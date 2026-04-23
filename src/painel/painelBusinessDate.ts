/**
 * Data de negócio no fuso America/Sao_Paulo (YYYY-MM-DD) para a coluna `ticket_date` em `painel_tickets`.
 */
export function getPainelBusinessDateIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
