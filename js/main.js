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

// ── Detecta atualização do SW e recarrega automaticamente ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}