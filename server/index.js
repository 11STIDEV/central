import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import express from "express";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import {
  agoraLocalParts,
  estaEmJanelaReservaAtiva,
  dispositivoEstaDisabled,
} from "./agendaCciLogic.js";
import {
  mapearPapeisDoOrgUnit,
  mesclarPapeisManuais,
  papelPrincipalUsuario,
  podeVerChamado,
} from "./chamadosAccess.js";
import { registerSetorLinksRoutes } from "./setorLinks.js";
import {
  listarTodosChamados,
  obterChamadoPorId,
  inserirChamado,
  atualizarChamado,
} from "./chamadosStore.js";
import {
  AVISO_TIPOS_VALIDOS,
  AVISO_SETORES_VALIDOS,
  listarTodosAvisos,
  inserirAviso,
} from "./avisosStore.js";
import { podeVerAviso, podePublicarNoSetor } from "./avisosAccess.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Dev local: lê `server/.env`. Produção (Docker/Coolify): variáveis vêm do runtime — o `.env` não vai na imagem. */
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3001;
/** Endereço de bind (Docker/rede: use 0.0.0.0 para aceitar conexões externas ao container). */
const HOST = process.env.HOST || "0.0.0.0";

app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

/** Um ou mais sufixos permitidos, separados por vírgula. Alinhar ao front (`AuthProvider`) e ao `server/.env.example`. */
function parseDominiosPermitidos() {
  const raw =
    process.env.DOMINIOS_PERMITIDOS ||
    process.env.DOMINIO_PERMITIDO ||
    "@portalcci.com.br,@faculdadecci.com.br,@tecscci.com.br";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
const DOMINIOS_PERMITIDOS = parseDominiosPermitidos();

/** Lê env em runtime (Coolify injeta no processo; nomes alternativos comuns). */
function lerSupabaseConfig() {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ""
  ).trim();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    ""
  ).trim();
  return { url, serviceKey };
}

function statusSupabaseEnv() {
  const { url, serviceKey } = lerSupabaseConfig();
  const keyRole = serviceKey ? papelDaChaveSupabase(serviceKey) : null;
  return {
    urlSet: Boolean(url),
    serviceRoleKeySet: Boolean(serviceKey),
    keyRole,
    configured: Boolean(url && serviceKey),
    keyLooksAnon: keyRole === "anon",
  };
}

function papelDaChaveSupabase(jwt) {
  try {
    const part = String(jwt).split(".")[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8",
    );
    const payload = JSON.parse(json);
    return typeof payload?.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function getSupabaseAdmin() {
  const { url, serviceKey } = lerSupabaseConfig();
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Cliente Supabase separado para agendamentos (self-hosted em portalcci.com.br). */
function lerSupabaseAgendaConfig() {
  const url = (process.env.SUPABASE_AGENDA_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_AGENDA_SERVICE_ROLE_KEY || "").trim();
  return { url, serviceKey };
}

function getSupabaseAgenda() {
  const { url, serviceKey } = lerSupabaseAgendaConfig();
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function mensagemSupabaseNaoConfigurado() {
  if (process.env.NODE_ENV === "production") {
    return (
      "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente do container " +
      "(Coolify → Environment / Secrets, em runtime — não em Build Arguments). " +
      "O arquivo server/.env do seu PC não é copiado para a imagem Docker."
    );
  }
  return "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no server/.env (chave service_role do Supabase).";
}

async function findAuthUserByEmail(admin, email) {
  const target = String(email).toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (!data.users.length || data.users.length < 200) return null;
    page += 1;
  }
}

function emailDominioPermitido(email) {
  const e = String(email).toLowerCase();
  return DOMINIOS_PERMITIDOS.some((d) => e.endsWith(d.toLowerCase()));
}

/** Slug em `painel_schools` — alinhar ao `VITE_SCHOOL_SLUG` do build do front. */
const PAINEL_SCHOOL_SLUG = (process.env.PAINEL_SCHOOL_SLUG || process.env.VITE_SCHOOL_SLUG || "demo").trim();

function normalizarCaminhoOu(path) {
  let s = String(path)
    .trim()
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .replace(/\s+/g, " ");
  if (!s.startsWith("/")) s = `/${s}`;
  s = s.replace(/\/+/g, "/").replace(/\/+$/, "");
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

const RE_OU_PAINEL_SECRETARIA = /(^|\/)administrativo\/secretaria(\/|$)/;
const RE_OU_PAINEL_ADMIN = /(^|\/)administrativo\/(setape|direcao)(\/|$)/;

function ouPainelAtendentePeloCaminho(chave) {
  if (RE_OU_PAINEL_SECRETARIA.test(chave)) return true;
  const prefixo = normalizarCaminhoOu("/Administrativo/Secretaria");
  return chave === prefixo || chave.startsWith(`${prefixo}/`);
}

function ouPainelAdminPeloCaminho(chave) {
  if (RE_OU_PAINEL_ADMIN.test(chave)) return true;
  for (const segmento of ["setape", "direcao"]) {
    const label = segmento === "direcao" ? "Direção" : "Setape";
    const prefixo = normalizarCaminhoOu(`/Administrativo/${label}`);
    if (chave === prefixo || chave.startsWith(`${prefixo}/`)) return true;
  }
  return false;
}

function painelPermissoesDoOrgUnit(orgUnitPath) {
  if (!orgUnitPath || String(orgUnitPath).trim() === "") {
    return { atendente: false, admin: false };
  }
  const chave = normalizarCaminhoOu(orgUnitPath);
  return {
    atendente: ouPainelAtendentePeloCaminho(chave),
    admin: ouPainelAdminPeloCaminho(chave),
  };
}

/** Legado: e-mails que podem passar no sync de perfil do painel sem critério de OU (dev/teste). Não usado no front. */
const PAINEL_LOCAL_ALLOW_EMAILS = (process.env.PAINEL_LOCAL_ALLOW_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function emailPainelLocalPermitido(email) {
  const e = String(email).toLowerCase();
  return PAINEL_LOCAL_ALLOW_EMAILS.length > 0 && PAINEL_LOCAL_ALLOW_EMAILS.includes(e);
}

/** Um ou mais Client IDs OAuth (mesmo valor de VITE_GOOGLE_CLIENT_ID no front); separados por vírgula se precisar. */
const GOOGLE_CLIENT_IDS = (process.env.GOOGLE_CLIENT_ID || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const GOOGLE_ADMIN_IMPERSONATE = process.env.GOOGLE_ADMIN_IMPERSONATE;
const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const GOOGLE_SERVICE_ACCOUNT_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
/** Opcional: caminho da OU (ex.: /Administrativo/CCI) para listar só Chromebooks dessa unidade. */
const GOOGLE_CHROMEBOOK_ORG_UNIT = process.env.GOOGLE_CHROMEBOOK_ORG_UNIT?.trim() || "";

const DATA_DIR = path.join(__dirname, "data");
const ARQUIVO_RESERVAS_AGENDA = path.join(DATA_DIR, "agenda-cci-reservas.json");
const ARQUIVO_PAPEIS_MANUAIS = path.join(DATA_DIR, "papeis-manuais.json");
const ARQUIVO_SETOR_LINKS = path.join(DATA_DIR, "setor-links.json");

/** Papéis atribuíveis apenas via API admin (extensível). */
const PAPEIS_MANUAIS_PERMITIDOS = ["admin", "painel_admin", "painel_atendente"];

/** Seed na primeira criação do arquivo (atribuição manual inicial). */
const PAPEIS_MANUAIS_SEED = {
  "thiago.ferreira@portalcci.com.br": ["admin"],
};
const AGENDA_CCI_TIMEZONE = process.env.AGENDA_CCI_TIMEZONE || "America/Sao_Paulo";
const AGENDA_CCI_POLL_MS = Number(process.env.AGENDA_CCI_POLL_MS) || 60_000;
const AGENDA_CCI_ENFORCE_DISABLE =
  process.env.AGENDA_CCI_ENFORCE_DISABLE === "true" ||
  process.env.AGENDA_CCI_ENFORCE_DISABLE === "1";
/** Se true e não houver nenhuma reserva salva, aplica disable em todo o parque (política dura). */
const AGENDA_CCI_DISABLE_WHEN_EMPTY =
  process.env.AGENDA_CCI_DISABLE_WHEN_EMPTY === "true" ||
  process.env.AGENDA_CCI_DISABLE_WHEN_EMPTY === "1";

/**
 * @returns {{ ok: true, parsed: object } | { ok: false, error: string }}
 */
function loadServiceAccountCredentials() {
  if (GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return { ok: true, parsed: JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON) };
    } catch (e) {
      return {
        ok: false,
        error: `GOOGLE_SERVICE_ACCOUNT_JSON inválido: ${e.message}`,
      };
    }
  }
  if (GOOGLE_SERVICE_ACCOUNT_PATH) {
    const rawPath = String(GOOGLE_SERVICE_ACCOUNT_PATH).trim();
    const fullPath = path.isAbsolute(rawPath)
      ? rawPath
      : path.resolve(__dirname, rawPath);
    if (!fs.existsSync(fullPath)) {
      return {
        ok: false,
        error: `Arquivo não encontrado: ${fullPath}. Salve o JSON da service account (Google Cloud → chave) nesse caminho ou ajuste GOOGLE_SERVICE_ACCOUNT_PATH.`,
      };
    }
    try {
      const raw = fs.readFileSync(fullPath, "utf8");
      return { ok: true, parsed: JSON.parse(raw) };
    } catch (e) {
      return {
        ok: false,
        error: `Não foi possível ler ou interpretar o JSON em ${fullPath}: ${e.message}`,
      };
    }
  }
  return {
    ok: false,
    error:
      "Defina GOOGLE_SERVICE_ACCOUNT_PATH (caminho para o .json) ou GOOGLE_SERVICE_ACCOUNT_JSON no server/.env.",
  };
}

function getServiceAccountCredentials() {
  const r = loadServiceAccountCredentials();
  if (!r.ok) {
    console.error("[service-account]", r.error);
    return null;
  }
  return r.parsed;
}

/** Motivo legível quando JWT Admin não pode ser criado (arquivo ausente, JSON inválido, etc.). */
function getServiceAccountSetupError() {
  const r = loadServiceAccountCredentials();
  if (!r.ok) return r.error;
  if (!GOOGLE_ADMIN_IMPERSONATE) {
    return "Defina GOOGLE_ADMIN_IMPERSONATE no server/.env (e-mail de um administrador do Google Workspace).";
  }
  return null;
}

/**
 * Escopos separados: um único JWT com user + chrome exige que AMBOS estejam na delegação.
 * Se só `user.readonly` estiver autorizado no Admin, o token falhava e a OU/papéis não carregavam.
 */
const SCOPE_ADMIN_USER_READONLY =
  "https://www.googleapis.com/auth/admin.directory.user.readonly";
const SCOPE_ADMIN_CHROME_DEVICE =
  "https://www.googleapis.com/auth/admin.directory.device.chromeos";
const SCOPE_ADMIN_USER_WRITE =
  "https://www.googleapis.com/auth/admin.directory.user";


function getAdminJwtForScopes(scopes) {
  const credentials = getServiceAccountCredentials();
  if (!credentials || !GOOGLE_ADMIN_IMPERSONATE) return null;
  try {
    return new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes,
      subject: GOOGLE_ADMIN_IMPERSONATE,
    });
  } catch (e) {
    console.error("Erro ao criar JWT Admin:", e.message);
    return null;
  }
}

/** Só para `/api/organizacao` (OU → papéis no front). */
function getJwtOrganizacao() {
  return getAdminJwtForScopes([SCOPE_ADMIN_USER_READONLY]);
}

/** Para criação de contas de alunos no Google Workspace. */
function getJwtWorkspaceUserWrite() {
  return getAdminJwtForScopes([SCOPE_ADMIN_USER_WRITE]);
}


/** Listagem de Chromebooks + disable/reenable na agenda. Exige escopo delegado à service account. */
function getJwtChromeOs() {
  return getAdminJwtForScopes([SCOPE_ADMIN_CHROME_DEVICE]);
}

/**
 * JWT dedicado para envio de e-mail via Gmail API.
 * IMPORTANTE: o `subject` deve ser o mesmo endereço usado como `userId` na chamada
 * (EMAIL_REMETENTE), e não GOOGLE_ADMIN_IMPERSONATE.
 * Quando diferem, o Google retorna "Delegation denied for <conta>".
 */
function getJwtParaEmail() {
  const remetente = (
    process.env.EMAIL_REMETENTE ||
    process.env.GOOGLE_ADMIN_IMPERSONATE ||
    ""
  ).trim();
  if (!remetente) return null;
  const credentials = getServiceAccountCredentials();
  if (!credentials) return null;
  try {
    return new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/gmail.send"],
      subject: remetente,
    });
  } catch (e) {
    console.error("[email] Erro ao criar JWT para Gmail:", e.message);
    return null;
  }
}

