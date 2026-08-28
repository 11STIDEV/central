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
import { registerAtestadosRoutes } from "./atestadosRoutes.js";
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
import {
  listarComunicadosStore,
  criarComunicadoStore,
  atualizarComunicadoStore,
  excluirComunicadoStore,
} from "./comunicadosStore.js";
import {
  lerProgressoUsuario,
  salvarProgressoUsuario,
  registrarXpGanho,
  obterRankingSemanal,
} from "./trilhaProgressoStore.js";
import {
  listarTrilhas,
  listarTrilhasAdmin,
  criarTrilha,
  atualizarTrilha,
  excluirTrilha,
  criarMissao,
  atualizarMissao,
  excluirMissao,
} from "./trilhaStore.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Dev local: l├¬ `server/.env`. Produ├º├úo (Docker/Coolify): vari├íveis v├¬m do runtime ÔÇö o `.env` n├úo vai na imagem. */
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3001;
/** Endere├ºo de bind (Docker/rede: use 0.0.0.0 para aceitar conex├Áes externas ao container). */
const HOST = process.env.HOST || "0.0.0.0";

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

registerAtestadosRoutes(app);

/** Um ou mais sufixos permitidos, separados por v├¡rgula. Alinhar ao front (`AuthProvider`) e ao `server/.env.example`. */
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

/** L├¬ env em runtime (Coolify injeta no processo; nomes alternativos comuns). */
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
      "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas vari├íveis de ambiente do container " +
      "(Coolify ÔåÆ Environment / Secrets, em runtime ÔÇö n├úo em Build Arguments). " +
      "O arquivo server/.env do seu PC n├úo ├® copiado para a imagem Docker."
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

/** Slug em `painel_schools` ÔÇö alinhar ao `VITE_SCHOOL_SLUG` do build do front. */
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
    const label = segmento === "direcao" ? "Dire├º├úo" : "Setape";
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

/** Legado: e-mails que podem passar no sync de perfil do painel sem crit├®rio de OU (dev/teste). N├úo usado no front. */
const PAINEL_LOCAL_ALLOW_EMAILS = (process.env.PAINEL_LOCAL_ALLOW_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function emailPainelLocalPermitido(email) {
  const e = String(email).toLowerCase();
  return PAINEL_LOCAL_ALLOW_EMAILS.length > 0 && PAINEL_LOCAL_ALLOW_EMAILS.includes(e);
}

/** Um ou mais Client IDs OAuth (mesmo valor de VITE_GOOGLE_CLIENT_ID no front); separados por v├¡rgula se precisar. */
const GOOGLE_CLIENT_IDS = (process.env.GOOGLE_CLIENT_ID || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const GOOGLE_ADMIN_IMPERSONATE = process.env.GOOGLE_ADMIN_IMPERSONATE;
const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const GOOGLE_SERVICE_ACCOUNT_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
/** Opcional: caminho da OU (ex.: /Administrativo/Setape) para listar só Chromebooks dessa unidade. Default: /Administrativo/Setape */
const GOOGLE_CHROMEBOOK_ORG_UNIT = process.env.GOOGLE_CHROMEBOOK_ORG_UNIT?.trim() || "/Administrativo/Setape";

const DATA_DIR = path.join(__dirname, "data");
const ARQUIVO_RESERVAS_AGENDA = path.join(DATA_DIR, "agenda-cci-reservas.json");
const ARQUIVO_PAPEIS_MANUAIS = path.join(DATA_DIR, "papeis-manuais.json");
const ARQUIVO_SETOR_LINKS = path.join(DATA_DIR, "setor-links.json");

/** Pap├®is atribu├¡veis apenas via API admin (extens├¡vel). */
const PAPEIS_MANUAIS_PERMITIDOS = [
  "admin",
  "painel_admin",
  "painel_atendente",
  "ccipay_admin",
  "ccipay_dp",
  "ccipay_loja",
  "ccipay_lancador",
];

/** Seed na primeira cria├º├úo do arquivo (atribui├º├úo manual inicial). */
const PAPEIS_MANUAIS_SEED = {
  "thiago.ferreira@portalcci.com.br": ["admin"],
};
const AGENDA_CCI_TIMEZONE = process.env.AGENDA_CCI_TIMEZONE || "America/Sao_Paulo";
const AGENDA_CCI_POLL_MS = Number(process.env.AGENDA_CCI_POLL_MS) || 60_000;
const AGENDA_CCI_ENFORCE_DISABLE =
  process.env.AGENDA_CCI_ENFORCE_DISABLE === "true" ||
  process.env.AGENDA_CCI_ENFORCE_DISABLE === "1";
/** Se true e n├úo houver nenhuma reserva salva, aplica disable em todo o parque (pol├¡tica dura). */
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
        error: `GOOGLE_SERVICE_ACCOUNT_JSON inv├ílido: ${e.message}`,
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
        error: `Arquivo n├úo encontrado: ${fullPath}. Salve o JSON da service account (Google Cloud ÔåÆ chave) nesse caminho ou ajuste GOOGLE_SERVICE_ACCOUNT_PATH.`,
      };
    }
    try {
      const raw = fs.readFileSync(fullPath, "utf8");
      return { ok: true, parsed: JSON.parse(raw) };
    } catch (e) {
      return {
        ok: false,
        error: `N├úo foi poss├¡vel ler ou interpretar o JSON em ${fullPath}: ${e.message}`,
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

/** Motivo leg├¡vel quando JWT Admin n├úo pode ser criado (arquivo ausente, JSON inv├ílido, etc.). */
function getServiceAccountSetupError() {
  const r = loadServiceAccountCredentials();
  if (!r.ok) return r.error;
  if (!GOOGLE_ADMIN_IMPERSONATE) {
    return "Defina GOOGLE_ADMIN_IMPERSONATE no server/.env (e-mail de um administrador do Google Workspace).";
  }
  return null;
}

/**
 * Escopos separados: um ├║nico JWT com user + chrome exige que AMBOS estejam na delega├º├úo.
 * Se s├│ `user.readonly` estiver autorizado no Admin, o token falhava e a OU/pap├®is n├úo carregavam.
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

/**
 * JWT dedicado para operações no Google Calendar.
 * Usa GOOGLE_CALENDAR_IMPERSONATE se definido; caso contrário, cai para GOOGLE_ADMIN_IMPERSONATE.
 * Isso permite que os eventos sejam criados em nome de uma conta de sistema dedicada
 * (ex: sistema@portalcci.com.br) em vez da conta de administração principal.
 */
function getCalendarJwt() {
  const credentials = getServiceAccountCredentials();
  if (!credentials) return null;
  const subject =
    process.env.GOOGLE_CALENDAR_IMPERSONATE ||
    GOOGLE_ADMIN_IMPERSONATE;
  if (!subject) return null;
  try {
    return new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/calendar"],
      subject,
    });
  } catch (e) {
    console.error("Erro ao criar JWT Calendar:", e.message);
    return null;
  }
}

/** S├│ para `/api/organizacao` (OU ÔåÆ pap├®is no front). */
function getJwtOrganizacao() {
  return getAdminJwtForScopes([SCOPE_ADMIN_USER_READONLY]);
}

/** Para cria├º├úo de contas de alunos no Google Workspace. */
function getJwtWorkspaceUserWrite() {
  return getAdminJwtForScopes([SCOPE_ADMIN_USER_WRITE]);
}


/** Listagem de Chromebooks + disable/reenable na agenda. Exige escopo delegado ├á service account. */
function getJwtChromeOs() {
  return getAdminJwtForScopes([SCOPE_ADMIN_CHROME_DEVICE]);
}

/**
 * JWT dedicado para envio de e-mail via Gmail API.
 * IMPORTANTE: o `subject` deve ser o mesmo endere├ºo usado como `userId` na chamada
 * (EMAIL_REMETENTE), e n├úo GOOGLE_ADMIN_IMPERSONATE.
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
 * Se o token do Google tiver mais de 1 hora ("Token used too late"), mas aud e domínio forem válidos,
 * aceita o payload para não interromper sessões ativas do usuário.
 * @returns {Promise<{ email: string, name?: string, picture?: string }>}
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
  
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience,
    });
    payload = ticket.getPayload();
  } catch (err) {
    if (err.message && (err.message.includes("Token used too late") || err.message.includes("jwt expired"))) {
      console.warn("[verify] Token ID Google expirado (Token used too late), utilizando payload para sessão ativa:", err.message);
      payload = payloadUnsafe;
    } else {
      throw err;
    }
  }

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
  // Importante: "SEM HDMI" tamb├®m cont├®m a palavra HDMI,
  // ent├úo precisamos tratar negativas antes.
  if (/\bsem\b\s*(entrada\s*)?\bhdmi\b/.test(s)) return false;
  if (/\bnao\b\s*(entrada\s*)?\bhdmi\b/.test(s)) return false;
  if (/\b(n[a├ú]o)\b\s*(entrada\s*)?\bhdmi\b/.test(s)) return false;

  if (/\bcom\b\s*(entrada\s*)?\bhdmi\b/.test(s)) return true;

  // Fallback: se mencionar HDMI sem indicar "sem", consideramos como com HDMI.
  return /\bhdmi\b/.test(s);
}

function ensureDataDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("[agenda-cci] n├úo foi poss├¡vel criar", DATA_DIR, e.message);
  }
}

function sanitizeReservaPayload(payload) {
  return typeof payload === "object" && payload !== null ? payload : null;
}

async function lerReservasSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase n├úo configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
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
    throw new Error("Supabase n├úo configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
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
    throw new Error(`[agenda-cci/supabase] listagem p├│s-upsert: ${listError.message}`);
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
      throw new Error(`[agenda-cci/supabase] remo├º├úo de ├│rf├úos: ${deleteError.message}`);
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
    return p.length ? p.join(" ┬À ") : "Reserva composta";
  }
  if (r.tipo === "chromebook") {
    const n = r.chromebookIds ? r.chromebookIds.length : 0;
    return `${n} Chromebooks`;
  }
  if (r.tipo === "equipamento") {
    return `${r.equipamentoNome || "Equipamento"} ┬À ${r.equipamentoQuantidade || 0} un.`;
  }
  return r.espacoNome || "Espa├ºo";
}

async function sincronizarReservasComGoogleCalendar(novaLista, oldLista) {
  const mainCalendarId = process.env.GOOGLE_CALENDAR_ID;
  const salasCalendarId = process.env.GOOGLE_CALENDAR_SALAS_ID || mainCalendarId;
  if (!mainCalendarId) return;

  const auth = getCalendarJwt();
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

    // 1. Processar cria├º├Áes e atualiza├º├Áes
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
            console.log(`[google-calendar-sync] Evento removido (cancelado): ${r.id} do calend├írio ${cancelCalendarId}`);
          } catch (e) {
            console.error(`[google-calendar-sync] Erro ao remover evento cancelado ${r.id} do calend├írio ${cancelCalendarId}:`, e.message);
          }
          delete r.googleEventId;
          if (oldR) delete oldR.googleEventId;
        }
        continue;
      }

      // Reserva ativa
      const summary = r.titulo
        ? `${r.titulo} - ${r.solicitanteNome}`
        : `${textoResumoReservasParaGoogle(r)} - ${r.solicitanteNome}`;

      const descriptionLines = [
        "Reserva Intranet CCI",
        "",
        `Solicitante: ${r.solicitanteNome} (${r.solicitanteEmail})`,
        `Recursos: ${textoResumoReservasParaGoogle(r)}`,
        `Observa\u00e7\u00e3o: ${r.observacao || "Nenhuma"}`,
        `ID da Reserva: ${r.id}`,
      ];

      const eventDetails = {
        summary,
        description: descriptionLines.join("\n"),
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

      // Se o calend├írio de destino mudou, apaga do antigo e cria no novo
      if (eventId && oldR && getCalendarId(oldR) !== targetCalendarId) {
        const oldTargetCalendarId = getCalendarId(oldR);
        try {
          await calendar.events.delete({
            calendarId: oldTargetCalendarId,
            eventId,
          });
          console.log(`[google-calendar-sync] Evento removido do antigo calend├írio ${oldTargetCalendarId} para migrar reserva: ${r.id}`);
        } catch (e) {
          console.error(`[google-calendar-sync] Erro ao remover evento no antigo calend├írio ${oldTargetCalendarId} para migrar:`, e.message);
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
            console.log(`[google-calendar-sync] Evento atualizado no Google Calendar: ${r.id} no calend├írio ${targetCalendarId}`);
          } catch (e) {
            console.error(`[google-calendar-sync] Erro ao atualizar evento ${r.id} no calend├írio ${targetCalendarId}:`, e.message);
            if (e.code === 404 || (e.response && e.response.status === 404)) {
              // Se o evento foi removido do Google Calendar, tentamos recri├í-lo
              try {
                const created = await calendar.events.insert({
                  calendarId: targetCalendarId,
                  requestBody: eventDetails,
                });
                r.googleEventId = created.data.id;
                console.log(`[google-calendar-sync] Evento recriado (estava ausente no Google): ${r.id} no calend├írio ${targetCalendarId}`);
              } catch (insErr) {
                console.error(`[google-calendar-sync] Erro ao recriar evento para ${r.id} no calend├írio ${targetCalendarId}:`, insErr.message);
                delete r.googleEventId;
              }
            }
          }
        } else {
          r.googleEventId = eventId; // Mant├®m
        }
      } else {
        // Criar novo evento
        try {
          const created = await calendar.events.insert({
            calendarId: targetCalendarId,
            requestBody: eventDetails,
          });
          r.googleEventId = created.data.id;
          console.log(`[google-calendar-sync] Novo evento criado no Google Calendar para reserva: ${r.id} no calend├írio ${targetCalendarId}`);
        } catch (e) {
          console.error(`[google-calendar-sync] Erro ao criar evento para ${r.id} no calend├írio ${targetCalendarId}:`, e.message);
        }
      }
    }

    // 2. Processar remo├º├Áes (deletados completamente da lista)
    for (const oldR of oldLista) {
      if (!novosIds.has(oldR.id) && oldR.googleEventId) {
        const targetCalendarId = getCalendarId(oldR);
        try {
          await calendar.events.delete({
            calendarId: targetCalendarId,
            eventId: oldR.googleEventId,
          });
          console.log(`[google-calendar-sync] Evento removido (deletado da lista): ${oldR.id} do calend├írio ${targetCalendarId}`);
        } catch (e) {
          console.error(`[google-calendar-sync] Erro ao remover evento deletado ${oldR.id} do calend├írio ${targetCalendarId}:`, e.message);
        }
      }
    }

  } catch (err) {
    console.error("[google-calendar-sync] Falha geral na sincroniza├º├úo com Google Calendar:", err.message);
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
    console.warn("[salvarReservasPersistidas] N├úo foi poss├¡vel ler reservas anteriores para sincronizar:", e.message);
  }

  // Detecta reservas novas (IDs que n├úo existiam antes) para envio de e-mail
  const oldIds = new Set(oldLista.map((r) => r.id));
  const novasReservas = lista.filter((r) => r.status === "ativa" && !oldIds.has(r.id));

  // Executa sincroniza├º├úo com o Google Calendar
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

  // Dispara e-mails de confirma├º├úo de forma ass├¡ncrona para cada nova reserva
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
  const targetOu = GOOGLE_CHROMEBOOK_ORG_UNIT || "/Administrativo/Setape";
  const listParams = {
    customerId: "my_customer",
    maxResults: 200,
    orgUnitPath: targetOu,
  };
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
      // Garante filtragem estrita da OU (descarta sub-OUs ou OUs divergentes)
      if (d.orgUnitPath && d.orgUnitPath !== targetOu) continue;
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
      "[agenda-cci] AGENDA_CCI_ENFORCE_DISABLE ativo mas Admin SDK n├úo configurado.",
      getServiceAccountSetupError() || "",
    );
    return;
  }

  try {
    await auth.authorize();
  } catch (e) {
    console.warn(
      "[agenda-cci] JWT Chrome OS n├úo autorizado (delega├º├úo de escopo?). Desative AGENDA_CCI_ENFORCE_DISABLE ou adicione o escopo device.chromeos no Admin:",
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
          console.log(`[agenda-cci] disable (sem reservas, pol├¡tica dura): ${d.deviceId}`);
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
          console.log(`[agenda-cci] reenable (lista vazia, recupera├º├úo): ${d.deviceId}`);
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

/** Decodifica payload do JWT (sem validar assinatura) ÔÇö s├│ para ler `aud` e diagnosticar mismatch de Client ID. */
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
 * POST /api/auth/session ÔÇö troca ID token Google por sess├úo de servidor (~12h sliding).
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
 * GET /api/auth/me ÔÇö restaura usu├írio da sess├úo (cookie ou header x-central-session).
 */
