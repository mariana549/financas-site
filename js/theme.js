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

function applyContext(ctx) {
  const type = ctx?.type || 'personal';
  document.documentElement.setAttribute('data-context', type);

  // Oculta via JS nav itens exclusivos do modo pessoal (sem CSS overhead)
  const navHistory = document.getElementById('nav-history');
  if (navHistory) navHistory.style.display = type === 'pj' ? 'none' : '';

  // Texto do logo reflete o contexto ativo
  const logoSub = document.querySelector('.logo-sub');
  if (logoSub) logoSub.textContent = type === 'pj' ? 'gestão empresarial' : 'organizador pessoal';
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

function renderContextSwitcher() {
  const el = document.getElementById('contextSwitcher');
  if (!el) return;
  if (!S.profile?.pjEnabled || S.contexts.length <= 1) { el.style.display = 'none'; return; }

  const active = S.activeContext;
  // Contextos raiz: pessoal + pj raiz
  const roots = S.contexts.filter(c => !c.parentId);
  // Sub-contextos PJ (filhos do PJ raiz)
  const pjRoot = roots.find(c => c.type === 'pj');
  const pjSubs = pjRoot ? S.contexts.filter(c => c.parentId === pjRoot.id) : [];
  // Lista de opções: pessoal + pj raiz + seus filhos
  const personal = roots.find(c => c.type === 'personal');

  const ctxIcon  = c => c.type === 'personal' ? '🏠' : '🏢';
  const ctxLabel = c => c.name;

  const isPersonal = active?.type === 'personal';
  const isPJ       = active?.type === 'pj' || (active && pjRoot && (active.id === pjRoot.id || active.parentId === pjRoot.id));

  let html = `<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--border)">
    <div style="display:flex;gap:4px;flex:1;background:var(--bg3);border-radius:8px;padding:3px">`;

  // Botão Pessoal
  html += `<button onclick="switchContext('${personal?.id}')"
    style="flex:1;padding:5px 8px;border-radius:6px;border:none;cursor:pointer;font-size:11px;font-weight:600;font-family:var(--mono);
    background:${isPersonal ? 'var(--bg)' : 'transparent'};color:${isPersonal ? 'var(--text)' : 'var(--text3)'};
    box-shadow:${isPersonal ? '0 1px 3px rgba(0,0,0,.25)' : 'none'};transition:all .15s">🏠 Pessoal</button>`;

  // Botão PJ (ou sub-contexto ativo)
  if (pjSubs.length === 0) {
    html += `<button onclick="switchContext('${pjRoot?.id}')"
      style="flex:1;padding:5px 8px;border-radius:6px;border:none;cursor:pointer;font-size:11px;font-weight:600;font-family:var(--mono);
      background:${isPJ ? 'var(--bg)' : 'transparent'};color:${isPJ ? 'var(--accent)' : 'var(--text3)'};
      box-shadow:${isPJ ? '0 1px 3px rgba(0,0,0,.25)' : 'none'};transition:all .15s">🏢 PJ</button>`;
  } else {
    // PJ com sub-contextos — exibe dropdown
    const pjLabel = isPJ && active?.id !== pjRoot?.id ? ctxLabel(active) : 'PJ';
    html += `<div style="flex:1;position:relative">
      <button onclick="_toggleCtxDropdown(event)"
        style="width:100%;padding:5px 8px;border-radius:6px;border:none;cursor:pointer;font-size:11px;font-weight:600;font-family:var(--mono);
        background:${isPJ ? 'var(--bg)' : 'transparent'};color:${isPJ ? 'var(--accent)' : 'var(--text3)'};
        box-shadow:${isPJ ? '0 1px 3px rgba(0,0,0,.25)' : 'none'};transition:all .15s">🏢 ${pjLabel} ▾</button>
      <div id="ctxDropdown" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--bg2);border:1px solid var(--border);border-radius:8px;z-index:200;overflow:hidden">
        <button onclick="switchContext('${pjRoot?.id}')" style="display:block;width:100%;padding:8px 12px;text-align:left;background:none;border:none;cursor:pointer;font-size:12px;color:var(--text);font-family:var(--mono)">🏢 PJ (geral)</button>
        ${pjSubs.map(sub => `<button onclick="switchContext('${sub.id}')" style="display:block;width:100%;padding:8px 12px;text-align:left;background:none;border:none;cursor:pointer;font-size:12px;color:var(--text);font-family:var(--mono)">↳ ${sub.name}</button>`).join('')}
      </div>
    </div>`;
  }

  html += `</div></div>`;
  el.innerHTML = html;
  el.style.display = '';
}

function _toggleCtxDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('ctxDropdown');
  if (!dd) return;
  const isOpen = dd.style.display !== 'none';
  dd.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) setTimeout(() => document.addEventListener('click', () => { dd.style.display = 'none'; }, { once: true }), 0);
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
  clients:   ['Clientes PJ',          'faturamento e contatos por cliente'],
  taxes:     ['Impostos PJ',          'DAS · IRPF · INSS · estimativas'],
  pjreports: ['Relatório PJ',         'faturamento · custos · impostos · líquido'],
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
  if (v === 'clients') renderClientsView();
  if (v === 'taxes') renderTaxesView();
  if (v === 'pjreports') renderPJReports();
}