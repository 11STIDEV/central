/**
 * Checklist de Matrículas e Renovações — Dashboard
 *
 * Backend Apps Script que serve um dashboard web para a planilha de
 * acompanhamento de matrículas. A planilha é o "banco de dados" e
 * este script expõe uma API para o front (Index.html).
 *
 * IMPORTANTE: ajuste as constantes abaixo conforme o nome da sua aba
 * e onde os cabeçalhos estão.
 */

// ============================================================
// CONFIGURAÇÃO — ajuste se necessário
// ============================================================
const CONFIG = {
  SHEET_NAME: 'Página1', // nome da aba (clique no rodapé da planilha)
  HEADER_ROW: 4,         // linha onde estão os títulos das etapas
  DATA_START_ROW: 5,     // primeira linha de aluno
  COL_CODIGO: 'A',
  COL_NOME: 'B',
  COL_ANDAMENTO: 'S',          // barra de Andamento (opcional)
  COL_SITUACAO: 'T',           // Situação da Matrícula
  STATUS_VALUES: ['Pendente', 'Em andamento', 'Concluído'],
  SITUACAO_VALUES: ['Crítica', 'Atenção', 'Regular'],
  // Cache de leitura para reduzir chamadas (segundos)
  CACHE_TTL: 30,
};

// ============================================================
// ENTRY POINT — Web App
// ============================================================
function doGet(e) {
  const tpl = HtmlService.createTemplateFromFile('Index');
  tpl.user = (Session.getActiveUser().getEmail() || '').toLowerCase();
  return tpl.evaluate()
    .setTitle('Checklist de Matrículas 2027')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// ============================================================
// API EXPOSTA AO FRONT
// ============================================================

/**
 * Devolve toda a estrutura: colunas (etapas), alunos e estatísticas.
 * Otimizado com cache curto para não travar em planilhas grandes.
 */
function api_getDashboardData() {
  const cache = CacheService.getUserCache();
  const cached = cache.get('dashboard');
  if (cached) return JSON.parse(cached);

  const sheet = _getSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < CONFIG.DATA_START_ROW) {
    return { columns: [], students: [], stats: _emptyStats() };
  }

  const headerRow = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getValues()[0];
  const sectionRow = sheet.getRange(CONFIG.HEADER_ROW - 2, 1, 1, lastCol).getValues()[0];
  const dataRange = sheet.getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.DATA_START_ROW + 1, lastCol);
  const values = dataRange.getValues();
  const bgColors = dataRange.getBackgrounds();

  const codigoIdx = _colToIdx(CONFIG.COL_CODIGO);
  const nomeIdx = _colToIdx(CONFIG.COL_NOME);
  const andamentoIdx = _colToIdx(CONFIG.COL_ANDAMENTO);
  const situacaoIdx = _colToIdx(CONFIG.COL_SITUACAO);

  // Mapa de colunas de checklist (entre Nome e Andamento)
  const columns = [];
  let currentSection = '';
  for (let i = nomeIdx + 1; i < andamentoIdx; i++) {
    const header = String(headerRow[i] || '').trim();
    const section = String(sectionRow[i] || '').trim();
    if (section) currentSection = section;
    if (!header) continue;
    columns.push({
      index: i,
      letter: _idxToCol(i),
      title: header,
      section: currentSection,
    });
  }

  // Alunos
  const students = [];
  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    const codigo = row[codigoIdx];
    const nome = row[nomeIdx];
    if (!codigo && !nome) continue;

    const checklist = columns.map((c) => ({
      key: c.letter,
      title: c.title,
      section: c.section,
      value: _normalizeStatus(row[c.index]),
    }));

    const totals = _countStatuses(checklist);
    const progresso = checklist.length
      ? Math.round((totals.Concluído / checklist.length) * 100)
      : 0;

    students.push({
      rowNumber: CONFIG.DATA_START_ROW + r,
      codigo: String(codigo || '').trim(),
      nome: String(nome || '').trim(),
      situacao: _normalizeSituacao(row[situacaoIdx]),
      progresso,
      totals,
      checklist,
    });
  }

  const stats = _calcStats(students, columns);
  const payload = { columns, students, stats, ts: Date.now() };

  cache.put('dashboard', JSON.stringify(payload), CONFIG.CACHE_TTL);
  return payload;
}

/**
 * Atualiza uma célula de checklist de um aluno e devolve o novo estado.
 * @param {Object} args { rowNumber, columnLetter, value }
 */