app.get("/api/auth/me", (req, res) => {
  const ctx = getContextoFromSessionRequest(req);
  if (!ctx) {
    return res.status(401).json({ error: "Sess├úo expirada ou n├úo autenticado." });
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
          "Servidor n├úo configurado para Admin SDK. Defina GOOGLE_SERVICE_ACCOUNT_JSON (ou GOOGLE_SERVICE_ACCOUNT_PATH) e GOOGLE_ADMIN_IMPERSONATE.",
        detalhe,
      });
    }

    try {
      await auth.authorize();
    } catch (authErr) {
      const det = mensagemErroGoogle(authErr);
      console.error("Erro /api/organizacao (JWT usu├írio):", det, authErr?.response?.data);
      return res.status(503).json({
        error:
          "A service account n├úo obteve token para ler o diret├│rio de usu├írios. No Admin do Google Workspace (Delega├º├úo em todo o dom├¡nio), use o Client ID num├®rico desta service account e autorize o escopo https://www.googleapis.com/auth/admin.directory.user.readonly",
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
        error: "Usu├írio n├úo encontrado no diret├│rio do Google Workspace.",
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
          "Servidor n├úo configurado para Admin SDK. Defina GOOGLE_SERVICE_ACCOUNT_JSON (ou GOOGLE_SERVICE_ACCOUNT_PATH) e GOOGLE_ADMIN_IMPERSONATE.",
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
          "A service account n├úo conseguiu autorizar o escopo de Chrome OS. No Admin do Google Workspace, em delega├º├úo em todo o dom├¡nio, autorize o Client ID num├®rico da service account com o escopo https://www.googleapis.com/auth/admin.directory.device.chromeos (al├®m de user.readonly para a OU).",
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
 * Body: { idToken } ÔÇö for├ºa uma rodada de disable/reenable (setape ou admin).
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
        error: "AGENDA_CCI_ENFORCE_DISABLE n├úo est├í ativo no servidor.",
      });
    }
    await aplicarPoliticaChromebooks();
    return res.json({ ok: true });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Erro /api/agenda-cci/aplicar-politica-chromebooks:", msg);
    return res.status(500).json({ error: msg || "Erro ao aplicar pol├¡tica." });
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
 * POST /api/agenda-cci/migrar-eventos-calendario
 * Remove eventos de reservas do calendário principal (Agenda CCI) e força recriação no calendário de salas/labs.
 * Body: { idToken }
 */
