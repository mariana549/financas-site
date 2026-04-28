// ══════════════════════════════════════════════════
// AUTH.JS — Login, Cadastro, Logout, Sessão
// ══════════════════════════════════════════════════

// ── Mapa de erros Supabase → português ─────────────
const AUTH_ERRORS = {
  'Invalid login credentials':                      'E-mail ou senha incorretos.',
  'User already registered':                        'Este e-mail já está cadastrado. Use a aba Entrar.',
  'Email not confirmed':                            'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada (e o spam).',
  'Password should be at least 6 characters':       'A senha precisa ter pelo menos 6 caracteres.',
  'Unable to validate email address: invalid format': 'Formato de e-mail inválido.',
  'signup_disabled':                                'Cadastro desativado temporariamente.',
  'over_email_send_rate_limit':                     'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'Email rate limit exceeded':                      'Limite de tentativas atingido. Aguarde alguns minutos.',
  'For security purposes, you can only request this once every 60 seconds': 'Aguarde 1 minuto antes de solicitar outro link.',
};

function _authErrMsg(err) {
  if (!err) return 'Erro desconhecido. Tente novamente.';
  // Verifica mensagem exata
  if (AUTH_ERRORS[err.message]) return AUTH_ERRORS[err.message];
  // Verifica por substring
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Sem conexão. Verifique sua internet e tente novamente.';
  if (msg.includes('invalid email') || msg.includes('invalid format'))
    return 'Formato de e-mail inválido.';
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Muitas tentativas. Aguarde alguns minutos.';
  if (msg.includes('weak password') || msg.includes('6 characters'))
    return 'A senha precisa ter pelo menos 6 caracteres.';
  // Fallback: mostra o erro original
  return err.message || 'Erro inesperado. Tente novamente.';
}

// ── Painéis da tela de auth ─────────────────────────
function showAuthPanel(panel) {
  document.getElementById('authPanelMain').style.display     = panel === 'main'     ? '' : 'none';
  document.getElementById('authPanelForgot').style.display   = panel === 'forgot'   ? '' : 'none';
  document.getElementById('authPanelRecovery').style.display = panel === 'recovery' ? '' : 'none';
  // Limpa mensagens ao trocar painel
  _clearAuthMsgs();
}

function _clearAuthMsgs() {
  ['authMsg','forgotMsg','recoveryMsg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.className = 'auth-msg'; }
  });
}

function showMsg(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'auth-msg ' + (type || '');
}

// ── Tabs login / cadastro ───────────────────────────
function switchAuthTab(tab) {
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('authBtn').textContent = tab === 'login' ? 'Entrar' : 'Cadastrar';
  document.getElementById('authBtn').dataset.mode = tab;
  document.getElementById('fgConfirm').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('authPassword').setAttribute('autocomplete', tab === 'login' ? 'current-password' : 'new-password');
  document.getElementById('btnForgot').style.display = tab === 'login' ? '' : 'none';
  showMsg('authMsg', '', '');
}

// ── Mostrar / ocultar senha ─────────────────────────
function toggleAuthEye(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  btn.style.opacity = isHidden ? '1' : '0.4';
}

// ── Login / Cadastro ────────────────────────────────
async function handleAuth() {
  const email    = (document.getElementById('authEmail').value || '').trim();
  const password = document.getElementById('authPassword').value;
  const confirm  = document.getElementById('authConfirm').value;
  const mode     = document.getElementById('authBtn').dataset.mode || 'login';
  const btn      = document.getElementById('authBtn');

  // Validações locais
  if (!email)                       { showMsg('authMsg', 'Informe seu e-mail.', 'err'); return; }
  if (!email.includes('@') || !email.includes('.'))
                                    { showMsg('authMsg', 'Formato de e-mail inválido.', 'err'); return; }
  if (!password)                    { showMsg('authMsg', 'Informe sua senha.', 'err'); return; }
  if (password.length < 6)         { showMsg('authMsg', 'A senha precisa ter pelo menos 6 caracteres.', 'err'); return; }
  if (mode === 'register' && password !== confirm)
                                    { showMsg('authMsg', 'As senhas não coincidem.', 'err'); return; }

  btn.textContent = 'Aguarde...';
  btn.disabled = true;

  try {
    if (mode === 'register') {
      const result = await sb.auth.signUp({ email, password });
      if (result.error) throw result.error;

      // Supabase retorna user mas sem session quando email já existe (identities vazio)
      if (result.data.user?.identities?.length === 0) {
        throw { message: 'User already registered' };
      }

      if (result.data.session) {
        // Confirmação de e-mail desativada → loga direto
        currentUser = result.data.user;
        onLoginSuccess();
        return;
      } else {
        // Confirmação de e-mail ativa
        showMsg('authMsg', '✓ Conta criada! Verifique seu e-mail para confirmar o cadastro (cheque o spam também).', 'ok');
        btn.textContent = 'Cadastrar';
        btn.disabled = false;
        return;
      }
    } else {
      const result = await sb.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      currentUser = result.data.user;
      onLoginSuccess();
    }
  } catch (err) {
    showMsg('authMsg', _authErrMsg(err), 'err');
    btn.textContent = mode === 'login' ? 'Entrar' : 'Cadastrar';
    btn.disabled = false;
  }
}

// Mantém compatibilidade com onkeydown inline existente
function showAuthMsg(msg, type) {
  showMsg('authMsg', msg, type === 'err' ? 'err' : type === 'ok' ? 'ok' : '');
}

