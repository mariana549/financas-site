// ══════════════════════════════════════════════════
// supabase-config.example.js — Template de configuração
// Copie para js/supabase-config.js e preencha com os valores reais.
// Encontre as credenciais em: Supabase → Project Settings → API
// ══════════════════════════════════════════════════

const SUPABASE_URL  = 'https://SEU-PROJECT-ID.supabase.co';
const SUPABASE_KEY  = 'sua-anon-public-key';

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
