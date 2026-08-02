import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import multer from "multer";
import * as XLSX from "xlsx";
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
  podeGerenciarChamado,
} from "./chamadosAccess.js";
import { registerSetorLinksRoutes } from "./setorLinks.js";
import { registerCcipayRoutes } from "./ccipayRoutes.js";
import { registerCcipayParceiroRoutes } from "./ccipayParceiroRoutes.js";
import { createRequestAuth } from "./requestAuth.js";
import {
  encerrarSessaoRequest,
  getContextoFromSessionRequest,
  getSessionIdFromRequest,
  iniciarSessaoUsuario,
} from "./sessionAuth.js";
import { resolverPapeisCompletos } from "./userContext.js";
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
import {
  registrarOuAtualizarUsuario,
  listarUsuariosPorSetor,
} from "./usuariosStore.js";
import {
  listarCardsPorSetor,
  criarCard,
  atualizarCard,
  excluirCard,
} from "./kanbanStore.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Dev local: lê `server/.env`. Produção (Docker/Coolify): variáveis vêm do runtime — o `.env` não vai na imagem. */
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3001;
/** Endereço de bind (Docker/rede: use 0.0.0.0 para aceitar conexões externas ao container). */
const HOST = process.env.HOST || "0.0.0.0";

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
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
const PAPEIS_MANUAIS_PERMITIDOS = [
  "admin",
  "painel_admin",
  "painel_atendente",
  "ccipay_admin",
  "ccipay_dp",
  "ccipay_loja",
  "ccipay_lancador",
];

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

  return {
    email,
    name: payload?.name || payload?.given_name,
    picture: payload?.picture
  };
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
 * POST /api/auth/session — troca ID token Google por sessão de servidor (~12h sliding).
 * Body: { idToken }
 */
app.post("/api/auth/session", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const ctx = await resolverContextoFromRequest(req);
    const session = iniciarSessaoUsuario(res, {
      email: ctx.email,
      nome: ctx.nome,
      picture: ctx.picture,
      papeis: ctx.papeis,
      orgUnitPath: ctx.orgUnitPath ?? null,
    });
    return res.json({
      ok: true,
      sessionId: session.id,
      user: {
        nome: ctx.nome,
        email: ctx.email,
        picture: ctx.picture,
        papeis: ctx.papeis,
      },
    });
  } catch (e) {
    return respostaErroIdToken(res, e);
  }
});

/**
 * GET /api/auth/me — restaura usuário da sessão (cookie ou header x-central-session).
 */
app.get("/api/auth/me", (req, res) => {
  const ctx = getContextoFromSessionRequest(req);
  if (!ctx) {
    return res.status(401).json({ error: "Sessão expirada ou não autenticado." });
  }
  return res.json({
    user: {
      nome: ctx.nome,
      email: ctx.email,
      picture: ctx.picture,
      papeis: ctx.papeis,
    },
    sessionId: getSessionIdFromRequest(req),
  });
});

/**
 * POST /api/auth/logout
 */
app.post("/api/auth/logout", (req, res) => {
  encerrarSessaoRequest(req, res);
  return res.json({ ok: true });
});

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
      ({ email } = await verificarAutenticacaoRequest(req));
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
      await verificarAutenticacaoRequest(req);
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
        label: notes || d.deviceId,
        model: d.model || undefined,
        hasHdmi: String(loc).toLowerCase().includes("com hdmi"),
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
      await verificarAutenticacaoRequest(req);
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
 * POST /api/agenda-cci/aplicar-politica-chromebooks
 * Body: { idToken } — força uma rodada de disable/reenable (setape ou admin).
 */
