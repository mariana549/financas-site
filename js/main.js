// ══════════════════════════════════════════════════
// MAIN.JS — Inicialização do App
// ══════════════════════════════════════════════════

// ── Injetar modais no body ──
injectModals();

// ── Tooltip global — evita clipping por overflow:hidden em cards e modais ──
(function () {
  const tip = document.createElement('div');
  tip.id = 'gTip';
  document.body.appendChild(tip);

  let _active = null;

  function show(el) {
    const text = el.getAttribute('data-tip');
    if (!text) return;
    tip.textContent = text;
    tip.style.opacity = '0';
    tip.style.display = 'block';
    _active = el;
    _pos(el);
    tip.style.opacity = '1';
  }

  function hide() {
    tip.style.opacity = '0';
    _active = null;
  }

  function _pos(el) {
    const r  = el.getBoundingClientRect();
    const tw = tip.offsetWidth  || 160;
    const th = tip.offsetHeight || 36;
    let left = r.left + r.width / 2 - tw / 2;
    let top  = r.top - th - 8;
    // flip below if not enough space above
    if (top < 8) top = r.bottom + 8;
    // clamp horizontally
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    tip.style.left = left + 'px';
    tip.style.top  = top  + 'px';
  }

  document.addEventListener('mouseover', e => {
    const el = e.target.closest('.tip[data-tip]');
    if (el) show(el);
  });

  document.addEventListener('mouseout', e => {
    if (e.target.closest('.tip[data-tip]')) hide();
  });

  // keep position updated if user moves between nested elements
  document.addEventListener('mousemove', e => {
    if (_active) _pos(_active);
  });
})();

// ── Aplicar tema salvo ──
applyTheme();

// ── Preenche versão no footer ──
(function () {
  const el = document.getElementById('footerVersion');
  if (el && typeof APP_VERSION !== 'undefined') el.textContent = 'v' + APP_VERSION;
})();

// ── Aplicar modo privacidade salvo ──
applyPrivacy(localStorage.getItem('fin_privacy') === 'on');

// ── Restaurar estado da sidebar desktop ──
if (localStorage.getItem('fin_sb_hidden') === '1') document.body.classList.add('sb-desktop-hidden');

// ── Inicializar color grid ──
buildColorGrid();

// ── Captura de erros globais → error_logs ──
window.onerror = function(msg, src, line, col, err) {
  dbLogError(msg, err?.stack || `${src}:${line}:${col}`, src);
};
window.addEventListener('unhandledrejection', e => {
  const msg = e.reason?.message || String(e.reason) || 'Unhandled rejection';
  dbLogError(msg, e.reason?.stack || null, window.location.href);
});

// ── Push notifications ──────────────────────────────
function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function _initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    showToast('Notificações push não suportadas neste dispositivo.', 'error');
    return false;
  }
  if (!VAPID_PUBLIC_KEY) {
    showToast('VAPID não configurado ainda. Contate o desenvolvedor.', 'error');
    return false;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    showToast('Permissão de notificação negada.', 'error');
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const ok = await dbSavePushSubscription(sub.toJSON());
    if (ok) {
      localStorage.setItem('fin_push_enabled', '1');
      showToast('✓ Notificações ativadas');
      return true;
    }
  } catch (e) {
    console.error('[push subscribe]', e);
    showToast('Erro ao ativar notificações.', 'error');
  }
  return false;
}

async function _disablePushNotifications() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await dbRemovePushSubscription();
    localStorage.removeItem('fin_push_enabled');
    showToast('Notificações desativadas');
    return true;
  } catch (e) {
    console.error('[push unsubscribe]', e);
    return false;
  }
}

// ── Registrar Service Worker ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registrado:', reg.scope))
      .catch(err => console.log('SW falhou:', err));
  });
}

// ── Detecta atualização do SW — recarrega apenas se updateNotify ativo ──
window._swUpdated = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window._swUpdated = true;
    if (S.appSettings?.updateNotify) window.location.reload();
  });
}

