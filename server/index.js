import "dotenv/config";
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

/** Um ou mais sufixos permitidos, separados por vírgula (ex.: @portalcci.com.br,@faculdadecci.com.br). */
function parseDominiosPermitidos() {
  const raw =
    process.env.DOMINIOS_PERMITIDOS || process.env.DOMINIO_PERMITIDO || "@portalcci.com.br";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
const DOMINIOS_PERMITIDOS = parseDominiosPermitidos();

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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

/** Papéis atribuíveis apenas via API admin (extensível). */
const PAPEIS_MANUAIS_PERMITIDOS = ["admin"];

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

function getServiceAccountCredentials() {
  if (GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error("GOOGLE_SERVICE_ACCOUNT_JSON inválido:", e.message);
      return null;
    }
  }
  if (GOOGLE_SERVICE_ACCOUNT_PATH) {
    try {
      const fullPath = path.isAbsolute(GOOGLE_SERVICE_ACCOUNT_PATH)
        ? GOOGLE_SERVICE_ACCOUNT_PATH
        : path.resolve(__dirname, GOOGLE_SERVICE_ACCOUNT_PATH);
      const raw = fs.readFileSync(fullPath, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("Erro ao ler GOOGLE_SERVICE_ACCOUNT_PATH:", e.message);
      return null;
    }
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

/** Listagem de Chromebooks + disable/reenable na agenda. Exige escopo delegado à service account. */
function getJwtChromeOs() {
  return getAdminJwtForScopes([SCOPE_ADMIN_CHROME_DEVICE]);
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

  const reservas = lerReservasArquivo();
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
      return res.status(500).json({
        error:
          "Servidor não configurado para Admin SDK. Defina GOOGLE_SERVICE_ACCOUNT_JSON (ou GOOGLE_SERVICE_ACCOUNT_PATH) e GOOGLE_ADMIN_IMPERSONATE.",
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
    const user = await admin.users.get({ userKey: email });
    const orgUnitPath =
      user.data?.orgUnitPath != null && user.data.orgUnitPath !== ""
        ? String(user.data.orgUnitPath)
        : null;

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
      return res.status(500).json({
        error:
          "Servidor não configurado para Admin SDK. Defina GOOGLE_SERVICE_ACCOUNT_JSON (ou GOOGLE_SERVICE_ACCOUNT_PATH) e GOOGLE_ADMIN_IMPERSONATE.",
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
        label:
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
    salvarReservasArquivo(reservas);
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
    return res.json({ reservas: lerReservasArquivo() });
  } catch (err) {
    const msg = mensagemErroGoogle(err);
    console.error("Erro /api/agenda-cci/reservas/obter:", msg);
    return res.status(500).json({ error: msg || "Erro ao ler reservas." });
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
        error: "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor.",
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

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
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
  const hasServiceAccount = GOOGLE_SERVICE_ACCOUNT_JSON || GOOGLE_SERVICE_ACCOUNT_PATH;
  if (GOOGLE_CLIENT_IDS.length === 0 || !hasServiceAccount || !GOOGLE_ADMIN_IMPERSONATE) {
    console.warn(
      "Aviso: configure GOOGLE_CLIENT_ID, GOOGLE_SERVICE_ACCOUNT_JSON e GOOGLE_ADMIN_IMPERSONATE para /api/organizacao funcionar."
    );
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
