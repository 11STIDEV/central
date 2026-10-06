import crypto from "crypto";
import { enviarEmailGmail } from "./emailService.js";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * @typedef {{
 *   token: string,
 *   login: string,
 *   email: string,
 *   nome: string,
 *   lojaId: string,
 *   lojaNome: string,
 *   criadoEm: number,
 *   expiraEm: number,
 * }} ResetTokenItem
 */

/** @type {Map<string, ResetTokenItem>} */
const tokensAtivos = new Map();

function limparTokensExpirados() {
  const agora = Date.now();
  for (const [token, item] of tokensAtivos.entries()) {
    if (item.expiraEm <= agora) {
      tokensAtivos.delete(token);
    }
  }
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

export function criarTokenRedefinicao(operador) {
  limparTokensExpirados();
  const token = crypto.randomBytes(32).toString("hex");
  const agora = Date.now();
  const item = {
    token,
    login: operador.login,
    email: operador.email,
    nome: operador.nome || operador.login,
    lojaId: operador.lojaId,
    lojaNome: operador.loja?.nome || operador.lojaNome || "Loja Parceira",
    criadoEm: agora,
    expiraEm: agora + TOKEN_TTL_MS,
  };
  tokensAtivos.set(token, item);
  return item;
}

export function validarTokenRedefinicao(token) {
  if (!token || typeof token !== "string") return null;
  limparTokensExpirados();
  const item = tokensAtivos.get(token.trim());
  if (!item) return null;
  if (item.expiraEm <= Date.now()) {
    tokensAtivos.delete(token.trim());
    return null;
  }
  return item;
}

export function consumirTokenRedefinicao(token) {
  const item = validarTokenRedefinicao(token);
  if (!item) return null;
  tokensAtivos.delete(token.trim());
  return item;
}

export function montarHtmlEmailRecuperacao({ nomeOperador, login, nomeLoja, linkRedefinicao }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinição de Senha — Advance-CCI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 28px; text-align: center; }
    .header h1 { color: #f8fafc; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; }
    .body { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
    .card-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .card-info-row { display: flex; justify-content: space-between; font-size: 13px; margin: 6px 0; }
    .card-info-label { color: #64748b; font-weight: 500; }
    .card-info-value { color: #0f172a; font-weight: 600; }
    .btn-container { text-align: center; margin: 32px 0 24px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 6px rgba(37,99,235,0.3); transition: background 0.2s; }
    .url-box { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px; font-size: 11px; word-break: break-all; color: #64748b; line-height: 1.4; margin-top: 16px; }
    .notice { font-size: 12px; color: #94a3b8; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
    .footer { background: #f8fafc; padding: 16px 28px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Portal Parceiro Advance-CCI</h1>
      <p>Recuperação de Credenciais de Acesso</p>
    </div>
    <div class="body">
      <div class="greeting">Olá, ${nomeOperador}!</div>
      <p class="text">
        Recebemos uma solicitação para redefinir a sua senha de acesso ao Portal do Parceiro Advance-CCI.
      </p>

      <div class="card-info">
        <div class="card-info-row">
          <span class="card-info-label">Estabelecimento / Loja:</span>
          <span class="card-info-value">${nomeLoja}</span>
        </div>
        <div class="card-info-row">
          <span class="card-info-label">Usuário de Login:</span>
          <span class="card-info-value" style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${login}</span>
        </div>
      </div>

      <div class="btn-container">
        <a href="${linkRedefinicao}" class="btn" target="_blank" rel="noopener noreferrer">
          Redefinir Minha Senha
        </a>
      </div>

      <p class="text" style="font-size: 13px; text-align: center; color: #64748b;">
        Ou copie e cole o link abaixo em seu navegador:
      </p>
      <div class="url-box">${linkRedefinicao}</div>

      <div class="notice">
        <strong>Importante:</strong> Este link é válido por <strong>1 hora</strong> a partir do recebimento deste e-mail.<br/>
        Se você não solicitou a alteração de senha, ignore esta mensagem com segurança — seus dados permanecem protegidos.
      </div>
    </div>
    <div class="footer">
      Advance-CCI • Colégio CCI • Mensagem automática, favor não responder.
    </div>
  </div>
</body>
</html>`;
}

export async function enviarEmailRecuperacaoParceiro({ operador, baseUrl }) {
  if (!operador?.email || !ehEmailRecuperacaoReal(operador.email)) {
    throw new Error("Operador não possui um e-mail de recuperação válido configurado.");
  }

  const itemToken = criarTokenRedefinicao(operador);
  const baseLimpa = baseUrl.replace(/\/+$/, "");
  const linkRedefinicao = `${baseLimpa}/redefinir-senha?token=${encodeURIComponent(itemToken.token)}`;

  const htmlBody = montarHtmlEmailRecuperacao({
    nomeOperador: operador.nome || operador.login,
    login: operador.login,
    nomeLoja: operador.loja?.nome || operador.lojaNome || "Loja Parceira",
    linkRedefinicao,
  });

  await enviarEmailGmail({
    destinatario: operador.email,
    assunto: `🔑 Redefinição de Senha — Portal Parceiro Advance-CCI (${operador.login})`,
    htmlBody,
    remetenteNome: "Advance-CCI",
  });

  return {
    ok: true,
    emailMascarado: mascararEmail(operador.email),
    expiraEm: itemToken.expiraEm,
  };
}
