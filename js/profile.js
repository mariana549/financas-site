// ══════════════════════════════════════════════════
// PROFILE.JS — Área do usuário
// ══════════════════════════════════════════════════

function _profileInitials(email) {
  if (!email) return '?';
  const name = email.split('@')[0];
  const parts = name.split(/[._\-+]/);
  if (parts.length >= 2 && parts[1].length > 0)
    return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function _profileColor(email) {
  const palette = ['#4d9fff','#f06595','#51cf66','#ffd43b','#cc5de8','#ff6b6b','#74c0fc','#ff922b','#20c997'];
  const hash = (email || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function _profileAvatarHtml(email, size, fontSize) {
  const s = size || 48; const f = fontSize || 15;
  return `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${_profileColor(email)};
    display:flex;align-items:center;justify-content:center;font-size:${f}px;font-weight:700;
    color:#fff;flex-shrink:0;font-family:var(--mono);letter-spacing:1px">${_profileInitials(email)}</div>`;
}

// Atualiza o avatar pequeno na sidebar
function _profileUpdateSidebarAvatar() {
  const el = document.getElementById('userAvatar');
  if (!el || !currentUser?.email) return;
  el.textContent = _profileInitials(currentUser.email);
  el.style.background = _profileColor(currentUser.email);
}

function renderProfile() {
  const el = document.getElementById('profileContent');
  if (!el || !currentUser) return;

  const email = currentUser.email || '';
  const since = currentUser.created_at
    ? new Date(currentUser.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const totalMonths    = S.months.length;
  const totalEntries   = S.months.reduce((a, m) => a + m.banks.reduce((b, bk) => b + bk.entries.length, 0), 0);
  const totalSubs      = S.subscriptions.length;
  const totalInst      = S.installments.length;
  const privacyOn      = document.documentElement.getAttribute('data-privacy') === 'on';

  el.innerHTML = `
  <div style="max-width:540px;margin:0 auto;padding:20px 20px 60px">

    <!-- Avatar + Info -->
    <div style="display:flex;align-items:center;gap:16px;padding:20px;background:var(--bg2);border:1px solid var(--border);border-radius:14px;margin-bottom:16px">
      ${_profileAvatarHtml(email, 64, 22)}
      <div style="min-width:0;flex:1">
        <div style="font-size:14px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${email}</div>
        <div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-top:4px">Membro desde ${since}</div>
        <div style="display:inline-flex;align-items:center;gap:5px;margin-top:8px;background:rgba(77,255,145,.1);border:1px solid rgba(77,255,145,.2);border-radius:20px;padding:2px 10px">
          <div style="width:5px;height:5px;border-radius:50%;background:var(--green)"></div>
          <span style="font-size:10px;color:var(--green);font-family:var(--mono)">conta ativa</span>
        </div>
      </div>
    </div>

    <!-- Segurança -->
    <div class="profile-card" style="margin-bottom:12px">
      <div class="profile-card-head">🔒 Segurança</div>
      <button class="profile-row" onclick="openModal('mChangePwd')">
        <div class="profile-row-info">
          <span class="profile-row-title">Trocar senha</span>
          <span class="profile-row-sub">Defina uma nova senha para sua conta</span>
        </div>
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button class="profile-row" onclick="_profileSignOutAll()">
        <div class="profile-row-info">
          <span class="profile-row-title">Encerrar todas as sessões</span>
          <span class="profile-row-sub">Desconecta de todos os dispositivos</span>
        </div>
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>

    <!-- Configurações -->
    <div class="profile-card" style="margin-bottom:12px">
      <div class="profile-card-head">⚙️ Configurações</div>
      <div class="profile-row" style="cursor:default">
        <div class="profile-row-info">
          <span class="profile-row-title">Tema</span>
          <span class="profile-row-sub">Aparência do aplicativo</span>
        </div>
        <button class="profile-toggle" onclick="toggleTheme();renderProfile()">
          ${S.theme === 'dark' ? '🌙 Escuro' : '☀️ Claro'}
        </button>
      </div>
      <div class="profile-row" style="cursor:default">
        <div class="profile-row-info">
          <span class="profile-row-title">Modo privacidade</span>
          <span class="profile-row-sub">Oculta valores na tela</span>
        </div>
        <button class="profile-toggle" onclick="togglePrivacy();renderProfile()">
          ${privacyOn ? '🙈 Ativado' : '👁 Desativado'}
        </button>
      </div>
      <div class="profile-row" style="cursor:default;opacity:.45;pointer-events:none">
        <div class="profile-row-info">
          <span class="profile-row-title">Notificações</span>
          <span class="profile-row-sub">Alertas de vencimentos e parcelas</span>
        </div>
        <span class="profile-badge-soon">em breve</span>
      </div>
      <div class="profile-row" style="cursor:default;opacity:.45;pointer-events:none">
        <div class="profile-row-info">
          <span class="profile-row-title">Moeda padrão</span>
          <span class="profile-row-sub">R$, US$, €...</span>
        </div>
        <span class="profile-badge-soon">em breve</span>
      </div>
    </div>

    <!-- Meus Dados -->
    <div class="profile-card" style="margin-bottom:12px">
      <div class="profile-card-head">
        📦 Meus Dados
        <span style="font-size:11px;color:var(--text3);font-family:var(--mono);font-weight:400;margin-left:8px">
          ${totalMonths} meses · ${totalEntries} lançamentos · ${totalSubs} assinaturas · ${totalInst} parcelas
        </span>
      </div>
      <button class="profile-row" onclick="_profileExportData()">
        <div class="profile-row-info">
          <span class="profile-row-title">Exportar meus dados</span>
          <span class="profile-row-sub">Baixa JSON completo com tudo — meses, lançamentos, assinaturas</span>
        </div>
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
      <button class="profile-row" onclick="openModal('mPrivacyPolicy')">
        <div class="profile-row-info">
          <span class="profile-row-title">Política de privacidade</span>
          <span class="profile-row-sub">Como seus dados são tratados (LGPD)</span>
        </div>
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>

    <!-- Zona de Perigo -->
    <div class="profile-card profile-card-danger" style="margin-bottom:20px">
      <div class="profile-card-head" style="color:var(--red)">⚠️ Zona de Perigo</div>
      <button class="profile-row" onclick="logout()">
        <div class="profile-row-info">
          <span class="profile-row-title">Sair da conta</span>
          <span class="profile-row-sub">Encerra a sessão neste dispositivo</span>
        </div>
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
      <button class="profile-row" onclick="openModal('mDeleteAccount')">
        <div class="profile-row-info">
          <span class="profile-row-title" style="color:var(--red)">Excluir minha conta</span>
          <span class="profile-row-sub">Remove todos os seus dados permanentemente</span>
        </div>
        <svg width="15" height="15" fill="none" stroke="var(--red)" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>

    <div style="text-align:center;font-size:11px;color:var(--text3);font-family:var(--mono)">
      Finanças v${APP_VERSION} · Dados protegidos conforme a LGPD
    </div>

  </div>`;
}

async function _profileSignOutAll() {
  if (!confirm('Encerrar sessão em todos os dispositivos?')) return;
  setSyncing(true);
  await sb.auth.signOut({ scope: 'global' });
  setSyncing(false);
  showToast('Todas as sessões encerradas');
}

function _profileExportData() {
  const data = {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    email: currentUser?.email,
    months: S.months,
    pixEntries: S.pixEntries,
    recurrents: S.recurrents,
    incomes: S.incomes,
    subscriptions: S.subscriptions,
    installments: S.installments,
    globalBanks: S.globalBanks,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financas-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ Dados exportados');
}

async function _profileDeleteAccount() {
  const input = document.getElementById('deleteAccountInput');
  const typed = (input?.value || '').trim().toLowerCase();
  const expected = (currentUser?.email || '').toLowerCase();

  if (typed !== expected) {
    showToast('E-mail incorreto. Digite exatamente seu e-mail.', 'error');
    return;
  }

  const btn = document.getElementById('deleteAccountBtn');
  btn.textContent = 'Excluindo...';
  btn.disabled = true;

  setSyncing(true);
  const ok = await dbDeleteAccount();
  setSyncing(false);

  if (!ok) {
    showToast('Erro ao excluir conta. Tente novamente.', 'error');
    btn.textContent = 'Excluir permanentemente';
    btn.disabled = false;
    return;
  }

  closeModal('mDeleteAccount');
  currentUser = null;
  S = { ...defaultState() };
  const devNavEl = document.getElementById('nav-dev');
  if (devNavEl) devNavEl.style.display = 'none';
  showAuthPanel('main');
  document.getElementById('authScreen').style.display = 'flex';
  showToast('Conta excluída. Até logo.');
}