/**
 * Valida o ID token do usuário e retorna o email (domínio já conferido).
 * @returns {{ email: string }}
 */
async function verificarIdTokenUsuario(idToken) {
  if (!idToken || typeof idToken !== "string") {
    const err = new Error("idToken é obrigatório no body.");
    err.status = 400;
    throw err;
  }

  if (GOOGLE_CLIENT_IDS.length === 0) {
    const err = new Error("GOOGLE_CLIENT_ID não configurado no servidor.");
    err.status = 500;
    throw err;
  }

  const payloadUnsafe = decodeJwtPayloadUnsafe(idToken);
  const audRaw = payloadUnsafe?.aud;
  const audDoToken = Array.isArray(audRaw) ? audRaw[0] : audRaw;
  if (audDoToken && !GOOGLE_CLIENT_IDS.includes(audDoToken)) {
    console.error(
      "[verify] aud do token não bate com GOOGLE_CLIENT_ID no .env:",
      { audDoToken, configurado: GOOGLE_CLIENT_IDS },
    );
    const err = new Error(
      "O Client ID OAuth do token (aud) não corresponde ao GOOGLE_CLIENT_ID do servidor.",
    );
    err.status = 401;
    err.audDoToken = audDoToken;
    throw err;
  }

  const audience =
    GOOGLE_CLIENT_IDS.length === 1 ? GOOGLE_CLIENT_IDS[0] : GOOGLE_CLIENT_IDS;
  const client = new OAuth2Client(GOOGLE_CLIENT_IDS[0]);
  const ticket = await client.verifyIdToken({
    idToken,
    audience,
  });
  const payload = ticket.getPayload();
  const email = payload?.email;

  if (!email) {
    const err = new Error("Token sem email.");
    err.status = 400;
    throw err;
  }

  if (!emailDominioPermitido(email)) {
    const err = new Error(
      `Apenas contas dos domínios ${DOMINIOS_PERMITIDOS.join(", ")} são permitidas.`,
    );
    err.status = 403;
    throw err;
  }

  return { email };
}

function textoIndicaHdmi(...partes) {
  const s = partes.filter(Boolean).join(" ").toLowerCase();
  // Importante: "SEM HDMI" também contém a palavra HDMI,
  // então precisamos tratar negativas antes.
  if (/\bsem\b\s*(entrada\s*)?\bhdmi\b/.test(s)) return false;
  if (/\bnao\b\s*(entrada\s*)?\bhdmi\b/.test(s)) return false;
  if (/\b(n[aã]o)\b\s*(entrada\s*)?\bhdmi\b/.test(s)) return false;

  if (/\bcom\b\s*(entrada\s*)?\bhdmi\b/.test(s)) return true;

  // Fallback: se mencionar HDMI sem indicar "sem", consideramos como com HDMI.
  return /\bhdmi\b/.test(s);
}

function ensureDataDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("[agenda-cci] não foi possível criar", DATA_DIR, e.message);
  }
}

function sanitizeReservaPayload(payload) {
  return typeof payload === "object" && payload !== null ? payload : null;
}

async function lerReservasSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  const { data, error } = await supabase
    .from("agenda_cci_reservas")
    .select("payload, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`[agenda-cci/supabase] leitura: ${error.message}`);
  }
  const lista = (data || [])
    .map((row) => sanitizeReservaPayload(row.payload))
    .filter((x) => (Array.isArray(x) ? false : Boolean(x)));
  return Array.isArray(lista) ? lista : [];
}

async function salvarReservasSupabase(lista) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  const nowIso = new Date().toISOString();
  const rows = lista.map((reserva) => ({
    id: String(reserva.id),
    payload: reserva,
    created_at: reserva.criadoEm || nowIso,
    updated_at: nowIso,
  }));
  const ids = new Set(rows.map((r) => r.id));

  const { error: upsertError } = await supabase
    .from("agenda_cci_reservas")
    .upsert(rows, { onConflict: "id" });
  if (upsertError) {
    throw new Error(`[agenda-cci/supabase] escrita: ${upsertError.message}`);
  }

  const { data: existing, error: listError } = await supabase
    .from("agenda_cci_reservas")
    .select("id");
  if (listError) {
    throw new Error(`[agenda-cci/supabase] listagem pós-upsert: ${listError.message}`);
  }
  const removerIds = (existing || [])
    .map((r) => String(r.id))
    .filter((id) => !ids.has(id));
  if (removerIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("agenda_cci_reservas")
      .delete()
      .in("id", removerIds);
    if (deleteError) {
      throw new Error(`[agenda-cci/supabase] remoção de órfãos: ${deleteError.message}`);
    }
  }
  return true;
}

function lerReservasArquivo() {
  try {
    const raw = fs.readFileSync(ARQUIVO_RESERVAS_AGENDA, "utf8");
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

function salvarReservasArquivo(lista) {
  ensureDataDir();
  fs.writeFileSync(
    ARQUIVO_RESERVAS_AGENDA,
    JSON.stringify(lista, null, 2),
    "utf8",
  );
}

function textoResumoReservasParaGoogle(r) {
  if (r.tipo === "composta") {
    const p = [];
    const n = r.chromebookIds ? r.chromebookIds.length : 0;
    if (n > 0) p.push(`${n} Chromebooks`);
    
    const eqList = r.equipamentos || [];
    for (const eq of eqList) {
      if (eq && eq.nome) p.push(`${eq.nome} x ${eq.quantity || eq.quantidade}`);
    }
    if (r.espacoNome) p.push(r.espacoNome);
    return p.length ? p.join(" · ") : "Reserva composta";
  }
  if (r.tipo === "chromebook") {
    const n = r.chromebookIds ? r.chromebookIds.length : 0;
    return `${n} Chromebooks`;
  }
  if (r.tipo === "equipamento") {
    return `${r.equipamentoNome || "Equipamento"} · ${r.equipamentoQuantidade || 0} un.`;
  }
  return r.espacoNome || "Espaço";
}

async function sincronizarReservasComGoogleCalendar(novaLista, oldLista) {
  const mainCalendarId = process.env.GOOGLE_CALENDAR_ID;
  const salasCalendarId = process.env.GOOGLE_CALENDAR_SALAS_ID || mainCalendarId;
  if (!mainCalendarId) return;

  const auth = getAdminJwtForScopes(["https://www.googleapis.com/auth/calendar"]);
  if (!auth) {
    console.warn("[google-calendar-sync] Sem credenciais para sincronizar.");
    return;
  }

  const getCalendarId = (res) => {
    return res && res.destinoCalendar === "agenda_cci" ? mainCalendarId : salasCalendarId;
  };

  try {
    await auth.authorize();
    const calendar = google.calendar({ version: "v3", auth });
    const oldMap = new Map(oldLista.map((r) => [r.id, r]));
    const novosIds = new Set(novaLista.map((r) => r.id));

    // 1. Processar criações e atualizações
    for (const r of novaLista) {
      const oldR = oldMap.get(r.id);
      const isCancelado = r.status === "cancelada";
      const targetCalendarId = getCalendarId(r);

      if (isCancelado) {
        // Se foi cancelado e tinha evento no Google, remove
        const eventId = r.googleEventId || oldR?.googleEventId;
        if (eventId) {
          const cancelCalendarId = getCalendarId(r) || (oldR ? getCalendarId(oldR) : salasCalendarId);
          try {
            await calendar.events.delete({
              calendarId: cancelCalendarId,
              eventId,
            });
            console.log(`[google-calendar-sync] Evento removido (cancelado): ${r.id} do calendário ${cancelCalendarId}`);
          } catch (e) {
            console.error(`[google-calendar-sync] Erro ao remover evento cancelado ${r.id} do calendário ${cancelCalendarId}:`, e.message);
          }
          delete r.googleEventId;
          if (oldR) delete oldR.googleEventId;
        }
        continue;
      }

      // Reserva ativa
      const eventDetails = {
        summary: r.titulo ? `${r.titulo} - ${r.solicitanteNome}` : `${textoResumoReservasParaGoogle(r)} - ${r.solicitanteNome}`,
        description: `Reserva Intranet CCI\n\nSolicitante: ${r.solicitanteNome} (${r.solicitanteEmail})\nRecursos: ${textoResumoReservasParaGoogle(r)}\nObservação: ${r.observacao || "Nenhuma"}\nID da Reserva: ${r.id}`,
        start: {
          dateTime: `${r.data}T${r.inicio}:00`,
          timeZone: AGENDA_CCI_TIMEZONE,
        },
        end: {
          dateTime: `${r.data}T${r.fim}:00`,
          timeZone: AGENDA_CCI_TIMEZONE,
        },
      };

      let eventId = r.googleEventId || oldR?.googleEventId;

      // Se o calendário de destino mudou, apaga do antigo e cria no novo
      if (eventId && oldR && getCalendarId(oldR) !== targetCalendarId) {
        const oldTargetCalendarId = getCalendarId(oldR);
        try {
          await calendar.events.delete({
            calendarId: oldTargetCalendarId,
            eventId,
          });
          console.log(`[google-calendar-sync] Evento removido do antigo calendário ${oldTargetCalendarId} para migrar reserva: ${r.id}`);
        } catch (e) {
          console.error(`[google-calendar-sync] Erro ao remover evento no antigo calendário ${oldTargetCalendarId} para migrar:`, e.message);
        }
        eventId = undefined;
        delete r.googleEventId;
      }

      if (eventId) {
        // Atualizar se algo mudou
        const mudou =
          !oldR ||
          oldR.titulo !== r.titulo ||
          oldR.data !== r.data ||
          oldR.inicio !== r.inicio ||
          oldR.fim !== r.fim ||
          oldR.observacao !== r.observacao ||
          oldR.status !== r.status;

        if (mudou) {
          try {
            await calendar.events.update({
              calendarId: targetCalendarId,
              eventId,
              requestBody: eventDetails,
            });
            r.googleEventId = eventId;
            console.log(`[google-calendar-sync] Evento atualizado no Google Calendar: ${r.id} no calendário ${targetCalendarId}`);
          } catch (e) {
            console.error(`[google-calendar-sync] Erro ao atualizar evento ${r.id} no calendário ${targetCalendarId}:`, e.message);
            if (e.code === 404 || (e.response && e.response.status === 404)) {
              // Se o evento foi removido do Google Calendar, tentamos recriá-lo
              try {
                const created = await calendar.events.insert({
                  calendarId: targetCalendarId,
                  requestBody: eventDetails,
                });
                r.googleEventId = created.data.id;
                console.log(`[google-calendar-sync] Evento recriado (estava ausente no Google): ${r.id} no calendário ${targetCalendarId}`);
              } catch (insErr) {
                console.error(`[google-calendar-sync] Erro ao recriar evento para ${r.id} no calendário ${targetCalendarId}:`, insErr.message);
                delete r.googleEventId;
              }
            }
          }
        } else {
          r.googleEventId = eventId; // Mantém
        }
      } else {
        // Criar novo evento
        try {
          const created = await calendar.events.insert({
            calendarId: targetCalendarId,
            requestBody: eventDetails,
          });
          r.googleEventId = created.data.id;
          console.log(`[google-calendar-sync] Novo evento criado no Google Calendar para reserva: ${r.id} no calendário ${targetCalendarId}`);
        } catch (e) {
          console.error(`[google-calendar-sync] Erro ao criar evento para ${r.id} no calendário ${targetCalendarId}:`, e.message);
        }
      }
    }

    // 2. Processar remoções (deletados completamente da lista)
    for (const oldR of oldLista) {
      if (!novosIds.has(oldR.id) && oldR.googleEventId) {
        const targetCalendarId = getCalendarId(oldR);
        try {
          await calendar.events.delete({
            calendarId: targetCalendarId,
            eventId: oldR.googleEventId,
          });
          console.log(`[google-calendar-sync] Evento removido (deletado da lista): ${oldR.id} do calendário ${targetCalendarId}`);
        } catch (e) {
          console.error(`[google-calendar-sync] Erro ao remover evento deletado ${oldR.id} do calendário ${targetCalendarId}:`, e.message);
        }
      }
    }

  } catch (err) {
    console.error("[google-calendar-sync] Falha geral na sincronização com Google Calendar:", err.message);
  }
}

async function lerReservasPersistidas() {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      return await lerReservasSupabase();
    } catch (e) {
      console.warn("[lerReservasPersistidas] Falha ao ler do Supabase, caindo de volta para arquivo local:", e.message);
      return lerReservasArquivo();
    }
  }
  return lerReservasArquivo();
}

