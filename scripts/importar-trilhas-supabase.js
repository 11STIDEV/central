// scripts/importar-trilhas-supabase.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lê server/.env manualmente
const envPath = path.join(__dirname, '../server/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY precisam estar definidos no server/.env.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const jsonPath = path.join(__dirname, 'trilhas-padrao.json');
  if (!fs.existsSync(jsonPath)) {
    console.error("Erro: trilhas-padrao.json não encontrado. Execute scripts/gerar-seed-trilhas.js primeiro.");
    process.exit(1);
  }

  const trilhas = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`Iniciando importação de ${trilhas.length} trilhas para o Supabase...`);

  let ordemTrilha = 1;
  for (const t of trilhas) {
    console.log(`-> Importando trilha: ${t.titulo} (${t.id})...`);

    const { error: errT } = await supabase
      .from('trilhas_conhecimento')
      .upsert({
        id: t.id,
        titulo: t.titulo,
        descricao: t.descricao || '',
        categoria: t.categoria || '',
        icone: t.icone || '📚',
        cor: t.cor || 'from-indigo-500 to-blue-600',
        dificuldade: t.dificuldade || 'iniciante',
        setor_restrito: t.setorRestrito || null,
        ativo: true,
        ordem: ordemTrilha,
      }, { onConflict: 'id' });

    if (errT) {
      console.error(`Erro ao importar trilha ${t.id}:`, errT.message);
      continue;
    }

    let ordemMissao = 1;
    for (const m of t.missoes) {
      const { error: errM } = await supabase
        .from('trilhas_missoes')
        .upsert({
          id: m.id,
          trilha_id: t.id,
          ordem: m.ordem || ordemMissao,
          titulo: m.titulo,
          descricao: m.descricao || '',
          conteudo: m.conteudo || '',
          link_externo: m.linkExterno || null,
          xp_recompensa: m.xpRecompensa || 5,
          tempo_estimado_min: m.tempoEstimadoMin || 10,
          quiz: m.quiz || [],
        }, { onConflict: 'id' });

      if (errM) {
        console.error(`  Erro ao importar missão ${m.id}:`, errM.message);
      }
      ordemMissao++;
    }
    ordemTrilha++;
  }

  console.log("Importação finalizada com sucesso!");
}

main().catch(console.error);
