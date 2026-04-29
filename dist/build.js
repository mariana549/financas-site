#!/usr/bin/env node
// ══════════════════════════════════════════════════
// dist/build.js — Concatena CSS e JS em dist/
// Uso: node dist/build.js   ou   npm run build
// ══════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CSS_FILES = [
  'css/variables.css',
  'css/base.css',
  'css/auth.css',
  'css/layout.css',
  'css/components.css',
  'css/tables.css',
  'css/modals.css',
  'css/reports.css',
  'css/ai.css',
  'css/responsive.css',
  'css/pj/pj-variables.css',
  'css/pj/pj-layout.css',
];

// Ordem crítica — cada arquivo pode chamar funções dos anteriores
const JS_FILES = [
  'js/supabase-config.js',
  'js/utils.js',
  'js/state.js',
  'js/filter.js',
  'js/theme.js',
  'js/dbs/db-months.js',
  'js/dbs/db-banks.js',
  'js/dbs/db-entries.js',
  'js/dbs/db-pix.js',
  'js/dbs/db-recurrents.js',
  'js/dbs/db-incomes.js',
  'js/dbs/db-subscriptions.js',
  'js/dbs/db-installments.js',
  'js/dbs/db-receivables.js',
  'js/dbs/db-dev.js',
  'js/dbs/db-profile.js',
  'js/dbs/db-contexts.js',
  'js/dbs/db-clients.js',
  'js/dbs/db-taxes.js',
  'js/dbs/db.js',
  'js/auth.js',
  'js/months.js',
  'js/banks.js',
  'js/entries.js',
  'js/installments.js',
  'js/pix.js',
  'js/recurrents.js',
  'js/income.js',
  'js/subscriptions.js',
  'js/dashboard.js',
  'js/cobranca.js',
  'js/reports.js',
  'js/history.js',
  'js/backup.js',
  'js/ai-engine.js',
  'js/changelog.js',
  'js/dev.js',
  'js/profile.js',
  'js/clients.js',
  'js/taxes.js',
  'js/pj-reports.js',
  'js/modals.js',
  'js/main.js',
];

function bundle(files, outName) {
  const missing = files.filter(f => !fs.existsSync(path.join(ROOT, f)));
  if (missing.length) {
    console.error('Arquivos não encontrados:\n  ' + missing.join('\n  '));
    process.exit(1);
  }

  const parts = files.map(f => {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    return `/* ── ${f} ── */\n${src.trimEnd()}`;
  });

  const out = path.join(ROOT, 'dist', outName);
  fs.writeFileSync(out, parts.join('\n\n') + '\n', 'utf8');

  const kb = (fs.statSync(out).size / 1024).toFixed(1);
  console.log(`  ✓  dist/${outName}  (${kb} KB, ${files.length} arquivos)`);
}

console.log('\nBuild iniciado...');
bundle(CSS_FILES, 'all.min.css');
bundle(JS_FILES,  'app.min.js');
console.log('Build concluído.\n');