app.post("/api/agenda-cci/aplicar-politica-chromebooks", async (req, res) => {
  try {
    const ctx = await resolverContextoFromRequest(req);
    const pode =
      ctx.papeis.includes("admin") ||
      ctx.papeis.includes("setape");
    if (!pode) {
      return res.status(403).json({ error: "Acesso restrito a Setape ou administradores." });
    }
    if (!AGENDA_CCI_ENFORCE_DISABLE) {
      return res.status(503).json({
        error: "AGENDA_CCI_ENFORCE_DISABLE não está ativo no servidor.",
      });
    }
    await aplicarPoliticaChromebooks();
    return res.json({ ok: true });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Erro /api/agenda-cci/aplicar-politica-chromebooks:", msg);
    return res.status(500).json({ error: msg || "Erro ao aplicar política." });
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
      await verificarAutenticacaoRequest(req);
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
      await verificarAutenticacaoRequest(req);
    } catch (e) {
      return respostaErroIdToken(res, e);
    }

    const calendarIds = [
      process.env.GOOGLE_CALENDAR_ID || process.env.VITE_GOOGLE_CALENDAR_ID,
      process.env.GOOGLE_CALENDAR_SALAS_ID || process.env.VITE_GOOGLE_CALENDAR_SALAS_ID,
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

function obterNomeAmigavelSetor(setor) {
  const mapeamento = {
    setape: "TI / Setape",
    secretaria: "Secretaria",
    financeiro: "DP / Financeiro",
    dp: "DP / Financeiro",
    direcao: "Direção",
    disciplinar: "Disciplinar",
    biblioteca: "Biblioteca",
    servicosgerais: "Serviços Gerais",
    almoxarifado: "Almoxarifado",
    primeirossocorros: "Primeiros Socorros",
    clat: "CLAT",
    publicidade: "Publicidade",
  };
  return mapeamento[setor] || setor || "Suporte";
}

/**
 * Envia e-mail de notificação de solução de chamado via Gmail API (service account).
 * Disparado de forma assíncrona — não bloqueia a resposta HTTP.
 * @param {{ id: string, titulo: string, solicitante: string, solicitanteEmail: string, data: string, setorDestino?: string, solucao: { autor: string, texto: string, data: string } }} chamado
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
  const dests = Array.isArray(chamado.setorDestino) ? chamado.setorDestino : [chamado.setorDestino || "setape"];
  const nomesSetores = dests.map(obterNomeAmigavelSetor).join(" & ");
  const solucaoAutor = chamado.solucao?.autor || `Equipe ${nomesSetores}`;
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

async function enviarEmailNovoChamado(chamado) {
  const remetente = (
    process.env.EMAIL_REMETENTE ||
    process.env.GOOGLE_ADMIN_IMPERSONATE ||
    ""
  ).trim();

  if (!remetente) {
    console.warn("[email-novo-chamado] EMAIL_REMETENTE não configurado — e-mail de aviso de novo chamado não enviado.");
    return;
  }

  const auth = getJwtParaEmail();
  if (!auth) {
    console.warn("[email-novo-chamado] Sem credenciais para enviar e-mail.");
    return;
  }

  try {
    await auth.authorize();
  } catch (e) {
    console.error("[email-novo-chamado] Falha ao autorizar JWT Gmail:", e.message);
    return;
  }

  const SETOR_EMAILS = {
    setape: ["setape@portalcci.com.br"],
    secretaria: ["atendimento@portalcci.com.br"],
    dp: ["dp@portalcci.com.br", "financeiro@portalcci.com.br"],
    financeiro: ["dp@portalcci.com.br", "financeiro@portalcci.com.br"],
    direcao: ["dir@portalcci.com.br"],
    disciplinar: ["disciplinar@portalcci.com.br"],
    biblioteca: ["biblioteca@portalcci.com.br"],
    servicosgerais: ["sgerais@portalcci.com.br"],
    almoxarifado: ["almoxarifado@portalcci.com.br"],
    primeirossocorros: ["enfermaria@portalcci.com.br"],
    clat: ["equipeclat@clat.com.br"],
    publicidade: ["publicidade@portalcci.com.br"],
  };

  const dests = Array.isArray(chamado.setorDestino) ? chamado.setorDestino : [chamado.setorDestino || "setape"];
  
  const emailsSetores = [];
  for (const d of dests) {
    const list = SETOR_EMAILS[d];
    if (Array.isArray(list)) {
      emailsSetores.push(...list);
    }
  }

  const destinatariosUnicos = Array.from(new Set(emailsSetores));

  if (destinatariosUnicos.length === 0) {
    destinatariosUnicos.push("setape@portalcci.com.br");
  }

  const destinatarioStr = destinatariosUnicos.join(", ");
  const assunto = `🔔 Novo chamado aberto: [${chamado.id}] - ${chamado.titulo}`;
  
  const nomesSetores = dests.map(obterNomeAmigavelSetor).join(" & ");
  
  const htmlBody = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #eab308; padding: 24px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 20px; }
    .body { padding: 24px 32px; color: #333; }
    .info-box { background: #fef9c3; border-left: 4px solid #eab308; border-radius: 4px; padding: 14px 18px; margin: 16px 0; }
    .info-box p { margin: 4px 0; font-size: 14px; }
    .desc-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 14px 18px; margin: 16px 0; white-space: pre-wrap; font-size: 14px; color: #374151; }
    .footer { padding: 16px 32px; background: #f4f4f4; font-size: 12px; color: #888; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Novo Chamado Aberto</h1>
    </div>
    <div class="body">
      <p>Um novo chamado foi aberto por <strong>${chamado.solicitante}</strong> (${chamado.solicitanteEmail}).</p>
      
      <div class="info-box">
        <p><strong>📌 ID:</strong> ${chamado.id}</p>
        <p><strong>📋 Solicitação:</strong> ${chamado.titulo}</p>
        <p><strong>🏢 Setor Destino:</strong> ${nomesSetores}</p>
        <p><strong>⚠️ Prioridade:</strong> ${chamado.prioridade ? chamado.prioridade.toUpperCase() : "MÉDIA"}</p>
        <p><strong>📅 Data:</strong> ${chamado.data}</p>
      </div>

      <p><strong>📝 Descrição:</strong></p>
      <div class="desc-box">${chamado.descricao || "Sem descrição."}</div>
      
      <p>Acesse a Gestão de Chamados na intranet para visualizar e interagir com este chamado.</p>
    </div>
    <div class="footer">Este é um e-mail automático da Intranet CCI. Não responda este e-mail.</div>
  </div>
</body>
</html>`;

  const rawMessage = [
    `From: Intranet CCI <${remetente}>`,
    `To: ${destinatarioStr}`,
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
    console.log(`[email-novo-chamado] E-mail de notificação de novo chamado enviado para ${destinatarioStr} (chamado ${chamado.id}).`);
  } catch (e) {
    console.error(`[email-novo-chamado] Falha ao enviar e-mail para ${destinatarioStr}:`, e.message);
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
  const { email, name, picture } = await verificarIdTokenUsuario(idToken);
  const payload = decodeJwtPayloadUnsafe(idToken);
  const nome =
    (typeof payload?.name === "string" && payload.name) ||
    (typeof name === "string" && name) ||
    (typeof payload?.given_name === "string" && payload.given_name) ||
    String(email).split("@")[0];
  const orgUnitPath = await obterOrgUnitPathUsuario(email);
  const manual = lerPapeisManuaisArquivo()[email.toLowerCase()] || [];
  const papeis = resolverPapeisCompletos(orgUnitPath, email, manual, {
    ouPainelAtendente: ouPainelAtendentePeloCaminho,
    ouPainelAdmin: ouPainelAdminPeloCaminho,
  });
  return {
    email,
    nome,
    picture: picture || payload?.picture,
    papeis,
    orgUnitPath,
    viewer: { email, papeis },
  };
}

const { verificarAutenticacaoRequest, resolverContextoFromRequest } = createRequestAuth({
  verificarIdTokenUsuario,
  resolverContextoChamados,
});

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

function sanitizarReaberturas(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (x) =>
        x &&
        typeof x === "object" &&
        typeof x.autor === "string" &&
        typeof x.motivo === "string" &&
        typeof x.data === "string"
    )
    .map((x) => ({
      autor: x.autor,
      data: x.data,
      motivo: x.motivo,
      solucaoAnterior: sanitizarSolucao(x.solucaoAnterior),
    }));
}

/**
 * POST /api/chamados/listar
 * Body: { idToken }
 */
app.post("/api/chamados/listar", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const ctx = await resolverContextoFromRequest(req);
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
      idToken, titulo, setorDestino, categoria, prioridade, descricao,
      solicitaFilmagem, filmagemData, filmagemHoraInicio,
      filmagemHoraFim, filmagemTermosAceitos,
    } = req.body || {};
    const ctx = await resolverContextoFromRequest(req);
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({
        error: mensagemSupabaseNaoConfigurado(),
      });
    }

    const tituloLimpo = typeof titulo === "string" ? titulo.trim() : "";
    let setorDestinoFinal = [];
    if (Array.isArray(setorDestino)) {
      setorDestinoFinal = setorDestino.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
    } else if (typeof setorDestino === "string" && setorDestino.trim() !== "") {
      setorDestinoFinal = [setorDestino.trim()];
    }
    if (setorDestinoFinal.length === 0) {
      setorDestinoFinal = ["setape"];
    }
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
      setorDestino: setorDestinoFinal,
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

    // Dispara e-mail de notificação de forma assíncrona (não bloqueia a resposta)
    setImmediate(() =>
      enviarEmailNovoChamado(chamado).catch((e) =>
        console.error("[email-novo-chamado] Erro inesperado:", e.message)
      )
    );

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
    const ctx = await resolverContextoFromRequest(req);
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

    const podeGerenciar = podeGerenciarChamado(ctx.viewer, existente);
    const atualizado = {
      ...existente,
      acompanhamentos: sanitizarListaEntradas(chamado.acompanhamentos),
    };

    if (podeGerenciar) {
      if (Array.isArray(chamado.setorDestino)) {
        atualizado.setorDestino = chamado.setorDestino;
      } else if (typeof chamado.setorDestino === "string" && chamado.setorDestino.trim() !== "") {
        atualizado.setorDestino = chamado.setorDestino.split(",").map((s) => s.trim()).filter(Boolean);
      }
      const statusOk = chamado.status === "resolvido" ? "resolvido" : "aberto";
      atualizado.status = statusOk;
      atualizado.tarefas = sanitizarListaEntradas(chamado.tarefas);
      atualizado.solucao =
        statusOk === "resolvido" ? sanitizarSolucao(chamado.solucao) : undefined;
      atualizado.reaberturas = sanitizarReaberturas(chamado.reaberturas);
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
    const ctx = await resolverContextoFromRequest(req);
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
    const ctx = await resolverContextoFromRequest(req);
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
    const { email } = await verificarAutenticacaoRequest(req);
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
    const { email } = await verificarAutenticacaoRequest(req);
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
    const { email } = await verificarAutenticacaoRequest(req);
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
  verificarAutenticacaoRequest,
  emailTemPapelAdminNoArquivo,
});

registerCcipayRoutes(app, {
  getSupabaseAdmin,
  mensagemSupabaseNaoConfigurado,
  resolverContextoFromRequest,
  respostaErroIdToken,
});

registerCcipayParceiroRoutes(app, {
  getSupabaseAdmin,
  mensagemSupabaseNaoConfigurado,
  resolverContextoFromRequest,
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
    const ctx = await resolverContextoFromRequest(req);
    const { email } = ctx;
    const fullName = ctx.nome;

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

    const { email: callerEmail } = await verificarAutenticacaoRequest(req);

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

async function obterDadosCompletosAlunoIscholar(idAluno) {
  const { codigoEscola, token } = obterCredenciaisIscholar();
  if (!codigoEscola || !token) {
    throw new Error("Credenciais do iScholar não configuradas no servidor.");
  }
  
  const url = `https://api.ischolar.app/aluno/busca?id_aluno=${idAluno}`;
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
    throw new Error(`Erro ao buscar dados do aluno (${response.status}): ${errText}`);
  }

  const resJson = await response.json();
  if (resJson.status !== "sucesso") {
    throw new Error(`Erro ao buscar aluno no iScholar: ${resJson.mensagem || "Resposta sem sucesso"}`);
  }

  return resJson.dados;
}

async function alterarEmailAlunoIscholar(idAluno, email) {
  const { codigoEscola, token } = obterCredenciaisIscholar();
  if (!codigoEscola || !token) {
    throw new Error("Credenciais do iScholar não configuradas no servidor.");
  }

  // 1. Obter dados completos atuais do aluno para não quebrar validações
  const dadosAluno = await obterDadosCompletosAlunoIscholar(idAluno);
  if (!dadosAluno || !dadosAluno.informacoes_basicas) {
    throw new Error("Dados básicos do aluno não encontrados para atualização.");
  }

  // 2. Mesclar o e-mail no objeto informacoes_basicas existente
  const informacoesBasicas = { ...dadosAluno.informacoes_basicas };
  informacoesBasicas.email = email;
  informacoesBasicas.id_aluno = parseInt(idAluno, 10);

  // Garantir valor válido para cor_raca (se vazio ou inválido, define como "PARDA")
  const corRacaAtual = (informacoesBasicas.cor_raca || "").trim().toUpperCase();
  const validos = ["AMARELA", "BRANCA", "INDÍGENA", "INDIGENA", "PARDA", "NEGRA", "NÃO DECLARADA", "NAO DECLARADA"];
  if (!corRacaAtual || !validos.includes(corRacaAtual)) {
    informacoesBasicas.cor_raca = "PARDA";
  }

  const url = "https://api.ischolar.app/aluno/altera";
  const body = {
    id_aluno: parseInt(idAluno, 10),
    informacoes_basicas: informacoesBasicas
  };

  if (dadosAluno.id_externo !== undefined) {
    body.id_externo = dadosAluno.id_externo;
  }

  if (dadosAluno.ultima_atualizacao) {
    body.versao = {
      checa: 0,
      nova: Math.floor(Date.now() / 1000),
      anterior: parseInt(dadosAluno.ultima_atualizacao, 10) || Math.floor(Date.now() / 1000)
    };
  }

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
  if (resJson.status !== "sucesso") {
    throw new Error(`Rejeitado pelo iScholar: ${resJson.mensagem || JSON.stringify(resJson)}`);
  }
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
              tModalidade.includes("FACULDADE") ||
              tTurma.includes("SUPERIOR") ||
              tCurso.includes("SUPERIOR") ||
              tCursoRef.includes("SUPERIOR") ||
              tModalidade.includes("SUPERIOR") ||
              tTurma.includes("FACS") ||
              tCurso.includes("FACS") ||
              tCursoRef.includes("FACS")
            ) {
              dominioEmail = "@faculdadecci.com.br";
              orgUnitPath = "/Alunos FACULDADE";
            } else {
              dominioEmail = "@cciweb.com.br";
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
    await verificarAutenticacaoRequest(req);
    
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

app.post("/api/ti/ischolar/aluno/criar-email", async (req, res) => {
  try {
    const { idToken, id_aluno, nome_aluno, turma, numero_re } = req.body || {};
    await verificarAutenticacaoRequest(req);

    if (!id_aluno) {
      return res.status(400).json({ error: "Parâmetro id_aluno é obrigatório." });
    }

    console.log(`[diagnostico-aluno] Iniciando criação de e-mail manual para aluno ID ${id_aluno}...`);

    let matricula = null;
    let nomeAluno = nome_aluno || "";
    let nomeTurma = turma || "";
    let numeroRe = numero_re || "";

    // 1. Tentar obter matrícula do iScholar para decidir o domínio do e-mail
    try {
      const idBuscaMatricula = String(id_aluno).startsWith("m-") ? String(id_aluno).substring(2) : id_aluno;
      const infoMatricula = await obterMatriculaIscholar(idBuscaMatricula);
      matricula = infoMatricula.dados?.[0];
    } catch (errMatricula) {
      console.warn(`[diagnostico-aluno] Não foi possível obter matrícula para o aluno ID ${id_aluno}:`, errMatricula.message);
    }

    if (matricula) {
      nomeAluno = matricula.nome_aluno || nomeAluno;
      nomeTurma = matricula.nome_turma || nomeTurma;
      numeroRe = matricula.numero_re || numeroRe;
    } else {
      // 2. Fallback: Buscar dados básicos do aluno caso não haja matrícula ativa (ex: transferido)
      try {
        const idBuscaAluno = String(id_aluno).startsWith("m-") ? String(id_aluno).substring(2) : id_aluno;
        const dadosAluno = await obterDadosCompletosAlunoIscholar(idBuscaAluno);
        if (dadosAluno && dadosAluno.informacoes_basicas) {
          const ib = dadosAluno.informacoes_basicas;
          nomeAluno = nomeAluno || `${ib.nome || ""} ${ib.sobrenome || ""}`.trim();
          numeroRe = numeroRe || ib.registro_escolar || ib.numero_re || "";
        }
      } catch (errAluno) {
        console.warn(`[diagnostico-aluno] Falha ao obter dados básicos do aluno ID ${id_aluno}:`, errAluno.message);
      }
    }

    if (!nomeAluno) {
      return res.status(400).json({ 
        error: `Não foi possível encontrar dados no iScholar para o aluno ID ${id_aluno} e nenhuma informação foi fornecida.` 
      });
    }

    // Normalizar para comparações seguras
    const normalizarTexto = (txt) => {
      return (txt || "")
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    };

    const tTurma = normalizarTexto(nomeTurma);
    const tCurso = matricula ? normalizarTexto(matricula.nome_curso || "") : "";
    const tCursoRef = matricula ? normalizarTexto(matricula.curso || "") : "";
    const tModalidade = matricula ? normalizarTexto(matricula.modalidade || "") : "";

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
      tModalidade.includes("FACULDADE") ||
      tTurma.includes("SUPERIOR") ||
      tCurso.includes("SUPERIOR") ||
      tCursoRef.includes("SUPERIOR") ||
      tModalidade.includes("SUPERIOR") ||
      tTurma.includes("FACS") ||
      tCurso.includes("FACS") ||
      tCursoRef.includes("FACS")
    ) {
      dominioEmail = "@faculdadecci.com.br";
      orgUnitPath = "/Alunos FACULDADE";
    } else {
      dominioEmail = "@cciweb.com.br";
      orgUnitPath = "/Alunos REGULAR";
    }

    // Obter número de matrícula (numero_re)
    const cleanNumeroRe = (numeroRe || "").trim();

    // Gerar local part (username) do e-mail
    const localPart = gerarEmailLocalPart(nomeAluno, cleanNumeroRe);
    const emailCandidato = `${localPart}${dominioEmail}`;
    const senhaProvisoria = "cci@2026";

    // Separar nome e sobrenome
    const partesNome = nomeAluno.trim().split(/\s+/);
    const givenName = partesNome[0] || "Estudante";
    const familyName = partesNome.slice(1).join(" ") || "CCI";

    let contaCriada = false;
    let erroWorkspace = null;

    try {
      await criarUsuarioGoogleWorkspace(emailCandidato, givenName, familyName, senhaProvisoria, orgUnitPath);
      contaCriada = true;
      console.log(`[diagnostico-aluno] Conta de e-mail ${emailCandidato} criada com sucesso para o aluno ID ${id_aluno}.`);
    } catch (errGoogle) {
      erroWorkspace = errGoogle.message;
      if (errGoogle.code === 409 || erroWorkspace.includes("Entity already exists") || erroWorkspace.includes("already exists")) {
        console.log(`[diagnostico-aluno] A conta ${emailCandidato} já existe no Google Workspace. Prosseguindo com o vínculo.`);
        contaCriada = true;
      } else {
        throw errGoogle;
      }
    }

    if (contaCriada) {
      console.log(`[diagnostico-aluno] Vinculando e-mail ${emailCandidato} no iScholar para o aluno ID ${id_aluno}...`);
      const idVinculo = String(id_aluno).startsWith("m-") ? String(id_aluno).substring(2) : id_aluno;
      await alterarEmailAlunoIscholar(idVinculo, emailCandidato);
      return res.json({
        ok: true,
        email: emailCandidato,
        aluno: nomeAluno,
        warning: erroWorkspace ? "A conta de e-mail já existia no Google Workspace, mas foi vinculada com sucesso no iScholar." : null
      });
    } else {
      throw new Error("Não foi possível criar a conta no Workspace.");
    }
  } catch (e) {
    console.error("[diagnostico-aluno] Erro ao criar e-mail manual:", e);
    return res.status(500).json({ error: e.message });
  }
});


app.post("/api/ti/ischolar/webhook-logs/clear", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    await verificarAutenticacaoRequest(req);
    
    const logPath = path.join(__dirname, "webhook-logs.json");
    fs.writeFileSync(logPath, JSON.stringify([], null, 2), "utf8");
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});


app.post("/api/ti/google-classroom/create-course", async (req, res) => {
  try {
    const { idToken, name, teacher } = req.body || {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "Você precisa estar autenticado com uma conta do Google (idToken ausente). Faça login no topo do site." });
    }
    const { email: userEmail } = await verificarIdTokenUsuario(idToken);

    // Verificar se o usuário autenticado pertence à TI (setape ou admin)
    const orgUnitPath = await obterOrgUnitPathUsuario(userEmail);
    const manual = lerPapeisManuaisArquivo()[userEmail.toLowerCase()] || [];
    const papeis = mesclarPapeisManuais(mapearPapeisDoOrgUnit(orgUnitPath), manual);
    if (!papeis.includes("setape") && !papeis.includes("admin")) {
      return res.status(403).json({ error: "Acesso negado: apenas equipe de TI." });
    }

    if (!name || String(name).trim() === "") {
      return res.status(400).json({ error: "O nome da turma é obrigatório." });
    }

    const credentials = getServiceAccountCredentials();
    if (!credentials) {
      return res.status(500).json({ error: "Credenciais do Google não configuradas no servidor." });
    }

    // Impersonar o e-mail dev.fac@portalcci.com.br diretamente para evitar erros caso a conta do administrador não tenha o Classroom habilitado
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/classroom.courses"],
      subject: "dev.fac@portalcci.com.br",
    });

    const classroom = google.classroom({ version: "v1", auth });

    const response = await classroom.courses.create({
      requestBody: {
        name: String(name).trim(),
        section: teacher ? String(teacher).trim() : "",
        ownerId: "me",
        courseState: "ACTIVE",
      },
    });

    return res.json({
      ok: true,
      id: response.data.id,
      name: response.data.name,
      section: response.data.section,
      alternateLink: response.data.alternateLink,
    });
  } catch (e) {
    console.error("[google-classroom-create] Falha ao criar turma. Erro completo:", e);
    if (e.response?.data) {
      console.error("[google-classroom-create] Detalhes do erro do Google:", JSON.stringify(e.response.data, null, 2));
    }
    const errMsg = e.response?.data?.error_description || e.response?.data?.error?.message || e.message;
    return res.status(500).json({ error: errMsg });
  }
});


