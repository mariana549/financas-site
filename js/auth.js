// ══════════════════════════════════════════════════
// AUTH.JS — Login, Cadastro, Logout, Sessão
// ══════════════════════════════════════════════════

function switchAuthTab(tab) {
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('authBtn').textContent = tab === 'login' ? 'Entrar' : 'Cadastrar';
  document.getElementById('authMsg').className = 'auth-msg';
  document.getElementById('authMsg').textContent = '';
  document.getElementById('authBtn').dataset.mode = tab;
}

async function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const mode = document.getElementById('authBtn').dataset.mode || 'login';
  const btn = document.getElementById('authBtn');

  if (!email || !password) { showAuthMsg('Preencha e-mail e senha.', 'err'); return; }
  if (password.length < 6) { showAuthMsg('Senha precisa ter ao menos 6 caracteres.', 'err'); return; }

  btn.textContent = 'Aguarde...';
  btn.disabled = true;

  try {
    let result;
    if (mode === 'register') {
      result = await sb.auth.signUp({ email, password });
      if (result.error) throw result.error;
      showAuthMsg('Conta criada! Entrando...', 'ok');
      setTimeout(() => handleAuth(), 1000);
      return;
    } else {
      result = await sb.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
    }
    currentUser = result.data.user;
    onLoginSuccess();
  } catch (err) {
    const msgs = {
      'Invalid login credentials': 'E-mail ou senha incorretos.',
      'User already registered': 'E-mail já cadastrado. Tente entrar.',
      'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
    };
    showAuthMsg(msgs[err.message] || err.message, 'err');
    btn.textContent = mode === 'login' ? 'Entrar' : 'Cadastrar';
    btn.disabled = false;
  }
}

function showAuthMsg(msg, type) {
  const el = document.getElementById('authMsg');
  el.textContent = msg;
  el.className = 'auth-msg ' + (type || '');
}

async function onLoginSuccess() {
  document.getElementById('authScreen').style.display = 'none';
  const emailEl = document.getElementById('userEmail');
  if (emailEl) emailEl.textContent = currentUser.email;

  // Skeleton enquanto carrega do Supabase
  const dashEl = document.getElementById('dashContent');
  if (dashEl) dashEl.innerHTML = renderSkeleton();

  await loadAllFromSupabase();
  renderMonthList();
  renderSubs();
  if (S.currentMonth) selectMonth(S.currentMonth, false);
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
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  document.getElementById('authBtn').textContent = 'Entrar';
  document.getElementById('authBtn').disabled = false;
  document.getElementById('authBtn').dataset.mode = 'login';
  showAuthMsg('', '');
}
// ── Verificar sessão existente ao carregar ──
sb.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    currentUser = session.user;
    onLoginSuccess();
  } else {
    document.getElementById('authScreen').style.display = 'flex';
  }
});

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    document.getElementById('authScreen').style.display = 'flex';
  }
});