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