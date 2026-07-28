/**
 * Hooks de e-mail CCI Pay — implementação Gmail a cargo do Thiago.
 * Por ora apenas registra no log para não bloquear o fluxo.
 */
export function notificarEmailCcipay(evento, dados) {
  console.log(`[email-ccipay] ${evento}`, JSON.stringify(dados));
}
