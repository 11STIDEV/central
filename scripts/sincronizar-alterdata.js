#!/usr/bin/env node
/**
 * scripts/sincronizar-alterdata.js
 *
 * Sincroniza colaboradores do Alterdata para o Supabase (intranet_alterdata_funcionarios).
 * Pode importar os dados já consolidados do arquivo local (server/data/alterdata_funcionarios.json)
 * ou consultar a API oficial do Alterdata diretamente caso um token seja fornecido.
 *
 * Uso:
 *   node scripts/sincronizar-alterdata.js             (sincroniza JSON local se sem token, ou API se ALTERDATA_TOKEN definido)
 *   node scripts/sincronizar-alterdata.js --local     (força importação do JSON local)
 *   node scripts/sincronizar-alterdata.js --api --token=SEU_TOKEN
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import {
  salvarFuncionariosNoBanco,
  sincronizarAlterdataDireto,
  lerBancoLocal,
} from "../server/alterdataStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente do server/.env
const envPath = path.join(__dirname, "../server/.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos no server/.env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Processa argumentos de linha de comando
const args = process.argv.slice(2);
const forcarLocal = args.includes("--local");
const forcarApi = args.includes("--api");
const tokenArg = args.find((a) => a.startsWith("--token="))?.split("=")[1];
const alterdataToken = tokenArg || process.env.ALTERDATA_TOKEN;

async function main() {
  console.log("==========================================================");
  console.log(" Central Connect — Sincronização de Funcionários Alterdata");
  console.log("==========================================================");

  if (!forcarLocal && (forcarApi || alterdataToken)) {
    console.log("🌐 Modo: Sincronização direta via API do Alterdata...");
    try {
      const res = await sincronizarAlterdataDireto(supabase, {
        token: alterdataToken,
        apenasAtivos: true,
      });
      console.log("✅ Sincronização via API finalizada!");
      console.log(`   - Contratos baixados: ${res.totalContratosBaixados}`);
      console.log(`   - Colaboradores unificados: ${res.totalColaboradoresUnificados}`);
      console.log(`   - Salvos no Supabase: ${res.salvos}`);
      console.log(`   - Status Supabase: ${res.supabase?.sucesso ? "OK" : res.supabase?.erro}`);
    } catch (err) {
      console.error("❌ Falha na sincronização via API:", err.message);
      process.exit(1);
    }
  } else {
    console.log("📁 Modo: Importação da base local consolidada (alterdata_funcionarios.json)...");
    const itensLocais = lerBancoLocal();
    if (!itensLocais || itensLocais.length === 0) {
      console.error("❌ Nenhum registro encontrado em server/data/alterdata_funcionarios.json.");
      process.exit(1);
    }

    console.log(`ℹ️  Lidos ${itensLocais.length} colaboradores da base local.`);
    console.log("💾 Enviando para o Supabase (tabela intranet_alterdata_funcionarios)...");

    const res = await salvarFuncionariosNoBanco(supabase, itensLocais, false);
    if (res.supabase?.sucesso) {
      console.log(`✅ Sucesso! ${res.salvos} colaboradores persistidos no Supabase.`);
    } else {
      console.warn(`⚠️  Aviso: salvos no banco local (${res.salvos}), mas o Supabase retornou:`, res.supabase?.erro);
    }
  }
  console.log("==========================================================");
}

main().catch((err) => {
  console.error("❌ Erro inesperado:", err);
  process.exit(1);
});
