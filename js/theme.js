// ══════════════════════════════════════════════════
// THEME.JS — Tema dark/light + Sidebar + Views
// ══════════════════════════════════════════════════

function toggleTheme() {
  S.theme = S.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  save();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', S.theme);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = S.theme === 'dark' ? '☀️' : '🌙';
}

function toggleSidebar() {
  document.getElementById('sb').classList.toggle('open');
  document.getElementById('sbOverlay').classList.toggle('open');
}

function togglePrivacy() {
  const isOn = document.documentElement.getAttribute('data-privacy') === 'on';
  applyPrivacy(!isOn);
  localStorage.setItem('fin_privacy', !isOn ? 'on' : 'off');
}

function applyPrivacy(on) {
  document.documentElement.setAttribute('data-privacy', on ? 'on' : 'off');
  const btn = document.getElementById('privacyBtn');
  if (btn) btn.textContent = on ? '🙈' : '👁';
}

function showView(v) {
  S.currentView = v;

  // ── Fecha sidebar no mobile ao trocar de view ──
  const sb = document.getElementById('sb');
  if (sb && sb.classList.contains('open')) toggleSidebar();

  document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  const navEl = document.getElementById('nav-' + v);
  if (navEl) navEl.classList.add('active');
  const tb = document.getElementById('mainTopbar');
  if (tb) tb.style.display = v === 'dash' ? 'flex' : 'none';
  if (v === 'reports') {
    const k = S.currentMonth;
    if (S._repKey !== k) { S._repKey = k; renderReports(); }
  }
  if (v === 'subs') renderSubs();
  if (v === 'year') {
    const k = S.months.length + ':' + (S.months[S.months.length - 1]?.key || '');
    if (S._yearKey !== k) { S._yearKey = k; renderYear(); }
  }
  if (v === 'history') {
    const k = S.months.length + ':' + (S.months[S.months.length - 1]?.key || '');
    if (S._histKey !== k) { S._histKey = k; renderHistory(); }
  }
}