async function salvarReservasPersistidas(lista) {
  let oldLista = [];
  try {
    oldLista = await lerReservasPersistidas();
  } catch (e) {
    console.warn("[salvarReservasPersistidas] Não foi possível ler reservas anteriores para sincronizar:", e.message);
  }

  // Detecta reservas novas (IDs que não existiam antes) para envio de e-mail
  const oldIds = new Set(oldLista.map((r) => r.id));
  const novasReservas = lista.filter((r) => r.status === "ativa" && !oldIds.has(r.id));

  // Executa sincronização com o Google Calendar
  await sincronizarReservasComGoogleCalendar(lista, oldLista);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await salvarReservasSupabase(lista);
    } catch (e) {
      console.warn("[salvarReservasPersistidas] Falha ao salvar no Supabase, caindo de volta para arquivo local:", e.message);
      salvarReservasArquivo(lista);
    }
  } else {
    salvarReservasArquivo(lista);
  }

  // Dispara e-mails de confirmação de forma assíncrona para cada nova reserva
  if (novasReservas.length > 0) {
    setImmediate(() => {
      for (const reserva of novasReservas) {
        enviarEmailConfirmacaoReserva(reserva).catch((e) =>
          console.error("[email-reserva] Erro inesperado:", e.message)
        );
      }
    });
  }

  return true;
}

function normalizarEmailMapaPapeis(obj) {
  const out = {};
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    const email = String(k).trim().toLowerCase();
    if (!email.includes("@")) continue;
    const arr = Array.isArray(v) ? v : [];
    out[email] = [
      ...new Set(
        arr.filter((p) => typeof p === "string" && PAPEIS_MANUAIS_PERMITIDOS.includes(p)),
      ),
    ];
  }
  return out;
}

function lerPapeisManuaisArquivo() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(ARQUIVO_PAPEIS_MANUAIS, "utf8");
    const j = JSON.parse(raw);
    return normalizarEmailMapaPapeis(j);
  } catch (e) {
    if (e.code !== "ENOENT") {
      console.error("[papeis-manuais] leitura:", e.message);
    }
  }
  const inicial = normalizarEmailMapaPapeis(PAPEIS_MANUAIS_SEED);
  salvarPapeisManuaisArquivo(inicial);
  return inicial;
}

function salvarPapeisManuaisArquivo(mapa) {
  ensureDataDir();
  const limpo = normalizarEmailMapaPapeis(mapa);
  fs.writeFileSync(
    ARQUIVO_PAPEIS_MANUAIS,
    JSON.stringify(limpo, null, 2),
    "utf8",
  );
  return limpo;
}

function emailTemPapelAdminNoArquivo(email) {
  const e = String(email).trim().toLowerCase();
  const mapa = lerPapeisManuaisArquivo();
  const lista = mapa[e];
  return Array.isArray(lista) && lista.includes("admin");
}

async function listarTodosChromeosAdmin(admin) {
  const listParams = {
    customerId: "my_customer",
    maxResults: 200,
  };
  if (GOOGLE_CHROMEBOOK_ORG_UNIT) {
    listParams.orgUnitPath = GOOGLE_CHROMEBOOK_ORG_UNIT;
  }
  const out = [];
  let pageToken;
  do {
    const r = await admin.chromeosdevices.list({
      ...listParams,
      pageToken: pageToken || undefined,
    });
    const list = r.data.chromeosdevices || [];
    for (const d of list) {
      const st = (d.status || "").toUpperCase();
      if (st === "DEPROVISIONED") continue;
      out.push(d);
    }
    pageToken = r.data.nextPageToken;
  } while (pageToken);
  return out;
}

async function chromeosAcao(admin, resourceId, actionName) {
  await admin.chromeosdevices.action({
    customerId: "my_customer",
    resourceId,
    requestBody: { action: actionName },
  });
}