// ── Esqueci a senha ─────────────────────────────────
async function handleForgotPwd() {
  const email = (document.getElementById('forgotEmail').value || '').trim();
  const btn   = document.getElementById('forgotBtn');

  if (!email || !email.includes('@')) {
    showMsg('forgotMsg', 'Informe um e-mail válido.', 'err');
    return;
  }

  btn.textContent = 'Enviando...';
  btn.disabled = true;

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });

  if (error) {
    showMsg('forgotMsg', _authErrMsg(error), 'err');
    btn.textContent = 'Enviar link';
    btn.disabled = false;
    return;
  }

  showMsg('forgotMsg', '✓ Link enviado! Verifique seu e-mail (e a pasta de spam).', 'ok');
  btn.textContent = 'Enviado';
  // Não reabilita o botão para evitar reenvio acidental
}

// ── Redefinir senha (recovery) ──────────────────────
async function handleRecoveryPwd() {
  const pwd     = document.getElementById('recoveryPwd').value;
  const confirm = document.getElementById('recoveryConfirm').value;
  const btn     = document.getElementById('recoveryBtn');

  if (!pwd || pwd.length < 6)  { showMsg('recoveryMsg', 'A senha precisa ter pelo menos 6 caracteres.', 'err'); return; }
  if (pwd !== confirm)          { showMsg('recoveryMsg', 'As senhas não coincidem.', 'err'); return; }

  btn.textContent = 'Salvando...';
  btn.disabled = true;

  const { error } = await sb.auth.updateUser({ password: pwd });

  if (error) {
    showMsg('recoveryMsg', _authErrMsg(error), 'err');
    btn.textContent = 'Salvar nova senha';
    btn.disabled = false;
    return;
  }

  showMsg('recoveryMsg', '✓ Senha alterada com sucesso! Entrando...', 'ok');
  setTimeout(() => {
    document.getElementById('authScreen').style.display = 'none';
  }, 1500);
}

// ── Trocar senha (usuário logado) ───────────────────
function openChangePwdModal() {
  openModal('mChangePwd');
}

async function handleChangePwd() {
  const pwd     = (document.getElementById('changePwd').value || '');
  const confirm = (document.getElementById('changePwdConfirm').value || '');
  const btn     = document.getElementById('changePwdBtn');

  if (!pwd || pwd.length < 6)  { showToast('A senha precisa ter pelo menos 6 caracteres.', 'error'); return; }
  if (pwd !== confirm)          { showToast('As senhas não coincidem.', 'error'); return; }

  btn.textContent = 'Salvando...';
  btn.disabled = true;

  const { error } = await sb.auth.updateUser({ password: pwd });

  btn.textContent = 'Salvar';
  btn.disabled = false;

  if (error) { showToast(_authErrMsg(error), 'error'); return; }

  closeModal('mChangePwd');
  document.getElementById('changePwd').value = '';
  document.getElementById('changePwdConfirm').value = '';
  showToast('✓ Senha alterada com sucesso');
}

// ── Login bem-sucedido ──────────────────────────────
async function onLoginSuccess() {
  document.getElementById('authScreen').style.display = 'none';
  showAuthPanel('main'); // reseta para painel principal para próxima vez
  const emailEl = document.getElementById('userEmail');
  if (emailEl) emailEl.textContent = currentUser.email;

  showSplash();

  const dashEl = document.getElementById('dashContent');
  if (dashEl) dashEl.innerHTML = renderSkeleton();

  await loadAllFromSupabase();

  // ── Dev Panel ──
  S.isDev = S.devUsers.some(d => d.email === currentUser.email);
  const devNav = document.getElementById('nav-dev');
  if (devNav) devNav.style.display = S.isDev ? 'flex' : 'none';
  if (S.isDev && S.changelogEntries.length === 0) {
    await dbSeedChangelog(CHANGELOG);
    S.changelogEntries = await dbLoadChangelogEntries();
  }

  renderMonthList();
  renderSubs();
  checkVersionBanner();
  // Mostra ponto vermelho no nav se versão nova
  const seen = localStorage.getItem('fin_seen_version');
  if (seen !== APP_VERSION) {
    const dot = document.getElementById('changelogDot');
    if (dot) dot.style.display = 'block';
    const banner = document.getElementById('bannerVersion');
    if (banner) banner.textContent = APP_VERSION;
  }

  if (S.currentMonth) {
    selectMonth(S.currentMonth, false);
  } else {
    _renderDashImpl();
  }

  applyTheme();
}

function logout() {
  openModal('mLogout');
}

async function confirmLogout() {
  closeModal('mLogout');
  await sb.auth.signOut();
  currentUser = null;
  S = { ...defaultState() };
  const devNavEl = document.getElementById('nav-dev');
  if (devNavEl) devNavEl.style.display = 'none';
  showAuthPanel('main');
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  document.getElementById('authBtn').textContent = 'Entrar';
  document.getElementById('authBtn').disabled = false;
  document.getElementById('authBtn').dataset.mode = 'login';
  showMsg('authMsg', '', '');
}

// ── Verificar sessão existente ao carregar ──────────
sb.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    currentUser = session.user;
    onLoginSuccess();
  } else {
    document.getElementById('authScreen').style.display = 'flex';
  }
});

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    // Usuário clicou no link de recuperação — mostra painel de nova senha
    document.getElementById('authScreen').style.display = 'flex';
    showAuthPanel('recovery');
  }
  if (event === 'SIGNED_OUT') {
    document.getElementById('authScreen').style.display = 'flex';
  }
});