function api_updateCell(args) {
  if (!args || !args.rowNumber || !args.columnLetter) {
    throw new Error('Parâmetros inválidos.');
  }
  const allowed = CONFIG.STATUS_VALUES.concat(CONFIG.SITUACAO_VALUES, ['']);
  if (allowed.indexOf(args.value) === -1) {
    throw new Error('Valor não permitido: ' + args.value);
  }

  const sheet = _getSheet();
  const range = sheet.getRange(args.columnLetter + args.rowNumber);
  range.setValue(args.value);

  // Invalida cache para que o próximo getDashboardData seja fresco.
  CacheService.getUserCache().remove('dashboard');

  return { ok: true, rowNumber: args.rowNumber, column: args.columnLetter, value: args.value };
}

/**
 * Força recarregar os dados (limpa cache).
 */
function api_refresh() {
  CacheService.getUserCache().remove('dashboard');
  return api_getDashboardData();
}

/**
 * Devolve o e-mail do usuário logado (útil para auditoria/UI).
 */
function api_whoAmI() {
  return Session.getActiveUser().getEmail() || '';
}

// ============================================================
// HELPERS
// ============================================================
function _getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
  if (!sh) throw new Error('Aba não encontrada: ' + CONFIG.SHEET_NAME);
  return sh;
}

function _colToIdx(letter) {
  let n = 0;
  letter = String(letter).toUpperCase();
  for (let i = 0; i < letter.length; i++) {
    n = n * 26 + (letter.charCodeAt(i) - 64);
  }
  return n - 1;
}

function _idxToCol(idx) {
  let s = '';
  let n = idx + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function _normalizeStatus(v) {
  const s = String(v || '').trim();
  if (!s) return 'Pendente';
  const lower = s.toLowerCase();
  if (lower.indexOf('conclu') === 0) return 'Concluído';
  if (lower.indexOf('andam') >= 0 || lower.indexOf('em ') === 0) return 'Em andamento';
  if (lower.indexOf('pend') === 0) return 'Pendente';
  return s;
}

function _normalizeSituacao(v) {
  const s = String(v || '').trim();
  if (!s) return 'Regular';
  const lower = s.toLowerCase();
  if (lower.indexOf('crít') === 0 || lower.indexOf('crit') === 0) return 'Crítica';
  if (lower.indexOf('aten') === 0) return 'Atenção';
  if (lower.indexOf('reg') === 0) return 'Regular';
  return s;
}

function _countStatuses(checklist) {
  const totals = { 'Concluído': 0, 'Em andamento': 0, 'Pendente': 0 };
  checklist.forEach((c) => {
    if (totals[c.value] != null) totals[c.value]++;
    else totals[c.value] = 1;
  });
  return totals;
}

function _emptyStats() {
  return {
    totalAlunos: 0,
    bySituacao: { 'Crítica': 0, 'Atenção': 0, 'Regular': 0 },
    progressoMedio: 0,
    porEtapa: [],
  };
}

function _calcStats(students, columns) {
  const stats = _emptyStats();
  stats.totalAlunos = students.length;
  let progSum = 0;
  const colStats = columns.map((c) => ({
    title: c.title,
    section: c.section,
    'Concluído': 0,
    'Em andamento': 0,
    'Pendente': 0,
  }));

  students.forEach((s) => {
    progSum += s.progresso;
    if (stats.bySituacao[s.situacao] != null) stats.bySituacao[s.situacao]++;
    else stats.bySituacao[s.situacao] = 1;

    s.checklist.forEach((c, i) => {
      if (colStats[i][c.value] != null) colStats[i][c.value]++;
    });
  });

  stats.progressoMedio = students.length ? Math.round(progSum / students.length) : 0;
  stats.porEtapa = colStats;
  return stats;
}

// ============================================================
// MENU NA PLANILHA — útil para abrir o dashboard rápido
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📊 Dashboard')
    .addItem('Abrir dashboard', 'menuOpenDashboard')
    .addItem('Limpar cache', 'menuClearCache')
    .addToUi();
}

function menuOpenDashboard() {
  const url = ScriptApp.getService().getUrl();
  if (!url) {
    SpreadsheetApp.getUi().alert('Faça o deploy como Web App primeiro (Deploy > Nova implantação).');
    return;
  }
  const html = HtmlService.createHtmlOutput(
    '<script>window.open("' + url + '","_blank");google.script.host.close();</script>'
  ).setWidth(50).setHeight(50);
  SpreadsheetApp.getUi().showModalDialog(html, 'Abrindo…');
}

function menuClearCache() {
  CacheService.getUserCache().remove('dashboard');
  SpreadsheetApp.getUi().alert('Cache limpo.');
}
