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

function toggleDesktopSidebar() {
  document.body.classList.toggle('sb-desktop-hidden');
  localStorage.setItem('fin_sb_hidden', document.body.classList.contains('sb-desktop-hidden') ? '1' : '0');
}

function toggleSidebarAll() {
  if (window.innerWidth <= 768) {
    toggleSidebar();
  } else {
    toggleDesktopSidebar();
  }
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

const VIEW_LABELS = {
  subs:    ['Assinaturas',        'por banco · com datas'],
  banks:   ['Bancos',             'cadastro global · estatísticas por banco'],
  reports: ['Relatórios',         'selecione um mês'],
  year:    ['Resumo Anual',       'visão geral do ano'],
  history: ['Histórico de Pessoas','quem comprou no seu cartão · todos os meses']
};

function showView(v) {
  S.currentView = v;

  // ── Fecha sidebar no mobile ao trocar de view ──
  const sb = document.getElementById('sb');
  if (sb && sb.classList.contains('open')) toggleSidebar();

  document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
  const viewEl = document.getElementById('view-' + v);
  viewEl.classList.add('active');
  const navEl = document.getElementById('nav-' + v);
  if (navEl) navEl.classList.add('active');

  // ── Atualiza topbar dinamicamente por view ──
  const tbTitle   = document.getElementById('tbTitle');
  const tbSub     = document.getElementById('tbSub');
  const tbActions = document.getElementById('tbActions');

  if (v === 'dash') {
    if (S.currentMonth) buildActions();
  } else {
    const lbl = VIEW_LABELS[v];
    if (tbTitle && lbl)   tbTitle.textContent   = lbl[0];
    if (tbSub   && lbl)   tbSub.textContent     = lbl[1];
    if (tbActions)        tbActions.innerHTML   = '';
    if (v === 'banks' && tbActions)
      tbActions.innerHTML = '<button class="btn btn-primary btn-sm" onclick="openGlobalBankM()">+ Adicionar</button>';
  }

  if (v === 'reports') {
    const k = S.currentMonth;
    if (S._repKey !== k) { S._repKey = k; renderReports(); }
  }
  if (v === 'subs') renderSubs();
  if (v === 'banks') renderBanksView();
  if (v === 'year') {
    const k = S.months.length + ':' + (S.months[S.months.length - 1]?.key || '');
    if (S._yearKey !== k) { S._yearKey = k; renderYear(); }
  }
  if (v === 'history') {
    const k = S.months.length + ':' + (S.months[S.months.length - 1]?.key || '');
    if (S._histKey !== k) { S._histKey = k; renderHistory(); }
  }
}