import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function carregarCredenciaisServiceAccount() {
  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    try {
      return { ok: true, creds: JSON.parse(jsonEnv) };
    } catch (e) {
      return { ok: false, error: `GOOGLE_SERVICE_ACCOUNT_JSON inválido: ${e.message}` };
    }
  }

  const rawPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (rawPath) {
    const fullPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(__dirname, rawPath);
    if (!fs.existsSync(fullPath)) {
      return { ok: false, error: `Arquivo service account não encontrado: ${fullPath}` };
    }
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      return { ok: true, creds: JSON.parse(content) };
    } catch (e) {
      return { ok: false, error: `Erro ao ler service account em ${fullPath}: ${e.message}` };
    }
  }

  return { ok: false, error: "Nenhuma service account configurada." };
}

/**
 * Obtém JWT autorizado para o Gmail API, tentando o remetente configurado
 * e caindo para a conta admin impersonada se necessário.
 * @returns {Promise<{ jwt: any, remetente: string }>}
 */
export async function obterJwtGmailAutorizado() {
  const res = carregarCredenciaisServiceAccount();
  if (!res.ok || !res.creds) {
    throw new Error(res.error || "Credenciais de service account não encontradas.");
  }

  const candidatos = [
    (process.env.EMAIL_REMETENTE || "").trim(),
    (process.env.GOOGLE_ADMIN_IMPERSONATE || "").trim(),
  ].filter(Boolean);

  if (candidatos.length === 0) {
    throw new Error("Nenhum remetente de e-mail (EMAIL_REMETENTE ou GOOGLE_ADMIN_IMPERSONATE) configurado.");
  }

  let ultimoErro = null;
  for (const subject of candidatos) {
    try {
      const jwt = new google.auth.JWT({
        email: res.creds.client_email,
        key: res.creds.private_key,
        scopes: ["https://www.googleapis.com/auth/gmail.send"],
        subject,
      });
      await jwt.authorize();
      return { jwt, remetente: subject };
    } catch (e) {
      ultimoErro = e;
      console.warn(`[emailService] Tentativa com '${subject}' falhou (${e.message}). Testando próxima conta...`);
    }
  }

  throw new Error(`Falha ao autorizar envio de e-mail via Google Workspace: ${ultimoErro?.message || "erro desconhecido"}`);
}

/**
 * Envia e-mail formatado em HTML usando Gmail API via Service Account com delegação de domínio.
 * @param {{ destinatario: string, assunto: string, htmlBody: string, remetenteNome?: string }} params
 */
export async function enviarEmailGmail({
  destinatario,
  assunto,
  htmlBody,
  remetenteNome = "Advance-CCI",
}) {
  const { jwt, remetente } = await obterJwtGmailAutorizado();

  const htmlBase64 = Buffer.from(htmlBody, "utf-8").toString("base64");
  const subjectBase64 = Buffer.from(assunto, "utf-8").toString("base64");

  const rawMessage = [
    `From: ${remetenteNome} <${remetente}>`,
    `To: ${destinatario}`,
    `Reply-To: ${remetente}`,
    `Subject: =?UTF-8?B?${subjectBase64}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    `X-Mailer: ${remetenteNome}/1.0`,
    "X-Auto-Submitted: auto-generated",
    "Precedence: transactional",
    "",
    htmlBody ? htmlBase64 : "",
  ].join("\r\n");

  const encoded = Buffer.from(rawMessage, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const gmail = google.gmail({ version: "v1", auth: jwt });
  await gmail.users.messages.send({
    userId: remetente,
    requestBody: { raw: encoded },
  });

  console.log(`[emailService] E-mail enviado com sucesso via ${remetente} para ${destinatario}: "${assunto}"`);
  return true;
}
