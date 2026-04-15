// ══════════════════════════════════════════════════
// build.js — Gerado na Vercel antes do deploy
// Lê SUPABASE_URL e SUPABASE_KEY das variáveis de ambiente
// e escreve js/supabase-config.js
// ══════════════════════════════════════════════════
const fs = require('fs');
const https = require('https');
const path = require('path');

const url  = process.env.SUPABASE_URL;
const key  = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('❌ SUPABASE_URL e SUPABASE_KEY precisam estar definidas nas variáveis de ambiente.');
  process.exit(1);
}

// ── 1. Gera js/supabase-config.js ──
const config = `// Gerado automaticamente pelo build.js — não edite manualmente.
const SUPABASE_URL  = '${url}';
const SUPABASE_KEY  = '${key}';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

const PALETTE = {
  azure:  '#4d9fff',
  green:  '#4dff91',
  purple: '#bf4dff',
  orange: '#ff9f4d',
  red:    '#ff4d4d',
  pink:   '#ff6eb4',
  teal:   '#2dd4bf',
  yellow: '#facc15',
};
`;

fs.writeFileSync(path.join(__dirname, 'js', 'supabase-config.js'), config);
console.log('✓ js/supabase-config.js gerado');

// ── 2. Baixa supabase.min.js se não existir ──
const libDir  = path.join(__dirname, 'js', 'lib');
const libFile = path.join(libDir, 'supabase.min.js');

if (fs.existsSync(libFile)) {
  console.log('✓ js/lib/supabase.min.js já existe — pulando download');
  process.exit(0);
}

fs.mkdirSync(libDir, { recursive: true });
const file = fs.createWriteStream(libFile);
https.get(
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  res => {
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('✓ js/lib/supabase.min.js baixado');
    });
  }
).on('error', err => {
  fs.unlink(libFile, () => {});
  console.error('❌ Falha ao baixar supabase.min.js:', err.message);
  process.exit(1);
});