async function aplicarPoliticaChromebooks() {
  if (!AGENDA_CCI_ENFORCE_DISABLE) return;

  const auth = getJwtChromeOs();
  if (!auth) {
    console.warn(
      "[agenda-cci] AGENDA_CCI_ENFORCE_DISABLE ativo mas Admin SDK não configurado.",
      getServiceAccountSetupError() || "",
    );
    return;
  }

  try {
    await auth.authorize();
  } catch (e) {
    console.warn(
      "[agenda-cci] JWT Chrome OS não autorizado (delegação de escopo?). Desative AGENDA_CCI_ENFORCE_DISABLE ou adicione o escopo device.chromeos no Admin:",
      mensagemErroGoogle(e),
    );
    return;
  }
  const admin = google.admin({ version: "directory_v1", auth });

  let devices;
  try {
    devices = await listarTodosChromeosAdmin(admin);
  } catch (e) {
    console.error("[agenda-cci] listar Chromebooks:", mensagemErroGoogle(e));
    return;
  }

  const reservas = await lerReservasPersistidas();
  const { ymd, minutes } = agoraLocalParts(AGENDA_CCI_TIMEZONE);

  if (!reservas.length) {
    if (AGENDA_CCI_DISABLE_WHEN_EMPTY) {
      for (const d of devices) {
        if (dispositivoEstaDisabled(d)) continue;
        try {
          await chromeosAcao(admin, d.deviceId, "disable");
          console.log(`[agenda-cci] disable (sem reservas, política dura): ${d.deviceId}`);
        } catch (e) {
          console.warn(
            `[agenda-cci] disable ${d.deviceId}:`,
            mensagemErroGoogle(e),
          );
        }
        await new Promise((r) => setTimeout(r, 250));
      }
    } else {
      for (const d of devices) {
        if (!dispositivoEstaDisabled(d)) continue;
        try {
          await chromeosAcao(admin, d.deviceId, "reenable");
          console.log(`[agenda-cci] reenable (lista vazia, recuperação): ${d.deviceId}`);
        } catch (e) {
          console.warn(
            `[agenda-cci] reenable ${d.deviceId}:`,
            mensagemErroGoogle(e),
          );
        }
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    return;
  }

  for (const d of devices) {
    const id = d.deviceId;
    const deveHabilitar = estaEmJanelaReservaAtiva(id, reservas, ymd, minutes);
    const disabled = dispositivoEstaDisabled(d);

    if (deveHabilitar && disabled) {
      try {
        await chromeosAcao(admin, id, "reenable");
        console.log(`[agenda-cci] reenable (janela de reserva): ${id}`);
      } catch (e) {
        console.warn(`[agenda-cci] reenable ${id}:`, mensagemErroGoogle(e));
      }
    } else if (!deveHabilitar && !disabled) {
      try {
        await chromeosAcao(admin, id, "disable");
        console.log(`[agenda-cci] disable (fora da reserva): ${id}`);
      } catch (e) {
        console.warn(`[agenda-cci] disable ${id}:`, mensagemErroGoogle(e));
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** Decodifica payload do JWT (sem validar assinatura) — só para ler `aud` e diagnosticar mismatch de Client ID. */
function decodeJwtPayloadUnsafe(idToken) {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const base64url = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (base64url.length % 4)) % 4;
    const base64 = base64url + "=".repeat(padLen);
    const json = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function mensagemErroGoogle(err) {
  const d = err?.response?.data;
  if (d?.error) {
    if (typeof d.error === "string") return d.error;
    if (typeof d.error === "object" && d.error !== null) {
      if (d.error.message) return d.error.message;
      if (d.error.errors?.[0]?.message) return d.error.errors[0].message;
      try {
        return JSON.stringify(d.error);
      } catch {
        /* fallthrough */
      }
    }
  }
  if (d && typeof d === "object" && !d.error) {
    try {
      return JSON.stringify(d);
    } catch {
      /* fallthrough */
    }
  }
  if (err?.errors?.[0]?.message) return err.errors[0].message;
  return err?.message || String(err);
}

/**
 * POST /api/organizacao
 * Body: { idToken: "<google-id-token>" }
 * Valida o token, extrai o email e consulta o Google Admin SDK para retornar orgUnitPath.
 */
app.post("/api/organizacao", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    let email;
    try {
      ({ email } = await verificarIdTokenUsuario(idToken));
    } catch (e) {
      const st = e.status || 500;
      if (st === 401 && e.audDoToken) {
        return res.status(st).json({
          error: `${e.message} Use o mesmo valor de VITE_GOOGLE_CLIENT_ID no server/.env.`,
          audDoToken: e.audDoToken,
        });
      }
      return res.status(st).json({ error: e.message });
    }

    const auth = getJwtOrganizacao();
    if (!auth) {
      const detalhe =
        getServiceAccountSetupError() ||
        "Falha ao criar JWT do Admin SDK (confira o JSON da service account).";
      return res.status(500).json({
        error:
          "Servidor não configurado para Admin SDK. Defina GOOGLE_SERVICE_ACCOUNT_JSON (ou GOOGLE_SERVICE_ACCOUNT_PATH) e GOOGLE_ADMIN_IMPERSONATE.",
        detalhe,
      });
    }

    try {
      await auth.authorize();
    } catch (authErr) {
      const det = mensagemErroGoogle(authErr);
      console.error("Erro /api/organizacao (JWT usuário):", det, authErr?.response?.data);
      return res.status(503).json({
        error:
          "A service account não obteve token para ler o diretório de usuários. No Admin do Google Workspace (Delegação em todo o domínio), use o Client ID numérico desta service account e autorize o escopo https://www.googleapis.com/auth/admin.directory.user.readonly",
        detalhe: det,
      });
    }

    const admin = google.admin({ version: "directory_v1", auth });
    const user = await admin.users.get({
      userKey: email,
      /** BASIC por vezes omite campos; FULL garante `orgUnitPath` (ex.: OUs na raiz como /Alunos FACULDADE). */
      projection: "full",
    });
    const rawOu = user.data?.orgUnitPath ?? user.data?.org_unit_path;
    const orgUnitPath =
      rawOu != null && String(rawOu).trim() !== "" ? String(rawOu).trim() : null;

    if (!orgUnitPath && process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[api/organizacao] users.get sem orgUnitPath; projection=full. Chaves em data:",
        user.data ? Object.keys(user.data).filter((k) => /org|unit|path/i.test(k)) : [],
      );
    }

    return res.json({ orgUnitPath, email });
  } catch (err) {
    if (err.code === 404 || err.response?.status === 404) {
      return res.status(404).json({
        error: "Usuário não encontrado no diretório do Google Workspace.",
      });
    }
    const msg = mensagemErroGoogle(err);
    console.error("Erro /api/organizacao:", msg, err?.response?.data || err);
    return res.status(500).json({
      error: msg || "Erro ao obter unidade organizacional.",
    });
  }
});

/**
 * POST /api/chromebooks
 * Body: { idToken }
 * Lista Chrome OS devices (ativos) do Workspace via Admin SDK.
 */
app.post("/api/chromebooks", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    try {
      await verificarIdTokenUsuario(idToken);
    } catch (e) {
      const st = e.status || 500;
      if (st === 401 && e.audDoToken) {
        return res.status(st).json({
          error: `${e.message} Use o mesmo valor de VITE_GOOGLE_CLIENT_ID no server/.env.`,
          audDoToken: e.audDoToken,
        });
      }
      return res.status(st).json({ error: e.message });
    }

    const auth = getJwtChromeOs();
    if (!auth) {
      const detalhe =
        getServiceAccountSetupError() ||
        "Falha ao criar JWT do Admin SDK (confira o JSON da service account).";
      return res.status(500).json({
        error:
          "Servidor não configurado para Admin SDK. Defina GOOGLE_SERVICE_ACCOUNT_JSON (ou GOOGLE_SERVICE_ACCOUNT_PATH) e GOOGLE_ADMIN_IMPERSONATE.",
        detalhe,
      });
    }

    try {
      await auth.authorize();
    } catch (authErr) {
      const det = mensagemErroGoogle(authErr);
      console.error("Erro /api/chromebooks (JWT Chrome):", det, authErr?.response?.data);
      return res.status(503).json({
        error:
          "A service account não conseguiu autorizar o escopo de Chrome OS. No Admin do Google Workspace, em delegação em todo o domínio, autorize o Client ID numérico da service account com o escopo https://www.googleapis.com/auth/admin.directory.device.chromeos (além de user.readonly para a OU).",
        detalhe: det,
      });
    }
    const admin = google.admin({ version: "directory_v1", auth });
    const raw = await listarTodosChromeosAdmin(admin);
    const devices = raw.map((d) => {
      const notes = d.notes || "";
      const asset = d.annotatedAssetId || "";
      const loc = d.annotatedLocation || "";
      const model = d.model || "";
      const st = (d.status || "").toUpperCase();
      return {
        id: d.deviceId,
        serialNumber: d.serialNumber || undefined,
        annotatedAssetId: d.annotatedAssetId || undefined,
        notes: notes || undefined,
        label:
          notes ||
          [d.annotatedAssetId, d.serialNumber].filter(Boolean).join(" · ") ||
          d.deviceId,
        model: d.model || undefined,
        hasHdmi: textoIndicaHdmi(notes, asset, loc, model),
        adminStatus: st || undefined,
      };
    });

    devices.sort((a, b) =>
      String(a.label).localeCompare(String(b.label), "pt-BR"),
    );

    return res.json({ devices });
  } catch (err) {
    const msg = mensagemErroGoogle(err);
    console.error("Erro /api/chromebooks:", msg, err?.response?.data || err);
    return res.status(500).json({
      error: msg || "Erro ao listar Chromebooks.",
    });
  }
});

/**
 * POST /api/agenda-cci/reservas
 * Body: { idToken, reservas: [...] }
 * Persiste reservas no servidor (para o worker de disable/reenable).
 */
app.post("/api/agenda-cci/reservas", async (req, res) => {
  try {
    const { idToken, reservas } = req.body || {};
    try {
      await verificarIdTokenUsuario(idToken);
    } catch (e) {
      const st = e.status || 500;
      if (st === 401 && e.audDoToken) {
        return res.status(st).json({
          error: `${e.message} Use o mesmo valor de VITE_GOOGLE_CLIENT_ID no server/.env.`,
          audDoToken: e.audDoToken,
        });
      }
      return res.status(st).json({ error: e.message });
    }
    if (!Array.isArray(reservas)) {
      return res.status(400).json({ error: "reservas deve ser um array." });
    }
    await salvarReservasPersistidas(reservas);
    setImmediate(() =>
      aplicarPoliticaChromebooks().catch((e) => console.error(e)),
    );
    return res.json({ ok: true });
  } catch (err) {
    const msg = mensagemErroGoogle(err);
    console.error("Erro /api/agenda-cci/reservas:", msg);
    return res.status(500).json({ error: msg || "Erro ao salvar reservas." });
  }
});

/**
 * POST /api/agenda-cci/reservas/obter
 * Body: { idToken }
 */
app.post("/api/agenda-cci/reservas/obter", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    try {
      await verificarIdTokenUsuario(idToken);
    } catch (e) {
      const st = e.status || 500;
      if (st === 401 && e.audDoToken) {
        return res.status(st).json({
          error: `${e.message} Use o mesmo valor de VITE_GOOGLE_CLIENT_ID no server/.env.`,
          audDoToken: e.audDoToken,
        });
      }
      return res.status(st).json({ error: e.message });
    }
    return res.json({ reservas: await lerReservasPersistidas() });
  } catch (err) {
    const msg = mensagemErroGoogle(err);
    console.error("Erro /api/agenda-cci/reservas/obter:", msg);
    return res.status(500).json({ error: msg || "Erro ao ler reservas." });
  }
});

/**
 * POST /api/agenda-cci/google-events
 * Body: { idToken, timeMin, timeMax }
 * Retorna os eventos do Google Calendar para o período.
 */
