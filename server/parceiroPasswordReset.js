import crypto from "crypto";
import { enviarEmailGmail } from "./emailService.js";

const CODIGO_TTL_MS = 15 * 60 * 1000; // 15 minutos

/**
 * @typedef {{
 *   codigo: string,
 *   login: string,
 *   email: string,
 *   nome: string,
 *   lojaId: string,
 *   lojaNome: string,
 *   criadoEm: number,
 *   expiraEm: number,
 * }} ResetCodigoItem
 */

/** @type {ResetCodigoItem[]} */
let codigosAtivos = [];

function limparCodigosExpirados() {
  const agora = Date.now();
  codigosAtivos = codigosAtivos.filter((item) => item.expiraEm > agora);
}

export function ehEmailRecuperacaoReal(email) {
  if (!email || typeof email !== "string") return false;
  const limpo = email.trim().toLowerCase();
  if (!limpo.includes("@") || !limpo.includes(".")) return false;
  if (limpo.endsWith("@parceiro.cci")) return false; // email sintético de fallback
  return true;
}

export function mascararEmail(email) {
  if (!email || typeof email !== "string") return "";
  const partes = email.trim().split("@");
  if (partes.length !== 2) return email;
  const [user, domain] = partes;
  if (user.length <= 2) {
    return `${user[0] || "*"}***@${domain}`;
  }
  const visivelInicio = user.slice(0, 2);
  const visivelFim = user.slice(-1);
  return `${visivelInicio}***${visivelFim}@${domain}`;
}

/**
 * Gera um código numérico de 6 dígitos para o operador.
 * Permite que códigos recentes continuem válidos dentro da janela de 15 minutos
 * para evitar problemas caso o usuário clique mais de uma vez ou o e-mail anterior chegue primeiro.
 */
export function criarCodigoRedefinicao(operador) {
  limparCodigosExpirados();
  const codigo = String(crypto.randomInt(100000, 999999));
  const agora = Date.now();
  const loginNorm = String(operador.login).trim().toLowerCase();
  const emailNorm = String(operador.email || "").trim().toLowerCase();

  const item = {
    codigo,
    login: loginNorm,
    email: emailNorm,
    nome: operador.nome || operador.login,
    lojaId: operador.lojaId,
    lojaNome: operador.loja?.nome || operador.lojaNome || "Loja Parceira",
    criadoEm: agora,
    expiraEm: agora + CODIGO_TTL_MS,
  };

  codigosAtivos.push(item);
  return item;
}

/**
 * Valida o código digitado pelo usuário.
 * Aceita qualquer código válido gerado para o operador nos últimos 15 minutos.
 */
export function verificarEConsumirCodigoRedefinicao(loginOuEmail, codigoDigitado) {
  limparCodigosExpirados();
  const termo = String(loginOuEmail || "").trim().toLowerCase();
  const codLimpo = String(codigoDigitado || "").replace(/\D/g, "").trim();

  if (!termo || !codLimpo) {
    return { ok: false, error: "Informe o usuário/e-mail e o código de 6 dígitos." };
  }

  // Localiza códigos recentes deste usuário (por login ou e-mail)
  const codigosDoUsuario = codigosAtivos.filter(
    (c) => c.login === termo || c.email === termo,
  );

  if (codigosDoUsuario.length === 0) {
    return {
      ok: false,
      error: "Nenhum código ativo encontrado para este usuário. Solicite um novo código.",
    };
  }

  // Verifica se algum dos códigos ativos bate com o digitado
  const itemValido = codigosDoUsuario.find((c) => c.codigo === codLimpo);

  if (!itemValido) {
    return {
      ok: false,
      error: "Código incorreto. Digite o código de 6 dígitos recebido no e-mail mais recente.",
    };
  }

  // Código correto! Remove todos os códigos deste usuário para evitar reuso
  codigosAtivos = codigosAtivos.filter(
    (c) => c.login !== itemValido.login && c.email !== itemValido.email,
  );

  return { ok: true, item: itemValido };
}

export function montarHtmlEmailCodigo({ nomeOperador, login, nomeLoja, codigo }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Recuperação — Advance-CCI Parceiro</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; }
    .header h1 { color: #f8fafc; margin: 0; font-size: 20px; font-weight: 700; }
    .header p { color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; }
    .body { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .card-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 13px; }
    .card-info p { margin: 4px 0; }
    .code-container { text-align: center; margin: 28px 0; }
    .code-badge { display: inline-block; background: #0f172a; color: #38bdf8; font-size: 34px; font-weight: 700; letter-spacing: 4px; padding: 16px 36px; border-radius: 12px; font-family: Consolas, Monaco, monospace; border: 2px solid #1e293b; box-shadow: 0 4px 12px rgba(15,23,42,0.15); user-select: all; }
    .code-instruction { font-size: 13px; text-align: center; color: #64748b; margin-top: 10px; }
    .notice { font-size: 12px; color: #94a3b8; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
    .footer { background: #f8fafc; padding: 16px 28px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Portal Parceiro Advance-CCI</h1>
      <p>Código de Verificação de Segurança</p>
    </div>
    <div class="body">
      <div class="greeting">Olá, ${nomeOperador}!</div>
      <p class="text">
        Recebemos uma solicitação para redefinir a senha do seu acesso ao Portal do Parceiro Advance-CCI.
      </p>

      <div class="card-info">
        <p><strong>Estabelecimento:</strong> ${nomeLoja}</p>
        <p><strong>Usuário de Login:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${login}</code></p>
      </div>

      <div class="code-container">
        <div class="code-badge">${codigo}</div>
        <p class="code-instruction">Copie ou digite este código de 6 dígitos diretamente na tela do portal parceiro.</p>
      </div>

      <div class="notice">
        ⏰ <strong>Validade:</strong> Este código expira em <strong>15 minutos</strong>.<br/>
        Se você não solicitou este código, desconsidere esta mensagem. Sua senha atual continuará válida e segura.
      </div>
    </div>
    <div class="footer">
      Advance-CCI • Colégio CCI • Mensagem automática, favor não responder.
    </div>
  </div>
</body>
</html>`;
}

export async function enviarEmailCodigoRecuperacaoParceiro({ operador }) {
  if (!operador?.email || !ehEmailRecuperacaoReal(operador.email)) {
    throw new Error("Operador não possui um e-mail de recuperação válido configurado.");
  }

  const item = criarCodigoRedefinicao(operador);

  const htmlBody = montarHtmlEmailCodigo({
    nomeOperador: operador.nome || operador.login,
    login: operador.login,
    nomeLoja: operador.loja?.nome || operador.lojaNome || "Loja Parceira",
    codigo: item.codigo,
  });

  await enviarEmailGmail({
    destinatario: operador.email,
    assunto: `🔐 Código de Verificação: ${item.codigo} — Advance-CCI Parceiro`,
    htmlBody,
    remetenteNome: "Advance-CCI",
  });

  return {
    ok: true,
    emailMascarado: mascararEmail(operador.email),
    expiraEm: item.expiraEm,
  };
}
