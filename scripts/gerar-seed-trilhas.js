// scripts/gerar-seed-trilhas.js
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const outfile = path.join(__dirname, '.temp-trilhas-bundle.cjs');
  
  await esbuild.build({
    entryPoints: [path.join(__dirname, '../src/data/trilhas/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    outfile: outfile,
  });

  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const bundled = require(outfile);
  const trilhas = bundled.TRILHAS_MOCK;

  // Limpa bundle temporário
  if (fs.existsSync(outfile)) {
    fs.unlinkSync(outfile);
  }

  // Ajusta pontuações se necessário
  for (const trilha of trilhas) {
    for (const missao of trilha.missoes) {
      missao.xpRecompensa = missao.xpRecompensa || 5;
    }
    trilha.xpTotal = (trilha.missoes.length * 5) + 10;
  }

  // Salva JSON das trilhas padrão
  const jsonPath = path.join(__dirname, 'trilhas-padrao.json');
  fs.writeFileSync(jsonPath, JSON.stringify(trilhas, null, 2), 'utf-8');
  console.log(`JSON gerado com sucesso em: ${jsonPath} (${trilhas.length} trilhas)`);

  // Gera SQL de seed
  function escapeSql(str) {
    if (str === null || str === undefined) return 'NULL';
    return "'" + String(str).replace(/'/g, "''") + "'";
  }

  function escapeJson(obj) {
    if (obj === null || obj === undefined) return "'[]'::jsonb";
    return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
  }

  const sqlLines = [
    '-- ============================================================',
    '-- SEED: Trilhas de Conhecimento e Missões Padrão',
    '-- Execute este script no SQL Editor do Supabase',
    '-- ============================================================',
    '',
  ];

  let ordemTrilha = 1;
  for (const t of trilhas) {
    sqlLines.push(`-- Trilha: ${t.titulo}`);
    sqlLines.push(`INSERT INTO trilhas_conhecimento (id, titulo, descricao, categoria, icone, cor, dificuldade, setor_restrito, ativo, ordem)`);
    sqlLines.push(`VALUES (${escapeSql(t.id)}, ${escapeSql(t.titulo)}, ${escapeSql(t.descricao)}, ${escapeSql(t.categoria)}, ${escapeSql(t.icone)}, ${escapeSql(t.cor)}, ${escapeSql(t.dificuldade)}, ${t.setorRestrito ? escapeSql(t.setorRestrito) : 'NULL'}, true, ${ordemTrilha})`);
    sqlLines.push(`ON CONFLICT (id) DO UPDATE SET`);
    sqlLines.push(`  titulo = EXCLUDED.titulo,`);
    sqlLines.push(`  descricao = EXCLUDED.descricao,`);
    sqlLines.push(`  categoria = EXCLUDED.categoria,`);
    sqlLines.push(`  icone = EXCLUDED.icone,`);
    sqlLines.push(`  cor = EXCLUDED.cor,`);
    sqlLines.push(`  dificuldade = EXCLUDED.dificuldade,`);
    sqlLines.push(`  setor_restrito = EXCLUDED.setor_restrito,`);
    sqlLines.push(`  ordem = EXCLUDED.ordem;`);
    sqlLines.push('');

    let ordemMissao = 1;
    for (const m of t.missoes) {
      sqlLines.push(`INSERT INTO trilhas_missoes (id, trilha_id, ordem, titulo, descricao, conteudo, link_externo, xp_recompensa, tempo_estimado_min, quiz)`);
      sqlLines.push(`VALUES (${escapeSql(m.id)}, ${escapeSql(t.id)}, ${m.ordem || ordemMissao}, ${escapeSql(m.titulo)}, ${escapeSql(m.descricao)}, ${escapeSql(m.conteudo)}, ${m.linkExterno ? escapeSql(m.linkExterno) : 'NULL'}, ${m.xpRecompensa || 5}, ${m.tempoEstimadoMin || 10}, ${escapeJson(m.quiz || [])})`);
      sqlLines.push(`ON CONFLICT (id) DO UPDATE SET`);
      sqlLines.push(`  trilha_id = EXCLUDED.trilha_id,`);
      sqlLines.push(`  ordem = EXCLUDED.ordem,`);
      sqlLines.push(`  titulo = EXCLUDED.titulo,`);
      sqlLines.push(`  descricao = EXCLUDED.descricao,`);
      sqlLines.push(`  conteudo = EXCLUDED.conteudo,`);
      sqlLines.push(`  link_externo = EXCLUDED.link_externo,`);
      sqlLines.push(`  xp_recompensa = EXCLUDED.xp_recompensa,`);
      sqlLines.push(`  tempo_estimado_min = EXCLUDED.tempo_estimado_min,`);
      sqlLines.push(`  quiz = EXCLUDED.quiz;`);
      sqlLines.push('');
      ordemMissao++;
    }
    ordemTrilha++;
  }

  const sqlPath = path.join(__dirname, 'seed-trilhas.sql');
  fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf-8');
  console.log(`SQL gerado com sucesso em: ${sqlPath}`);
}

main().catch(console.error);