app.post("/api/agenda-cci/migrar-eventos-calendario", async (req, res) => {
  try {
    const ctx = await resolverContextoFromRequest(req);
    if (!ctx.papeis.includes("admin") && !ctx.papeis.includes("setape")) {
      return res.status(403).json({ error: "Acesso restrito a Setape ou administradores." });
    }

    const mainCalendarId = process.env.GOOGLE_CALENDAR_ID;
    const salasCalendarId = process.env.GOOGLE_CALENDAR_SALAS_ID;
    if (!mainCalendarId || !salasCalendarId) {
      return res.status(400).json({ error: "GOOGLE_CALENDAR_ID e GOOGLE_CALENDAR_SALAS_ID precisam estar configurados no server/.env." });
    }
    if (mainCalendarId === salasCalendarId) {
      return res.json({ ok: true, msg: "Os dois calendários são o mesmo — nada a migrar.", migrados: 0 });
    }

    const auth = getAdminJwtForScopes(["https://www.googleapis.com/auth/calendar"]);
    if (!auth) {
      return res.status(500).json({ error: "Sem credenciais de service account para o Google Calendar." });
    }
    await auth.authorize();
    const calendar = google.calendar({ version: "v3", auth });

    const reservas = await lerReservasPersistidas();

    // Reservas que devem estar no salasCalendarId (toda reserva de equipamento/chromebook/espaço)
    // mas que ainda têm googleEventId salvo (provavelmente criadas no mainCalendarId)
    const paraCorrigir = reservas.filter(
      (r) => r.status === "ativa" && r.googleEventId && r.destinoCalendar !== "agenda_cci"
    );

    let migrados = 0;
    let erros = 0;

    for (const r of paraCorrigir) {
      // Tenta deletar do calendário principal (onde pode estar erroneamente)
      try {
        await calendar.events.delete({
          calendarId: mainCalendarId,
          eventId: r.googleEventId,
        });
        console.log(`[migrar-calendario] Removido evento ${r.googleEventId} do calendário principal para reserva ${r.id}`);
      } catch (e) {
        // Ignora 404 (já não estava lá ou já foi apagado)
        if (e.response?.status !== 404) {
          console.warn(`[migrar-calendario] Erro ao remover ${r.googleEventId} do calendário principal:`, e.message);
        }
      }
      // Apaga googleEventId para forçar recriação no calendário correto na próxima sincronização
      delete r.googleEventId;
      migrados++;
    }

    if (migrados > 0) {
      // Persiste a lista com googleEventId removido e dispara sincronização
      await salvarReservasPersistidas(reservas);
      console.log(`[migrar-calendario] ${migrados} reservas migradas para o calendário de salas/labs.`);
    }

    return res.json({ ok: true, migrados, erros, total: paraCorrigir.length });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    console.error("[migrar-calendario] Erro:", e.message);
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/**
 * POST /api/agenda-cci/google-events
 * Body: { idToken, timeMin, timeMax }
 * Retorna os eventos do Google Calendar para o per├¡odo.
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
      console.warn("[google-calendar] N├úo foi poss├¡vel obter credenciais para Google Calendar (verifique o JSON da service account e GOOGLE_ADMIN_IMPERSONATE).");
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

      // Ordenar por hor├írio de in├¡cio
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

  const htmlBase64 = Buffer.from(htmlBody, "utf-8").toString("base64");
  const subjectBase64 = Buffer.from(assunto, "utf-8").toString("base64");

  const rawMessage = [
    `From: Intranet CCI <${remetente}>`,
    `To: ${destinatario}`,
    `Reply-To: ${remetente}`,
    `Subject: =?UTF-8?B?${subjectBase64}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "X-Mailer: Intranet-CCI/1.0",
    "X-Auto-Submitted: auto-generated",
    "Precedence: transactional",
    "",
    htmlBase64,
  ].join("\r\n");

  const encoded = Buffer.from(rawMessage, "utf-8")
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
    setape: process.env.EMAIL_SETOR_SETAPE ? process.env.EMAIL_SETOR_SETAPE.split(",").map((s) => s.trim()) : ["setape@portalcci.com.br"],
    secretaria: process.env.EMAIL_SETOR_SECRETARIA ? process.env.EMAIL_SETOR_SECRETARIA.split(",").map((s) => s.trim()) : ["atendimento@portalcci.com.br"],
    dp: process.env.EMAIL_SETOR_DP ? process.env.EMAIL_SETOR_DP.split(",").map((s) => s.trim()) : ["dp@portalcci.com.br", "financeiro@portalcci.com.br"],
    financeiro: process.env.EMAIL_SETOR_FINANCEIRO ? process.env.EMAIL_SETOR_FINANCEIRO.split(",").map((s) => s.trim()) : ["dp@portalcci.com.br", "financeiro@portalcci.com.br"],
    direcao: process.env.EMAIL_SETOR_DIRECAO ? process.env.EMAIL_SETOR_DIRECAO.split(",").map((s) => s.trim()) : ["dir@portalcci.com.br"],
    disciplinar: process.env.EMAIL_SETOR_DISCIPLINAR ? process.env.EMAIL_SETOR_DISCIPLINAR.split(",").map((s) => s.trim()) : ["disciplinar@portalcci.com.br"],
    biblioteca: process.env.EMAIL_SETOR_BIBLIOTECA ? process.env.EMAIL_SETOR_BIBLIOTECA.split(",").map((s) => s.trim()) : ["biblioteca@portalcci.com.br"],
    servicosgerais: process.env.EMAIL_SETOR_SERVICOSGERAIS ? process.env.EMAIL_SETOR_SERVICOSGERAIS.split(",").map((s) => s.trim()) : ["sgerais@portalcci.com.br"],
    almoxarifado: process.env.EMAIL_SETOR_ALMOXARIFADO ? process.env.EMAIL_SETOR_ALMOXARIFADO.split(",").map((s) => s.trim()) : ["almoxarifado@portalcci.com.br"],
    primeirossocorros: process.env.EMAIL_SETOR_PRIMEIROSSOCORROS ? process.env.EMAIL_SETOR_PRIMEIROSSOCORROS.split(",").map((s) => s.trim()) : ["enfermaria@portalcci.com.br"],
    clat: process.env.EMAIL_SETOR_CLAT ? process.env.EMAIL_SETOR_CLAT.split(",").map((s) => s.trim()) : ["equipeclat@clat.com.br"],
    publicidade: process.env.EMAIL_SETOR_PUBLICIDADE ? process.env.EMAIL_SETOR_PUBLICIDADE.split(",").map((s) => s.trim()) : ["publicidade@portalcci.com.br"],
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
        <p><strong>🏷️ Categoria:</strong> ${chamado.categoria || "Geral"}</p>
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

  const htmlBase64 = Buffer.from(htmlBody, "utf-8").toString("base64");
  const subjectBase64 = Buffer.from(assunto, "utf-8").toString("base64");

  const rawMessage = [
    `From: Intranet CCI <${remetente}>`,
    `To: ${destinatarioStr}`,
    `Reply-To: ${remetente}`,
    `Subject: =?UTF-8?B?${subjectBase64}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "X-Mailer: Intranet-CCI/1.0",
    "X-Auto-Submitted: auto-generated",
    "Precedence: transactional",
    "",
    htmlBase64,
  ].join("\r\n");

  const encoded = Buffer.from(rawMessage, "utf-8")
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
 * Formata data no padr├úo ISO (yyyy-MM-dd) para dd/MM/yyyy.
 * Se j├í vier formatada, devolve como est├í.
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
    linhas.push(`<p><strong>­ƒÆ╗ Chromebooks:</strong> ${total} unidade(s)${partes.length ? ` (${partes.join(" ┬À ")})` : ""}</p>`);
  }

  // Equipamentos
  if (Array.isArray(reserva.equipamentos) && reserva.equipamentos.length > 0) {
    for (const eq of reserva.equipamentos) {
      linhas.push(`<p><strong>­ƒôª Equipamento:</strong> ${eq.nome} ├ù ${eq.quantidade}</p>`);
    }
  } else if (reserva.equipamentoNome && reserva.equipamentoQuantidade) {
    linhas.push(`<p><strong>­ƒôª Equipamento:</strong> ${reserva.equipamentoNome} ├ù ${reserva.equipamentoQuantidade}</p>`);
  }

  // Espa├ºo
  if (reserva.espacoNome) {
    linhas.push(`<p><strong>­ƒôì Espa├ºo:</strong> ${reserva.espacoNome}</p>`);
  }

  if (linhas.length === 0) {
    linhas.push("<p>Nenhum recurso identificado.</p>");
  }
  return linhas.join("\n        ");
}

/**
 * Envia e-mail de confirma├º├úo de reserva de equipamentos/espa├ºos via Gmail API.
 * @param {object} reserva ÔÇö objeto completo da reserva (ReservaAgendaCCI)
 */
async function enviarEmailConfirmacaoReserva(reserva) {
  const destinatario = reserva.solicitanteEmail;
  if (!destinatario) {
    console.warn("[email-reserva] Reserva sem solicitanteEmail ÔÇö e-mail n├úo enviado.", reserva.id);
    return;
  }

  const remetente = (
    process.env.EMAIL_REMETENTE ||
    process.env.GOOGLE_ADMIN_IMPERSONATE ||
    ""
  ).trim();

  if (!remetente) {
    console.warn("[email-reserva] EMAIL_REMETENTE n├úo configurado ÔÇö e-mail de reserva n├úo enviado.");
    return;
  }

  const auth = getJwtParaEmail();
  if (!auth) {
    console.warn("[email-reserva] Sem credenciais para enviar e-mail (EMAIL_REMETENTE ou service account n├úo configurado).");
    return;
  }

  try {
    await auth.authorize();
  } catch (e) {
    console.error("[email-reserva] Falha ao autorizar JWT Gmail:", e.message);
    return;
  }

  const assunto = `­ƒôà Reserva [${reserva.id}] confirmada`;
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
      <h1>­ƒôà Reserva Confirmada</h1>
    </div>
    <div class="body">
      <p>Ol├í, <strong>${reserva.solicitanteNome || destinatario}</strong>!</p>
      <p>Sua reserva foi registrada com sucesso. Confira os detalhes abaixo:</p>
      <div class="info-box">
        <p><strong>­ƒÅÀ´©Å T├¡tulo:</strong> ${reserva.titulo || "ÔÇö"}</p>
        <p><strong>­ƒåö ID da Reserva:</strong> ${reserva.id}</p>
        <p><strong>­ƒôà Data:</strong> ${dataBR}</p>
        <p><strong>­ƒòÉ Hor├írio:</strong> ${reserva.inicio} ÔÇö ${reserva.fim}</p>
      </div>
      <p><strong>­ƒôï Recursos reservados:</strong></p>
      <div class="resources-box">
        ${recursosHtml}
      </div>
      <p>Voc├¬ pode acompanhar sua reserva em <strong>Minhas Reservas</strong> na intranet.</p>
    </div>
    <div class="footer">Este ├® um e-mail autom├ítico da Intranet CCI. N├úo responda este e-mail.</div>
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
    console.log(`[email-reserva] E-mail de confirma├º├úo enviado para ${destinatario} (reserva ${reserva.id}).`);
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
      return res.status(400).json({ error: "titulo, categoria e descricao s├úo obrigat├│rios." });
    }
    const prioridades = ["baixa", "media", "alta"];
    const prioridadeFinal = prioridades.includes(prioridade) ? prioridade : "media";

    // Valida├º├Áes de filmagem
    const eFilmagem = solicitaFilmagem === true;
    if (eFilmagem) {
      if (!filmagemData || !filmagemHoraInicio || !filmagemHoraFim) {
        return res.status(400).json({
          error: "Para chamados de filmagem, informe a data, hora de in├¡cio e hora final.",
        });
      }
      if (filmagemHoraInicio >= filmagemHoraFim) {
        return res.status(400).json({
          error: "A hora de in├¡cio deve ser anterior ├á hora final da filmagem.",
        });
      }
      if (filmagemTermosAceitos !== true) {
        return res.status(400).json({
          error: "├ë obrigat├│rio aceitar os termos de responsabilidade para chamados de filmagem.",
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

    // Dispara e-mail de notifica├º├úo de forma ass├¡ncrona (n├úo bloqueia a resposta)
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
      return res.status(400).json({ error: "chamado.id ├® obrigat├│rio." });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({
        error: mensagemSupabaseNaoConfigurado(),
      });
    }

    const existente = await obterChamadoPorId(supabase, chamado.id);
    if (!existente) {
      return res.status(404).json({ error: "Chamado n├úo encontrado." });
    }
    if (!podeVerChamado(ctx.viewer, existente)) {
      return res.status(403).json({ error: "Sem permiss├úo para editar este chamado." });
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

    // Detecta se o setorDestino mudou para notificar os novos setores destinatários
    const setoresAntigos = (existente.setorDestino || []).sort().join(",");
    const setoresNovos = (atualizado.setorDestino || []).sort().join(",");
    const setorFoiAlterado = setoresAntigos !== setoresNovos;

    await atualizarChamado(supabase, atualizado);

    // Dispara e-mail de solução de forma assíncrona (não bloqueia a resposta)
    if (solucaoEraAusente && solucaoFoiAdicionada) {
      setImmediate(() =>
        enviarEmailSolucaoChamado(atualizado).catch((e) =>
          console.error("[email-chamado] Erro inesperado:", e.message)
        )
      );
    } else if (setorFoiAlterado) {
      setImmediate(() =>
        enviarEmailNovoChamado(atualizado).catch((e) =>
          console.error("[email-novo-chamado] Erro ao notificar novo setor:", e.message)
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
 * Retorna avisos vis├¡veis conforme pap├®is (OU) do usu├írio.
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
      return res.status(400).json({ error: "titulo e conteudo s├úo obrigat├│rios." });
    }
    const tipoFinal = AVISO_TIPOS_VALIDOS.includes(tipo) ? tipo : "aviso";
    if (!AVISO_SETORES_VALIDOS.includes(setor)) {
      return res.status(400).json({ error: "setor inv├ílido." });
    }
    if (!podePublicarNoSetor(ctx.papeis, setor)) {
      return res.status(403).json({
        error: "Voc├¬ n├úo tem permiss├úo para publicar avisos neste setor.",
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
 * Body: { idToken } ÔÇö pap├®is manuais do usu├írio (ex.: admin).
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
 * Body: { idToken } ÔÇö mapa completo (somente admin no arquivo).
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
 * Body: { idToken, emailAlvo, papeisManuais: string[] } ÔÇö somente admin.
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
      return res.status(400).json({ error: "Informe um e-mail v├ílido." });
    }
    if (!emailDominioPermitido(alvo)) {
      return res.status(400).json({
        error: `O e-mail deve ser de um dos dom├¡nios permitidos: ${DOMINIOS_PERMITIDOS.join(", ")}.`,
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
 * Sincroniza painel_profiles com a OU do Workspace e pap├®is manuais (admin), sem cadastro manual.
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
        error: "Escola n├úo encontrada em painel_schools (slug).",
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
 * Cria usu├írio Auth + painel_profiles (somente admin painel da mesma escola).
 */
app.post("/api/painel/create-user", async (req, res) => {
  try {
    const body = req.body || {};
    const { idToken, email, password, full_name, role, service_window_id, school_id } = body;

    const { email: callerEmail } = await verificarAutenticacaoRequest(req);

    if (!email || !password || !full_name || !school_id) {
      return res.status(400).json({ error: "Campos obrigat├│rios faltando." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
    }
    if (!emailDominioPermitido(String(email))) {
      return res.status(400).json({
        error: `O e-mail deve ser de um dos dom├¡nios permitidos: ${DOMINIOS_PERMITIDOS.join(", ")}.`,
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
          "Sua conta ainda n├úo existe no Supabase do painel. Abra o painel de senhas logado na Central para sincronizar.",
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
      return res.status(500).json({ error: authError?.message ?? "Erro ao criar usu├írio." });
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
    throw new Error("Credenciais do iScholar n├úo configuradas no servidor.");
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
    throw new Error("Credenciais do iScholar n├úo configuradas no servidor.");
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
    throw new Error("Credenciais do iScholar n├úo configuradas no servidor.");
  }

  // 1. Obter dados completos atuais do aluno para n├úo quebrar valida├º├Áes
  const dadosAluno = await obterDadosCompletosAlunoIscholar(idAluno);
  if (!dadosAluno || !dadosAluno.informacoes_basicas) {
    throw new Error("Dados b├ísicos do aluno n├úo encontrados para atualiza├º├úo.");
  }

  // 2. Mesclar o e-mail no objeto informacoes_basicas existente
  const informacoesBasicas = { ...dadosAluno.informacoes_basicas };
  informacoesBasicas.email = email;
  informacoesBasicas.id_aluno = parseInt(idAluno, 10);

  // Garantir valor v├ílido para cor_raca (se vazio ou inv├ílido, define como "PARDA")
  const corRacaAtual = (informacoesBasicas.cor_raca || "").trim().toUpperCase();
  const validos = ["AMARELA", "BRANCA", "IND├ìGENA", "INDIGENA", "PARDA", "NEGRA", "N├âO DECLARADA", "NAO DECLARADA"];
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
    throw new Error("N├úo foi poss├¡vel inicializar a autentica├º├úo do Google Workspace para escrita.");
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


app.get(["/api/webhooks/ischolar", "/webhooks/ischolar"], (req, res) => {
  console.log(`[webhook-ischolar] GET Ping/Teste de validação em ${req.originalUrl}`);
  return res.json({ ok: true, active: true, message: "Webhook iScholar ativo e aguardando eventos." });
});

app.post(["/api/webhooks/ischolar", "/webhooks/ischolar"], async (req, res) => {
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
    const rawEvento = req.body?.evento || req.body?.event || req.body?.type || req.body?.action || "";
    const evento = String(rawEvento).trim().toLowerCase();
    
    const dadosDepois = req.body?.data?.depois || req.body?.depois || req.body?.data || req.body;
    const idAluno = dadosDepois?.id_aluno || req.body?.id_aluno || req.body?.aluno_id;
    const idMatricula = dadosDepois?.id_matricula || req.body?.id_matricula;
    const idTurma = dadosDepois?.id_turma || req.body?.id_turma;

    console.log(`[webhook-ischolar] Recebido webhook em ${req.originalUrl}: evento="${rawEvento}", idAluno=${idAluno || "N/A"}`);

    const ehEventoMatricula =
      evento === "secretaria.matriculas.novo" ||
      evento === "secretaria.matricula.novo" ||
      evento === "secretaria.matriculas.criado" ||
      evento === "secretaria.matricula.criado" ||
      evento.includes("matricula") ||
      Boolean(idAluno);

    if (ehEventoMatricula) {
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
    } else {
      console.log(`[webhook-ischolar] Evento não processado: "${rawEvento}". Body keys: ${Object.keys(req.body || {}).join(", ")}`);
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
      return res.status(400).json({ error: "Par├ómetro id_aluno ├® obrigat├│rio." });
    }

    console.log(`[diagnostico-aluno] Iniciando cria├º├úo de e-mail manual para aluno ID ${id_aluno}...`);

    let matricula = null;
    let nomeAluno = nome_aluno || "";
    let nomeTurma = turma || "";
    let numeroRe = numero_re || "";

    // 1. Tentar obter matr├¡cula do iScholar para decidir o dom├¡nio do e-mail
    try {
      const idBuscaMatricula = String(id_aluno).startsWith("m-") ? String(id_aluno).substring(2) : id_aluno;
      const infoMatricula = await obterMatriculaIscholar(idBuscaMatricula);
      matricula = infoMatricula.dados?.[0];
    } catch (errMatricula) {
      console.warn(`[diagnostico-aluno] N├úo foi poss├¡vel obter matr├¡cula para o aluno ID ${id_aluno}:`, errMatricula.message);
    }

    if (matricula) {
      nomeAluno = matricula.nome_aluno || nomeAluno;
      nomeTurma = matricula.nome_turma || nomeTurma;
      numeroRe = matricula.numero_re || numeroRe;
    } else {
      // 2. Fallback: Buscar dados b├ísicos do aluno caso n├úo haja matr├¡cula ativa (ex: transferido)
      try {
        const idBuscaAluno = String(id_aluno).startsWith("m-") ? String(id_aluno).substring(2) : id_aluno;
        const dadosAluno = await obterDadosCompletosAlunoIscholar(idBuscaAluno);
        if (dadosAluno && dadosAluno.informacoes_basicas) {
          const ib = dadosAluno.informacoes_basicas;
          nomeAluno = nomeAluno || `${ib.nome || ""} ${ib.sobrenome || ""}`.trim();
          numeroRe = numeroRe || ib.registro_escolar || ib.numero_re || "";
        }
      } catch (errAluno) {
        console.warn(`[diagnostico-aluno] Falha ao obter dados b├ísicos do aluno ID ${id_aluno}:`, errAluno.message);
      }
    }

    if (!nomeAluno) {
      return res.status(400).json({ 
        error: `N├úo foi poss├¡vel encontrar dados no iScholar para o aluno ID ${id_aluno} e nenhuma informa├º├úo foi fornecida.` 
      });
    }

    // Normalizar para compara├º├Áes seguras
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

    // Determinar o dom├¡nio correto do e-mail e unidade organizacional (OU)
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

    // Obter n├║mero de matr├¡cula (numero_re)
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
        console.log(`[diagnostico-aluno] A conta ${emailCandidato} j├í existe no Google Workspace. Prosseguindo com o v├¡nculo.`);
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
        warning: erroWorkspace ? "A conta de e-mail j├í existia no Google Workspace, mas foi vinculada com sucesso no iScholar." : null
      });
    } else {
      throw new Error("N├úo foi poss├¡vel criar a conta no Workspace.");
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
      return res.status(400).json({ error: "Voc├¬ precisa estar autenticado com uma conta do Google (idToken ausente). Fa├ºa login no topo do site." });
    }
    const { email: userEmail } = await verificarIdTokenUsuario(idToken);

    // Verificar se o usu├írio autenticado pertence ├á TI (setape ou admin)
    const orgUnitPath = await obterOrgUnitPathUsuario(userEmail);
    const manual = lerPapeisManuaisArquivo()[userEmail.toLowerCase()] || [];
    const papeis = mesclarPapeisManuais(mapearPapeisDoOrgUnit(orgUnitPath), manual);
    if (!papeis.includes("setape") && !papeis.includes("admin")) {
      return res.status(403).json({ error: "Acesso negado: apenas equipe de TI." });
    }

    if (!name || String(name).trim() === "") {
      return res.status(400).json({ error: "O nome da turma ├® obrigat├│rio." });
    }

    const credentials = getServiceAccountCredentials();
    if (!credentials) {
      return res.status(500).json({ error: "Credenciais do Google n├úo configuradas no servidor." });
    }

    // Impersonar o e-mail dev.fac@portalcci.com.br diretamente para evitar erros caso a conta do administrador n├úo tenha o Classroom habilitado
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


// ÔöÇÔöÇÔöÇ iScholar & Google Classroom Ensalamento Persistence ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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

const STUDENT_ENROLLMENTS_FILE = path.join(__dirname, "data", "studentEnrollments.json");

function lerHistoricoEnsalamentoAlunos() {
  try {
    if (!fs.existsSync(STUDENT_ENROLLMENTS_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(STUDENT_ENROLLMENTS_FILE, "utf-8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    console.error("[student-enrollments] Erro ao ler histórico de ensalamento:", e.message);
    return {};
  }
}

function salvarHistoricoEnsalamentoAlunos(historico) {
  try {
    const dir = path.dirname(STUDENT_ENROLLMENTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STUDENT_ENROLLMENTS_FILE, JSON.stringify(historico, null, 2), "utf-8");
  } catch (e) {
    console.error("[student-enrollments] Erro ao salvar histórico de ensalamento:", e.message);
  }
}

function isAlunoEnsaladoLocal(courseId, emailAluno, historico) {
  if (!courseId || !emailAluno) return false;
  const key = `${courseId}_${String(emailAluno).toLowerCase().trim()}`;
  const record = historico[key];
  return Boolean(record && record.status !== "excluido_manualmente");
}

function isAlunoExcluidoManualmenteLocal(courseId, emailAluno, historico) {
  if (!courseId || !emailAluno) return false;
  const key = `${courseId}_${String(emailAluno).toLowerCase().trim()}`;
  const record = historico[key];
  return Boolean(record && record.status === "excluido_manualmente");
}

function registrarAlunoEnsaladoLocal(courseId, emailAluno, nomeAluno, idTurma, historico) {
  if (!courseId || !emailAluno) return;
  const emailClean = String(emailAluno).toLowerCase().trim();
  const key = `${courseId}_${emailClean}`;
  historico[key] = {
    courseId: String(courseId),
    email: emailClean,
    nome: nomeAluno || historico[key]?.nome || "",
    id_turma: idTurma ? String(idTurma) : (historico[key]?.id_turma || ""),
    status: "matriculado",
    enrolled_at: new Date().toISOString()
  };
}

function marcarAlunoExcluidoManualmenteLocal(courseId, emailAluno, historico) {
  if (!courseId || !emailAluno) return false;
  const emailClean = String(emailAluno).toLowerCase().trim();
  const key = `${courseId}_${emailClean}`;
  const existing = historico[key] || {};
  historico[key] = {
    courseId: String(courseId),
    email: emailClean,
    nome: existing.nome || "",
    id_turma: existing.id_turma || "",
    status: "excluido_manualmente",
    excluded_at: new Date().toISOString()
  };
  return true;
}

function removerBloqueioAlunoLocal(courseId, emailAluno, historico) {
  if (!courseId || !emailAluno) return false;
  const emailClean = String(emailAluno).toLowerCase().trim();
  const key = `${courseId}_${emailClean}`;
  if (historico[key]) {
    delete historico[key];
    return true;
  }
  return false;
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
    return { ok: false, status: response.status, data: null, rawText: text, error: `Formato de resposta do iScholar inv├ílido: ${text.slice(0, 100)}` };
  }
}

async function obterUnidadesIscholar() {
  const { codigoEscola, token } = obterCredenciaisIscholar();
  if (!codigoEscola || !token) {
    throw new Error("Credenciais do iScholar n├úo configuradas no servidor.");
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

  const turmasMap = new Map();

  // 1. Buscar turmas iterando por periodo_id (1 a 15) para evitar que o iScholar limite apenas ao período padrão
  for (let pid = 1; pid <= 15; pid++) {
    let page = 1;
    while (true) {
      try {
        const url = `https://api.ischolar.app/turma/lista?periodo_id=${pid}&pagina=${page}`;
        const res = await safeFetchIscholarJson(url, { method: "GET", headers });
        if (res.ok && res.data) {
          const raw = res.data.dados || res.data.turmas || res.data.lista || res.data;
          const items = Array.isArray(raw) ? raw : (typeof raw === "object" && raw !== null ? Object.values(raw) : []);
          if (items.length === 0) break;

          for (const t of items) {
            if (!t || typeof t !== "object") continue;
            const idTurma = String(t.id_turma || t.id || t.codigo || "");
            if (!idTurma || turmasMap.has(idTurma)) continue;

            const nome = extrairStringValor(t.nome_turma) || extrairStringValor(t.nome) || extrairStringValor(t.turma) || `Turma ${idTurma}`;
            const curso = extrairStringValor(t.nome_curso) || extrairStringValor(t.curso);
            const periodo = extrairStringValor(t.periodo_letivo) || extrairStringValor(t.periodo) || extrairStringValor(t.ano_letivo) || "2026.2";
            const nomeUnidadeRaw = t.unidade?.nome || t.nome_unidade || t.nome_unidade_ref || "";

            const normalizar = (str) => (str || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const norm = normalizar(String(nome) + " " + String(curso) + " " + String(nomeUnidadeRaw));

            let unidade = nomeUnidadeRaw || "Todas as Unidades";
            if (norm.includes("TECNICO") || norm.includes("TECSCCI")) {
              unidade = "TecsCCI Escola Técnica";
            } else if (norm.includes("FACULDADE") || norm.includes("GRADUACAO") || norm.includes("FAC")) {
              unidade = "Faculdade CCI";
            }

            turmasMap.set(idTurma, {
              id_turma: idTurma,
              nome_turma: String(nome),
              curso: String(curso),
              periodo_letivo: String(periodo),
              unidade: String(unidade),
              id_unidade: String(t.unidade?.id || t.id_unidade || t.id_unidade_ref || "")
            });
          }

          if (items.length < 100) break;
          page++;
        } else {
          break;
        }
      } catch (e) {
        console.error(`[ischolar-turmas] Erro ao buscar periodo_id ${pid} pag ${page}:`, e.message);
        break;
      }
    }
  }

  // 2. Fallback por unidades se o loop de períodos por algum motivo falhar totalmente
  if (turmasMap.size === 0) {
    const unidades = await obterUnidadesIscholar();
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
                const idTurma = String(t.id_turma || t.id || t.codigo || "");
                if (idTurma && !turmasMap.has(idTurma)) {
                  const nome = extrairStringValor(t.nome_turma) || extrairStringValor(t.nome) || extrairStringValor(t.turma) || `Turma ${idTurma}`;
                  const curso = extrairStringValor(t.nome_curso) || extrairStringValor(t.curso);
                  const periodo = extrairStringValor(t.periodo_letivo) || extrairStringValor(t.periodo) || extrairStringValor(t.ano_letivo) || "2026.2";
                  const normalizar = (str) => (str || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  const norm = normalizar(String(nome) + " " + String(curso) + " " + String(u.nome_unidade));

                  let unidade = u.nome_unidade || "Todas as Unidades";
                  if (norm.includes("TECNICO") || norm.includes("TECSCCI")) {
                    unidade = "TecsCCI Escola Técnica";
                  } else if (norm.includes("FACULDADE") || norm.includes("GRADUACAO") || norm.includes("FAC")) {
                    unidade = "Faculdade CCI";
                  }

                  turmasMap.set(idTurma, {
                    id_turma: idTurma,
                    nome_turma: String(nome),
                    curso: String(curso),
                    periodo_letivo: String(periodo),
                    unidade: String(unidade),
                    id_unidade: String(u.id_unidade)
                  });
                }
              }
            });
          }
        } catch (e) {
          console.error(`[ischolar-turmas] Erro ao buscar turmas da unidade ${u.id_unidade}:`, e);
        }
      }
    }
  }

  const todasAsTurmas = Array.from(turmasMap.values()).filter(t => String(t.periodo_letivo).trim() === "2026.2");
  console.log(`[ischolar-turmas] Sucesso! Total de ${todasAsTurmas.length} turmas do período 2026.2.`);
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
          console.log(`[ischolar-funcionarios] Encontrados ${list.length} funcion├írios via: ${item.method} ${item.url}`);
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

  // 1. Comparar se o nome do funcion├írio em /funcionarios/listar ├® id├¬ntico ao nome_professor
  for (const f of funcionariosLista) {
    if (!f || typeof f !== "object") continue;
    const nomeFunc = extrairStringValor(f.nome || f.nome_funcionario || f.funcionario || f.nome_completo);
    
    if (normalizar(nomeFunc) === targetNorm) {
      let email = extrairEmailDoObjeto(f);
      if (email) {
        console.log(`[ischolar-professor] Sucesso! Nome id├¬ntico '${nomeProfessor}' -> E-mail: ${email}`);
        return email;
      }
    }
  }

  // 2. Tentar busca caso haja varia├º├úo de acentua├º├úo ou caixa
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

  // 3. Fallback institucional se n├úo houver e-mail cadastrado
  const local = gerarEmailLocalPart(nomeProfessor, "prof");
  return `${local}@portalcci.com.br`;
}

function extrairNomeProfessor(d) {
  if (!d || typeof d !== "object") return "";

  // Primeiro verifica dentro do objeto 'professores' (padr├úo iScholar)
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

  // Primeiro verifica dentro do objeto 'professores' (padr├úo iScholar)
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
    throw new Error("Credenciais do iScholar n├úo configuradas no servidor.");
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
    let nomeProf = extrairNomeProfessor(d); // nome j├í vem de d.professores.nome_professor
    let emailProf = extrairEmailDoObjeto(d);

    // Se temos o id_professor, usa /funcionarios/busca apenas para obter o e-mail
    // (o nome j├í vem correto do objeto 'professores' na disciplina)
    if (idProf && !emailProf) {
      const dadosProf = await buscarFuncionarioPorIdIscholar(idProf, cacheFuncMap);
      // S├│ usa o nome do /funcionarios/busca se n├úo t├¡nhamos nome ainda
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
    throw new Error("Credenciais do iScholar n├úo configuradas no servidor.");
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

    // Se o e-mail n├úo veio na listagem da matr├¡cula, busca no perfil do aluno (/aluno/busca)
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

    // Fallback apenas se n├úo existir e-mail cadastrado
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

    // Mesclar disciplinas manuais/personalizadas salvas no mapeamento para esta turma
    const prefixo = `${idTurma}_`;
    const idsExistentes = new Set((disciplinas || []).map(d => String(d.id_disciplina || d.id)));

    Object.keys(mapeamentos).forEach(k => {
      if (k.startsWith(prefixo)) {
        const item = mapeamentos[k];
        const idDisc = String(item.id_disciplina || "");
        if (idDisc && !idsExistentes.has(idDisc)) {
          idsExistentes.add(idDisc);
          disciplinas.push({
            id_disciplina: idDisc,
            nome_disciplina: item.nome_disciplina,
            codigo_disciplina: idDisc,
            periodo_letivo: item.periodo_letivo || "2026.2",
            nome_professor: item.nome_professor || "",
            email_professor: item.email_professor || "",
            isManual: true
          });
        }
      }
    });

    return res.json({ ok: true, disciplinas, mapeamentos });
  } catch (e) {
    console.error("[ischolar-disciplinas] Erro:", e);
    return res.status(500).json({ error: e.message });
  }
});

// Endpoint de diagn├│stico: retorna dados crus e processados para uma turma/disciplina
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

    // 2. Resultado processado pela fun├º├úo
    const disciplinasProcessadas = await obterDisciplinasTurmaIscholar(idTurma);

    // 3. Para a disc 490 (ou a primeira), testar a busca de funcion├írio diretamente
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
    throw new Error("Credenciais do Google n├úo configuradas no servidor.");
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
    console.warn("[google-classroom-auth] Falha na delega├º├úo de rosters, alternando para courses:", e1.message);
  }

  // 2. Tentativa com o escopo prim├írio classroom.courses
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
      return res.status(400).json({ error: "idToken ausente. Fa├ºa login no topo do site." });
    }
    const { email: userEmail } = await verificarIdTokenUsuario(idToken);
    const orgUnitPath = await obterOrgUnitPathUsuario(userEmail);
    const manual = lerPapeisManuaisArquivo()[userEmail.toLowerCase()] || [];
    const papeis = mesclarPapeisManuais(mapearPapeisDoOrgUnit(orgUnitPath), manual);
    if (!papeis.includes("setape") && !papeis.includes("admin")) {
      return res.status(403).json({ error: "Acesso negado: apenas equipe de TI." });
    }

    if (!idTurma || !disciplinas || !Array.isArray(disciplinas) || disciplinas.length === 0) {
      return res.status(400).json({ error: "idTurma e lista de disciplinas s├úo obrigat├│rios." });
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

      // Padr├úo de Nomenclatura Solicitado: [Nome da Disciplina] - [Periodo Letivo]
      const nomeSalaClassroom = `${nomeDisc} - ${periodoFormatado}`;

      // 1. Verificar se a disciplina J├ü foi criada anteriormente para o mesmo per├¡odo letivo
      //    Deduplica├º├úo por NOME NORMALIZADO (permite reutiliza├º├úo cross-turma e cross-curso)
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
              avisoProfessor = `Permiss├úo insuficiente no Google Workspace para adicionar docente (${emailProf}): ${msgErrProf}`;
            }
          }
        }

        const turmasAlvo = Array.isArray(disc.turmasVinculadas) && disc.turmasVinculadas.length > 0
          ? disc.turmasVinculadas.map(String)
          : [String(idTurma)];

        turmasAlvo.forEach((tId, idx) => {
          const keyMap = `${tId}_${idDisc}`;
          mapeamentos[keyMap] = {
            google_course_id: mapeamentoExistente.google_course_id,
            google_course_name: mapeamentoExistente.google_course_name,
            alternateLink: mapeamentoExistente.alternateLink,
            id_turma: tId,
            id_disciplina: idDisc,
            nome_disciplina: nomeDisc,
            periodo_letivo: periodoFormatado,
            id_professor: disc.id_professor || "",
            nome_professor: nomeProf,
            email_professor: emailProf,
            professor_ensalado: profEnsalado,
            aviso_professor: avisoProfessor,
            reaproveitada: idx > 0 || tId !== String(idTurma) || !!mapeamentoExistente.reaproveitada,
            created_at: new Date().toISOString(),
          };
        });

        resultados.push({
          google_course_id: mapeamentoExistente.google_course_id,
          google_course_name: mapeamentoExistente.google_course_name,
          alternateLink: mapeamentoExistente.alternateLink,
          id_turma: String(idTurma),
          id_disciplina: idDisc,
          nome_disciplina: nomeDisc,
          periodo_letivo: periodoFormatado,
          status: "sucesso"
        });
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

        const turmasAlvo = Array.isArray(disc.turmasVinculadas) && disc.turmasVinculadas.length > 0
          ? disc.turmasVinculadas.map(String)
          : [String(idTurma)];

        turmasAlvo.forEach((tId, idx) => {
          const keyMap = `${tId}_${idDisc}`;
          mapeamentos[keyMap] = {
            google_course_id: response.data.id,
            google_course_name: response.data.name,
            alternateLink: response.data.alternateLink,
            id_turma: tId,
            id_disciplina: idDisc,
            nome_disciplina: nomeDisc,
            periodo_letivo: periodoFormatado,
            id_professor: disc.id_professor || "",
            nome_professor: nomeProf,
            email_professor: emailProf,
            professor_ensalado: profEnsalado,
            aviso_professor: avisoProfessor,
            reaproveitada: idx > 0,
            created_at: new Date().toISOString()
          };
        });

        resultados.push({
          google_course_id: response.data.id,
          google_course_name: response.data.name,
          alternateLink: response.data.alternateLink,
          id_turma: String(idTurma),
          id_disciplina: idDisc,
          nome_disciplina: nomeDisc,
          periodo_letivo: periodoFormatado,
          status: "sucesso"
        });
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
        error: `Falha na cria├º├úo no Google Classroom: ${primeiroErro}`,
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
      return res.status(400).json({ error: "idToken ausente. Fa├ºa login no topo do site." });
    }
    const { email: userEmail } = await verificarIdTokenUsuario(idToken);
    const orgUnitPath = await obterOrgUnitPathUsuario(userEmail);
    const manual = lerPapeisManuaisArquivo()[userEmail.toLowerCase()] || [];
    const papeis = mesclarPapeisManuais(mapearPapeisDoOrgUnit(orgUnitPath), manual);
    if (!papeis.includes("setape") && !papeis.includes("admin")) {
      return res.status(403).json({ error: "Acesso negado: apenas equipe de TI." });
    }

    if (!idTurma) {
      return res.status(400).json({ error: "idTurma ├® obrigat├│rio." });
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
    const historicoEnsalamento = lerHistoricoEnsalamentoAlunos();
    let historicoModificado = false;

    const relatorio = {
      totalAlunos: alunos.length,
      totalSalas: salasMapeadas.length,
      sucessos: 0,
      jaMatriculados: 0,
      puladosHistorico: 0,
      bloqueadosManualmente: 0,
      falhas: 0,
      detalhes: []
    };

    for (const aluno of alunos) {
      const emailAluno = aluno.email;
      if (!emailAluno) continue;

      for (const sala of salasMapeadas) {
        const courseId = sala.google_course_id;

        if (isAlunoExcluidoManualmenteLocal(courseId, emailAluno, historicoEnsalamento)) {
          relatorio.bloqueadosManualmente++;
          relatorio.jaMatriculados++;
          relatorio.detalhes.push({
            aluno: aluno.nome_aluno,
            email: emailAluno,
            sala: sala.google_course_name,
            status: "bloqueado_manualmente"
          });
          continue;
        }

        if (isAlunoEnsaladoLocal(courseId, emailAluno, historicoEnsalamento)) {
          relatorio.jaMatriculados++;
          relatorio.puladosHistorico++;
          relatorio.detalhes.push({
            aluno: aluno.nome_aluno,
            email: emailAluno,
            sala: sala.google_course_name,
            status: "ja_existia"
          });
          continue;
        }

        try {
          await classroom.courses.students.create({
            courseId: courseId,
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

          registrarAlunoEnsaladoLocal(courseId, emailAluno, aluno.nome_aluno, idTurma, historicoEnsalamento);
          historicoModificado = true;
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

            registrarAlunoEnsaladoLocal(courseId, emailAluno, aluno.nome_aluno, idTurma, historicoEnsalamento);
            historicoModificado = true;
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

    if (historicoModificado) {
      salvarHistoricoEnsalamentoAlunos(historicoEnsalamento);
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

app.post("/api/ti/google-classroom/aluno-salas", async (req, res) => {
  try {
    const { idToken, email } = req.body || {};
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

    const emailAluno = String(email || "").trim().toLowerCase();
    if (!emailAluno || !emailAluno.includes("@")) {
      return res.status(400).json({ error: "E-mail do aluno inválido ou ausente." });
    }

    const classroom = await criarGoogleClassroomClientAuth();
    const mapeamentos = lerMapeamentosClassroom();
    const historico = lerHistoricoEnsalamentoAlunos();

    let response;
    try {
      response = await classroom.courses.list({
        studentId: emailAluno,
        courseStates: ["ACTIVE"]
      });
    } catch (errList) {
      console.warn(`[classroom-aluno-salas] Erro ao listar turmas via studentId (${emailAluno}):`, errList.message);
      return res.json({ ok: true, studentEmail: emailAluno, total: 0, salas: [], bloqueadas: [] });
    }

    const courses = response.data.courses || [];
    const salas = courses.map((c) => {
      const courseId = c.id;
      const mItem = Object.values(mapeamentos).find((m) => m && m.google_course_id === courseId);

      return {
        google_course_id: courseId,
        google_course_name: c.name,
        section: c.section || "",
        alternateLink: c.alternateLink || mItem?.alternateLink || "",
        nome_disciplina: mItem?.nome_disciplina || c.name,
        id_turma: mItem?.id_turma || "",
        periodo_letivo: mItem?.periodo_letivo || ""
      };
    });

    const bloqueadas = [];
    for (const [key, record] of Object.entries(historico)) {
      if (record && record.email === emailAluno && record.status === "excluido_manualmente") {
        const cId = record.courseId;
        const mItem = Object.values(mapeamentos).find((m) => m && m.google_course_id === cId);
        bloqueadas.push({
          google_course_id: cId,
          google_course_name: mItem?.google_course_name || mItem?.nome_disciplina || `Sala ID ${cId}`,
          id_turma: record.id_turma || mItem?.id_turma || "",
          excluded_at: record.excluded_at || ""
        });
      }
    }

    return res.json({ ok: true, studentEmail: emailAluno, total: salas.length, salas, bloqueadas });
  } catch (e) {
    console.error("[google-classroom-aluno-salas] Erro geral:", e);
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/ti/google-classroom/remover-aluno-salas", async (req, res) => {
  try {
    const { idToken, email, courseIds } = req.body || {};
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

    const emailAluno = String(email || "").trim().toLowerCase();
    if (!emailAluno || !emailAluno.includes("@")) {
      return res.status(400).json({ error: "E-mail do aluno inválido ou ausente." });
    }

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: "Nenhuma disciplina foi selecionada para remoção." });
    }

    const classroom = await criarGoogleClassroomClientAuth();
    const historicoEnsalamento = lerHistoricoEnsalamentoAlunos();
    let historicoModificado = false;

    const relatorio = {
      emailAluno,
      totalSalas: courseIds.length,
      removidos: 0,
      falhas: 0,
      detalhes: []
    };

    for (const cId of courseIds) {
      try {
        await classroom.courses.students.delete({
          courseId: String(cId),
          userId: emailAluno
        });

        relatorio.removidos++;
        relatorio.detalhes.push({
          courseId: cId,
          status: "removido"
        });
        if (marcarAlunoExcluidoManualmenteLocal(cId, emailAluno, historicoEnsalamento)) {
          historicoModificado = true;
        }
        console.log(`[desenturmalizacao] Aluno ${emailAluno} removido da sala ${cId} e registrado bloqueio manual`);
      } catch (errDelete) {
        const msg = errDelete.response?.data?.error?.message || errDelete.message;
        relatorio.falhas++;
        relatorio.detalhes.push({
          courseId: cId,
          status: "erro",
          erro: msg
        });
        console.warn(`[desenturmalizacao] Erro ao remover ${emailAluno} da sala ${cId}:`, msg);
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    if (historicoModificado) {
      salvarHistoricoEnsalamentoAlunos(historicoEnsalamento);
    }

    return res.json({ ok: true, relatorio });
  } catch (e) {
    console.error("[google-classroom-remover-aluno-salas] Erro geral:", e);
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/ti/google-classroom/reincluso-aluno-salas", async (req, res) => {
  try {
    const { idToken, email, courseIds } = req.body || {};
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

    const emailAluno = String(email || "").trim().toLowerCase();
    if (!emailAluno || !emailAluno.includes("@")) {
      return res.status(400).json({ error: "E-mail do aluno inválido ou ausente." });
    }

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: "Nenhuma disciplina foi selecionada para re-inclusão." });
    }

    const classroom = await criarGoogleClassroomClientAuth();
    const historicoEnsalamento = lerHistoricoEnsalamentoAlunos();
    let historicoModificado = false;

    const relatorio = {
      emailAluno,
      totalSalas: courseIds.length,
      reinclusos: 0,
      falhas: 0,
      detalhes: []
    };

    for (const cId of courseIds) {
      try {
        await classroom.courses.students.create({
          courseId: String(cId),
          requestBody: { userId: emailAluno }
        });
        relatorio.reinclusos++;
        relatorio.detalhes.push({ courseId: cId, status: "reincluso" });

        registrarAlunoEnsaladoLocal(cId, emailAluno, "", "", historicoEnsalamento);
        historicoModificado = true;
      } catch (errCreate) {
        const msg = errCreate.response?.data?.error?.message || errCreate.message;
        if (errCreate.response?.status === 409 || msg.includes("already exists")) {
          relatorio.reinclusos++;
          relatorio.detalhes.push({ courseId: cId, status: "ja_existia" });
          registrarAlunoEnsaladoLocal(cId, emailAluno, "", "", historicoEnsalamento);
          historicoModificado = true;
        } else {
          relatorio.falhas++;
          relatorio.detalhes.push({ courseId: cId, status: "erro", erro: msg });
        }
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    if (historicoModificado) {
      salvarHistoricoEnsalamentoAlunos(historicoEnsalamento);
    }

    return res.json({ ok: true, relatorio });
  } catch (e) {
    console.error("[google-classroom-reincluso-aluno-salas] Erro geral:", e);
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/ti/google-classroom/historico-ensalamento", async (req, res) => {
  try {
    const { idToken } = req.body || {};
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

    const historico = lerHistoricoEnsalamentoAlunos();
    const total = Object.keys(historico).length;
    return res.json({ ok: true, total, historico });
  } catch (e) {
    console.error("[google-classroom-historico-ensalamento] Erro geral:", e);
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/ti/google-classroom/limpar-historico-ensalamento", async (req, res) => {
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

    let historico = lerHistoricoEnsalamentoAlunos();
    let removidosCount = 0;

    if (idTurma) {
      const idTurmaStr = String(idTurma);
      const novoHistorico = {};
      for (const [key, item] of Object.entries(historico)) {
        if (item && item.id_turma === idTurmaStr) {
          removidosCount++;
        } else {
          novoHistorico[key] = item;
        }
      }
      historico = novoHistorico;
    } else {
      removidosCount = Object.keys(historico).length;
      historico = {};
    }

    salvarHistoricoEnsalamentoAlunos(historico);
    return res.json({ ok: true, removidos: removidosCount, totalRestante: Object.keys(historico).length });
  } catch (e) {
    console.error("[google-classroom-limpar-historico-ensalamento] Erro geral:", e);
    return res.status(500).json({ error: e.message });
  }
});



// ÔöÇÔöÇÔöÇ Mapeamento server-side: setor a partir dos papeis ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

/** Papeis de gerente ÔåÆ papel base do setor (espelhado do front). */
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
  // Verifica se ├® gerente de algum setor
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

// ÔöÇÔöÇÔöÇ POST /api/usuarios/registrar ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.post("/api/usuarios/registrar", async (req, res) => {
  try {
    const { idToken, papeis } = req.body || {};
    const payload = await verificarAutenticacaoRequest(req);
    const email = payload?.email;
    const nome = payload?.name ?? email ?? "Usu├írio";
    const fotoUrl = payload?.picture || null;
    if (!email) return res.status(400).json({ error: "Token inv├ílido." });

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

// ÔöÇÔöÇÔöÇ GET /api/kanban/usuarios ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.post("/api/kanban/usuarios", async (req, res) => {
  try {
    const { idToken, setor } = req.body || {};
    await verificarAutenticacaoRequest(req);
    if (!setor || typeof setor !== "string") {
      return res.status(400).json({ error: "setor ├® obrigat├│rio." });
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

// ÔöÇÔöÇÔöÇ GET /api/kanban/cards ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.post("/api/kanban/cards/listar", async (req, res) => {
  try {
    const { idToken, setor } = req.body || {};
    const payload = await verificarAutenticacaoRequest(req);
    if (!setor || typeof setor !== "string") {
      return res.status(400).json({ error: "setor ├® obrigat├│rio." });
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

// ÔöÇÔöÇÔöÇ POST /api/kanban/cards/criar ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.post("/api/kanban/cards/criar", async (req, res) => {
  try {
    const { idToken, card } = req.body || {};
    const payload = await verificarAutenticacaoRequest(req);
    if (!card || typeof card !== "object") {
      return res.status(400).json({ error: "card ├® obrigat├│rio." });
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

// ÔöÇÔöÇÔöÇ POST /api/kanban/cards/atualizar ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.post("/api/kanban/cards/atualizar", async (req, res) => {
  try {
    const { idToken, id, patch } = req.body || {};
    await verificarAutenticacaoRequest(req);
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "id ├® obrigat├│rio." });
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

// ÔöÇÔöÇÔöÇ POST /api/kanban/cards/excluir ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.post("/api/kanban/cards/excluir", async (req, res) => {
  try {
    const { idToken, id } = req.body || {};
    await verificarAutenticacaoRequest(req);
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "id ├® obrigat├│rio." });
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

/** Build Vite (`dist/`) ao lado de `server/` ÔÇö produ├º├úo e Docker. */
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
 * fazer `fetch` na URL p├║blica correta sem novo build (p.ex. API noutro subdom├¡nio no Coolify).
 * N├úo servir o index ÔÇ£cruÔÇØ via express.static, sen├úo a inje├º├úo nunca corria.
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
  /* index: false ÔÇö nunca servir dist/index.html ÔÇ£cruÔÇØ a partir do static (precisamos injetar a meta) */
  app.use(express.static(DIST_DIR, { index: false }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "Not found" });
    }
    return sendIndexHtml(res, next);
  });
} else if (shouldServeStatic() && !fs.existsSync(DIST_DIR)) {
  console.warn(`[static] Produ├º├úo esperada mas dist/ ausente em ${DIST_DIR}. Rode npm run build na raiz ou defina SERVE_STATIC=0.`);
}

app.listen(PORT, HOST, () => {
  console.log(`API rodando em http://${HOST}:${PORT}`);
  const sa = getServiceAccountCredentials();
  if (sa?.client_id) {
    console.log(
      `[Google Workspace] Delega├º├úo em todo o dom├¡nio (Admin Console): use o Client ID num├®rico ${sa.client_id} desta service account ÔÇö n├úo o Client ID OAuth do frontend (VITE_GOOGLE_CLIENT_ID).`,
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
      setupErr ? `ÔÇö ${setupErr}` : "",
    );
  }
  const supabase = statusSupabaseEnv();
  if (supabase.urlSet && !supabase.serviceRoleKeySet) {
    console.warn(
      "Aviso: SUPABASE_URL definida mas falta SUPABASE_SERVICE_ROLE_KEY (runtime no Coolify ou server/.env).",
    );
  } else if (!supabase.configured) {
    console.warn(
      "[supabase] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ausentes ÔÇö chamados, agenda e sync do painel n├úo funcionam.",
    );
  } else if (supabase.keyLooksAnon) {
    console.warn(
      '[supabase] A chave configurada ├® "anon", n├úo "service_role". Use a secret service_role do Supabase.',
    );
  } else if (supabase.configured) {
    console.log("[supabase] OK (URL + service_role configurados).");
  }
  if (AGENDA_CCI_ENFORCE_DISABLE) {
    console.log(
      `[agenda-cci] disable/reenable ativo ÔÇö intervalo ${AGENDA_CCI_POLL_MS}ms, fuso ${AGENDA_CCI_TIMEZONE}. Lista vazia: ${AGENDA_CCI_DISABLE_WHEN_EMPTY ? "disable em todo o parque" : "s├│ reabilita bloqueados (recupera├º├úo)"}.`,
    );
    setInterval(() => {
      aplicarPoliticaChromebooks().catch((e) => console.error(e));
    }, AGENDA_CCI_POLL_MS);
    setTimeout(() => aplicarPoliticaChromebooks().catch(console.error), 12_000);
  }
});

// Trigger reload for reading env variables

// ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
// HELPERS: Grade Hor├íria Excel
// ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

/** Normaliza nome de disciplina para compara├º├úo de deduplica├º├úo */
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
const SHEETS_CURSOS = ["ADS", "BIOMEDICINA", "DIREITO ", "ENFERMAGEM", "FONOAUDIOLOGIA", "PEDAGOGIA", "PSICOLOGIA", "T├ëC ENF ", "T├ëC SA├ÜDE BUCAL"];

/** Converte n├║mero romano para inteiro */
function romanToNum(str) {
  const s = String(str || "").toUpperCase().trim();
  const romanMap = { "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10 };
  if (romanMap[s]) return romanMap[s];
  const m = s.match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\b/);
  return m ? romanMap[m[1]] : null;
}

/** Extrai o n├║mero de per├¡odo/m├│dulo de uma string */
function extrairNumeroPeriodo(str) {
  const s = String(str || "").trim();
  const m = s.match(/(\d+)[┬║o┬░]?\s*[ÔÇô-]?\s*(?:per├¡odo|m├│dulo|m├│d)/i);
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
 * Parseia o arquivo Excel da grade hor├íria.
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
        const profLimpo = prof.replace(/^(Prof[oa┬║┬¬.]+\s*)/i, "").trim();
        for (const nome of nomes) {
          if (!nome || nomesVistos.has(normalizarNomeDisc(nome))) continue;
          nomesVistos.add(normalizarNomeDisc(nome));
          listaDisc.push({ nome: nome.trim(), professor: profLimpo });
        }
      }
      if (listaDisc.length > 0) {
        const existente = turmas.find(t => t.periodo !== null && t.periodo === turmaAtual.periodo && t.curso === turmaAtual.curso);
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
        col0.toLowerCase().startsWith("ambienta├º├úo") ||
        col0.toLowerCase().startsWith("em campo") ||
        col0.toLowerCase().startsWith("hor├írio") ||
        col0.toLowerCase().startsWith("professor") ||
        col0.toLowerCase().startsWith("sala") ||
        col0.toLowerCase().startsWith("class") ||
        col0.toLowerCase().startsWith("observ") ||
        col0.toLowerCase().startsWith("grade") ||
        col0.toLowerCase().startsWith("curso de") ||
        col0.startsWith("1┬║ - 19h") ||
        col0.startsWith("1┬¬ - 19h") ||
        col0.startsWith("Das 19h");

      const ehLinhaTurma =
        col0 &&
        !isSubheader &&
        (col0.match(/(1┬║|2┬║|3┬║|4┬║|5┬║|6┬║|7┬║|8┬║|9┬║|10┬║|1┬░|2┬░|\d+[┬║o┬░])/i) ||
         col0.toLowerCase().includes("t├®cnico em") ||
         col0.toLowerCase().includes("m├│dulo") ||
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
        col0.startsWith("1┬║ - 19h") ||
        col0.startsWith("1┬¬ - 19h") ||
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
    "TEC ENF": ["TECNICO EM ENFERMAGEM", "TEC ENF", "ENF TEC", "T├ëC ENF"],
    "TEC SAUDE BUCAL": ["TECNICO EM SAUDE BUCAL", "TEC SAUDE BUCAL", "SAUDE BUCAL", "T├ëC SA├ÜDE BUCAL", "T├ëC SAUDE BUCAL"],
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

// ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
// ENDPOINT: POST /api/ti/grade/parse-excel
// Recebe arquivo Excel (multipart), retorna turmas + disciplinas
// ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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

    if (!req.file) return res.status(400).json({ error: "Arquivo Excel n├úo enviado." });

    const turmas = parseGradeHorariaExcel(req.file.buffer);
    return res.json({ ok: true, turmas });
  } catch (e) {
    console.error("[grade-parse-excel] Erro:", e);
    return res.status(500).json({ error: e.message });
  }
});

// ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
// ENDPOINT: POST /api/ti/grade/match-turmas
// Recebe turmas do Excel, busca turmas iScholar, faz matching
// ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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

    // Busca todas as turmas do iScholar via fun├º├úo auxiliar testada
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
        aviso: melhorScore < 70 ? `Nenhuma turma do iScholar com correspond├¬ncia suficiente (score ${melhorScore}/100). Selecione manualmente.` : null,
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

// ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
// ENDPOINT: POST /api/ti/grade/criar-salas
// Cria salas no Classroom a partir da grade Excel confirmada.
// Disciplinas com mesmo nome (normalizado) no mesmo periodoLetivo
// compartilham a mesma sala (cross-turma e cross-curso).
// ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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

    // ── Helper: ensala alunos de uma turma iScholar em um curso do Classroom
    async function ensalarAlunosTurmaNoClassroom(courseId, idTurma) {
      const resultado = { ensalados: 0, jaExistiam: 0, puladosHistorico: 0, semEmail: 0, erros: 0, detalhes: [] };
      const historico = lerHistoricoEnsalamentoAlunos();
      let modificado = false;

      try {
        const alunos = await obterAlunosTurmaIscholar(idTurma);
        for (const aluno of alunos) {
          const email = aluno.email;
          if (!email || !email.includes("@")) {
            resultado.semEmail++;
            resultado.detalhes.push({ nome: aluno.nome_aluno, status: "sem_email" });
            continue;
          }

          if (isAlunoExcluidoManualmenteLocal(courseId, email, historico)) {
            resultado.jaExistiam++;
            resultado.puladosHistorico++;
            resultado.detalhes.push({ nome: aluno.nome_aluno, email, status: "bloqueado_manualmente" });
            continue;
          }

          if (isAlunoEnsaladoLocal(courseId, email, historico)) {
            resultado.jaExistiam++;
            resultado.puladosHistorico++;
            resultado.detalhes.push({ nome: aluno.nome_aluno, email, status: "ja_existia" });
            continue;
          }

          try {
            await classroom.courses.students.create({
              courseId,
              requestBody: { userId: email },
            });
            resultado.ensalados++;
            resultado.detalhes.push({ nome: aluno.nome_aluno, email, status: "ensalado" });
            registrarAlunoEnsaladoLocal(courseId, email, aluno.nome_aluno, idTurma, historico);
            modificado = true;
          } catch (errAluno) {
            const msg = errAluno.response?.data?.error?.message || errAluno.message || "";
            if (errAluno.response?.status === 409 || msg.toLowerCase().includes("already")) {
              resultado.jaExistiam++;
              resultado.detalhes.push({ nome: aluno.nome_aluno, email, status: "ja_existia" });
              registrarAlunoEnsaladoLocal(courseId, email, aluno.nome_aluno, idTurma, historico);
              modificado = true;
            } else {
              resultado.erros++;
              resultado.detalhes.push({ nome: aluno.nome_aluno, email, status: "erro", erro: msg });
              console.warn(`[ensalamento] Erro ao ensalar ${email} no curso ${courseId}:`, msg);
            }
          }
        }

        if (modificado) {
          salvarHistoricoEnsalamentoAlunos(historico);
        }
      } catch (e) {
        console.error(`[ensalamento] Erro ao buscar alunos da turma ${idTurma}:`, e.message);
        resultado.erros++;
      }
      return resultado;
    }

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
        // Chave global por nome de disciplina — deduplicação cross-turma e cross-curso
        const chaveGlobal = `global_${nomeNorm}_${periodoFormatado.replace(/\./g, "_")}`;

        // Busca e-mail do professor no iScholar
        let emailProf = "";
        if (nomeProf) {
          try {
            const { codigoEscola, token } = obterCredenciaisIscholar();
            const headers = { "X-Codigo-Escola": codigoEscola, "X-Autorizacao": token, "Content-Type": "application/json" };
            const resultFunc = await safeFetchIscholarJson("https://api.ischolar.app/funcionarios/listar", { method: "GET", headers });
            if (resultFunc.ok && resultFunc.data) {
              const rawFunc = resultFunc.data.dados || resultFunc.data.funcionarios || resultFunc.data;
              const listaFunc = Array.isArray(rawFunc) ? rawFunc : Object.values(rawFunc || {});
              const nomeParts = normalizarNomeDisc(nomeProf).split(" ").filter(Boolean);
              const matchFunc = listaFunc.find(f => {
                const nomeCompleto = normalizarNomeDisc(`${f.nome || ""} ${f.sobrenome || ""}`);
                return nomeParts.every(p => nomeCompleto.includes(p));
              });
              if (matchFunc && matchFunc.email) emailProf = matchFunc.email;
            }
          } catch (eProf) {
            console.warn(`[grade-criar-salas] Não encontrou e-mail para professor ${nomeProf}:`, eProf.message);
          }
        }

        // ── Deduplicação: verifica se essa disciplina já tem sala criada
        let googleCourseId = null;
        let reaproveitada = false;

        if (mapeamentos[chaveGlobal] && mapeamentos[chaveGlobal].google_course_id) {
          // Sala já existe — reaproveita
          googleCourseId = mapeamentos[chaveGlobal].google_course_id;
          reaproveitada = true;
          // Tenta adicionar professor (ignora se já existe)
          if (emailProf && emailProf.includes("@")) {
            try {
              await classroom.courses.teachers.create({ courseId: googleCourseId, requestBody: { userId: emailProf } });
            } catch (errProf) {
              const msgErrProf = errProf.response?.data?.error?.message || errProf.message;
              if (!msgErrProf?.includes("already") && errProf.response?.status !== 409) {
                console.warn(`[grade-criar-salas] Docente ${emailProf} não adicionado (reap):`, msgErrProf);
              }
            }
          }
        } else {
          // Cria nova sala no Classroom
          try {
            const response = await classroom.courses.create({
              requestBody: { name: nomeSalaClassroom, section: nomeProf || "Sem Docente Definido", ownerId: "me", courseState: "ACTIVE" },
            });
            googleCourseId = response.data.id;
            if (emailProf && emailProf.includes("@")) {
              try {
                await classroom.courses.teachers.create({ courseId: googleCourseId, requestBody: { userId: emailProf } });
              } catch (errProf) {
                console.warn(`[grade-criar-salas] Docente ${emailProf} não adicionado (novo):`, errProf.message);
              }
            }
            mapeamentos[chaveGlobal] = {
              google_course_id: googleCourseId,
              google_course_name: response.data.name,
              alternateLink: response.data.alternateLink,
              nome_disciplina: nomeDisc,
              periodo_letivo: periodoFormatado,
              nome_professor: nomeProf,
              email_professor: emailProf,
              turmas_ensaladas: [],
              fonte: "excel",
              created_at: new Date().toISOString(),
            };
          } catch (errDisc) {
            const errMsg = errDisc.response?.data?.error?.message || errDisc.message;
            console.error(`[grade-criar-salas] Erro ao criar ${nomeDisc}:`, errMsg);
            resultados.push({ nome_disciplina: nomeDisc, status: "erro", erro: errMsg, reaproveitada: false });
            continue;
          }
        }

        // ── Ensalamento de alunos da turma iScholar nesta disciplina
        const turmasJaEnsaladas = mapeamentos[chaveGlobal]?.turmas_ensaladas || [];
        let ensalamento = { ensalados: 0, jaExistiam: 0, semEmail: 0, erros: 0 };

        if (!turmasJaEnsaladas.includes(idTurma)) {
          console.log(`[grade-criar-salas] Ensalando turma ${idTurma} em "${nomeDisc}" (${googleCourseId})...`);
          ensalamento = await ensalarAlunosTurmaNoClassroom(googleCourseId, idTurma);
          if (!mapeamentos[chaveGlobal].turmas_ensaladas) mapeamentos[chaveGlobal].turmas_ensaladas = [];
          mapeamentos[chaveGlobal].turmas_ensaladas.push(idTurma);
        } else {
          console.log(`[grade-criar-salas] Turma ${idTurma} já ensalada em "${nomeDisc}" — pulando.`);
          ensalamento.jaExistiam = -1; // sentinela: indica que foi pulada
        }

        // Índice por turma+disciplina para lookup futuro
        mapeamentos[`${idTurma}_${nomeNorm}`] = {
          ...(mapeamentos[chaveGlobal] || {}),
          id_turma: idTurma,
          reaproveitada,
          ensalamento,
        };

        resultados.push({
          nome_disciplina: nomeDisc,
          google_course_id: googleCourseId,
          google_course_name: mapeamentos[chaveGlobal]?.google_course_name || nomeSalaClassroom,
          alternateLink: mapeamentos[chaveGlobal]?.alternateLink,
          reaproveitada,
          status: "sucesso",
          ensalamento,
          nome_professor: nomeProf,
          email_professor: emailProf,
        });
      }

      salvarMapeamentosClassroom(mapeamentos);
      resultadosPorTurma.push({
        nomeTurma: turmaExcel.nomeTurma,
        idTurmaIscholar: idTurma,
        status: "concluido",
        disciplinas: resultados,
      });
    }

    const allDiscs = resultadosPorTurma.flatMap(t => t.disciplinas);
    const totalCriadas = allDiscs.filter(d => d.status === "sucesso" && !d.reaproveitada).length;
    const totalReaproveitadas = allDiscs.filter(d => d.reaproveitada).length;
    const totalErros = allDiscs.filter(d => d.status === "erro").length;
    const totalAlunos = allDiscs.reduce((acc, d) => acc + (d.ensalamento?.ensalados || 0), 0);

    return res.json({
      ok: true,
      resumo: { totalCriadas, totalReaproveitadas, totalErros, totalAlunos },
      resultadosPorTurma,
    });
  } catch (e) {
    console.error("[grade-criar-salas] Erro geral:", e);
    return res.status(500).json({ error: e.message });
  }
});


// ── Comunicados Intersetoriais ──────────────────────────────────────────
const COMUNICADOS_INTERSETORIAIS_FILE = path.join(__dirname, "data", "comunicadosIntersetoriais.json");

function lerComunicadosIntersetoriais() {
  try {
    if (!fs.existsSync(COMUNICADOS_INTERSETORIAIS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(COMUNICADOS_INTERSETORIAIS_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    console.error("[comunicados-intersetoriais] Erro ao ler arquivo:", e.message);
    return [];
  }
}

function salvarComunicadosIntersetoriais(dados) {
  try {
    const dir = path.dirname(COMUNICADOS_INTERSETORIAIS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(COMUNICADOS_INTERSETORIAIS_FILE, JSON.stringify(dados, null, 2), "utf-8");
  } catch (e) {
    console.error("[comunicados-intersetoriais] Erro ao salvar arquivo:", e.message);
  }
}

// Listar Comunicados (com filtros)
app.post("/api/comunicados-intersetoriais/listar", async (req, res) => {
  try {
    const { idToken, setor, status, busca } = req.body || {};
    const supabase = getSupabaseAdmin();
    let comunicados = await listarComunicadosStore(supabase);

    const hojeStr = new Date().toISOString().split("T")[0];

    // Calcula status dinamico (ativo vs expirado) baseado na dataValidade
    comunicados = comunicados.map((c) => {
      let isExpirado = false;
      if (c.dataValidade) {
        isExpirado = c.dataValidade < hojeStr;
      }
      return {
        ...c,
        isExpirado,
        statusCalculado: isExpirado ? "expirado" : "ativo"
      };
    });

    // Identifica usuário e seus papéis para filtrar visibilidade por setor
    let userEmail = "";
    let papeis = [];
    if (idToken && typeof idToken === "string") {
      try {
        const usr = await verificarIdTokenUsuario(idToken);
        userEmail = (usr.email || "").toLowerCase();
        const orgUnitPath = await obterOrgUnitPathUsuario(userEmail);
        const manual = lerPapeisManuaisArquivo()[userEmail] || [];
        papeis = mesclarPapeisManuais(mapearPapeisDoOrgUnit(orgUnitPath), manual);
      } catch (errToken) {
        console.warn("[comunicados-listar] Falha ao verificar idToken para escopo de setor:", errToken.message);
      }
    }

    function extrairSetoresDoUsuario(papeis) {
      const p = Array.isArray(papeis) ? papeis.map(x => String(x).toLowerCase()) : [];
      if (p.includes("admin") || p.includes("setape")) return ["*"];
      const s = [];
      if (p.includes("secretaria")) s.push("SECRETARIA");
      if (p.includes("dp") || p.includes("financeiro")) s.push("DP / FINANCEIRO");
      if (p.includes("direcao")) s.push("DIREÇÃO");
      if (p.includes("disciplinar")) s.push("DISCIPLINAR");
      if (p.includes("biblioteca")) s.push("BIBLIOTECA");
      if (p.includes("servicosgerais")) s.push("SERVIÇOS GERAIS");
      if (p.includes("almoxarifado")) s.push("ALMOXARIFADO");
      if (p.includes("primeirossocorros")) s.push("PRIMEIROS SOCORROS");
      if (p.includes("clat")) s.push("CLAT");
      if (p.includes("publicidade")) s.push("PUBLICIDADE");
      return s;
    }

    const setoresUsuario = extrairSetoresDoUsuario(papeis);
    const isAdminOuSetape = setoresUsuario.includes("*");

    // Restringe visibilidade aos comunicados direcionados ao setor do usuário ou publicados por ele
    if (!isAdminOuSetape && setoresUsuario.length > 0) {
      comunicados = comunicados.filter((c) => {
        if (userEmail && c.criadoPorEmail?.toLowerCase() === userEmail) return true;
        const dest = c.setoresDestino || [];
        if (dest.includes("Todos")) return true;
        return setoresUsuario.some(s => dest.includes(s) || c.setorOrigem === s);
      });
    }

    if (setor && setor !== "Todos") {
      comunicados = comunicados.filter((c) => {
        const dest = c.setoresDestino || [];
        return dest.includes("Todos") || dest.includes(setor) || c.setorOrigem === setor;
      });
    }

    if (status && status !== "todos") {
      comunicados = comunicados.filter((c) => c.statusCalculado === status);
    }

    if (busca && typeof busca === "string" && busca.trim()) {
      const q = busca.trim().toLowerCase();
      comunicados = comunicados.filter((c) => {
        return (
          c.titulo?.toLowerCase().includes(q) ||
          c.descricao?.toLowerCase().includes(q) ||
          c.setorOrigem?.toLowerCase().includes(q) ||
          c.criadoPorNome?.toLowerCase().includes(q)
        );
      });
    }

    comunicados.sort((a, b) => new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime());

    return res.json({ ok: true, comunicados });
  } catch (e) {
    console.error("[comunicados-intersetoriais-listar] Erro:", e);
    return res.status(500).json({ error: e.message });
  }
});

// Criar Comunicado
app.post("/api/comunicados-intersetoriais/criar", async (req, res) => {
  try {
    const { idToken, novoComunicado } = req.body || {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "Faça login para criar um comunicado." });
    }

    const { email: userEmail, name: userNome } = await verificarIdTokenUsuario(idToken);

    if (!novoComunicado || !novoComunicado.titulo || !novoComunicado.descricao) {
      return res.status(400).json({ error: "Título e descrição são obrigatórios." });
    }

    if (novoComunicado.dataValidade) {
      const agora = new Date();
      const hojeLocalStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
      if (novoComunicado.dataValidade < hojeLocalStr) {
        return res.status(400).json({ error: "A data de validade não pode ser uma data passada." });
      }
    }

    const item = {
      id: `comunicado_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      titulo: String(novoComunicado.titulo).trim(),
      setorOrigem: String(novoComunicado.setorOrigem || "Coordenação").trim(),
      setoresDestino: Array.isArray(novoComunicado.setoresDestino) && novoComunicado.setoresDestino.length > 0 ? novoComunicado.setoresDestino : ["Secretaria"],
      canaisDivulgacao: Array.isArray(novoComunicado.canaisDivulgacao) ? novoComunicado.canaisDivulgacao : [],
      descricao: String(novoComunicado.descricao).trim(),
      dataValidade: novoComunicado.dataValidade || null,
      anexosOuLinks: Array.isArray(novoComunicado.anexosOuLinks) ? novoComunicado.anexosOuLinks : [],
      criadoPorEmail: userEmail,
      criadoPorNome: userNome || userEmail,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      cientes: []
    };

    const supabase = getSupabaseAdmin();
    await criarComunicadoStore(supabase, item);

    // Dispara backup assíncrono para o Google Planilhas (Webhook / Sheets API)
    sincronizarComunicadoComGoogleSheets(item).catch(err => {
      console.warn("[comunicados-sheets] Falha no backup automático para Google Planilhas:", err.message);
    });

    return res.json({ ok: true, comunicado: item });
  } catch (e) {
    console.error("[comunicados-intersetoriais-criar] Erro:", e);
    return res.status(500).json({ error: e.message });
  }
});

// Helper de Sincronização e Backup no Google Planilhas
async function sincronizarComunicadoComGoogleSheets(item) {
  const webhookUrl = process.env.GOOGLE_SHEETS_COMUNICADOS_WEBHOOK_URL;
  const spreadsheetId = process.env.GOOGLE_SHEETS_COMUNICADOS_SPREADSHEET_ID;

  const dataFormatada = new Date(item.criadoEm || Date.now()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const validadeFormatada = item.dataValidade ? new Date(item.dataValidade + "T00:00:00").toLocaleDateString("pt-BR") : "Sem validade";
  const setoresDestinoStr = (item.setoresDestino || []).join(", ");
  const canaisDivulgacaoStr = (item.canaisDivulgacao || []).join(", ");
  const linksStr = (item.anexosOuLinks || []).map(l => `${l.titulo}: ${l.url}`).join(" | ");

  // Método 1: Webhook do Google Apps Script (Recomendado e simples)
  if (webhookUrl && webhookUrl.startsWith("http")) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataHora: dataFormatada,
          id: item.id,
          titulo: item.titulo,
          setorOrigem: item.setorOrigem,
          setoresDestino: setoresDestinoStr,
          publicadoPor: `${item.criadoPorNome} (${item.criadoPorEmail})`,
          canaisDivulgacao: canaisDivulgacaoStr,
          dataValidade: validadeFormatada,
          descricao: item.descricao,
          links: linksStr
        })
      });
      console.log(`[comunicados-sheets] Backup enviado via Webhook para ${item.id}`);
    } catch (e) {
      console.warn(`[comunicados-sheets] Erro ao enviar Webhook:`, e.message);
    }
  }

  // Método 2: Google Sheets API v4 via Service Account (se SPREADSHEET_ID estiver configurado)
  if (spreadsheetId) {
    try {
      const sa = typeof getServiceAccountCredentials === "function" ? getServiceAccountCredentials() : null;
      if (sa && sa.client_email && sa.private_key) {
        const auth = new google.auth.JWT(
          sa.client_email,
          null,
          sa.private_key.replace(/\\n/g, "\n"),
          ["https://www.googleapis.com/auth/spreadsheets"]
        );
        const sheets = google.sheets({ version: "v4", auth });
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: "Página1!A:J",
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [
              [
                dataFormatada,
                item.id,
                item.titulo,
                item.setorOrigem,
                setoresDestinoStr,
                `${item.criadoPorNome} (${item.criadoPorEmail})`,
                canaisDivulgacaoStr,
                validadeFormatada,
                item.descricao,
                linksStr
              ]
            ]
          }
        });
        console.log(`[comunicados-sheets] Linha adicionada na planilha ${spreadsheetId} via Google Sheets API`);
      }
    } catch (e) {
      console.warn(`[comunicados-sheets] Erro ao usar Google Sheets API:`, e.message);
    }
  }
}

// Atualizar Comunicado / Alterar Status
app.post("/api/comunicados-intersetoriais/atualizar", async (req, res) => {
  try {
    const { idToken, id, dadosAtualizados } = req.body || {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "Faça login para atualizar." });
    }

    await verificarIdTokenUsuario(idToken);

    if (!id) {
      return res.status(400).json({ error: "ID do comunicado não informado." });
    }

    const supabase = getSupabaseAdmin();
    const itemAtualizado = await atualizarComunicadoStore(supabase, id, dadosAtualizados || {});
    if (!itemAtualizado) {
      return res.status(404).json({ error: "Comunicado não encontrado." });
    }

    return res.json({ ok: true, comunicado: itemAtualizado });
  } catch (e) {
    console.error("[comunicados-intersetoriais-atualizar] Erro:", e);
    return res.status(500).json({ error: e.message });
  }
});

// Registrar "Ciente" (Secretaria / Atendimento)
app.post("/api/comunicados-intersetoriais/marcar-ciente", async (req, res) => {
  try {
    const { idToken, id, setorUsuario } = req.body || {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "Faça login para registrar ciente." });
    }

    const { email: userEmail, name: userNome } = await verificarIdTokenUsuario(idToken);
    const orgUnitPath = await obterOrgUnitPathUsuario(userEmail);
    const manual = lerPapeisManuaisArquivo()[userEmail.toLowerCase()] || [];
    const papeis = mesclarPapeisManuais(mapearPapeisDoOrgUnit(orgUnitPath), manual);

    function resolverSetorPorPapeis(papeis, setorEnviado) {
      const p = Array.isArray(papeis) ? papeis.map(x => String(x).toLowerCase()) : [];
      if (p.includes("setape") || p.includes("admin")) return "SETAPE";
      if (p.includes("secretaria")) return "SECRETARIA";
      if (p.includes("dp") || p.includes("financeiro")) return "DP / FINANCEIRO";
      if (p.includes("direcao")) return "DIREÇÃO";
      if (p.includes("disciplinar")) return "DISCIPLINAR";
      if (p.includes("biblioteca")) return "BIBLIOTECA";
      if (p.includes("servicosgerais")) return "SERVIÇOS GERAIS";
      if (p.includes("almoxarifado")) return "ALMOXARIFADO";
      if (p.includes("primeirossocorros")) return "PRIMEIROS SOCORROS";
      if (p.includes("clat")) return "CLAT";
      if (p.includes("publicidade")) return "PUBLICIDADE";
      if (setorEnviado && typeof setorEnviado === "string" && !setorEnviado.includes("Atendimento")) {
        return setorEnviado;
      }
      return "SETAPE";
    }

    const setorCalculado = resolverSetorPorPapeis(papeis, setorUsuario);

    if (!id) {
      return res.status(400).json({ error: "ID do comunicado não informado." });
    }

    const supabase = getSupabaseAdmin();
    const comunicados = await listarComunicadosStore(supabase);
    const item = comunicados.find((c) => c.id === id);
    if (!item) {
      return res.status(404).json({ error: "Comunicado não encontrado." });
    }

    const cientes = Array.isArray(item.cientes) ? [...item.cientes] : [];
    const jaDeuCiente = cientes.some((c) => c.email.toLowerCase() === userEmail.toLowerCase());
    if (!jaDeuCiente) {
      cientes.push({
        email: userEmail,
        nome: userNome || userEmail,
        setor: setorCalculado,
        data: new Date().toISOString()
      });
      await atualizarComunicadoStore(supabase, id, { cientes });
    }

    return res.json({ ok: true, cientes });
  } catch (e) {
    console.error("[comunicados-intersetoriais-marcar-ciente] Erro:", e);
    return res.status(500).json({ error: e.message });
  }
});

// Excluir Comunicado
app.post("/api/comunicados-intersetoriais/excluir", async (req, res) => {
  try {
    const { idToken, id } = req.body || {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "Faça login para excluir." });
    }

    await verificarIdTokenUsuario(idToken);

    if (!id) {
      return res.status(400).json({ error: "ID do comunicado não informado." });
    }

    const supabase = getSupabaseAdmin();
    await excluirComunicadoStore(supabase, id);

    return res.json({ ok: true });
  } catch (e) {
    console.error("[comunicados-intersetoriais-excluir] Erro:", e);
    return res.status(500).json({ error: e.message });
  }
});

// ============================================================
// Trilha de Conhecimento — Endpoints
// ============================================================

/**
 * POST /api/trilha/progresso/obter
 * Retorna o progresso do usuário autenticado.
 */
app.post("/api/trilha/progresso/obter", async (req, res) => {
  try {
    const ctx = await resolverContextoFromRequest(req);
    const progresso = await lerProgressoUsuario(ctx.email);
    return res.json({ progresso });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    console.error("[trilha/progresso/obter] Erro:", e.message);
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/**
 * POST /api/trilha/progresso/salvar
 * Salva o progresso do usuário e registra XP ganho no histórico.
 * Body: { xpTotal, missoesCompletas, trilhasCompletas, progressoPorTrilha,
 *         ofensivaDiasAtual, xpGanho?, trilhaId?, missaoId? }
 */
app.post("/api/trilha/progresso/salvar", async (req, res) => {
  try {
    const ctx = await resolverContextoFromRequest(req);
    const {
      xpTotal,
      missoesCompletas,
      trilhasCompletas,
      progressoPorTrilha,
      ofensivaDiasAtual,
      xpGanho,
      trilhaId,
      missaoId,
    } = req.body || {};

    if (typeof xpTotal !== "number") {
      return res.status(400).json({ error: "xpTotal obrigatório." });
    }

    const resultado = await salvarProgressoUsuario({
      email: ctx.email,
      nome: ctx.nome,
      avatarUrl: ctx.picture ?? null,
      xpTotal,
      missoesCompletas: missoesCompletas ?? 0,
      trilhasCompletas: trilhasCompletas ?? 0,
      progressoPorTrilha: progressoPorTrilha ?? {},
      ofensivaDiasAtual: ofensivaDiasAtual ?? 0,
    });

    // Registra XP no histórico se uma missão foi concluída
    if (typeof xpGanho === "number" && trilhaId && missaoId) {
      await registrarXpGanho(ctx.email, trilhaId, missaoId, xpGanho);
    }

    return res.json({ ok: true, ofensivaDias: resultado?.ofensivaDias ?? ofensivaDiasAtual });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    console.error("[trilha/progresso/salvar] Erro:", e.message);
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/**
 * GET /api/trilha/ranking-semanal
 * Retorna o ranking semanal de XP (autenticado).
 */
app.get("/api/trilha/ranking-semanal", async (req, res) => {
  try {
    await verificarAutenticacaoRequest(req);
    const ranking = await obterRankingSemanal(10);
    return res.json({ ranking });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    console.error("[trilha/ranking-semanal] Erro:", e.message);
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});
// ============================================================
// Trilhas de Conhecimento — CRUD (conteúdo)
// ============================================================

/**
 * GET /api/trilhas
 * Lista trilhas ativas com missões (para todos os usuários autenticados).
 */
app.get("/api/trilhas", async (req, res) => {
  try {
    await verificarAutenticacaoRequest(req);
    const trilhas = await listarTrilhas();
    return res.json({ trilhas, fonte: trilhas === null ? "estatico" : "supabase" });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    console.error("[trilhas/listar] Erro:", e.message);
    return res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/trilhas/admin
 * Lista todas as trilhas (inclusive inativas) para o painel admin.
 */
app.get("/api/trilhas/admin", async (req, res) => {
  try {
    const ctx = await resolverContextoFromRequest(req);
    if (!ctx.papeis?.includes("admin")) {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }
    const trilhas = await listarTrilhasAdmin();
    return res.json({ trilhas });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    console.error("[trilhas/admin/listar] Erro:", e.message);
    return res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/trilhas — Cria uma trilha [admin]
 */
app.post("/api/trilhas", async (req, res) => {
  try {
    const ctx = await resolverContextoFromRequest(req);
    if (!ctx.papeis?.includes("admin")) {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }
    const trilha = await criarTrilha(req.body);
    return res.status(201).json({ trilha });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    console.error("[trilhas/criar] Erro:", e.message);
    return res.status(400).json({ error: e.message });
  }
});

/**
 * PUT /api/trilhas/:id — Atualiza uma trilha [admin]
 */
app.put("/api/trilhas/:id", async (req, res) => {
  try {
    const ctx = await resolverContextoFromRequest(req);
    if (!ctx.papeis?.includes("admin")) {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }
    await atualizarTrilha(req.params.id, req.body);
    return res.json({ ok: true });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    console.error("[trilhas/atualizar] Erro:", e.message);
    return res.status(400).json({ error: e.message });
  }
});

/**
 * DELETE /api/trilhas/:id — Exclui uma trilha [admin]
 */
app.delete("/api/trilhas/:id", async (req, res) => {
  try {
    const ctx = await resolverContextoFromRequest(req);
    if (!ctx.papeis?.includes("admin")) {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }
    await excluirTrilha(req.params.id);
    return res.json({ ok: true });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    console.error("[trilhas/excluir] Erro:", e.message);
    return res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/trilhas/:id/missoes — Cria missão [admin]
 */
app.post("/api/trilhas/:id/missoes", async (req, res) => {
  try {
    const ctx = await resolverContextoFromRequest(req);
    if (!ctx.papeis?.includes("admin")) {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }
    const missao = await criarMissao(req.params.id, req.body);
    return res.status(201).json({ missao });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    console.error("[trilhas/missoes/criar] Erro:", e.message);
    return res.status(400).json({ error: e.message });
  }
});

/**
 * PUT /api/trilhas/:id/missoes/:mid — Atualiza missão [admin]
 */
app.put("/api/trilhas/:id/missoes/:mid", async (req, res) => {
  try {
    const ctx = await resolverContextoFromRequest(req);
    if (!ctx.papeis?.includes("admin")) {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }
    await atualizarMissao(req.params.mid, req.body);
    return res.json({ ok: true });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    console.error("[trilhas/missoes/atualizar] Erro:", e.message);
    return res.status(400).json({ error: e.message });
  }
});

/**
 * DELETE /api/trilhas/:id/missoes/:mid — Exclui missão [admin]
 */
app.delete("/api/trilhas/:id/missoes/:mid", async (req, res) => {
  try {
    const ctx = await resolverContextoFromRequest(req);
    if (!ctx.papeis?.includes("admin")) {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }
    await excluirMissao(req.params.mid);
    return res.json({ ok: true });
  } catch (e) {
    if (e.status) return respostaErroIdToken(res, e);
    console.error("[trilhas/missoes/excluir] Erro:", e.message);
    return res.status(400).json({ error: e.message });
  }
});