// ══════════════════════════════════════════════
// LOTE B — Prompt de permissão de push
// ══════════════════════════════════════════════
function _showPushPrompt() {
  if (document.getElementById('pushPrompt')) return;
  if (!('PushManager' in window)) return;
  const card = document.createElement('div');
  card.id = 'pushPrompt';
  card.className = 'push-prompt';
  card.innerHTML = `
    <div class="push-prompt-icon">🔔</div>
    <div class="push-prompt-text">
      <div class="push-prompt-title">Ativar lembretes de contas?</div>
      <div class="push-prompt-sub">Aviso quando um boleto estiver para vencer</div>
    </div>
    <div class="push-prompt-actions">
      <button class="btn btn-primary btn-sm" onclick="_pwaPushAccept()">Ativar</button>
      <button class="btn btn-ghost btn-sm" onclick="_pwaPushDecline()">Agora não</button>
    </div>`;
  const content = document.querySelector('.content');
  if (content) content.prepend(card);
}

window._pwaPushAccept = async function () {
  document.getElementById('pushPrompt')?.remove();
  await _initPushNotifications();
};

window._pwaPushDecline = function () {
  document.getElementById('pushPrompt')?.remove();
  localStorage.setItem('fin_push_declined', '1');
};

// ══════════════════════════════════════════════
// LOTE A — Banner de instalação do PWA
// ══════════════════════════════════════════════
(function () {
  // Já é PWA standalone — oferecer push se ainda não configurado
  if (window.matchMedia('(display-mode: standalone)').matches) {
    setTimeout(() => {
      if (!localStorage.getItem('fin_push_enabled') && !localStorage.getItem('fin_push_declined')) {
        _showPushPrompt();
      }
    }, 4000);
    return;
  }

  // Só exibe no mobile
  if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

  // Não exibe se dispensou nos últimos 7 dias
  const dismissed = localStorage.getItem('pwa_dismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  let _installPrompt = null;

  window._pwaBannerInstall = async function () {
    if (!_installPrompt) return;
    _installPrompt.prompt();
    const { outcome } = await _installPrompt.userChoice;
    _installPrompt = null;
    document.getElementById('pwaBanner')?.remove();
    if (outcome === 'accepted') localStorage.setItem('pwa_dismissed', Date.now());
  };

  function _showPWABanner() {
    if (document.getElementById('pwaBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'pwaBanner';
    banner.className = 'pwa-banner';
    if (isIOS) {
      banner.innerHTML = `
        <div class="pwa-banner-icon">📲</div>
        <div class="pwa-banner-text">
          <div class="pwa-banner-title">Instale o app no celular</div>
          <div class="pwa-banner-sub">Toque em <span class="pwa-share-icon">↑</span> depois em <strong>"Adicionar à Tela de Início"</strong></div>
        </div>
        <button class="pwa-banner-close" onclick="this.closest('.pwa-banner').remove();localStorage.setItem('pwa_dismissed',Date.now())" title="Fechar">×</button>`;
    } else {
      banner.innerHTML = `
        <div class="pwa-banner-icon">📲</div>
        <div class="pwa-banner-text">
          <div class="pwa-banner-title">Instale o app no celular</div>
          <div class="pwa-banner-sub">Receba lembretes quando uma conta vencer</div>
        </div>
        <div class="pwa-banner-actions">
          <button class="btn btn-primary btn-sm" onclick="_pwaBannerInstall()">Instalar</button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('pwaBanner').remove();localStorage.setItem('pwa_dismissed',Date.now())">Agora não</button>
        </div>`;
    }
    document.body.appendChild(banner);
  }

  if (isIOS) {
    window.addEventListener('load', () => setTimeout(_showPWABanner, 3000));
  } else {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      _installPrompt = e;
      setTimeout(_showPWABanner, 3000);
    });
  }

  // Após instalar: remove banner, mostra prompt de push
  window.addEventListener('appinstalled', () => {
    document.getElementById('pwaBanner')?.remove();
    localStorage.setItem('pwa_dismissed', Date.now());
    setTimeout(_showPushPrompt, 2000);
  });
})();