app.post("/api/agenda-cci/google-events", async (req, res) => {
  try {
    const { idToken, timeMin, timeMax } = req.body || {};
    try {
      await verificarIdTokenUsuario(idToken);
    } catch (e) {
      return respostaErroIdToken(res, e);
    }

    const calendarIds = [
      process.env.GOOGLE_CALENDAR_ID,
      process.env.GOOGLE_CALENDAR_SALAS_ID,
    ].filter(Boolean);

    if (calendarIds.length === 0) {
      console.warn("[google-calendar] Nenhum ID de Google Calendar configurado. Retornando array vazio.");
      return res.json({ events: [] });
    }

    const auth = getAdminJwtForScopes(["https://www.googleapis.com/auth/calendar"]);
    if (!auth) {
      console.warn("[google-calendar] Não foi possível obter credenciais para Google Calendar (verifique o JSON da service account e GOOGLE_ADMIN_IMPERSONATE).");
      return res.json({ events: [] });
    }

    try {
      await auth.authorize();
      const calendar = google.calendar({ version: "v3", auth });
      
      const fetchPromises = calendarIds.map(async (calId) => {
        try {
          const response = await calendar.events.list({
            calendarId: calId,
            timeMin: timeMin || new Date().toISOString(),
            timeMax: timeMax || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            singleEvents: true,
          });
          const items = response.data.items || [];
          return items.map((item) => ({ ...item, calendarId: calId }));
        } catch (calErr) {
          console.error(`[google-calendar] Erro ao listar eventos do calendar ${calId}:`, mensagemErroGoogle(calErr));
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const allEvents = results.flat();

      // Deduplicar eventos por id
      const seenIds = new Set();
      const uniqueEvents = [];
      for (const ev of allEvents) {
        if (!ev.id) continue;
        if (!seenIds.has(ev.id)) {
          seenIds.add(ev.id);
          uniqueEvents.push(ev);
        }
      }

      // Ordenar por horário de início
      const getStartTime = (e) => {
        if (e.start?.dateTime) return new Date(e.start.dateTime).getTime();
        if (e.start?.date) return new Date(e.start.date).getTime();
        return 0;
      };
      uniqueEvents.sort((a, b) => getStartTime(a) - getStartTime(b));

      return res.json({ events: uniqueEvents });
    } catch (apiErr) {
      const msg = mensagemErroGoogle(apiErr);
      console.error("[google-calendar] Erro geral ao listar eventos do Google Calendar:", msg, apiErr?.response?.data || apiErr);
      // Retorna sucesso com array vazio para resiliência no frontend, mas informando que houve falha
      return res.json({ events: [], error: msg || "Erro de permissão ou API no Google Calendar." });
    }
  } catch (err) {
    const msg = mensagemErroGoogle(err);
    console.error("Erro /api/agenda-cci/google-events:", msg);
    return res.status(500).json({ error: msg || "Erro ao obter eventos da Google." });
  }
});

function respostaErroIdToken(res, e) {
  const st = e.status || 500;
  if (st === 401 && e.audDoToken) {
    return res.status(st).json({
      error: `${e.message} Use o mesmo valor de VITE_GOOGLE_CLIENT_ID no server/.env.`,
      audDoToken: e.audDoToken,
    });
  }
  return res.status(st).json({ error: e.message });
}

/**
 * Envia e-mail de notificação de solução de chamado via Gmail API (service account).
 * Disparado de forma assíncrona — não bloqueia a resposta HTTP.
 * @param {{ id: string, titulo: string, solicitante: string, solicitanteEmail: string, data: string, solucao: { autor: string, texto: string, data: string } }} chamado
 */
async function enviarEmailSolucaoChamado(chamado) {
  const remetente = (
    process.env.EMAIL_REMETENTE ||
    process.env.GOOGLE_ADMIN_IMPERSONATE ||
    ""
  ).trim();

  if (!remetente) {
    console.warn("[email-chamado] EMAIL_REMETENTE não configurado — e-mail de solução não enviado.");
    return;
  }

  const auth = getJwtParaEmail();
  if (!auth) {
    console.warn("[email-chamado] Sem credenciais para enviar e-mail (EMAIL_REMETENTE ou service account não configurado).");
    return;
  }

  try {
    await auth.authorize();
  } catch (e) {
    console.error("[email-chamado] Falha ao autorizar JWT Gmail:", e.message);
    console.error("[email-chamado] Verifique se o escopo https://www.googleapis.com/auth/gmail.send está na delegação em todo o domínio.");
    return;
  }

  const destinatario = chamado.solicitanteEmail;
  const assunto = `✅ Seu chamado [${chamado.id}] foi resolvido`;
  const solucaoTexto = chamado.solucao?.texto || "";
  const solucaoAutor = chamado.solucao?.autor || "Equipe Setape";
  const _solucaoDataRaw = chamado.solucao?.data || "";
  let solucaoData = "";
  if (_solucaoDataRaw) {
    const _parsed = new Date(_solucaoDataRaw);
    solucaoData = isNaN(_parsed.getTime())
      ? _solucaoDataRaw
      : _parsed.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  }

  const htmlBody = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1a56db; padding: 24px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 20px; }
    .body { padding: 24px 32px; color: #333; }
    .info-box { background: #f0f4ff; border-left: 4px solid #1a56db; border-radius: 4px; padding: 14px 18px; margin: 16px 0; }
    .info-box p { margin: 4px 0; font-size: 14px; }
    .solution-box { background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px; padding: 14px 18px; margin: 16px 0; white-space: pre-wrap; font-size: 14px; color: #166534; }
    .footer { padding: 16px 32px; background: #f4f4f4; font-size: 12px; color: #888; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Chamado Resolvido</h1>
    </div>
    <div class="body">
      <p>Olá, <strong>${chamado.solicitante}</strong>!</p>
      <p>Seu chamado foi resolvido. Confira os detalhes abaixo:</p>
      <div class="info-box">
        <p><strong>📌 Chamado:</strong> ${chamado.titulo}</p>
        <p><strong>🆔 ID:</strong> ${chamado.id}</p>
        <p><strong>📅 Aberto em:</strong> ${chamado.data}</p>
      </div>
      <p><strong>✅ Solução registrada por ${solucaoAutor}${solucaoData ? ` em ${solucaoData}` : ""}:</strong></p>
      <div class="solution-box">${solucaoTexto}</div>
      <p>Se tiver dúvidas, acesse a intranet e consulte o chamado.</p>
    </div>
    <div class="footer">Este é um e-mail automático da Intranet CCI. Não responda este e-mail.</div>
  </div>
</body>
</html>`;

  // Monta a mensagem RFC 2822 em Base64url
  const rawMessage = [
    `From: Intranet CCI <${remetente}>`,
    `To: ${destinatario}`,
    `Reply-To: ${remetente}`,
    `Subject: =?UTF-8?B?${Buffer.from(assunto).toString("base64")}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "X-Mailer: Intranet-CCI/1.0",
    "X-Auto-Submitted: auto-generated",
    "Precedence: transactional",
    "",
    htmlBody,
  ].join("\r\n");

  const encoded = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.messages.send({
      userId: remetente,
      requestBody: { raw: encoded },
    });
    console.log(`[email-chamado] E-mail de solução enviado para ${destinatario} (chamado ${chamado.id}).`);
  } catch (e) {
    console.error(`[email-chamado] Falha ao enviar e-mail para ${destinatario}:`, e.message);
  }
}

/**
 * Formata data no padrão ISO (yyyy-MM-dd) para dd/MM/yyyy.
 * Se já vier formatada, devolve como está.
 */
function formatarDataBR(data) {
  if (!data) return "";
  const m = String(data).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return String(data);
}

/**
 * Monta o resumo de recursos da reserva em linhas de HTML para o e-mail.
 */
function resumoRecursosHtml(reserva) {
  const linhas = [];

  // Chromebooks
  if (Array.isArray(reserva.chromebookIds) && reserva.chromebookIds.length > 0) {
    const total = reserva.chromebookIds.length;
    let comHdmi = 0;
    if (Array.isArray(reserva.chromebooksEntrega)) {
      comHdmi = reserva.chromebooksEntrega.filter((c) => c.hasHdmi).length;
    }
    const semHdmi = total - comHdmi;
    const partes = [];
    if (comHdmi > 0) partes.push(`${comHdmi} com HDMI`);
    if (semHdmi > 0) partes.push(`${semHdmi} sem HDMI`);
    linhas.push(`<p><strong>💻 Chromebooks:</strong> ${total} unidade(s)${partes.length ? ` (${partes.join(" · ")})` : ""}</p>`);
  }

  // Equipamentos
  if (Array.isArray(reserva.equipamentos) && reserva.equipamentos.length > 0) {
    for (const eq of reserva.equipamentos) {
      linhas.push(`<p><strong>📦 Equipamento:</strong> ${eq.nome} × ${eq.quantidade}</p>`);
    }
  } else if (reserva.equipamentoNome && reserva.equipamentoQuantidade) {
    linhas.push(`<p><strong>📦 Equipamento:</strong> ${reserva.equipamentoNome} × ${reserva.equipamentoQuantidade}</p>`);
  }

  // Espaço
  if (reserva.espacoNome) {
    linhas.push(`<p><strong>📍 Espaço:</strong> ${reserva.espacoNome}</p>`);
  }

  if (linhas.length === 0) {
    linhas.push("<p>Nenhum recurso identificado.</p>");
  }
  return linhas.join("\n        ");
}

/**
 * Envia e-mail de confirmação de reserva de equipamentos/espaços via Gmail API.
 * @param {object} reserva — objeto completo da reserva (ReservaAgendaCCI)
 */
async function enviarEmailConfirmacaoReserva(reserva) {
  const destinatario = reserva.solicitanteEmail;
  if (!destinatario) {
    console.warn("[email-reserva] Reserva sem solicitanteEmail — e-mail não enviado.", reserva.id);
    return;
  }

  const remetente = (
    process.env.EMAIL_REMETENTE ||
    process.env.GOOGLE_ADMIN_IMPERSONATE ||
    ""
  ).trim();

  if (!remetente) {
    console.warn("[email-reserva] EMAIL_REMETENTE não configurado — e-mail de reserva não enviado.");
    return;
  }

  const auth = getJwtParaEmail();
  if (!auth) {
    console.warn("[email-reserva] Sem credenciais para enviar e-mail (EMAIL_REMETENTE ou service account não configurado).");
    return;
  }

  try {
    await auth.authorize();
  } catch (e) {
    console.error("[email-reserva] Falha ao autorizar JWT Gmail:", e.message);
    return;
  }

  const assunto = `📅 Reserva [${reserva.id}] confirmada`;
  const dataBR = formatarDataBR(reserva.data);
  const recursosHtml = resumoRecursosHtml(reserva);

  const htmlBody = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #0e7490; padding: 24px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 20px; }
    .body { padding: 24px 32px; color: #333; }
    .info-box { background: #f0fdfa; border-left: 4px solid #0e7490; border-radius: 4px; padding: 14px 18px; margin: 16px 0; }
    .info-box p { margin: 5px 0; font-size: 14px; }
    .resources-box { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 4px; padding: 14px 18px; margin: 16px 0; }
    .resources-box p { margin: 5px 0; font-size: 14px; }
    .footer { padding: 16px 32px; background: #f4f4f4; font-size: 12px; color: #888; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Reserva Confirmada</h1>
    </div>
    <div class="body">
      <p>Olá, <strong>${reserva.solicitanteNome || destinatario}</strong>!</p>
      <p>Sua reserva foi registrada com sucesso. Confira os detalhes abaixo:</p>
      <div class="info-box">
        <p><strong>🏷️ Título:</strong> ${reserva.titulo || "—"}</p>
        <p><strong>🆔 ID da Reserva:</strong> ${reserva.id}</p>
        <p><strong>📅 Data:</strong> ${dataBR}</p>
        <p><strong>🕐 Horário:</strong> ${reserva.inicio} — ${reserva.fim}</p>
      </div>
      <p><strong>📋 Recursos reservados:</strong></p>
      <div class="resources-box">
        ${recursosHtml}
      </div>
      <p>Você pode acompanhar sua reserva em <strong>Minhas Reservas</strong> na intranet.</p>
    </div>
    <div class="footer">Este é um e-mail automático da Intranet CCI. Não responda este e-mail.</div>
  </div>
</body>
</html>`;

  const rawMessage = [
    `From: Intranet CCI <${remetente}>`,
    `To: ${destinatario}`,
    `Reply-To: ${remetente}`,
    `Subject: =?UTF-8?B?${Buffer.from(assunto).toString("base64")}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "X-Mailer: Intranet-CCI/1.0",
    "X-Auto-Submitted: auto-generated",
    "Precedence: transactional",
    "",
    htmlBody,
  ].join("\r\n");

  const encoded = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.messages.send({
      userId: remetente,
      requestBody: { raw: encoded },
    });
    console.log(`[email-reserva] E-mail de confirmação enviado para ${destinatario} (reserva ${reserva.id}).`);
  } catch (e) {
    console.error(`[email-reserva] Falha ao enviar e-mail para ${destinatario}:`, e.message);
  }
}

async function resolverContextoChamados(idToken) {
  const { email } = await verificarIdTokenUsuario(idToken);
  const payload = decodeJwtPayloadUnsafe(idToken);
  const nome =
    (typeof payload?.name === "string" && payload.name) ||
    (typeof payload?.given_name === "string" && payload.given_name) ||
    String(email).split("@")[0];
  const orgUnitPath = await obterOrgUnitPathUsuario(email);
  const manual = lerPapeisManuaisArquivo()[email.toLowerCase()] || [];
  const papeis = mesclarPapeisManuais(mapearPapeisDoOrgUnit(orgUnitPath), manual);
  return {
    email,
    nome,
    papeis,
    viewer: { email, papeis },
  };
}

function sanitizarListaEntradas(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (x) =>
        x &&
        typeof x === "object" &&
        typeof x.autor === "string" &&
        typeof x.texto === "string" &&
        typeof x.data === "string",
    )
    .map((x) => ({
      autor: x.autor,
      texto: x.texto,
      data: x.data,
    }));
}

function sanitizarSolucao(sol) {
  if (!sol || typeof sol !== "object") return undefined;
  if (typeof sol.autor !== "string" || typeof sol.texto !== "string" || typeof sol.data !== "string") {
    return undefined;
  }
  return { autor: sol.autor, texto: sol.texto, data: sol.data };
}

/**
 * POST /api/chamados/listar
 * Body: { idToken }
 */
app.post("/api/chamados/listar", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const ctx = await resolverContextoChamados(idToken);
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({
        error: mensagemSupabaseNaoConfigurado(),
      });
    }
    const todos = await listarTodosChamados(supabase);
    const chamados = todos.filter((c) => podeVerChamado(ctx.viewer, c));
    return res.json({ chamados });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Erro /api/chamados/listar:", msg);
    return res.status(500).json({ error: msg || "Erro ao listar chamados." });
  }
});

/**
 * POST /api/chamados/criar
 * Body: { idToken, titulo, categoria, prioridade, descricao,
 *         solicitaFilmagem?, filmagemData?, filmagemHoraInicio?,
 *         filmagemHoraFim?, filmagemTermosAceitos? }
 */
app.post("/api/chamados/criar", async (req, res) => {
  try {
    const {
      idToken, titulo, categoria, prioridade, descricao,
      solicitaFilmagem, filmagemData, filmagemHoraInicio,
      filmagemHoraFim, filmagemTermosAceitos,
    } = req.body || {};
    const ctx = await resolverContextoChamados(idToken);
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({
        error: mensagemSupabaseNaoConfigurado(),
      });
    }

    const tituloLimpo = typeof titulo === "string" ? titulo.trim() : "";
    const categoriaLimpa = typeof categoria === "string" ? categoria.trim() : "";
    const descricaoLimpa = typeof descricao === "string" ? descricao.trim() : "";
    if (!tituloLimpo || !categoriaLimpa || !descricaoLimpa) {
      return res.status(400).json({ error: "titulo, categoria e descricao são obrigatórios." });
    }
    const prioridades = ["baixa", "media", "alta"];
    const prioridadeFinal = prioridades.includes(prioridade) ? prioridade : "media";

    // Validações de filmagem
    const eFilmagem = solicitaFilmagem === true;
    if (eFilmagem) {
      if (!filmagemData || !filmagemHoraInicio || !filmagemHoraFim) {
        return res.status(400).json({
          error: "Para chamados de filmagem, informe a data, hora de início e hora final.",
        });
      }
      if (filmagemHoraInicio >= filmagemHoraFim) {
        return res.status(400).json({
          error: "A hora de início deve ser anterior à hora final da filmagem.",
        });
      }
      if (filmagemTermosAceitos !== true) {
        return res.status(400).json({
          error: "É obrigatório aceitar os termos de responsabilidade para chamados de filmagem.",
        });
      }
    }

    const chamado = {
      id: `CHM-${Date.now()}`,
      titulo: tituloLimpo,
      solicitante: ctx.nome,
      solicitanteEmail: ctx.email,
      papelAbertura: papelPrincipalUsuario(ctx.papeis),
      categoria: categoriaLimpa,
      prioridade: prioridadeFinal,
      status: "aberto",
      data: new Date().toLocaleDateString("pt-BR"),
      descricao: descricaoLimpa,
      acompanhamentos: [],
      tarefas: [],
      // Campos de filmagem
      solicitaFilmagem: eFilmagem,
      filmagemData: eFilmagem ? String(filmagemData) : null,
      filmagemHoraInicio: eFilmagem ? String(filmagemHoraInicio) : null,
      filmagemHoraFim: eFilmagem ? String(filmagemHoraFim) : null,
      filmagemTermosAceitos: eFilmagem ? true : false,
    };

    await inserirChamado(supabase, chamado);
    return res.json({ ok: true, chamado });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Erro /api/chamados/criar:", msg);
    return res.status(500).json({ error: msg || "Erro ao criar chamado." });
  }
});



