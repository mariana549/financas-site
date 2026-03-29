// ══════════════════════════════════════════════════
// SUPABASE CONFIG — Conexão com o banco de dados
// ══════════════════════════════════════════════════

const SUPABASE_URL = 'https://rzyrwmjwtemlyaxujxnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6eXJ3bWp3dGVtbHlheHVqeG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzU1OTEsImV4cCI6MjA5MDMxMTU5MX0.1EQECRLTL_6apYmilyLo0EGXGkFnnVOhD5F_1KbyXXw';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// ── Sync Indicator ──
function setSyncing(on) {
  const dot = document.getElementById('syncDot');
  const lbl = document.getElementById('syncLabel');
  if (dot) dot.classList.toggle('syncing', on);
  if (lbl) lbl.textContent = on ? 'sync...' : 'ok';
}

// ── Paleta de cores para bancos ──
const PALETTE = {
  azure: '#4d9fff', violet: '#a78bfa', emerald: '#4dff91', coral: '#ff6b6b',
  amber: '#ff9f4d', pink: '#ff6eb4', teal: '#2dd4bf', yellow: '#facc15',
  indigo: '#6366f1', rose: '#fb7185', lime: '#a3e635', sky: '#38bdf8',
  slate: '#94a3b8', fuchsia: '#e879f9', orange: '#f97316', mint: '#34d399'
};