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

function toggleActMenu(e) {
  if (e) e.stopPropagation();
  const list = document.getElementById('actMenuList');
  if (!list) return;
  if (list.classList.contains('open')) {
    closeActMenu();
    return;
  }
  // Posiciona o dropdown fixo perto do botão trigger
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  list.style.top  = (rect.bottom + 6) + 'px';
  list.style.right = (window.innerWidth - rect.right) + 'px';
  list.classList.add('open');
  setTimeout(() => document.addEventListener('click', closeActMenu, { once: true }), 0);
}

function closeActMenu() {
  document.getElementById('actMenuList')?.classList.remove('open');
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

function renderAnnouncementBanner() {
  const el = document.getElementById('announcementBanner');
  if (!el) return;
  const active = S.announcements.filter(a => a.active);
  if (!active.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
  const dismissed = JSON.parse(localStorage.getItem('fin_ann_dismissed') || '[]');
  const visible = active.filter(a => !dismissed.includes(a.id));
  if (!visible.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
  const a = visible[0]; // mostra só o mais recente
  el.style.display = 'flex';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 18px;width:100%;background:linear-gradient(90deg,rgba(255,159,77,.09),transparent);border-bottom:1px solid rgba(255,159,77,.25);font-size:13px;box-sizing:border-box">
      <div style="width:28px;height:28px;border-radius:50%;background:rgba(255,159,77,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px">📣</div>
      <div style="flex:1;min-width:0;color:var(--text)">${a.message}</div>
      <button onclick="_dismissAnnouncement('${a.id}')" style="font-size:20px;line-height:1;background:none;border:none;color:var(--text3);cursor:pointer;padding:0 4px;flex-shrink:0" title="Fechar">×</button>
    </div>`;
}

function _dismissAnnouncement(id) {
  const dismissed = JSON.parse(localStorage.getItem('fin_ann_dismissed') || '[]');
  if (!dismissed.includes(id)) dismissed.push(id);
  localStorage.setItem('fin_ann_dismissed', JSON.stringify(dismissed));
  renderAnnouncementBanner();
}

const VIEW_LABELS = {
  subs:      ['Assinaturas',          'por banco · com datas'],
  banks:     ['Bancos',               'cadastro global · estatísticas por banco'],
  reports:   ['Relatórios',           'selecione um mês'],
  year:      ['Resumo Anual',         'visão geral do ano'],
  history:   ['Histórico de Pessoas', 'quem comprou no seu cartão · todos os meses'],
  changelog: ['Novidades',            'o que mudou em cada versão'],
  dev:       ['Dev Panel',            'changelog · usuários dev'],
  profile:   ['Meu Perfil',           'conta · configurações · dados'],
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
    renderReports();
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
  if (v === 'changelog') {
    renderChangelog();
    // Remove o ponto vermelho ao abrir
    const dot = document.getElementById('changelogDot');
    if (dot) dot.style.display = 'none';
    localStorage.setItem('fin_seen_version', APP_VERSION);
  }
  if (v === 'dev') renderDev();
  if (v === 'profile') renderProfile();
}