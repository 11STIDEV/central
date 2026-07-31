/**
 * Executa uma rodada da política disable/reenable (mesma lógica do worker em index.js).
 * Uso: node scripts/run-chromebook-policy-once.mjs
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import {
  agoraLocalParts,
  estaEmJanelaReservaAtiva,
  dispositivoEstaDisabled,
} from "../agendaCciLogic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const TIMEZONE = process.env.AGENDA_CCI_TIMEZONE || "America/Sao_Paulo";
const DATA_FILE = path.join(__dirname, "..", "data", "agenda-cci-reservas.json");

function loadCreds() {
  const rawPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || "./service-account-key.json";
  const fullPath = path.resolve(path.join(__dirname, ".."), rawPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

async function lerReservas() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && key) {
    try {
      const sb = createClient(url, key);
      const { data, error } = await sb
        .from("agenda_cci_reservas")
        .select("payload")
        .order("created_at", { ascending: false });
      if (!error && data?.length) {
        return data.map((r) => r.payload).filter((p) => p && typeof p === "object");
      }
      if (error) console.warn("[policy-once] Supabase:", error.message);
    } catch (e) {
      console.warn("[policy-once] Supabase falhou:", e.message);
    }
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

async function listarDevices(admin) {
  const out = [];
  let pageToken;
  const ou = process.env.GOOGLE_CHROMEBOOK_ORG_UNIT?.trim();
  do {
    const r = await admin.chromeosdevices.list({
      customerId: "my_customer",
      maxResults: 200,
      orgUnitPath: ou || undefined,
      pageToken: pageToken || undefined,
    });
    for (const d of r.data.chromeosdevices || []) {
      if (String(d.status || "").toUpperCase() === "DEPROVISIONED") continue;
      out.push(d);
    }
    pageToken = r.data.nextPageToken;
  } while (pageToken);
  return out;
}

async function acao(admin, deviceId, action) {
  await admin.chromeosdevices.action({
    customerId: "my_customer",
    resourceId: deviceId,
    requestBody: { action },
  });
}

const creds = loadCreds();
const auth = new google.auth.JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ["https://www.googleapis.com/auth/admin.directory.device.chromeos"],
  subject: process.env.GOOGLE_ADMIN_IMPERSONATE,
});
await auth.authorize();
const admin = google.admin({ version: "directory_v1", auth });

const reservas = await lerReservas();
const { ymd, minutes } = agoraLocalParts(TIMEZONE);
console.log(`[policy-once] ${reservas.length} reserva(s), agora ${ymd} ${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")} (${TIMEZONE})`);

const devices = await listarDevices(admin);
console.log(`[policy-once] ${devices.length} Chromebook(s) no Admin`);

let reenable = 0;
let disable = 0;
for (const d of devices) {
  const id = d.deviceId;
  const deveHabilitar = estaEmJanelaReservaAtiva(id, reservas, ymd, minutes);
  const disabled = dispositivoEstaDisabled(d);
  const serial = d.serialNumber || id;

  if (deveHabilitar && disabled) {
    await acao(admin, id, "reenable");
    console.log(`[policy-once] REENABLE ${serial} (${d.annotatedAssetId || d.notes || id})`);
    reenable += 1;
  } else if (!deveHabilitar && !disabled) {
    await acao(admin, id, "disable");
    console.log(`[policy-once] DISABLE ${serial} (${d.annotatedAssetId || d.notes || id})`);
    disable += 1;
  } else {
    const estado = disabled ? "DISABLED" : "ACTIVE";
    const janela = deveHabilitar ? "reserva ativa" : "fora da reserva";
    if (serial.endsWith("00924") || String(d.annotatedAssetId).includes("CHR040")) {
      console.log(`[policy-once] CHR040/00924: ${estado}, ${janela} — sem ação`);
    }
  }
  await new Promise((r) => setTimeout(r, 250));
}

console.log(`[policy-once] Concluído: ${reenable} reenable, ${disable} disable`);