/**
 * POST /api/chamados/atualizar
 * Body: { idToken, chamado }
 */
app.post("/api/chamados/atualizar", async (req, res) => {
  try {
    const { idToken, chamado } = req.body || {};
    const ctx = await resolverContextoChamados(idToken);
    if (!chamado || typeof chamado !== "object" || typeof chamado.id !== "string") {
      return res.status(400).json({ error: "chamado.id é obrigatório." });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({
        error: mensagemSupabaseNaoConfigurado(),
      });
    }

    const existente = await obterChamadoPorId(supabase, chamado.id);
    if (!existente) {
      return res.status(404).json({ error: "Chamado não encontrado." });
    }
    if (!podeVerChamado(ctx.viewer, existente)) {
      return res.status(403).json({ error: "Sem permissão para editar este chamado." });
    }

    const isSetape = ctx.papeis.includes("setape");
    const atualizado = {
      ...existente,
      acompanhamentos: sanitizarListaEntradas(chamado.acompanhamentos),
    };

    if (isSetape) {
      const statusOk = chamado.status === "resolvido" ? "resolvido" : "aberto";
      atualizado.status = statusOk;
      atualizado.tarefas = sanitizarListaEntradas(chamado.tarefas);
      atualizado.solucao =
        statusOk === "resolvido" ? sanitizarSolucao(chamado.solucao) : undefined;
    }

    // Detecta se a solução foi adicionada agora (antes não existia, agora existe)
    const solucaoEraAusente = !existente.solucao;
    const solucaoFoiAdicionada = Boolean(atualizado.solucao);

    await atualizarChamado(supabase, atualizado);

    // Dispara e-mail de solução de forma assíncrona (não bloqueia a resposta)
    if (solucaoEraAusente && solucaoFoiAdicionada) {
      setImmediate(() =>
        enviarEmailSolucaoChamado(atualizado).catch((e) =>
          console.error("[email-chamado] Erro inesperado:", e.message)
        )
      );
    }

    return res.json({ ok: true, chamado: atualizado });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Erro /api/chamados/atualizar:", msg);
    return res.status(500).json({ error: msg || "Erro ao atualizar chamado." });
  }
});

/**
 * POST /api/avisos/listar
 * Body: { idToken }
 * Retorna avisos visíveis conforme papéis (OU) do usuário.
 */
app.post("/api/avisos/listar", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const ctx = await resolverContextoChamados(idToken);
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({
        error: mensagemSupabaseNaoConfigurado(),
      });
    }
    const todos = await listarTodosAvisos(supabase);
    const avisos = todos.filter((a) => podeVerAviso(ctx.viewer, a));
    return res.json({ avisos });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Erro /api/avisos/listar:", msg);
    return res.status(500).json({ error: msg || "Erro ao listar avisos." });
  }
});

/**
 * POST /api/avisos/criar
 * Body: { idToken, titulo, conteudo, tipo, setor }
 */
app.post("/api/avisos/criar", async (req, res) => {
  try {
    const { idToken, titulo, conteudo, tipo, setor } = req.body || {};
    const ctx = await resolverContextoChamados(idToken);
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({
        error: mensagemSupabaseNaoConfigurado(),
      });
    }

    const tituloLimpo = typeof titulo === "string" ? titulo.trim() : "";
    const conteudoLimpo = typeof conteudo === "string" ? conteudo.trim() : "";
    if (!tituloLimpo || !conteudoLimpo) {
      return res.status(400).json({ error: "titulo e conteudo são obrigatórios." });
    }
    const tipoFinal = AVISO_TIPOS_VALIDOS.includes(tipo) ? tipo : "aviso";
    if (!AVISO_SETORES_VALIDOS.includes(setor)) {
      return res.status(400).json({ error: "setor inválido." });
    }
    if (!podePublicarNoSetor(ctx.papeis, setor)) {
      return res.status(403).json({
        error: "Você não tem permissão para publicar avisos neste setor.",
      });
    }
    const setorFinal = setor;

    const agora = new Date();
    const aviso = {
      id: `AVS-${agora.getTime()}`,
      titulo: tituloLimpo,
      conteudo: conteudoLimpo,
      tipo: tipoFinal,
      setor: setorFinal,
      autor: ctx.nome,
      autorEmail: ctx.email,
      data: agora.toLocaleDateString("pt-BR"),
      createdAt: agora.toISOString(),
    };

    await inserirAviso(supabase, aviso);
    return res.json({ ok: true, aviso });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Erro /api/avisos/criar:", msg);
    return res.status(500).json({ error: msg || "Erro ao publicar aviso." });
  }
});

/**
 * POST /api/papeis-manuais/obter
 * Body: { idToken } — papéis manuais do usuário (ex.: admin).
 */
app.post("/api/papeis-manuais/obter", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const { email } = await verificarIdTokenUsuario(idToken);
    const mapa = lerPapeisManuaisArquivo();
    const lista = mapa[email.toLowerCase()] || [];
    return res.json({ papeisManuais: lista });
  } catch (e) {
    const st = e.status || 500;
    if (st === 401 && e.audDoToken) {
      return res.status(st).json({
        error: `${e.message} Use o mesmo valor de VITE_GOOGLE_CLIENT_ID no server/.env.`,
        audDoToken: e.audDoToken,
      });
    }
    return res.status(st).json({ error: e.message });
  }
});

/**
 * POST /api/papeis-manuais/listar
 * Body: { idToken } — mapa completo (somente admin no arquivo).
 */
app.post("/api/papeis-manuais/listar", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const { email } = await verificarIdTokenUsuario(idToken);
    if (!emailTemPapelAdminNoArquivo(email)) {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }
    return res.json({ atribuicoes: lerPapeisManuaisArquivo() });
  } catch (e) {
    const st = e.status || 500;
    if (st === 401 && e.audDoToken) {
      return res.status(st).json({
        error: `${e.message} Use o mesmo valor de VITE_GOOGLE_CLIENT_ID no server/.env.`,
        audDoToken: e.audDoToken,
      });
    }
    return res.status(st).json({ error: e.message });
  }
});

/**
 * POST /api/papeis-manuais/atualizar
 * Body: { idToken, emailAlvo, papeisManuais: string[] } — somente admin.
 */
app.post("/api/papeis-manuais/atualizar", async (req, res) => {
  try {
    const { idToken, emailAlvo, papeisManuais } = req.body || {};
    const { email } = await verificarIdTokenUsuario(idToken);
    if (!emailTemPapelAdminNoArquivo(email)) {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }
    const alvo = String(emailAlvo || "")
      .trim()
      .toLowerCase();
    if (!alvo.includes("@")) {
      return res.status(400).json({ error: "Informe um e-mail válido." });
    }
    if (!emailDominioPermitido(alvo)) {
      return res.status(400).json({
        error: `O e-mail deve ser de um dos domínios permitidos: ${DOMINIOS_PERMITIDOS.join(", ")}.`,
      });
    }
    let lista = Array.isArray(papeisManuais) ? papeisManuais : [];
    lista = [
      ...new Set(
        lista.filter((p) => typeof p === "string" && PAPEIS_MANUAIS_PERMITIDOS.includes(p)),
      ),
    ];
    const mapa = { ...lerPapeisManuaisArquivo() };
    if (lista.length === 0) {
      delete mapa[alvo];
    } else {
      mapa[alvo] = lista;
    }
    salvarPapeisManuaisArquivo(mapa);
    return res.json({ ok: true, atribuicoes: lerPapeisManuaisArquivo() });
  } catch (e) {
    const st = e.status || 500;
    if (st === 401 && e.audDoToken) {
      return res.status(st).json({
        error: `${e.message} Use o mesmo valor de VITE_GOOGLE_CLIENT_ID no server/.env.`,
        audDoToken: e.audDoToken,
      });
    }
    return res.status(st).json({ error: e.message });
  }
});

registerSetorLinksRoutes(app, {
  arquivo: ARQUIVO_SETOR_LINKS,
  ensureDataDir,
  verificarIdTokenUsuario,
  emailTemPapelAdminNoArquivo,
});

/**
 * Consulta orgUnitPath no Admin SDK (mesma ideia de /api/organizacao).
 * @returns {Promise<string|null>}
 */
async function obterOrgUnitPathUsuario(email) {
  const auth = getJwtOrganizacao();
  if (!auth) return null;
  try {
    await auth.authorize();
    const directory = google.admin({ version: "directory_v1", auth });
    const user = await directory.users.get({
      userKey: email,
      projection: "full",
    });
    const rawOu = user.data?.orgUnitPath ?? user.data?.org_unit_path;
    if (rawOu != null && String(rawOu).trim() !== "") {
      return String(rawOu).trim();
    }
    return null;
  } catch (e) {
    console.warn("[painel/sync-profile] Admin SDK:", e.message);
    return null;
  }
}