// ─── iScholar & Google Classroom Ensalamento Persistence ────────────────────
const CLASSROOM_MAPPING_FILE = path.join(__dirname, "data", "classroomMapping.json");

function lerMapeamentosClassroom() {
  try {
    if (!fs.existsSync(CLASSROOM_MAPPING_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(CLASSROOM_MAPPING_FILE, "utf-8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    console.error("[classroom-mapping] Erro ao ler arquivo de mapeamento:", e);
    return {};
  }
}

function salvarMapeamentosClassroom(mapeamentos) {
  try {
    const dir = path.dirname(CLASSROOM_MAPPING_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CLASSROOM_MAPPING_FILE, JSON.stringify(mapeamentos, null, 2), "utf-8");
  } catch (e) {
    console.error("[classroom-mapping] Erro ao salvar arquivo de mapeamento:", e);
  }
}

async function safeFetchIscholarJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!text || !text.trim()) {
    return { ok: false, status: response.status, data: null, error: `Resposta vazia da API do iScholar (HTTP ${response.status})` };
  }
  try {
    const data = JSON.parse(text);
    return { ok: response.ok, status: response.status, data, rawText: text };
  } catch (e) {
    return { ok: false, status: response.status, data: null, rawText: text, error: `Formato de resposta do iScholar inválido: ${text.slice(0, 100)}` };
  }
}

async function obterUnidadesIscholar() {
  const { codigoEscola, token } = obterCredenciaisIscholar();
  if (!codigoEscola || !token) {
    throw new Error("Credenciais do iScholar não configuradas no servidor.");
  }

  const headers = {
    "X-Codigo-Escola": codigoEscola,
    "X-Autorizacao": token,
    "Content-Type": "application/json"
  };

  const result = await safeFetchIscholarJson("https://api.ischolar.app/unidades/listar_unidades", { method: "GET", headers });
  if (!result.ok || !result.data) {
    console.error("[ischolar-unidades] Erro ao listar unidades:", result.error);
    return [];
  }

  const lista = result.data.dados || result.data.unidades || (Array.isArray(result.data) ? result.data : []);
  return lista.map(u => ({
    id_unidade: String(u.id_unidade || u.id),
    nome_unidade: u.nome_unidade || u.nome || u.unidade || `Unidade ${u.id_unidade || u.id}`
  }));
}

async function obterTurmasIscholar() {
  const { codigoEscola, token } = obterCredenciaisIscholar();
  if (!codigoEscola || !token) {
    throw new Error("Credenciais do iScholar não configuradas no servidor (ISCHOLAR_CODIGO_ESCOLA e ISCHOLAR_TOKEN).");
  }

  const headers = {
    "X-Codigo-Escola": codigoEscola,
    "X-Autorizacao": token,
    "Content-Type": "application/json"
  };

  // 1. Buscar unidades cadastradas
  const unidades = await obterUnidadesIscholar();
  let rawTurmas = [];

  if (Array.isArray(unidades) && unidades.length > 0) {
    for (const u of unidades) {
      try {
        const url = `https://api.ischolar.app/turma/lista?unidade_id=${u.id_unidade}`;
        const res = await safeFetchIscholarJson(url, { method: "GET", headers });
        if (res.ok && res.data) {
          const raw = res.data.dados || res.data.turmas || res.data.lista || res.data;
          const items = Array.isArray(raw) ? raw : (typeof raw === "object" && raw !== null ? Object.values(raw) : []);
          items.forEach(t => {
            if (t && typeof t === "object") {
              rawTurmas.push({ ...t, id_unidade_ref: u.id_unidade, nome_unidade_ref: u.nome_unidade });
            }
          });
        }
      } catch (e) {
        console.error(`[ischolar-turmas] Erro ao buscar turmas da unidade ${u.id_unidade}:`, e);
      }
    }
  }

  // 2. Fallback direto se unidades retornou vazio
  if (rawTurmas.length === 0) {
    const url = `https://api.ischolar.app/turma/lista`;
    const res = await safeFetchIscholarJson(url, { method: "GET", headers });
    if (res.ok && res.data) {
      const raw = res.data.dados || res.data.turmas || res.data.lista || res.data;
      rawTurmas = Array.isArray(raw) ? raw : (typeof raw === "object" && raw !== null ? Object.values(raw) : []);
    }
  }

  const normalizar = (str) => (str || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const todasAsTurmas = (Array.isArray(rawTurmas) ? rawTurmas : []).map(t => {
    if (!t || typeof t !== "object") return null;
    const nome = extrairStringValor(t.nome_turma) || extrairStringValor(t.nome) || extrairStringValor(t.turma) || `Turma ${t.id_turma || t.id || ""}`;
    const curso = extrairStringValor(t.nome_curso) || extrairStringValor(t.curso) || "";
    
    let periodo = extrairStringValor(t.periodo_letivo) ||
                  extrairStringValor(t.periodo) ||
                  extrairStringValor(t.ano_letivo) ||
                  extrairStringValor(t.semestre) ||
                  "2026.1";

    const norm = normalizar(String(nome) + " " + String(curso) + " " + String(t.nome_unidade_ref || ""));
    
    let unidade = t.nome_unidade_ref || "Todas as Unidades";
    if (norm.includes("TECNICO") || norm.includes("TECSCCI")) {
      unidade = "TecsCCI Escola Técnica";
    } else if (norm.includes("FACULDADE") || norm.includes("GRADUACAO") || norm.includes("FAC")) {
      unidade = "Faculdade CCI";
    }

    return {
      id_turma: String(t.id_turma || t.id || t.codigo || ""),
      nome_turma: String(nome),
      curso: String(curso),
      periodo_letivo: String(periodo),
      unidade: String(unidade),
      id_unidade: String(t.id_unidade || t.id_unidade_ref || "")
    };
  }).filter(Boolean);

  return todasAsTurmas;
}

function extrairStringValor(val) {
  if (!val) return "";
  if (typeof val === "string" || typeof val === "number") return String(val).trim();
  if (typeof val === "object") {
    const res = val.disciplina_nome ||
                val.nome_disciplina ||
                val.nome_turma ||
                val.nome ||
                val.periodo_letivo ||
                val.periodo ||
                val.descricao ||
                val.ano_letivo ||
                val.ano ||
                val.semestre ||
                val.disciplina ||
                val.titulo ||
                val.id_disciplina ||
                val.id ||
                "";
    if (res && typeof res === "object") return extrairStringValor(res);
    return String(res || "").trim();
  }
  return "";
}

function extrairEmailDoObjeto(obj) {
  if (!obj || typeof obj !== "object") return "";
  const campos = [
    obj.email,
    obj.email_aluno,
    obj.email_institucional,
    obj.aluno_email,
    obj.email_contato,
    obj.mail,
    obj.aluno?.email,
    obj.aluno?.email_aluno,
    obj.aluno?.email_institucional,
    obj.dados_aluno?.email,
    obj.pessoa?.email,
    obj.usuario?.email
  ];

  for (const c of campos) {
    if (typeof c === "string" && c.trim().includes("@")) {
      return c.trim();
    }
  }
  return "";
}

async function obterFuncionariosUnidadeIscholar(idUnidade) {
  const { codigoEscola, token } = obterCredenciaisIscholar();
  if (!codigoEscola || !token) return [];

  const headers = {
    "X-Codigo-Escola": codigoEscola,
    "X-Autorizacao": token,
    "Content-Type": "application/json"
  };

  const idU = String(idUnidade || "").trim();
  const tentativas = [
    idU ? { url: `https://api.ischolar.app/funcionarios/listar?id_unidade=${idU}`, method: "GET" } : null,
    idU ? { url: `https://api.ischolar.app/funcionarios/listar?unidade_id=${idU}`, method: "GET" } : null,
    { url: "https://api.ischolar.app/funcionarios/listar", method: "GET" },
    { url: "https://api.ischolar.app/funcionarios/listar", method: "POST", body: JSON.stringify({ id_unidade: idU, unidade_id: idU }) },
    { url: "https://api.ischolar.app/funcionario/listar", method: "GET" },
    { url: "https://api.ischolar.app/funcionario/lista", method: "GET" },
    { url: "https://api.ischolar.app/professores/listar", method: "GET" },
    { url: "https://api.ischolar.app/professor/listar", method: "GET" }
  ].filter(Boolean);

  for (const item of tentativas) {
    try {
      const opts = { method: item.method, headers };
      if (item.body) opts.body = item.body;

      const result = await safeFetchIscholarJson(item.url, opts);
      if (result.ok && result.data) {
        const raw = result.data.dados || result.data.funcionarios || result.data.professores || result.data;
        const list = Array.isArray(raw) ? raw : (typeof raw === "object" && raw !== null ? Object.values(raw) : []);
        if (list.length > 0) {
          console.log(`[ischolar-funcionarios] Encontrados ${list.length} funcionários via: ${item.method} ${item.url}`);
          return list;
        }
      }
    } catch (e) {
      console.error(`[ischolar-funcionarios] Erro no endpoint ${item.url}:`, e.message);
    }
  }

  return [];
}

function buscarEmailProfessorPorNomeDirect(nomeProfessor, funcionariosLista) {
  if (!nomeProfessor || typeof nomeProfessor !== "string" || !nomeProfessor.trim()) {
    return "";
  }

  const normalizar = (str) => (str || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  const targetNorm = normalizar(nomeProfessor);

  // 1. Comparar se o nome do funcionário em /funcionarios/listar é idêntico ao nome_professor
  for (const f of funcionariosLista) {
    if (!f || typeof f !== "object") continue;
    const nomeFunc = extrairStringValor(f.nome || f.nome_funcionario || f.funcionario || f.nome_completo);
    
    if (normalizar(nomeFunc) === targetNorm) {
      let email = extrairEmailDoObjeto(f);
      if (email) {
        console.log(`[ischolar-professor] Sucesso! Nome idêntico '${nomeProfessor}' -> E-mail: ${email}`);
        return email;
      }
    }
  }

  // 2. Tentar busca caso haja variação de acentuação ou caixa
  for (const f of funcionariosLista) {
    if (!f || typeof f !== "object") continue;
    const nomeFunc = extrairStringValor(f.nome || f.nome_funcionario || f.funcionario || f.nome_completo);
    const funcNorm = normalizar(nomeFunc);
    if (targetNorm.length > 5 && (funcNorm.includes(targetNorm) || targetNorm.includes(funcNorm))) {
      let email = extrairEmailDoObjeto(f);
      if (email) {
        console.log(`[ischolar-professor] Sucesso (aproximado)! '${nomeProfessor}' ~ '${nomeFunc}' -> E-mail: ${email}`);
        return email;
      }
    }
  }

  // 3. Fallback institucional se não houver e-mail cadastrado
  const local = gerarEmailLocalPart(nomeProfessor, "prof");
  return `${local}@portalcci.com.br`;
}

function extrairNomeProfessor(d) {
  if (!d || typeof d !== "object") return "";

  // Primeiro verifica dentro do objeto 'professores' (padrão iScholar)
  const prof = extrairProfessoresObj(d);
  if (prof) {
    const nomeFromProf = extrairStringValor(prof.nome_professor || prof.nome || prof.funcionario || prof.nome_completo);
    if (nomeFromProf && nomeFromProf.length > 1) return nomeFromProf;
  }

  // Fallback: campos diretos na disciplina
  const campos = [
    d.nome_professor,
    d.professor_nome,
    d.nome_docente,
    d.docente_nome,
    d.nome_funcionario
  ];

  for (const c of campos) {
    const str = extrairStringValor(c);
    if (str && str.length > 1 && str !== "Disciplina") return str;
  }
  return "";
}

function extrairProfessoresObj(d) {
  if (!d || typeof d !== "object") return null;
  // O iScholar retorna o professor dentro de 'professores' (objeto ou array)
  const p = d.professores;
  if (!p) return null;
  if (Array.isArray(p)) return p.length > 0 ? p[0] : null;
  if (typeof p === "object") return p;
  return null;
}

function extrairIdProfessor(d) {
  if (!d || typeof d !== "object") return "";

  // Primeiro verifica dentro do objeto 'professores' (padrão iScholar)
  const prof = extrairProfessoresObj(d);
  if (prof) {
    const idFromProf = prof.id_professor || prof.id_funcionario || prof.id_usuario || prof.id;
    if (idFromProf !== undefined && idFromProf !== null) {
      const val = String(idFromProf).trim();
      if (val && /^\d+$/.test(val)) return val;
    }
  }

  // Fallback: campos diretos na disciplina
  const candidatos = [
    d.id_professor,
    d.professor_id,
    d.id_funcionario,
    d.funcionario_id,
    d.id_usuario,
    d.id_docente
  ];

  for (const c of candidatos) {
    if (c !== undefined && c !== null) {
      if (typeof c === "number") return String(c);
      if (typeof c === "string") {
        const val = c.trim();
        if (val && /^\d+$/.test(val)) return val;
      }
    }
  }
  return "";
}

async function buscarFuncionarioPorIdIscholar(idFuncionario, cacheFuncMap) {
  if (!idFuncionario || typeof idFuncionario !== "string" || !idFuncionario.trim()) {
    return { nome: "", email: "" };
  }

  const key = String(idFuncionario).trim();
  if (cacheFuncMap && cacheFuncMap.has(key)) {
    return cacheFuncMap.get(key);
  }

  const { codigoEscola, token } = obterCredenciaisIscholar();
  if (!codigoEscola || !token) return { nome: "", email: "" };

  const headers = {
    "X-Codigo-Escola": codigoEscola,
    "X-Autorizacao": token,
    "Content-Type": "application/json"
  };

  try {
    const url = `https://api.ischolar.app/funcionarios/busca?id_funcionario=${encodeURIComponent(key)}`;
    const result = await safeFetchIscholarJson(url, { method: "GET", headers });
    if (result.ok && result.data) {
      const d = result.data.dados || result.data.funcionario || result.data;
      const nome = extrairStringValor(d.nome_funcionario || d.nome || d.funcionario || d.nome_completo || d.usuario_nome);
      let email = extrairEmailDoObjeto(d) || extrairEmailDoObjeto(result.data);

      if (!email && nome) {
        const local = gerarEmailLocalPart(nome, key);
        email = `${local}@portalcci.com.br`;
      }

      const resObj = { nome, email };
      if (cacheFuncMap) cacheFuncMap.set(key, resObj);
      console.log(`[ischolar-funcionario-busca] id_funcionario=${key} -> nome='${nome}', email='${email}'`);
      return resObj;
    }
  } catch (e) {
    console.error(`[ischolar-funcionario-busca] Erro ao buscar id_funcionario ${key}:`, e.message);
  }

  return { nome: "", email: "" };
}

async function obterDisciplinasTurmaIscholar(idTurma, idUnidadeInput = "") {
  const { codigoEscola, token } = obterCredenciaisIscholar();
  if (!codigoEscola || !token) {
    throw new Error("Credenciais do iScholar não configuradas no servidor.");
  }

  const headers = {
    "X-Codigo-Escola": codigoEscola,
    "X-Autorizacao": token,
    "Content-Type": "application/json"
  };

  const url = `https://api.ischolar.app/turma/disciplinas?id_turma=${idTurma}`;
  const result = await safeFetchIscholarJson(url, { method: "GET", headers });

  if (!result.ok || !result.data) {
    console.error(`[ischolar-disciplinas] Erro ao buscar disciplinas da turma ${idTurma}:`, result.error);
    return [];
  }

  const rawDados = result.data.dados || result.data.disciplinas || result.data;
  const listaDisc = Array.isArray(rawDados) ? rawDados : (typeof rawDados === "object" && rawDados !== null ? Object.values(rawDados) : []);

  if (listaDisc.length > 0) {
    console.log("[ischolar-disciplinas] Amostra do registro de disciplina:", JSON.stringify(listaDisc[0], null, 2));
  }

  const cacheFuncMap = new Map();

  const discPromises = (Array.isArray(listaDisc) ? listaDisc : []).map(async (d) => {
    if (!d || typeof d !== "object") return null;

    let nomeDisc = extrairStringValor(d.disciplina_nome) ||
                   extrairStringValor(d.nome_disciplina) ||
                   extrairStringValor(d.nome) ||
                   extrairStringValor(d.disciplina) ||
                   extrairStringValor(d.titulo) ||
                   extrairStringValor(d.descricao) ||
                   "Disciplina";

    let idDisc = String(d.id_disciplina || d.id || d.disciplina_id || d.codigo_disciplina || d.codigo || "");
    let codDisc = extrairStringValor(d.codigo_disciplina) || extrairStringValor(d.codigo) || "";
    let periodo = extrairStringValor(d.periodo_letivo) || extrairStringValor(d.periodo) || extrairStringValor(d.ano_letivo) || "";

    // id_professor da disciplina serve como id_funcionario no iScholar (ex: id 47)
    let idProf = extrairIdProfessor(d);
    let nomeProf = extrairNomeProfessor(d); // nome já vem de d.professores.nome_professor
    let emailProf = extrairEmailDoObjeto(d);

    // Se temos o id_professor, usa /funcionarios/busca apenas para obter o e-mail
    // (o nome já vem correto do objeto 'professores' na disciplina)
    if (idProf && !emailProf) {
      const dadosProf = await buscarFuncionarioPorIdIscholar(idProf, cacheFuncMap);
      // Só usa o nome do /funcionarios/busca se não tínhamos nome ainda
      if (!nomeProf && dadosProf.nome) nomeProf = dadosProf.nome;
      if (dadosProf.email) emailProf = dadosProf.email;
    }

    // Fallback de e-mail institucional
    if (nomeProf && !emailProf) {
      const local = gerarEmailLocalPart(nomeProf, idProf || "prof");
      emailProf = `${local}@portalcci.com.br`;
    }

    return {
      id_disciplina: idDisc,
      nome_disciplina: nomeDisc,
      codigo_disciplina: codDisc,
      periodo_letivo: periodo,
      id_professor: idProf,
      nome_professor: nomeProf,
      email_professor: emailProf
    };
  });

  const disciplinas = await Promise.all(discPromises);
  return disciplinas.filter(Boolean);
}

async function obterAlunosTurmaIscholar(idTurma) {
  const { codigoEscola, token } = obterCredenciaisIscholar();
  if (!codigoEscola || !token) {
    throw new Error("Credenciais do iScholar não configuradas no servidor.");
  }

  const headers = {
    "X-Codigo-Escola": codigoEscola,
    "X-Autorizacao": token,
    "Content-Type": "application/json"
  };

  const url = `https://api.ischolar.app/matricula/listar?id_turma=${idTurma}`;
  const result = await safeFetchIscholarJson(url, { method: "GET", headers });

  if (!result.ok || !result.data) {
    console.error(`[ischolar-alunos] Erro ao buscar alunos da turma ${idTurma}:`, result.error);
    return [];
  }

  const rawLista = result.data.dados || result.data.matriculas || result.data.alunos || result.data;
  const lista = Array.isArray(rawLista) ? rawLista : (typeof rawLista === "object" && rawLista !== null ? Object.values(rawLista) : []);

  if (lista.length > 0) {
    console.log("[ischolar-alunos] Registro de amostra de matricula:", JSON.stringify(lista[0], null, 2));
  }

  const alunosPromises = (Array.isArray(lista) ? lista : []).map(async (m) => {
    if (!m || typeof m !== "object") return null;

    const nomeAluno = extrairStringValor(m.nome_aluno || m.aluno || m.nome || m.nome_completo);
    const idAluno = String(m.id_aluno || m.id || m.aluno_id || "");

    let email = extrairEmailDoObjeto(m);

    // Se o e-mail não veio na listagem da matrícula, busca no perfil do aluno (/aluno/busca)
    if (!email && idAluno) {
      try {
        const resAluno = await safeFetchIscholarJson(`https://api.ischolar.app/aluno/busca?id_aluno=${idAluno}`, { method: "GET", headers });
        if (resAluno.ok && resAluno.data) {
          const dAluno = resAluno.data.dados || resAluno.data.aluno || resAluno.data;
          email = extrairEmailDoObjeto(dAluno) || extrairEmailDoObjeto(resAluno.data);
        }
      } catch (e) {
        console.error(`[ischolar-alunos] Erro ao buscar perfil do aluno ID ${idAluno}:`, e.message);
      }
    }

    // Fallback apenas se não existir e-mail cadastrado
    if (!email && nomeAluno && idAluno) {
      const isTecnico = (m.nome_turma || m.curso || "").toUpperCase().includes("TECNICO");
      const dom = isTecnico ? "@tecscci.com.br" : "@portalcci.com.br";
      const local = gerarEmailLocalPart(nomeAluno, idAluno);
      email = `${local}${dom}`;
    }

    return {
      id_aluno: idAluno,
      nome_aluno: nomeAluno,
      email: email
    };
  });

  const alunos = await Promise.all(alunosPromises);
  return alunos.filter(Boolean);
}

app.get("/api/ti/ischolar/debug-turmas", async (req, res) => {
  try {
    const { codigoEscola, token } = obterCredenciaisIscholar();
    if (!codigoEscola || !token) {
      return res.status(400).json({
        ok: false,
        error: "Credenciais do iScholar ausentes no ambiente. Defina ISCHOLAR_CODIGO_ESCOLA e ISCHOLAR_TOKEN no server/.env."
      });
    }

    const headers = {
      "X-Codigo-Escola": codigoEscola,
      "X-Autorizacao": token,
      "Content-Type": "application/json"
    };

    // ID de turma vindo na querystring ou detectado dinamicamente
    let idTurmaExemplo = req.query.id_turma ? String(req.query.id_turma) : "";
    if (!idTurmaExemplo) {
      try {
        const resTurmas = await safeFetchIscholarJson("https://api.ischolar.app/turma/lista?unidade_id=1", { method: "GET", headers });
        if (resTurmas.ok && resTurmas.data) {
          const list = resTurmas.data.dados || resTurmas.data.turmas || resTurmas.data;
          if (Array.isArray(list) && list.length > 0 && (list[0].id_turma || list[0].id)) {
            idTurmaExemplo = String(list[0].id_turma || list[0].id);
          }
        }
      } catch (e) {}
    }
    if (!idTurmaExemplo) idTurmaExemplo = "1052";

    let idFuncionarioExemplo = req.query.id_funcionario ? String(req.query.id_funcionario) : "1";

    const testes = [
      { url: "https://api.ischolar.app/unidades/listar_unidades", method: "GET" },
      { url: "https://api.ischolar.app/turma/lista?unidade_id=1", method: "GET" },
      { url: `https://api.ischolar.app/turma/disciplinas?id_turma=${idTurmaExemplo}`, method: "GET" },
      { url: `https://api.ischolar.app/funcionarios/busca?id_funcionario=${idFuncionarioExemplo}`, method: "GET" },
      { url: "https://api.ischolar.app/funcionarios/listar", method: "GET" }
    ];

    const resultados = [];

    for (const t of testes) {
      try {
        const opts = { method: t.method, headers };
        if (t.body) opts.body = t.body;

        const response = await fetch(t.url, opts);
        const text = await response.text();

        let jsonParsed = null;
        try { jsonParsed = JSON.parse(text); } catch (e) {}

        resultados.push({
          url: t.url,
          method: t.method,
          status: response.status,
          statusText: response.statusText,
          bodyLength: text ? text.length : 0,
          isJson: !!jsonParsed,
          jsonSnippet: jsonParsed ? jsonParsed : text.slice(0, 300)
        });
      } catch (e) {
        resultados.push({
          url: t.url,
          method: t.method,
          error: e.message
        });
      }
    }

    return res.json({
      ok: true,
      credenciaisConfiguradas: {
        codigoEscola: codigoEscola ? `${codigoEscola.slice(0, 3)}***` : "AUSENTE",
        tokenPresente: !!token
      },
      idTurmaTestada: idTurmaExemplo,
      resultados
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/ti/ischolar/turmas", async (req, res) => {
  try {
    const turmas = await obterTurmasIscholar();
    return res.json({ ok: true, turmas });
  } catch (e) {
    console.error("[ischolar-turmas] Erro:", e);
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/ti/ischolar/turmas/:idTurma/disciplinas", async (req, res) => {
  try {
    const { idTurma } = req.params;
    const { idUnidade } = req.query || {};
    const disciplinas = await obterDisciplinasTurmaIscholar(idTurma, idUnidade);
    const mapeamentos = lerMapeamentosClassroom();
    return res.json({ ok: true, disciplinas, mapeamentos });
  } catch (e) {
    console.error("[ischolar-disciplinas] Erro:", e);
    return res.status(500).json({ error: e.message });
  }
});

// Endpoint de diagnóstico: retorna dados crus e processados para uma turma/disciplina
app.get("/api/ti/ischolar/debug-disciplina/:idTurma", async (req, res) => {
  try {
    const { idTurma } = req.params;
    const { codigoEscola, token } = obterCredenciaisIscholar();
    if (!codigoEscola || !token) return res.status(400).json({ error: "Sem credenciais" });

    const headers = {
      "X-Codigo-Escola": codigoEscola,
      "X-Autorizacao": token,
      "Content-Type": "application/json"
    };

    // 1. Raw do endpoint de disciplinas
    const rawResp = await fetch(`https://api.ischolar.app/turma/disciplinas?id_turma=${idTurma}`, { method: "GET", headers });
    const rawText = await rawResp.text();
    let rawJson = null;
    try { rawJson = JSON.parse(rawText); } catch (e) {}

    // 2. Resultado processado pela função
    const disciplinasProcessadas = await obterDisciplinasTurmaIscholar(idTurma);

    // 3. Para a disc 490 (ou a primeira), testar a busca de funcionário diretamente
    const primeiraDisc = disciplinasProcessadas[0] || null;
    let testeFuncionario = null;
    if (primeiraDisc && primeiraDisc.id_professor) {
      const urlFunc = `https://api.ischolar.app/funcionarios/busca?id_funcionario=${primeiraDisc.id_professor}`;
      const funcResp = await fetch(urlFunc, { method: "GET", headers });
      const funcText = await funcResp.text();
      try { testeFuncionario = { url: urlFunc, status: funcResp.status, data: JSON.parse(funcText) }; } catch (e) {
        testeFuncionario = { url: urlFunc, status: funcResp.status, text: funcText.slice(0, 300) };
      }
    }

    return res.json({
      ok: true,
      idTurma,
      raw_ischolar: rawJson || rawText.slice(0, 500),
      disciplinas_processadas: disciplinasProcessadas,
      teste_funcionario: testeFuncionario
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/ti/ischolar/turmas/:idTurma/alunos", async (req, res) => {
  try {
    const { idTurma } = req.params;
    const alunos = await obterAlunosTurmaIscholar(idTurma);
    return res.json({ ok: true, alunos });
  } catch (e) {
    console.error("[ischolar-alunos] Erro:", e);
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/ti/google-classroom/mapeamento", (req, res) => {
  const mapeamentos = lerMapeamentosClassroom();
  return res.json({ ok: true, mapeamentos });
});

async function criarGoogleClassroomClientAuth() {
  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    throw new Error("Credenciais do Google não configuradas no servidor.");
  }

  // 1. Tentativa com escopos de cursos e listas usando o e-mail delegado oficial dev.fac@portalcci.com.br
  try {
    const auth1 = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        "https://www.googleapis.com/auth/classroom.courses",
        "https://www.googleapis.com/auth/classroom.rosters"
      ],
      subject: "dev.fac@portalcci.com.br",
    });
    await auth1.authorize();
    return google.classroom({ version: "v1", auth: auth1 });
  } catch (e1) {
    console.warn("[google-classroom-auth] Falha na delegação de rosters, alternando para courses:", e1.message);
  }

  // 2. Tentativa com o escopo primário classroom.courses
  const auth2 = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/classroom.courses"],
    subject: "dev.fac@portalcci.com.br",
  });
  await auth2.authorize();
  return google.classroom({ version: "v1", auth: auth2 });
}

app.post("/api/ti/google-classroom/criar-salas-disciplinas", async (req, res) => {
  try {
    const { idToken, idTurma, periodoLetivo, disciplinas } = req.body || {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "idToken ausente. Faça login no topo do site." });
    }
    const { email: userEmail } = await verificarIdTokenUsuario(idToken);
    const orgUnitPath = await obterOrgUnitPathUsuario(userEmail);
    const manual = lerPapeisManuaisArquivo()[userEmail.toLowerCase()] || [];
    const papeis = mesclarPapeisManuais(mapearPapeisDoOrgUnit(orgUnitPath), manual);
    if (!papeis.includes("setape") && !papeis.includes("admin")) {
      return res.status(403).json({ error: "Acesso negado: apenas equipe de TI." });
    }

    if (!idTurma || !disciplinas || !Array.isArray(disciplinas) || disciplinas.length === 0) {
      return res.status(400).json({ error: "idTurma e lista de disciplinas são obrigatórios." });
    }

    const classroom = await criarGoogleClassroomClientAuth();
    const mapeamentos = lerMapeamentosClassroom();
    const resultados = [];

    const periodoFormatado = String(periodoLetivo || "2026.1").trim();

    for (const disc of disciplinas) {
      const idDisc = String(disc.id_disciplina || disc.id).trim();
      const nomeDisc = String(disc.nome_disciplina || disc.nome).trim();
      const nomeProf = String(disc.nome_professor || disc.professor || "").trim();
      const emailProf = String(disc.email_professor || disc.professor_email || "").trim();
      const chaveMapeamento = `${idTurma}_${idDisc}`;

      // Padrão de Nomenclatura Solicitado: [Nome da Disciplina] - [Periodo Letivo]
      const nomeSalaClassroom = `${nomeDisc} - ${periodoFormatado}`;

      // 1. Verificar se a disciplina JÁ foi criada anteriormente para o mesmo período letivo
      //    Deduplicação por NOME NORMALIZADO (permite reutilização cross-turma e cross-curso)
      const nomeNorm = normalizarNomeDisc(nomeDisc);
      const mapeamentoExistente = Object.values(mapeamentos).find(
        (m) =>
          m &&
          m.google_course_id &&
          normalizarNomeDisc(m.nome_disciplina || "") === nomeNorm &&
          String(m.periodo_letivo || "").trim() === periodoFormatado
      );

      if (mapeamentoExistente) {
        console.log(
          `[google-classroom-create-disc] Reaproveitando sala existente para disciplina ${idDisc} (${nomeDisc}): ${mapeamentoExistente.google_course_id}`
        );

        let profEnsalado = mapeamentoExistente.professor_ensalado || false;
        let avisoProfessor = mapeamentoExistente.aviso_professor || null;

        if (emailProf && emailProf.includes("@")) {
          try {
            await classroom.courses.teachers.create({
              courseId: mapeamentoExistente.google_course_id,
              requestBody: {
                userId: emailProf,
              },
            });
            profEnsalado = true;
            console.log(
              `[classroom-professor] Docente adicional ${emailProf} ensalado na sala reutilizada ${mapeamentoExistente.google_course_id}`
            );
          } catch (errProf) {
            const msgErrProf = errProf.response?.data?.error?.message || errProf.message;
            if (errProf.response?.status !== 409 && !msgErrProf?.includes("already exists")) {
              console.warn(
                `[classroom-professor] Erro ao adicionar docente adicional ${emailProf}:`,
                msgErrProf
              );
              avisoProfessor = `Permissão insuficiente no Google Workspace para adicionar docente (${emailProf}): ${msgErrProf}`;
            }
          }
        }

        const dadosReaproveitados = {
          google_course_id: mapeamentoExistente.google_course_id,
          google_course_name: mapeamentoExistente.google_course_name,
          alternateLink: mapeamentoExistente.alternateLink,
          id_turma: String(idTurma),
          id_disciplina: idDisc,
          nome_disciplina: nomeDisc,
          periodo_letivo: periodoFormatado,
          id_professor: disc.id_professor || "",
          nome_professor: nomeProf,
          email_professor: emailProf,
          professor_ensalado: profEnsalado,
          aviso_professor: avisoProfessor,
          reaproveitada: true,
          created_at: new Date().toISOString(),
        };

        mapeamentos[chaveMapeamento] = dadosReaproveitados;
        resultados.push({ ...dadosReaproveitados, status: "sucesso" });
        continue;
      }

      try {
        const response = await classroom.courses.create({
          requestBody: {
            name: nomeSalaClassroom,
            section: nomeProf || "Sem Docente Definido",
            ownerId: "me",
            courseState: "ACTIVE",
          },
        });

        let profEnsalado = false;
        let avisoProfessor = null;

        if (emailProf && emailProf.includes("@")) {
          try {
            await classroom.courses.teachers.create({
              courseId: response.data.id,
              requestBody: {
                userId: emailProf
              }
            });
            profEnsalado = true;
            console.log(`[classroom-professor] Professor ${emailProf} ensalado como docente da sala ${response.data.id}`);
          } catch (errProf) {
            const msgErrProf = errProf.response?.data?.error?.message || errProf.message;
            console.error(`[classroom-professor] Aviso/Erro de permissão ao adicionar docente ${emailProf}:`, msgErrProf);
            avisoProfessor = `Permissão insuficiente no Google Workspace para adicionar docente (${emailProf}): ${msgErrProf}`;
          }
        }

        const dadosCriacao = {
          google_course_id: response.data.id,
          google_course_name: response.data.name,
          alternateLink: response.data.alternateLink,
          id_turma: String(idTurma),
          id_disciplina: idDisc,
          nome_disciplina: nomeDisc,
          periodo_letivo: periodoFormatado,
          id_professor: disc.id_professor || "",
          nome_professor: nomeProf,
          email_professor: emailProf,
          professor_ensalado: profEnsalado,
          aviso_professor: avisoProfessor,
          created_at: new Date().toISOString()
        };

        mapeamentos[chaveMapeamento] = dadosCriacao;
        resultados.push({ ...dadosCriacao, status: "sucesso" });
      } catch (errDisc) {
        console.error(`[google-classroom-create-disc] Erro ao criar disciplina ${nomeDisc}:`, errDisc);
        const errMsg = errDisc.response?.data?.error?.message || errDisc.message;
        resultados.push({
          id_disciplina: idDisc,
          nome_disciplina: nomeDisc,
          status: "erro",
          erro: errMsg
        });
      }
    }

    salvarMapeamentosClassroom(mapeamentos);

    const sucessos = resultados.filter(r => r.status === "sucesso");
    const erros = resultados.filter(r => r.status === "erro");

    if (sucessos.length === 0 && erros.length > 0) {
      const primeiroErro = erros[0].erro || "Erro ao criar salas no Google Classroom.";
      return res.status(400).json({
        ok: false,
        error: `Falha na criação no Google Classroom: ${primeiroErro}`,
        criadas: resultados,
        mapeamentos
      });
    }

    return res.json({
      ok: true,
      criadas: resultados,
      mapeamentos
    });
  } catch (e) {
    console.error("[google-classroom-criar-salas-disciplinas] Erro geral:", e);
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/ti/google-classroom/ensalar-turma", async (req, res) => {
  try {
    const { idToken, idTurma } = req.body || {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "idToken ausente. Faça login no topo do site." });
    }
    const { email: userEmail } = await verificarIdTokenUsuario(idToken);
    const orgUnitPath = await obterOrgUnitPathUsuario(userEmail);
    const manual = lerPapeisManuaisArquivo()[userEmail.toLowerCase()] || [];
    const papeis = mesclarPapeisManuais(mapearPapeisDoOrgUnit(orgUnitPath), manual);
    if (!papeis.includes("setape") && !papeis.includes("admin")) {
      return res.status(403).json({ error: "Acesso negado: apenas equipe de TI." });
    }

    if (!idTurma) {
      return res.status(400).json({ error: "idTurma é obrigatório." });
    }

    const mapeamentos = lerMapeamentosClassroom();
    const prefixo = `${idTurma}_`;
    const salasMapeadas = Object.keys(mapeamentos)
      .filter(k => k.startsWith(prefixo))
      .map(k => mapeamentos[k]);

    if (salasMapeadas.length === 0) {
      return res.status(400).json({
        error: `Nenhuma sala do Google Classroom foi criada/mapeada para a Turma ID ${idTurma} ainda. Crie as salas das disciplinas primeiro.`
      });
    }

    const alunos = await obterAlunosTurmaIscholar(idTurma);
    if (alunos.length === 0) {
      return res.status(400).json({ error: `Nenhum aluno encontrado para a Turma ID ${idTurma} no iScholar.` });
    }

    const classroom = await criarGoogleClassroomClientAuth();

    const relatorio = {
      totalAlunos: alunos.length,
      totalSalas: salasMapeadas.length,
      sucessos: 0,
      jaMatriculados: 0,
      falhas: 0,
      detalhes: []
    };

    for (const aluno of alunos) {
      const emailAluno = aluno.email;
      if (!emailAluno) continue;

      for (const sala of salasMapeadas) {
        try {
          await classroom.courses.students.create({
            courseId: sala.google_course_id,
            requestBody: {
              userId: emailAluno
            }
          });

          relatorio.sucessos++;
          relatorio.detalhes.push({
            aluno: aluno.nome_aluno,
            email: emailAluno,
            sala: sala.google_course_name,
            status: "matriculado"
          });
        } catch (errStudent) {
          const status = errStudent.response?.status;
          const msg = errStudent.response?.data?.error?.message || errStudent.message;

          if (status === 409 || (msg && msg.includes("already exists"))) {
            relatorio.jaMatriculados++;
            relatorio.detalhes.push({
              aluno: aluno.nome_aluno,
              email: emailAluno,
              sala: sala.google_course_name,
              status: "ja_existia"
            });
          } else {
            relatorio.falhas++;
            relatorio.detalhes.push({
              aluno: aluno.nome_aluno,
              email: emailAluno,
              sala: sala.google_course_name,
              status: "erro",
              erro: msg
            });
          }
        }
        await new Promise(r => setTimeout(r, 150));
      }
    }

    return res.json({
      ok: true,
      relatorio
    });
  } catch (e) {
    console.error("[google-classroom-ensalar-turma] Erro geral:", e);
    return res.status(500).json({ error: e.message });
  }
});



// ─── Mapeamento server-side: setor a partir dos papeis ──────────────────────

/** Papeis de gerente → papel base do setor (espelhado do front). */
const GERENTE_PARA_SETOR_BASE = {
  gerente_biblioteca: "biblioteca",
  gerente_direcao: "direcao",
  gerente_disciplinar: "disciplinar",
  gerente_dp: "dp",
  gerente_faculdade: "faculdade",
  gerente_financeiro: "financeiro",
  gerente_publicidade: "publicidade",
  gerente_secretaria: "secretaria",
  gerente_servicosgerais: "servicosgerais",
  gerente_setape: "setape",
  gerente_almoxarifado: "almoxarifado",
  gerente_primeirossocorros: "primeirossocorros",
  gerente_clat: "clat",
};

const PAPEIS_SETOR_BASE = new Set([
  "biblioteca", "direcao", "disciplinar", "dp", "faculdade", "financeiro",
  "publicidade", "secretaria", "servicosgerais", "setape", "almoxarifado",
  "primeirossocorros", "clat",
]);

function extrairSetorDePapeis(papeis) {
  if (!Array.isArray(papeis)) return { setor: null, isGerente: false };
  // Verifica se é gerente de algum setor
  for (const p of papeis) {
    if (GERENTE_PARA_SETOR_BASE[p]) {
      return { setor: GERENTE_PARA_SETOR_BASE[p], isGerente: true };
    }
  }
  // Verifica papel base
  for (const p of papeis) {
    if (PAPEIS_SETOR_BASE.has(p)) {
      return { setor: p, isGerente: false };
    }
  }
  return { setor: null, isGerente: false };
}

// ─── POST /api/usuarios/registrar ───────────────────────────────────────────

app.post("/api/usuarios/registrar", async (req, res) => {
  try {
    const { idToken, papeis } = req.body || {};
    const payload = await verificarAutenticacaoRequest(req);
    const email = payload?.email;
    const nome = payload?.name ?? email ?? "Usuário";
    const fotoUrl = payload?.picture || null;
    if (!email) return res.status(400).json({ error: "Token inválido." });

    const supabase = getSupabaseAdmin();
    if (!supabase) return res.json({ ok: true, skipped: true }); // sem supabase, ignora silenciosamente

    const { setor, isGerente } = extrairSetorDePapeis(papeis);
    await registrarOuAtualizarUsuario(supabase, { email, nome, setor, isGerente, fotoUrl });
    return res.json({ ok: true });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Erro /api/usuarios/registrar:", msg);
    return res.status(500).json({ error: msg });
  }
});

// ─── GET /api/kanban/usuarios ────────────────────────────────────────────────

app.post("/api/kanban/usuarios", async (req, res) => {
  try {
    const { idToken, setor } = req.body || {};
    await verificarAutenticacaoRequest(req);
    if (!setor || typeof setor !== "string") {
      return res.status(400).json({ error: "setor é obrigatório." });
    }
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ error: mensagemSupabaseNaoConfigurado() });

    let usuarios = [];
    if (setor === "dp-financeiro") {
      const [uDP, uFin] = await Promise.all([
        listarUsuariosPorSetor(supabase, "dp"),
        listarUsuariosPorSetor(supabase, "financeiro"),
      ]);
      const mapa = new Map();
      [...uDP, ...uFin].forEach(u => mapa.set(u.email, u));
      usuarios = Array.from(mapa.values());
    } else {
      usuarios = await listarUsuariosPorSetor(supabase, setor);
    }
    return res.json({ usuarios });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ─── GET /api/kanban/cards ───────────────────────────────────────────────────

app.post("/api/kanban/cards/listar", async (req, res) => {
  try {
    const { idToken, setor } = req.body || {};
    const payload = await verificarAutenticacaoRequest(req);
    if (!setor || typeof setor !== "string") {
      return res.status(400).json({ error: "setor é obrigatório." });
    }
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ error: mensagemSupabaseNaoConfigurado() });
    const cards = await listarCardsPorSetor(supabase, setor);
    return res.json({ cards });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ─── POST /api/kanban/cards/criar ────────────────────────────────────────────

app.post("/api/kanban/cards/criar", async (req, res) => {
  try {
    const { idToken, card } = req.body || {};
    const payload = await verificarAutenticacaoRequest(req);
    if (!card || typeof card !== "object") {
      return res.status(400).json({ error: "card é obrigatório." });
    }
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ error: mensagemSupabaseNaoConfigurado() });

    const id = `KNB-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const novoCard = await criarCard(supabase, {
      id,
      setor: card.setor,
      titulo: String(card.titulo || "").trim(),
      descricao: String(card.descricao || "").trim(),
      coluna: card.coluna || "todo",
      atribuidoA: card.atribuidoA || null,
      atribuidoNome: card.atribuidoNome || null,
      criadoPor: payload.email,
      criadoPorNome: payload.name ?? payload.email,
      prioridade: card.prioridade || "media",
      dataLimite: card.dataLimite || null,
    });
    return res.json({ ok: true, card: novoCard });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ─── POST /api/kanban/cards/atualizar ────────────────────────────────────────

app.post("/api/kanban/cards/atualizar", async (req, res) => {
  try {
    const { idToken, id, patch } = req.body || {};
    await verificarAutenticacaoRequest(req);
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "id é obrigatório." });
    }
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ error: mensagemSupabaseNaoConfigurado() });
    const card = await atualizarCard(supabase, id, patch || {});
    return res.json({ ok: true, card });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ─── POST /api/kanban/cards/excluir ──────────────────────────────────────────

app.post("/api/kanban/cards/excluir", async (req, res) => {
  try {
    const { idToken, id } = req.body || {};
    await verificarAutenticacaoRequest(req);
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "id é obrigatório." });
    }
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ error: mensagemSupabaseNaoConfigurado() });
    await excluirCard(supabase, id);
    return res.json({ ok: true });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
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

// ─────────────────────────────────────────────────────────────
// HELPERS: Grade Horária Excel
// ─────────────────────────────────────────────────────────────

/** Normaliza nome de disciplina para comparação de deduplicação */
function normalizarNomeDisc(nome) {
  return String(nome || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sheets de cursos que o parser deve processar */
const SHEETS_CURSOS = ["ADS", "BIOMEDICINA", "DIREITO ", "ENFERMAGEM", "FONOAUDIOLOGIA", "PEDAGOGIA", "PSICOLOGIA", "TÉC ENF ", "TÉC SAÚDE BUCAL"];

/** Converte número romano para inteiro */
function romanToNum(str) {
  const s = String(str || "").toUpperCase().trim();
  const romanMap = { "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10 };
  if (romanMap[s]) return romanMap[s];
  const m = s.match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\b/);
  return m ? romanMap[m[1]] : null;
}

/** Extrai o número de período/módulo de uma string */
function extrairNumeroPeriodo(str) {
  const s = String(str || "").trim();
  const m = s.match(/(\d+)[ºo°]?\s*[–-]?\s*(?:período|módulo|mód)/i);
  if (m) return parseInt(m[1], 10);
  const r = romanToNum(s);
  if (r) return r;
  const nums = s.match(/(\d+)/g);
  if (nums) {
    for (const n of nums) {
      const val = parseInt(n, 10);
      if (val < 20) return val;
    }
  }
  return null;
}

/**
 * Parseia o arquivo Excel da grade horária.
 * Retorna array de objetos: { nomeTurma, curso, periodo, periodoLetivo, disciplinas: [{nome, professor}] }
 */
function parseGradeHorariaExcel(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const turmas = [];

  for (const sheetName of SHEETS_CURSOS) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const curso = sheetName.trim();
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    let turmaAtual = null;
    let disciplinasRows = [];
    let professoresRow = null;
    let numColunas = 6;

    const flushTurma = () => {
      if (!turmaAtual) return;
      const discMap = {};
      for (const row of disciplinasRows) {
        for (let col = 1; col <= numColunas; col++) {
          const val = String(row[col] || "").trim();
          if (!val) continue;
          if (!discMap[col]) discMap[col] = [];
          discMap[col].push(...val.split("+").map(p => p.trim()).filter(Boolean));
        }
      }
      const listaDisc = [];
      const nomesVistos = new Set();
      for (let col = 1; col <= numColunas; col++) {
        const nomes = discMap[col] || [];
        const prof = professoresRow ? String(professoresRow[col] || "").trim() : "";
        const profLimpo = prof.replace(/^(Prof[oaºª.]+\s*)/i, "").trim();
        for (const nome of nomes) {
          if (!nome || nomesVistos.has(normalizarNomeDisc(nome))) continue;
          nomesVistos.add(normalizarNomeDisc(nome));
          listaDisc.push({ nome: nome.trim(), professor: profLimpo });
        }
      }
      if (listaDisc.length > 0) {
        const existente = turmas.find(t => t.periodo !== null && t.periodo === turmaAtual.periodo);
        if (existente) {
          for (const d of listaDisc) {
            if (!existente.disciplinas.some(x => normalizarNomeDisc(x.nome) === normalizarNomeDisc(d.nome))) {
              existente.disciplinas.push(d);
            }
          }
        } else {
          turmas.push({ ...turmaAtual, disciplinas: listaDisc });
        }
      }
      turmaAtual = null;
      disciplinasRows = [];
      professoresRow = null;
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const col0 = String(row[0] || "").trim();

      const isSubheader =
        col0.toLowerCase().startsWith("primeiro ciclo") ||
        col0.toLowerCase().startsWith("segundo ciclo") ||
        col0.toLowerCase().startsWith("terceiro ciclo") ||
        col0.toLowerCase().startsWith("ambientação") ||
        col0.toLowerCase().startsWith("em campo") ||
        col0.toLowerCase().startsWith("horário") ||
        col0.toLowerCase().startsWith("professor") ||
        col0.toLowerCase().startsWith("sala") ||
        col0.toLowerCase().startsWith("class") ||
        col0.toLowerCase().startsWith("observ") ||
        col0.toLowerCase().startsWith("grade") ||
        col0.toLowerCase().startsWith("curso de") ||
        col0.startsWith("1º - 19h") ||
        col0.startsWith("1ª - 19h") ||
        col0.startsWith("Das 19h");

      const ehLinhaTurma =
        col0 &&
        !isSubheader &&
        (col0.match(/(1º|2º|3º|4º|5º|6º|7º|8º|9º|10º|1°|2°|\d+[ºo°])/i) ||
         col0.toLowerCase().includes("técnico em") ||
         col0.toLowerCase().includes("módulo") ||
         col0.toLowerCase().includes("modulo") ||
         col0.match(/\b(I|II|III|IV|V|VI)\b/));

      if (ehLinhaTurma) {
        if (disciplinasRows.length > 0) flushTurma();
        const periodoLetMatch = col0.match(/(\d{4}\.\d)/i);
        const periodoLet = periodoLetMatch ? periodoLetMatch[1] : "2026.2";
        const numPeriodo = extrairNumeroPeriodo(col0);
        const headerRow = data[i + 1] || [];
        numColunas = Math.max(1, headerRow.slice(1).filter(c => String(c).trim() !== "").length);

        if (turmaAtual && disciplinasRows.length === 0) {
          turmaAtual.nomeTurma += " " + col0;
          if (numPeriodo !== null) turmaAtual.periodo = numPeriodo;
          if (periodoLetMatch) turmaAtual.periodoLetivo = periodoLet;
        } else {
          turmaAtual = {
            nomeTurma: col0,
            curso,
            periodo: numPeriodo,
            periodoLetivo: periodoLet,
          };
        }
        i++;
        continue;
      }

      if (!turmaAtual) continue;

      if (
        col0 === "" ||
        col0.startsWith("1º - 19h") ||
        col0.startsWith("1ª - 19h") ||
        col0.startsWith("Das 19h") ||
        col0.toLowerCase().startsWith("primeiro ciclo") ||
        col0.toLowerCase().startsWith("segundo ciclo")
      ) {
        const temConteudo = row.slice(1).some(c => String(c).trim() !== "");
        if (temConteudo) disciplinasRows.push(row);
        continue;
      }

      if (col0.toLowerCase().startsWith("professor")) {
        professoresRow = row;
        continue;
      }
    }

    flushTurma();
  }

  return turmas;
}

/**
 * Algoritmo de matching entre turma do Excel e turmas do iScholar.
 * Retorna score 0-100.
 */
function calcularScoreMatch(excelTurma, ischolarTurma) {
  const nomeTurmaIsch = normalizarNomeDisc(ischolarTurma.nome_turma || ischolarTurma.nome || "");
  const cursoNorm = normalizarNomeDisc(excelTurma.curso);
  const periodo = excelTurma.periodo;
  const periodoLetivo = String(excelTurma.periodoLetivo || "").trim();

  let score = 0;

  const abrevMap = {
    "ADS": ["ADS", "ANALISE E DESENVOLVIMENTO DE SISTEMAS", "ANALISE"],
    "BIOMEDICINA": ["BIOMEDICINA", "BIOMED"],
    "DIREITO": ["DIREITO", "DIR"],
    "ENFERMAGEM": ["ENFERMAGEM", "ENF"],
    "FONOAUDIOLOGIA": ["FONOAUDIOLOGIA", "FONO"],
    "PEDAGOGIA": ["PEDAGOGIA", "PED"],
    "PSICOLOGIA": ["PSICOLOGIA", "PSI"],
    "TEC ENF": ["TECNICO EM ENFERMAGEM", "TEC ENF", "ENF TEC", "TÉC ENF"],
    "TEC SAUDE BUCAL": ["TECNICO EM SAUDE BUCAL", "TEC SAUDE BUCAL", "SAUDE BUCAL", "TÉC SAÚDE BUCAL", "TÉC SAUDE BUCAL"],
  };
  const aliases = abrevMap[cursoNorm] || [cursoNorm];
  const cursoEncontrado = aliases.some(a => nomeTurmaIsch.includes(normalizarNomeDisc(a)));
  if (cursoEncontrado) score += 50;

  if (periodo !== null) {
    const numNome = extrairNumeroPeriodo(nomeTurmaIsch);
    if (numNome === periodo) score += 35;
  }

  const periodoIsch = String(ischolarTurma.periodo_letivo || "").trim();
  if (periodoLetivo && periodoIsch && periodoIsch.includes(periodoLetivo.replace(".", ""))) {
    score += 15;
  } else if (periodoLetivo && periodoIsch === periodoLetivo) {
    score += 15;
  }

  return score;
}

// ─────────────────────────────────────────────────────────────
// ENDPOINT: POST /api/ti/grade/parse-excel
// Recebe arquivo Excel (multipart), retorna turmas + disciplinas
// ─────────────────────────────────────────────────────────────
const uploadGrade = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.post("/api/ti/grade/parse-excel", uploadGrade.single("arquivo"), async (req, res) => {
  try {
    const idToken = req.body?.idToken || req.headers["x-id-token"];
    if (!idToken) return res.status(400).json({ error: "idToken ausente." });
    const { email: userEmail } = await verificarIdTokenUsuario(idToken);
    const orgUnitPath = await obterOrgUnitPathUsuario(userEmail);
    const manual = lerPapeisManuaisArquivo()[userEmail.toLowerCase()] || [];
    const papeis = mesclarPapeisManuais(mapearPapeisDoOrgUnit(orgUnitPath), manual);
    if (!papeis.includes("setape") && !papeis.includes("admin")) {
      return res.status(403).json({ error: "Acesso negado: apenas equipe de TI." });
    }

    if (!req.file) return res.status(400).json({ error: "Arquivo Excel não enviado." });

    const turmas = parseGradeHorariaExcel(req.file.buffer);
    return res.json({ ok: true, turmas });
  } catch (e) {
    console.error("[grade-parse-excel] Erro:", e);
    return res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ENDPOINT: POST /api/ti/grade/match-turmas
// Recebe turmas do Excel, busca turmas iScholar, faz matching
// ─────────────────────────────────────────────────────────────
app.post("/api/ti/grade/match-turmas", async (req, res) => {
  try {
    const { idToken, turmasExcel } = req.body || {};
    if (!idToken) return res.status(400).json({ error: "idToken ausente." });
    const { email: userEmail } = await verificarIdTokenUsuario(idToken);
    const orgUnitPath = await obterOrgUnitPathUsuario(userEmail);
    const manual = lerPapeisManuaisArquivo()[userEmail.toLowerCase()] || [];
    const papeis = mesclarPapeisManuais(mapearPapeisDoOrgUnit(orgUnitPath), manual);
    if (!papeis.includes("setape") && !papeis.includes("admin")) {
      return res.status(403).json({ error: "Acesso negado: apenas equipe de TI." });
    }

    if (!Array.isArray(turmasExcel) || turmasExcel.length === 0) {
      return res.status(400).json({ error: "turmasExcel ausente ou vazio." });
    }

    // Busca todas as turmas do iScholar via função auxiliar testada
    const turmasIscholar = await obterTurmasIscholar();

    // Faz matching
    const pares = turmasExcel.map(excelTurma => {
      let melhorMatch = null;
      let melhorScore = 0;

      for (const ischTurma of turmasIscholar) {
        const score = calcularScoreMatch(excelTurma, ischTurma);
        if (score > melhorScore) {
          melhorScore = score;
          melhorMatch = ischTurma;
        }
      }

      return {
        turmaExcel: excelTurma,
        turmaIscholar: melhorScore >= 70 ? melhorMatch : null,
        score: melhorScore,
        status: melhorScore >= 70 ? "matched" : "sem_correspondencia",
        aviso: melhorScore < 70 ? `Nenhuma turma do iScholar com correspondência suficiente (score ${melhorScore}/100). Selecione manualmente.` : null,
        turmasCandidatas: turmasIscholar
          .map(t => ({ ...t, score: calcularScoreMatch(excelTurma, t) }))
          .filter(t => t.score >= 30)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
      };
    });

    return res.json({ ok: true, pares });
  } catch (e) {
    console.error("[grade-match-turmas] Erro:", e);
    return res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ENDPOINT: POST /api/ti/grade/criar-salas
// Cria salas no Classroom a partir da grade Excel confirmada.
// Disciplinas com mesmo nome (normalizado) no mesmo periodoLetivo
// compartilham a mesma sala (cross-turma e cross-curso).
// ─────────────────────────────────────────────────────────────
app.post("/api/ti/grade/criar-salas", async (req, res) => {
  try {
    const { idToken, paresConfirmados, periodoLetivo } = req.body || {};
    if (!idToken) return res.status(400).json({ error: "idToken ausente." });
    const { email: userEmail } = await verificarIdTokenUsuario(idToken);
    const orgUnitPath = await obterOrgUnitPathUsuario(userEmail);
    const manual = lerPapeisManuaisArquivo()[userEmail.toLowerCase()] || [];
    const papeis = mesclarPapeisManuais(mapearPapeisDoOrgUnit(orgUnitPath), manual);
    if (!papeis.includes("setape") && !papeis.includes("admin")) {
      return res.status(403).json({ error: "Acesso negado: apenas equipe de TI." });
    }

    if (!Array.isArray(paresConfirmados) || paresConfirmados.length === 0) {
      return res.status(400).json({ error: "paresConfirmados ausente ou vazio." });
    }

    const periodoFormatado = String(periodoLetivo || "2026.2").trim();
    const classroom = await criarGoogleClassroomClientAuth();
    const mapeamentos = lerMapeamentosClassroom();
    const resultadosPorTurma = [];

    for (const par of paresConfirmados) {
      const { turmaExcel, turmaIscholar } = par;
      if (!turmaIscholar || !turmaIscholar.id_turma) {
        resultadosPorTurma.push({
          nomeTurma: turmaExcel.nomeTurma,
          status: "sem_correspondencia",
          aviso: "Turma sem correspondência no iScholar — ignorada.",
          disciplinas: [],
        });
        continue;
      }

      const idTurma = String(turmaIscholar.id_turma);
      const disciplinasExcel = turmaExcel.disciplinas || [];
      const resultados = [];

      for (const disc of disciplinasExcel) {
        const nomeDisc = String(disc.nome || "").trim();
        const nomeProf = String(disc.professor || "").trim();
        if (!nomeDisc) continue;

        const nomeNorm = normalizarNomeDisc(nomeDisc);
        const nomeSalaClassroom = `${nomeDisc} - ${periodoFormatado}`;
        // Chave de mapeamento: turma + nome normalizado (sem id_disciplina)
        const chaveMapeamento = `${idTurma}_${nomeNorm}`;

        // Busca e-mail do professor pelo nome no iScholar
        let emailProf = "";
        if (nomeProf) {
          try {
            const { codigoEscola, token } = obterCredenciaisIscholar();
            const headers = { "X-Codigo-Escola": codigoEscola, "X-Autorizacao": token, "Content-Type": "application/json" };
            const urlFunc = `https://api.ischolar.app/funcionarios/listar`;
            const resultFunc = await safeFetchIscholarJson(urlFunc, { method: "GET", headers });
            if (resultFunc.ok && resultFunc.data) {
              const rawFunc = resultFunc.data.dados || resultFunc.data.funcionarios || resultFunc.data;
              const listaFunc = Array.isArray(rawFunc) ? rawFunc : Object.values(rawFunc || {});
              const nomeParts = normalizarNomeDisc(nomeProf).split(" ").filter(Boolean);
              const match = listaFunc.find(f => {
                const nomeCompleto = normalizarNomeDisc(`${f.nome || ""} ${f.sobrenome || ""}`);
                return nomeParts.every(p => nomeCompleto.includes(p));
              });
              if (match && match.email) emailProf = match.email;
            }
          } catch (eProf) {
            console.warn(`[grade-criar-salas] Não encontrou e-mail para professor ${nomeProf}:`, eProf.message);
          }
        }

        // Deduplicação por nome normalizado
        const mapeamentoExistente = Object.values(mapeamentos).find(
          (m) =>
            m &&
            m.google_course_id &&
            normalizarNomeDisc(m.nome_disciplina || "") === nomeNorm &&
            String(m.periodo_letivo || "").trim() === periodoFormatado
        );

        if (mapeamentoExistente) {
          // Reaproveita sala existente
          if (emailProf && emailProf.includes("@")) {
            try {
              await classroom.courses.teachers.create({
                courseId: mapeamentoExistente.google_course_id,
                requestBody: { userId: emailProf },
              });
            } catch (errProf) {
              const msgErrProf = errProf.response?.data?.error?.message || errProf.message;
              if (!msgErrProf?.includes("already exists") && errProf.response?.status !== 409) {
                console.warn(`[grade-criar-salas] Docente ${emailProf} não adicionado:`, msgErrProf);
              }
            }
          }

          const dadosReap = {
            google_course_id: mapeamentoExistente.google_course_id,
            google_course_name: mapeamentoExistente.google_course_name,
            alternateLink: mapeamentoExistente.alternateLink,
            id_turma: idTurma,
            id_disciplina: "",
            nome_disciplina: nomeDisc,
            periodo_letivo: periodoFormatado,
            nome_professor: nomeProf,
            email_professor: emailProf,
            professor_ensalado: !!emailProf,
            reaproveitada: true,
            fonte: "excel",
            created_at: new Date().toISOString(),
          };
          mapeamentos[chaveMapeamento] = dadosReap;
          resultados.push({ ...dadosReap, status: "sucesso" });
          continue;
        }

        // Cria nova sala no Classroom
        try {
          const response = await classroom.courses.create({
            requestBody: {
              name: nomeSalaClassroom,
              section: nomeProf || "Sem Docente Definido",
              ownerId: "me",
              courseState: "ACTIVE",
            },
          });

          let profEnsalado = false;
          let avisoProfessor = null;

          if (emailProf && emailProf.includes("@")) {
            try {
              await classroom.courses.teachers.create({
                courseId: response.data.id,
                requestBody: { userId: emailProf },
              });
              profEnsalado = true;
            } catch (errProf) {
              const msgErrProf = errProf.response?.data?.error?.message || errProf.message;
              avisoProfessor = `Não foi possível adicionar o docente (${emailProf}): ${msgErrProf}`;
            }
          }

          const dadosCriacao = {
            google_course_id: response.data.id,
            google_course_name: response.data.name,
            alternateLink: response.data.alternateLink,
            id_turma: idTurma,
            id_disciplina: "",
            nome_disciplina: nomeDisc,
            periodo_letivo: periodoFormatado,
            nome_professor: nomeProf,
            email_professor: emailProf,
            professor_ensalado: profEnsalado,
            aviso_professor: avisoProfessor,
            reaproveitada: false,
            fonte: "excel",
            created_at: new Date().toISOString(),
          };

          mapeamentos[chaveMapeamento] = dadosCriacao;
          resultados.push({ ...dadosCriacao, status: "sucesso" });
        } catch (errDisc) {
          const errMsg = errDisc.response?.data?.error?.message || errDisc.message;
          console.error(`[grade-criar-salas] Erro ao criar ${nomeDisc}:`, errMsg);
          resultados.push({ nome_disciplina: nomeDisc, status: "erro", erro: errMsg });
        }
      }

      salvarMapeamentosClassroom(mapeamentos);
      resultadosPorTurma.push({
        nomeTurma: turmaExcel.nomeTurma,
        idTurmaIscholar: idTurma,
        status: "concluido",
        disciplinas: resultados,
      });
    }

    const totalCriadas = resultadosPorTurma.flatMap(t => t.disciplinas).filter(d => d.status === "sucesso" && !d.reaproveitada).length;
    const totalReaproveitadas = resultadosPorTurma.flatMap(t => t.disciplinas).filter(d => d.reaproveitada).length;
    const totalErros = resultadosPorTurma.flatMap(t => t.disciplinas).filter(d => d.status === "erro").length;

    return res.json({
      ok: true,
      resumo: { totalCriadas, totalReaproveitadas, totalErros },
      resultadosPorTurma,
    });
  } catch (e) {
    console.error("[grade-criar-salas] Erro geral:", e);
    return res.status(500).json({ error: e.message });
  }
});

