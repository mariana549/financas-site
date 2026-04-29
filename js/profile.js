// ══════════════════════════════════════════════════
// PROFILE.JS — Área do usuário
// ══════════════════════════════════════════════════

function _profileDisplayName() {
  return S.profile?.nickname || currentUser?.email || '';
}

function _profileInitials(str) {
  if (!str) return '?';
  const name = str.includes('@') ? str.split('@')[0] : str;
  const parts = name.trim().split(/[\s._\-+]+/).filter(Boolean);
  if (parts.length >= 2 && parts[1].length > 0)
    return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function _profileColor(str) {
  const palette = ['#4d9fff','#f06595','#51cf66','#ffd43b','#cc5de8','#ff6b6b','#74c0fc','#ff922b','#20c997'];
  const hash = (str || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function _profileAvatarHtml(size, fontSize) {
  const display = _profileDisplayName();
  const s = size || 48; const f = fontSize || 15;
  return `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${_profileColor(display)};
    display:flex;align-items:center;justify-content:center;font-size:${f}px;font-weight:700;
    color:#fff;flex-shrink:0;font-family:var(--mono);letter-spacing:1px">${_profileInitials(display)}</div>`;
}

// Atualiza o avatar pequeno na sidebar
function _profileUpdateSidebarAvatar() {
  const el = document.getElementById('userAvatar');
  if (!el || !currentUser?.email) return;
  const display = _profileDisplayName();
  el.textContent = _profileInitials(display);
  el.style.background = _profileColor(display);

  // Atualiza o texto exibido na sidebar (apelido ou email)
  const emailEl = document.getElementById('userEmail');
  if (emailEl) emailEl.textContent = S.profile?.nickname || currentUser.email;
}

function renderProfile() {
  const el = document.getElementById('profileContent');
  if (!el || !currentUser) return;

  const email = currentUser.email || '';
  const nickname = S.profile?.nickname || '';
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
      ${_profileAvatarHtml(64, 22)}
      <div style="min-width:0;flex:1">
        <div style="font-size:14px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nickname || email}</div>
        <div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nickname ? email : ''}</div>
        <div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-top:4px">Membro desde ${since}</div>
        <div style="display:inline-flex;align-items:center;gap:5px;margin-top:8px;background:rgba(77,255,145,.1);border:1px solid rgba(77,255,145,.2);border-radius:20px;padding:2px 10px">
          <div style="width:5px;height:5px;border-radius:50%;background:var(--green)"></div>
          <span style="font-size:10px;color:var(--green);font-family:var(--mono)">conta ativa</span>
        </div>
      </div>
    </div>

    <!-- Nome / Apelido -->
    <div class="profile-card" style="margin-bottom:12px">
      <div class="profile-card-head">👤 Nome de exibição</div>
      <div style="padding:14px 16px">
        <div style="font-size:12px;color:var(--text3);font-family:var(--mono);margin-bottom:10px">
          Como você quer ser chamado no app. Aparece na sidebar e no avatar.
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <input
            type="text"
            id="profileNicknameInput"
            style="flex:1;padding:8px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none;font-family:inherit"
            placeholder="Seu nome ou apelido"
            maxlength="40"
            value="${nickname.replace(/"/g, '&quot;')}"
            onkeydown="if(event.key==='Enter')_profileSaveNickname()"
          >
          <button class="btn btn-primary btn-sm" onclick="_profileSaveNickname()" id="profileNicknameBtn">Salvar</button>
          ${nickname ? `<button class="btn btn-ghost btn-sm" onclick="_profileClearNickname()" title="Remover apelido" style="padding:6px 10px">✕</button>` : ''}
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
      <div class="profile-row" style="cursor:default" id="profilePushRow">
        <div class="profile-row-info">
          <span class="profile-row-title">Notificações push</span>
          <span class="profile-row-sub" id="profilePushSub">Alertas mesmo com o app fechado</span>
        </div>
        <button class="profile-toggle" id="profilePushToggle" onclick="_profileTogglePush()">
          ${localStorage.getItem('fin_push_enabled') === '1' ? '🔔 Ativado' : '🔕 Desativado'}
        </button>
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

async function _profileSaveNickname() {
  const input = document.getElementById('profileNicknameInput');
  const btn   = document.getElementById('profileNicknameBtn');
  if (!input) return;
  const val = input.value.trim();
  btn.textContent = '...';
  btn.disabled = true;
  const ok = await dbSaveNickname(val);
  if (ok) {
    S.profile.nickname = val;
    _profileUpdateSidebarAvatar();
    showToast(val ? `Apelido salvo: ${val}` : 'Nome de exibição removido');
    renderProfile();
  } else {
    showToast('Erro ao salvar. Tente novamente.', 'error');
    btn.textContent = 'Salvar';
    btn.disabled = false;
  }
}

async function _profileClearNickname() {
  const ok = await dbSaveNickname('');
  if (ok) {
    S.profile.nickname = '';
    _profileUpdateSidebarAvatar();
    showToast('Nome de exibição removido');
    renderProfile();
  } else {
    showToast('Erro ao remover. Tente novamente.', 'error');
  }
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
    nickname: S.profile?.nickname || null,
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

async function _profileTogglePush() {
  const btn = document.getElementById('profilePushToggle');
  const sub = document.getElementById('profilePushSub');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  const enabled = localStorage.getItem('fin_push_enabled') === '1';
  let ok;
  if (enabled) {
    ok = await _disablePushNotifications();
  } else {
    ok = await _initPushNotifications();
  }
  if (btn) {
    btn.disabled = false;
    btn.textContent = localStorage.getItem('fin_push_enabled') === '1' ? '🔔 Ativado' : '🔕 Desativado';
  }
  if (sub && ok && !enabled && !VAPID_PUBLIC_KEY) {
    sub.textContent = 'VAPID não configurado — configure nas secrets do Supabase';
  }
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