/**
 * POST /api/painel/sync-profile
 * Body: { idToken }
 * Sincroniza painel_profiles com a OU do Workspace e papéis manuais (admin), sem cadastro manual.
 */
app.post("/api/painel/sync-profile", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const { email } = await verificarIdTokenUsuario(idToken);
    const payload = decodeJwtPayloadUnsafe(idToken);
    const fullName =
      (typeof payload?.name === "string" && payload.name) ||
      (typeof payload?.given_name === "string" && payload.given_name) ||
      String(email).split("@")[0];

    const supabaseSrv = getSupabaseAdmin();
    if (!supabaseSrv) {
      return res.status(503).json({
        error: mensagemSupabaseNaoConfigurado(),
      });
    }

    const orgUnitPath = await obterOrgUnitPathUsuario(email);
    const manual = lerPapeisManuaisArquivo()[email.toLowerCase()] || [];
    const manualGlobalAdmin = manual.includes("admin");
    const manualPainelAdmin = manual.includes("painel_admin");
    const manualPainelAtt = manual.includes("painel_atendente");
    const perm = painelPermissoesDoOrgUnit(orgUnitPath);
    const localAllow = emailPainelLocalPermitido(email);
    const eligible =
      manualGlobalAdmin ||
      manualPainelAdmin ||
      manualPainelAtt ||
      perm.admin ||
      perm.atendente ||
      localAllow;

    const authUser = await findAuthUserByEmail(supabaseSrv, email);
    if (!authUser) {
      return res.json({
        ok: true,
        synced: false,
        reason: "no_supabase_user",
      });
    }

    const { data: school, error: schoolErr } = await supabaseSrv
      .from("painel_schools")
      .select("id")
      .eq("slug", PAINEL_SCHOOL_SLUG)
      .maybeSingle();

    if (schoolErr || !school?.id) {
      return res.status(500).json({
        error: "Escola não encontrada em painel_schools (slug).",
        slug: PAINEL_SCHOOL_SLUG,
      });
    }

    if (!eligible) {
      await supabaseSrv.from("painel_profiles").delete().eq("id", authUser.id);
      return res.json({
        ok: true,
        synced: false,
        reason: "no_painel_workspace_permission",
      });
    }

    let role =
      manualGlobalAdmin || manualPainelAdmin || perm.admin ? "admin" : "attendant";
    if (
      localAllow &&
      !manualGlobalAdmin &&
      !manualPainelAdmin &&
      !perm.admin &&
      process.env.PAINEL_LOCAL_ROLE === "admin"
    ) {
      role = "admin";
    }

    const { data: existing } = await supabaseSrv
      .from("painel_profiles")
      .select("service_window_id")
      .eq("id", authUser.id)
      .maybeSingle();

    const row = {
      id: authUser.id,
      school_id: school.id,
      full_name: fullName,
      role,
      service_window_id: existing?.service_window_id ?? null,
    };

    const { error: upsertErr } = await supabaseSrv
      .from("painel_profiles")
      .upsert(row, { onConflict: "id" });

    if (upsertErr) {
      return res.status(500).json({ error: upsertErr.message });
    }

    return res.json({ ok: true, synced: true, role });
  } catch (e) {
    const st = e.status || 500;
    if (st === 401 && e.audDoToken) {
      return res.status(st).json({
        error: `${e.message} Use o mesmo valor de VITE_GOOGLE_CLIENT_ID no server/.env.`,
        audDoToken: e.audDoToken,
      });
    }
    return res.status(st).json({ error: e.message });
  }
});

/**
 * POST /api/painel/create-user
 * Body: { idToken, email, password, full_name, role, service_window_id, school_id }
 * Cria usuário Auth + painel_profiles (somente admin painel da mesma escola).
 */
app.post("/api/painel/create-user", async (req, res) => {
  try {
    const body = req.body || {};
    const { idToken, email, password, full_name, role, service_window_id, school_id } = body;

    const { email: callerEmail } = await verificarIdTokenUsuario(idToken);

    if (!email || !password || !full_name || !school_id) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
    }
    if (!emailDominioPermitido(String(email))) {
      return res.status(400).json({
        error: `O e-mail deve ser de um dos domínios permitidos: ${DOMINIOS_PERMITIDOS.join(", ")}.`,
      });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return res.status(500).json({
        error: mensagemSupabaseNaoConfigurado(),
      });
    }

    const callerUser = await findAuthUserByEmail(admin, callerEmail);
    if (!callerUser) {
      return res.status(403).json({
        error:
          "Sua conta ainda não existe no Supabase do painel. Abra o painel de senhas logado na Central para sincronizar.",
      });
    }

    const { data: callerProfile, error: callerProfErr } = await admin
      .from("painel_profiles")
      .select("*")
      .eq("id", callerUser.id)
      .single();

    if (
      callerProfErr ||
      !callerProfile ||
      callerProfile.role !== "admin" ||
      callerProfile.school_id !== school_id
    ) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { data: newUser, error: authError } = await admin.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true,
    });

    if (authError || !newUser.user) {
      return res.status(500).json({ error: authError?.message ?? "Erro ao criar usuário." });
    }

    const { data: profile, error: profileError } = await admin
      .from("painel_profiles")
      .insert({
        id: newUser.user.id,
        school_id,
        full_name: String(full_name).trim(),
        role: role === "admin" ? "admin" : "attendant",
        service_window_id: service_window_id || null,
      })
      .select()
      .single();

    if (profileError) {
      await admin.auth.admin.deleteUser(newUser.user.id);
      return res.status(500).json({ error: profileError.message });
    }

    return res.json({ profile });
  } catch (e) {
    const st = e.status || 500;
    if (st === 401 && e.audDoToken) {
      return res.status(st).json({
        error: `${e.message} Use o mesmo valor de VITE_GOOGLE_CLIENT_ID no server/.env.`,
        audDoToken: e.audDoToken,
      });
    }
    return res.status(st).json({ error: e.message });
  }
});

function obterCredenciaisIscholar() {
  const codigoEscola = (
    process.env.ISCHOLAR_CODIGO_ESCOLA ||
    process.env.VITE_ISCHOLAR_CODIGO_ESCOLA ||
    ""
  ).trim();
  const token = (
    process.env.ISCHOLAR_TOKEN ||
    process.env.VITE_ISCHOLAR_TOKEN ||
    ""
  ).trim();
  return { codigoEscola, token };
}

async function obterMatriculaIscholar(idAluno) {
  const { codigoEscola, token } = obterCredenciaisIscholar();
  if (!codigoEscola || !token) {
    throw new Error("Credenciais do iScholar não configuradas no servidor.");
  }
  
  const url = `https://api.ischolar.app/matricula/listar?id_aluno=${idAluno}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Codigo-Escola": codigoEscola,
      "X-Autorizacao": token,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro na API do iScholar (${response.status}): ${errText}`);
  }

  const resJson = await response.json();
  if (resJson.status !== "sucesso") {
    throw new Error(`Erro no iScholar: ${resJson.mensagem || "Resposta sem sucesso"}`);
  }

  return resJson;
}

async function alterarEmailAlunoIscholar(idAluno, email) {
  const { codigoEscola, token } = obterCredenciaisIscholar();
  if (!codigoEscola || !token) {
    throw new Error("Credenciais do iScholar não configuradas no servidor.");
  }

  const url = "https://api.ischolar.app/aluno/altera";
  const body = {
    id_aluno: parseInt(idAluno, 10),
    informacoes_basicas: {
      id_aluno: parseInt(idAluno, 10),
      email: email
    }
  };


  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Codigo-Escola": codigoEscola,
      "X-Autorizacao": token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao atualizar e-mail no iScholar (${response.status}): ${errText}`);
  }

  const resJson = await response.json();
  return resJson;
}

function gerarEmailLocalPart(nomeAluno, numeroRe) {
  if (!nomeAluno) return `estudante${numeroRe || ""}`;
  
  const normalized = nomeAluno
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); 
  
  const clean = normalized.replace(/[^a-z0-9\s]/g, "");
  
  const partes = clean.split(/\s+/).filter(Boolean);
  const primeiroNome = partes[0] || "estudante";
  
  return `${primeiroNome}${numeroRe || ""}`;
}


async function criarUsuarioGoogleWorkspace(email, nome, sobrenome, senhaProvisoria, orgUnitPath) {
  const auth = getJwtWorkspaceUserWrite();
  if (!auth) {
    throw new Error("Não foi possível inicializar a autenticação do Google Workspace para escrita.");
  }

  await auth.authorize();
  const directory = google.admin({ version: "directory_v1", auth });

  const response = await directory.users.insert({
    requestBody: {
      primaryEmail: email,
      name: {
        givenName: nome || "Estudante",
        familyName: sobrenome || "CCI",
      },
      password: senhaProvisoria,
      changePasswordAtNextLogin: true,
      orgUnitPath: orgUnitPath,
    }
  });

  return response.data;
}


app.post("/api/webhooks/ischolar", async (req, res) => {
  const payload = {
    timestamp: new Date().toISOString(),
    headers: req.headers,
    query: req.query,
    body: req.body,
    automacao: {
      status: "sem_acao",
      motivo: "Evento não processado por este webhook"
    }
  };

  try {
    const evento = req.body?.evento || req.body?.event;
    console.log(`[webhook-ischolar] Recebido webhook do iScholar: ${evento}`);

    if (evento === "secretaria.matriculas.novo") {
      const dadosDepois = req.body?.data?.depois;
      const idAluno = dadosDepois?.id_aluno;
      const idMatricula = dadosDepois?.id_matricula;
      const idTurma = dadosDepois?.id_turma;

      if (!idAluno) {
        payload.automacao = {
          status: "erro",
          motivo: "id_aluno ausente no payload"
        };
      } else {
        console.log(`[webhook-ischolar] Buscando matrícula do aluno ${idAluno}...`);
        const infoMatricula = await obterMatriculaIscholar(idAluno);
        const matricula = infoMatricula.dados?.[0];

        if (!matricula) {
          payload.automacao = {
            status: "erro",
            motivo: `Nenhuma matrícula encontrada para o aluno ID ${idAluno}`
          };
        } else {
          const nomeAluno = matricula.nome_aluno || "";
          const periodo = matricula.periodo || "";
          const nomeTurma = matricula.nome_turma || "";

          // Normalizar para comparações seguras
          const normalizarTexto = (txt) => {
            return (txt || "")
              .toUpperCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
          };

          const tPeriodo = normalizarTexto(periodo);
          const tTurma = normalizarTexto(nomeTurma);
          const tCurso = normalizarTexto(matricula.nome_curso || "");
          const tCursoRef = normalizarTexto(matricula.curso || "");
          const tModalidade = normalizarTexto(matricula.modalidade || "");

          // 1. Filtrar Períodos Letivos
          const periodosIgnorados = ["P1NEGOCCIA", "PEC 2026", "ESTAGIO OBRIGT FACS"];
          const deveIgnorarPeriodo = periodosIgnorados.some(p => tPeriodo.includes(p));

          // 2. Filtrar Turmas Extracurriculares
          const termosTurmasIgnorados = [
            "EXTRACURRICULAR",
            "PERIODO INTEGRAL",
            "PI.",
            "OFICINA DA ESCRITA",
            "SERVICO DE CUIDADOR",
            "PASSEIOS E EVENTOS",
            "PEC TEATRO",
            "PROGRAMA ELETIVO"
          ];
          const deveIgnorarTurma = termosTurmasIgnorados.some(termo => tTurma.includes(termo));

          if (deveIgnorarPeriodo) {
            console.log(`[webhook-ischolar] Descartado aluno ${nomeAluno}: Período letivo ${periodo} ignorado.`);
            payload.automacao = {
              status: "ignorado",
              motivo: `Período letivo "${periodo}" está na lista de exclusão.`,
              aluno: nomeAluno
            };
          } else if (deveIgnorarTurma) {
            console.log(`[webhook-ischolar] Descartado aluno ${nomeAluno}: Turma ${nomeTurma} ignorada.`);
            payload.automacao = {
              status: "ignorado",
              motivo: `Turma "${nomeTurma}" está na lista de exclusão (extracurricular/especial).`,
              aluno: nomeAluno
            };
          } else {
            // Determinar o domínio correto do e-mail e unidade organizacional (OU)
            let dominioEmail = "";
            let orgUnitPath = "";
            if (tTurma.includes("TECNICO") || tCurso.includes("TECNICO") || tCursoRef.includes("TECNICO")) {
              dominioEmail = "@tecscci.com.br";
              orgUnitPath = "/Alunos TECSCCI";
            } else if (
              tTurma.includes("FACULDADE") ||
              tCurso.includes("FACULDADE") ||
              tCursoRef.includes("FACULDADE") ||
              tModalidade.includes("GRADUACAO") ||
              tModalidade.includes("POS-GRADUACAO") ||
              tModalidade.includes("FACULDADE")
            ) {
              dominioEmail = "@faculdadecci.com.br";
              orgUnitPath = "/Alunos FACULDADE";
            } else {
              dominioEmail = "@portalcci.com.br";
              orgUnitPath = "/Alunos REGULAR";
            }


            // Obter número de matrícula (numero_re)
            const numeroRe = (matricula.numero_re || dadosDepois?.numero_re || "").trim();

            // Gerar local part (username) do e-mail
            const localPart = gerarEmailLocalPart(nomeAluno, numeroRe);
            const emailCandidato = `${localPart}${dominioEmail}`;
            const senhaProvisoria = "cci@2026";


            console.log(`[webhook-ischolar] Criando e-mail ${emailCandidato} no Google Workspace...`);
            
            // Separar nome e sobrenome
            const partesNome = nomeAluno.trim().split(/\s+/);
            const givenName = partesNome[0] || "Estudante";
            const familyName = partesNome.slice(1).join(" ") || "CCI";

            let contaCriada = false;
            let erroWorkspace = null;

            try {
              await criarUsuarioGoogleWorkspace(emailCandidato, givenName, familyName, senhaProvisoria, orgUnitPath);
              contaCriada = true;
              console.log(`[webhook-ischolar] Conta de e-mail ${emailCandidato} criada com sucesso.`);
            } catch (errGoogle) {
              erroWorkspace = errGoogle.message;
              console.error(`[webhook-ischolar] Erro ao criar conta no Google Workspace:`, erroWorkspace);
              
              // Se for um erro de duplicidade (409), podemos considerar que a conta já existe e atualizar no iScholar mesmo assim
              if (errGoogle.code === 409 || erroWorkspace.includes("Entity already exists") || erroWorkspace.includes("already exists")) {
                console.log(`[webhook-ischolar] A conta ${emailCandidato} já existe no Google Workspace. Prosseguindo com o vínculo.`);
                contaCriada = true;
              }
            }

            if (contaCriada) {
              console.log(`[webhook-ischolar] Vinculando e-mail ${emailCandidato} no iScholar para o aluno ID ${idAluno}...`);
              await alterarEmailAlunoIscholar(idAluno, emailCandidato);
              
              payload.automacao = {
                status: "sucesso",
                motivo: "Conta de e-mail criada/verificada e cadastrada no iScholar",
                email: emailCandidato,
                aluno: nomeAluno,
                turma: nomeTurma,
                periodo: periodo,
                warning: erroWorkspace ? `Conta já existia no Workspace: ${erroWorkspace}` : null
              };
            } else {
              payload.automacao = {
                status: "erro",
                motivo: `Falha ao criar conta no Google Workspace: ${erroWorkspace}`,
                email: emailCandidato,
                aluno: nomeAluno
              };
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("[webhook-ischolar] Erro geral ao processar automação:", e);
    payload.automacao = {
      status: "erro",
      motivo: `Erro geral no processamento: ${e.message}`
    };
  }

  // Salvar o log no arquivo local (mantendo os últimos 100 logs)
  try {
    const logPath = path.join(__dirname, "webhook-logs.json");
    let logs = [];
    if (fs.existsSync(logPath)) {
      try {
        const raw = fs.readFileSync(logPath, "utf8");
        logs = JSON.parse(raw);
        if (!Array.isArray(logs)) logs = [];
      } catch (e) {
        logs = [];
      }
    }
    
    logs.unshift(payload);
    if (logs.length > 100) {
      logs = logs.slice(0, 100);
    }
    
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), "utf8");
  } catch (errLog) {
    console.error("[webhook-ischolar] Erro ao escrever no webhook-logs.json:", errLog);
  }

  return res.json({ ok: true, received: true });
});

app.post("/api/ti/ischolar/webhook-logs", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    await verificarIdTokenUsuario(idToken);
    
    const logPath = path.join(__dirname, "webhook-logs.json");
    if (!fs.existsSync(logPath)) {
      return res.json([]);
    }
    
    const raw = fs.readFileSync(logPath, "utf8");
    const logs = JSON.parse(raw);
    return res.json(Array.isArray(logs) ? logs : []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/ti/ischolar/webhook-logs/clear", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    await verificarIdTokenUsuario(idToken);
    
    const logPath = path.join(__dirname, "webhook-logs.json");
    fs.writeFileSync(logPath, JSON.stringify([], null, 2), "utf8");
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/health", (_, res) => {
  const supabase = statusSupabaseEnv();
  res.json({
    ok: true,
    version: "2026-03-20-supabase-diag",
    nodeEnv: process.env.NODE_ENV || "development",
    supabaseConfigured: supabase.configured && !supabase.keyLooksAnon,
    supabase,
  });
});

/** Build Vite (`dist/`) ao lado de `server/` — produção e Docker. */
const DIST_DIR = path.join(__dirname, "..", "dist");

function shouldServeStatic() {
  if (process.env.SERVE_STATIC === "0" || process.env.SERVE_STATIC === "false") return false;
  if (process.env.SERVE_STATIC === "1" || process.env.SERVE_STATIC === "true") return true;
  return process.env.NODE_ENV === "production";
}

function escapeHtmlAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

const INDEX_PATH = path.join(DIST_DIR, "index.html");

/**
 * Injete `CENTRAL_API_BASE_URL` (ou `PUBLIC_API_URL`) no meta `central-api-base` para o front
 * fazer `fetch` na URL pública correta sem novo build (p.ex. API noutro subdomínio no Coolify).
 * Não servir o index “cru” via express.static, senão a injeção nunca corria.
 */
function sendIndexHtml(res, next) {
  if (!fs.existsSync(INDEX_PATH)) {
    return res.status(500).type("text/plain").send("index.html em falta (dist/).");
  }
  try {
    const apiBase = (
      process.env.CENTRAL_API_BASE_URL ||
      process.env.PUBLIC_API_URL ||
      ""
    ).trim();
    const escaped = escapeHtmlAttr(apiBase);
    let html = fs.readFileSync(INDEX_PATH, "utf8");
    if (!/<meta\s+name="central-api-base"/i.test(html)) {
      return res.type("text/html; charset=utf-8").send(html);
    }
    html = html.replace(
      /(<meta\s+name="central-api-base"\s+content=")([^"]*)("\s*\/?>)/i,
      `$1${escaped}$3`,
    );
    return res.type("text/html; charset=utf-8").send(html);
  } catch (e) {
    next(e);
  }
}

if (shouldServeStatic() && fs.existsSync(DIST_DIR)) {
  if (process.env.TRUST_PROXY === "1" || process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }
  /* index: false — nunca servir dist/index.html “cru” a partir do static (precisamos injetar a meta) */
  app.use(express.static(DIST_DIR, { index: false }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "Not found" });
    }
    return sendIndexHtml(res, next);
  });
} else if (shouldServeStatic() && !fs.existsSync(DIST_DIR)) {
  console.warn(`[static] Produção esperada mas dist/ ausente em ${DIST_DIR}. Rode npm run build na raiz ou defina SERVE_STATIC=0.`);
}

app.listen(PORT, HOST, () => {
  console.log(`API rodando em http://${HOST}:${PORT}`);
  const sa = getServiceAccountCredentials();
  if (sa?.client_id) {
    console.log(
      `[Google Workspace] Delegação em todo o domínio (Admin Console): use o Client ID numérico ${sa.client_id} desta service account — não o Client ID OAuth do frontend (VITE_GOOGLE_CLIENT_ID).`,
    );
    console.log(
      "  Escopos (autorize cada URL completa):",
      SCOPE_ADMIN_USER_READONLY,
      "|",
      SCOPE_ADMIN_CHROME_DEVICE,
    );
  }
  const setupErr = getServiceAccountSetupError();
  if (GOOGLE_CLIENT_IDS.length === 0 || setupErr) {
    console.warn(
      "Aviso: configure GOOGLE_CLIENT_ID, credenciais da service account (arquivo ou JSON) e GOOGLE_ADMIN_IMPERSONATE para /api/organizacao e /api/chromebooks.",
      setupErr ? `— ${setupErr}` : "",
    );
  }
  const supabase = statusSupabaseEnv();
  if (supabase.urlSet && !supabase.serviceRoleKeySet) {
    console.warn(
      "Aviso: SUPABASE_URL definida mas falta SUPABASE_SERVICE_ROLE_KEY (runtime no Coolify ou server/.env).",
    );
  } else if (!supabase.configured) {
    console.warn(
      "[supabase] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ausentes — chamados, agenda e sync do painel não funcionam.",
    );
  } else if (supabase.keyLooksAnon) {
    console.warn(
      '[supabase] A chave configurada é "anon", não "service_role". Use a secret service_role do Supabase.',
    );
  } else if (supabase.configured) {
    console.log("[supabase] OK (URL + service_role configurados).");
  }
  if (AGENDA_CCI_ENFORCE_DISABLE) {
    console.log(
      `[agenda-cci] disable/reenable ativo — intervalo ${AGENDA_CCI_POLL_MS}ms, fuso ${AGENDA_CCI_TIMEZONE}. Lista vazia: ${AGENDA_CCI_DISABLE_WHEN_EMPTY ? "disable em todo o parque" : "só reabilita bloqueados (recuperação)"}.`,
    );
    setInterval(() => {
      aplicarPoliticaChromebooks().catch((e) => console.error(e));
    }, AGENDA_CCI_POLL_MS);
    setTimeout(() => aplicarPoliticaChromebooks().catch(console.error), 12_000);
  }
});

// Trigger reload for reading env variables

